"""Archive and parse the public Chan May authority HTML berth schedules."""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request
import unicodedata
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.local/cmp'
INDEX = 'https://cangvuhanghaithuathienhue.gov.vn/index.aspx?page=law&cat=3133'
VERSION = 'cmp-authority-html/1.0.0'


def clean(text):
    return re.sub(r'\s+', ' ', text).strip()


def weight(text):
    text = text.replace(' ', '').replace('\xa0', '')
    if not re.fullmatch(r'\d+(?:[.,]\d+)*', text):
        return None
    # Vietnamese source uses decimal commas; dots, when grouped, are thousands.
    if ',' in text:
        text = text.replace('.', '').replace(',', '.')
    elif re.fullmatch(r'\d{1,3}(?:\.\d{3})+', text):
        text = text.replace('.', '')
    try:
        value = float(text)
        return value if 0 < value <= 1_000_000 else None
    except ValueError:
        return None


def parse(text, page, digest):
    soup = BeautifulSoup(text, 'html.parser')
    current = soup.select_one('#ctl22_LabelCurrentPage')
    if not current or current.get_text(strip=True) != str(page):
        raise ValueError('Schedule page did not advance')
    accordion = soup.select_one('#accordion')
    if accordion is None:
        raise ValueError('Missing schedule accordion')
    children = accordion.find_all(recursive=False)
    documents = []
    for title, body in zip(children[::2], children[1::2]):
        caption = clean(title.get_text(' ', strip=True))
        match = re.search(r'Kế hoạch điều động tàu ngày\s+(\d{1,2})/(\d{1,2})/(\d{4})', caption, re.I)
        if not match or title.name != 'li' or body.name != 'ul':
            raise ValueError('Unexpected dated schedule structure')
        day = str(dt.date(int(match[3]), int(match[2]), int(match[1])))
        section = None
        header_seen = False
        rows, rejected, sections = [], [], []
        for tr in body.select('tr'):
            if tr.find('tr'):
                continue
            cells = [clean(c.get_text(' ', strip=True)) for c in tr.find_all(['td', 'th'], recursive=False)]
            joined = clean(' '.join(cells)).upper()
            if len(cells) == 1 and 'KẾ HOẠCH TÀU' in joined:
                section = 'arrival' if 'ĐẾN CẢNG' in joined else 'departure' if 'RỜI CẢNG' in joined else 'movement' if 'DI CHUYỂN' in joined else None
                if section:
                    sections.append(section)
                header_seen = False
                continue
            if 'Name of ship' in ' '.join(cells):
                if header_seen:
                    section = None
                header_seen = True
                continue
            if not cells or not any(cells):
                continue
            if len(cells) != 10 or section is None:
                rejected.append(cells)
                continue
            match_time = re.fullmatch(r'(\d{1,2})[hH:](\d{2})(?:\s*[’\'])?', cells[0])
            if not match_time or int(match_time[1]) > 23 or int(match_time[2]) > 59 or not cells[1] or not cells[7] or not cells[8]:
                rejected.append(cells)
                continue
            rows.append({'time':day+'T'+match_time[1].zfill(2)+':'+match_time[2]+':00+07:00',
                         'vessel':cells[1], 'dwt':weight(cells[4]), 'from':cells[7], 'to':cells[8],
                         'section':section, 'raw':cells})
        if not sections:
            raise ValueError('Schedule sections missing for '+day)
        documents.append({'id':f'{day}-{hashlib.sha256(caption.encode()).hexdigest()[:12]}', 'day':day,
                          'title':caption, 'supplement':'bổ sung' in caption.lower(), 'page':page,
                          'url':INDEX, 'sha256':digest, 'parser_version':VERSION,
                          'sections':sections, 'rows':rows, 'rejected_rows':rejected})
    if not documents:
        raise ValueError('No dated schedules')
    return documents, soup


def fetch(body=None):
    request = urllib.request.Request(INDEX, data=body, headers={'User-Agent':'Mozilla/5.0', 'Content-Type':'application/x-www-form-urlencoded'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                if response.geturl() != INDEX:
                    raise ValueError('Unexpected authority redirect')
                raw = response.read(6_000_001)
            if len(raw) > 6_000_000:
                raise ValueError('Schedule page too large')
            return raw
        except OSError:
            if attempt == 2:
                raise
            time.sleep(2)


def berth(label):
    label = re.sub(r'\s*-\s*',' - ',clean(unicodedata.normalize('NFC',label))).lower()
    if label=='bến số 1' or re.fullmatch(r'cầu (?:cảng )?(?:số )?1(?: - tuyến mép bến phía (?:biển|bờ))?',label):return 'cmp_cau1'
    if label=='bến số 2' or re.fullmatch(r'cầu (?:cảng )?(?:số )?2',label):return 'cmp_cau2'
    return None


def ledger(documents):
    events = {}
    for document in reversed(documents):
        for r in document['rows']:
            key=(r['time'],clean(unicodedata.normalize('NFC',r['vessel'])).upper(),r['from'],r['to'])
            previous=events.get(key)
            value=dict(r)
            if previous and previous['dwt']!=r['dwt']:value['dwt']=None
            events[key]=value
    result={}
    for r in events.values():
        if re.search(r'cập mạn|hỗ trợ|mạn tàu',r['from']+' '+r['to'],re.I):continue
        origin,dest=berth(r['from']),berth(r['to'])
        if origin and dest:continue
        direction='arrival' if dest and r['section'] in ('arrival','movement') else 'departure' if origin and r['section'] in ('departure','movement') else None
        if direction is None:continue
        key=r['time'][:7]+'/'+direction
        entry=result.setdefault(key,{'rows':0,'known_dwt':0,'missing_dwt':0})
        entry['rows']+=1
        if r['dwt'] is None:entry['missing_dwt']+=1
        else:entry['known_dwt']+=r['dwt']
    for entry in result.values():entry['known_dwt']=round(entry['known_dwt'],6)
    return dict(sorted(result.items()))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--from-date', default='2025-01-01')
    parser.add_argument('--cached', action='store_true', help='Reparse archived pages without network')
    parser.add_argument('--resume', action='store_true', help='Resume the interrupted initial historical archive')
    args = parser.parse_args()
    start = dt.date.fromisoformat(args.from_date)
    archive = OUT / 'archive'; archive.mkdir(parents=True, exist_ok=True)
    documents, body, pages = [], None, []
    for page in range(1, 200):
        pointer = OUT / f'page-{page}.html'
        raw = pointer.read_bytes() if args.cached or (args.resume and pointer.exists()) else fetch(body)
        digest = hashlib.sha256(raw).hexdigest()
        (archive / (digest+'.html')).write_bytes(raw)
        pointer.write_bytes(raw)
        parsed, soup = parse(raw.decode('utf-8-sig'), page, digest)
        pages.append({'page':page,'sha256':digest})
        documents.extend(d for d in parsed if d['day'] >= str(start))
        print(json.dumps({'page':page,'through':parsed[-1]['day'],'documents':len(documents)}), flush=True)
        if min(d['day'] for d in parsed) < str(start):
            break
        fields = {i['name']:i.get('value','') for i in soup.select('input[type=hidden][name]')}
        fields.update({'ctl22$ImageButton_NavNext.x':'1','ctl22$ImageButton_NavNext.y':'1'})
        body = urllib.parse.urlencode(fields).encode()
    else:
        raise ValueError('History bound exhausted')
    if len(documents) < 500:
        raise ValueError('Unexpected historical document loss')
    # A dated title occasionally has a mistyped year. Quarantine it rather than
    # moving rows into a year inferred from nearby editions.
    dates = [dt.date.fromisoformat(d['day']).toordinal() for d in documents]
    for i, document in enumerate(documents):
        nearby = sorted(dates[max(0,i-3):i]+dates[i+1:i+4])
        if nearby and abs(dates[i]-nearby[len(nearby)//2]) > 45:
            document['source_error'] = 'title_date_outlier'
            document['rejected_rows'].extend(row['raw'] for row in document['rows'])
            document['rows'] = []
    ids = [d['id'] for d in documents]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate edition identity; review before export')
    metadata = {'source_url':INDEX,'collected_at':dt.datetime.now(dt.timezone.utc).isoformat(),
                'parser_version':VERSION,'documents':len(documents),'pages':pages,
                'rejected_rows':sum(len(d['rejected_rows']) for d in documents),
                'date_error_documents':sum(bool(d.get('source_error')) for d in documents),
                'history_complete':False,'full_coverage_verified':False,'scheduled_refresh_verified':False}
    if args.cached and (OUT/'history.json').exists():
        metadata['collected_at']=json.loads((OUT/'history.json').read_text(encoding='utf-8'))['metadata']['collected_at']
    monthly=ledger(documents)
    last=max(d['day'] for d in documents)[:7]
    first=str(start)[:7]
    year,month=map(int,first.split('-'))
    while f'{year}-{month:02}' <= last:
        for direction in ('arrival','departure'):
            if f'{year}-{month:02}/{direction}' not in monthly:raise ValueError('Missing recorded month/direction matrix')
        year,month=(year+1,1) if month==12 else (year,month+1)
    previous=ROOT/'docs/catalog-review/cmp-history-ledger.json'
    if previous.exists():
        old=json.loads(previous.read_text(encoding='utf-8'))
        if len(documents)<old['documents']*.95:raise ValueError('Historical document regression')
    receipt={'cutoff':max(d['day'] for d in documents),'documents':len(documents),'source_rows':sum(len(d['rows']) for d in documents),'monthly':monthly}
    bundle = {'metadata':metadata,'documents':documents}
    (OUT/'history.json').write_text(json.dumps(bundle,ensure_ascii=False),encoding='utf-8')
    target = ROOT/'packages/modules/port/src/cmp-history-data.ts'
    content = "// Generated from archived official HTML by scripts/collect-cmp-plans.py.\nimport type {CmpBulletin} from './cmp-plans';\n"
    content += 'export const cmpHistoryMetadata='+json.dumps(metadata,ensure_ascii=False,separators=(',',':'))+';\n'
    content += 'export const cmpBulletins:CmpBulletin[]=[\n'+',\n'.join(json.dumps(d,ensure_ascii=False,separators=(',',':')) for d in documents)+'\n];\n'
    target.write_text(content,encoding='utf-8')
    previous.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/'export-receipt.json').write_text(json.dumps({'metadata':metadata,'ledger':receipt},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(metadata))


if __name__ == '__main__':
    main()
