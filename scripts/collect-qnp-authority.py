"""Extract source-backed QNP berth plans from official dated image bulletins.

Requires Python 3.12 + rapidocr-onnxruntime/opencv. Raw pages, OCR and hashes stay
in .local/qnp-authority. Never treats missing images/rows/weights as zero.
"""
import argparse
import concurrent.futures
import datetime as dt
import hashlib
import html
import json
import pathlib
import re
import time
import unicodedata
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / '.local/qnp-authority'
BASE = 'https://cangvuhanghaiquynhon.gov.vn/'
VERSION = 'qnp-authority-grid/1.0.0'


def normal(text):
    value = ''.join(c for c in unicodedata.normalize('NFD', text.upper().replace('Đ', 'D')) if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^A-Z0-9]', '', value)


def weight(text):
    s = text.strip().replace(' ', '')
    if re.fullmatch(r'\d{1,3}(?:[,.]\d{3})+', s):
        n = float(s.replace(',', '').replace('.', ''))
    elif re.fullmatch(r'\d+(?:,\d{1,2})?', s):
        n = float(s.replace(',', '.'))
    else:
        return None
    return n if 0 < n <= 1_000_000 else None


def berth(text):
    # Explicit typography/OCR aliases checked against the original source cells.
    s = re.sub(r'\s+', ' ', text.upper()).strip().replace('P.0', 'P0')
    if s in ('PO', 'P O', 'P 0'):
        return 'P0'
    if re.fullmatch(r'I[ABC](?: ?(?:TL|HL))?', s):
        s = '1' + s[1:]
    s = re.sub(r'^(1[ABC]|C[1-4][TN]?)(TL|HL)$', r'\1 \2', s)
    return s


def window(text, title_day):
    dates = re.findall(r'(\d{1,2})/(\d{1,2})/(20\d{2})', text)
    if len(dates) != 2:
        raise ValueError('Cannot read the two source window dates')
    a, b = [dt.date(int(y), int(m), int(d)) for d, m, y in dates]
    if b != dt.date.fromisoformat(title_day) or (b-a).days != 1:
        raise ValueError('Source image and dated title disagree')
    return a.isoformat()+'T16:00:00+07:00', b.isoformat()+'T16:00:00+07:00'


def event_time(text, start, end):
    match = re.fullmatch(r'\s*(\d{1,2})\s*[hH:]\s*(\d{2})\s*[-–—]?\s*(\d{1,2})/(\d{1,2})\s*', text)
    if not match:
        raise ValueError('Unreadable source row time')
    hour, minute, day, month = map(int, match.groups())
    # Year follows the actual source window, including New Year transitions.
    candidates = []
    for year in {int(start[:4]), int(end[:4])}:
        try:
            value = dt.datetime(year, month, day, hour, minute).isoformat()+'+07:00'
        except ValueError:
            continue
        # Endpoints occur in adjacent editions; canonicalization removes exact replays.
        if start <= value <= end:
            candidates.append(value)
    if len(candidates) != 1:
        raise ValueError('Source row outside its dated window')
    return candidates[0]


def fetch(url):
    if not url.startswith(BASE) or urllib.parse.urlsplit(url).netloc != 'cangvuhanghaiquynhon.gov.vn':
        raise ValueError('Unexpected authority URL')
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=35) as response:
                if not response.geturl().startswith(BASE):
                    raise ValueError('Unexpected source redirect')
                raw = response.read(12_000_001)
                if len(raw) > 12_000_000:
                    raise ValueError('Source too large')
                return raw
        except OSError:
            if attempt == 2:
                raise
            time.sleep(attempt+1)


def image_resource(rel):
    if not re.fullmatch(r'images/uploads/images/[^/?#\\]+\.(?:jpg|png|jpeg)',rel,re.I):
        raise ValueError('Unexpected image resource')
    name=urllib.parse.unquote(rel.rsplit('/',1)[1])
    if any(c in name for c in '/\\?#') or any(ord(c)<32 for c in name) or name in ('.','..'):
        raise ValueError('Invalid image filename')
    return urllib.parse.quote(rel,safe='/()%-._')


def preserve(raw,suffix):
    folder=OUT/'evidence';folder.mkdir(exist_ok=True)
    digest=hashlib.sha256(raw).hexdigest();target=folder/(digest+suffix)
    if target.exists():
        if hashlib.sha256(target.read_bytes()).hexdigest()!=digest:raise ValueError('Archived source hash mismatch')
    else:target.write_bytes(raw)
    return digest


def archive(item,refresh=False):
    ident = re.search(r'id=(\d+)', item['url'])[1]
    detail = OUT / f'detail-{ident}.html'
    fetched_detail=refresh or not detail.exists()
    if detail.exists() and refresh:preserve(detail.read_bytes(),'.html')
    if not detail.exists() or refresh:
        detail.write_bytes(fetch(item['url']))
    raw = detail.read_bytes()
    text = raw.decode('utf-8-sig')
    images = list(dict.fromkeys(re.findall(r'src="(images/uploads/images/[^"<>]+\.(?:jpg|png|jpeg))"', text, re.I)))
    if not images and not refresh:
        detail.write_bytes(fetch(item['url']));raw=detail.read_bytes();text=raw.decode('utf-8-sig')
        images=list(dict.fromkeys(re.findall(r'src="(images/uploads/images/[^"<>]+\.(?:jpg|png|jpeg))"',text,re.I)))
    if not images:
        raise ValueError('No official schedule images')
    evidence = []
    for rel in images:
        rel=image_resource(rel)
        path = OUT / 'images' / pathlib.PurePosixPath(rel).name
        if path.exists() and refresh:preserve(path.read_bytes(),path.suffix)
        if not path.exists() or refresh:
            path.write_bytes(fetch(BASE+rel))
        evidence.append({'url': BASE+rel, 'path': str(path), 'sha256': preserve(path.read_bytes(),path.suffix)})
    preserve(raw,'.html')
    return {**item, 'id': int(ident), 'html_sha256': hashlib.sha256(raw).hexdigest(), 'images': evidence,**({'checked_at':dt.datetime.now(dt.timezone.utc).isoformat()} if fetched_detail else {})}


def centers(box):
    return sum(p[0] for p in box)/4, sum(p[1] for p in box)/4


def groups(values):
    result = []
    for value in values:
        if not result or value-result[-1][-1] > 2:
            result.append([int(value)])
        else:
            result[-1].append(int(value))
    return [sum(g)/len(g) for g in result]


def init_worker():
    global OCR
    import cv2
    from rapidocr_onnxruntime import RapidOCR
    cv2.setNumThreads(1)
    OCR = RapidOCR(intra_op_num_threads=2, inter_op_num_threads=1, rec_batch_num=6)


SCOPE_READER = 'qnp-footer/3'
def scope_footer(image):
    """Locate a positively named next port below the QNP grid, including a split header."""
    import cv2
    import numpy as np
    im=cv2.imread(image['path'])
    gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    binary=cv2.adaptiveThreshold(gray,255,cv2.ADAPTIVE_THRESH_MEAN_C,cv2.THRESH_BINARY_INV,15,10)
    horizontal=cv2.morphologyEx(binary,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_RECT,(im.shape[1]//3,1)))
    vertical=cv2.morphologyEx(binary,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_RECT,(1,20)))
    contours,_=cv2.findContours(horizontal|vertical,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    tables=sorted((cv2.boundingRect(c) for c in contours if cv2.boundingRect(c)[2]>im.shape[1]*.7 and cv2.boundingRect(c)[3]>60),key=lambda r:r[1])
    if not tables:return {'reader':SCOPE_READER,'closed':False,'labels':[]}
    x,y,w,h=tables[0];start=y+h+2
    lines=np.where((horizontal>0).sum(axis=1)>im.shape[1]*.7)[0]
    following=lines[lines>start+3]
    end=int(following[0])-1 if len(following) else im.shape[0]
    if end<=start:return {'reader':SCOPE_READER,'closed':False,'labels':[]}
    ink=(binary[start:end,x+3:x+w-3]>0).sum(axis=1);spans=[]
    for i in np.where(ink>max(1,w*.003))[0]:
        if not spans or i-spans[-1][-1]>2:spans.append([int(i)])
        else:spans[-1].append(int(i))
    boxes=[(start+v[0],start+v[-1]+1) for v in spans if v[-1]-v[0]>=3]
    crops=[]
    for a,b in boxes:
        pts=cv2.findNonZero(binary[a:b,x+3:x+w-3]);cx,cy,cw,ch=cv2.boundingRect(pts)
        crops.append(cv2.resize(im[max(0,a-1):b+1,max(x+3,x+3+cx-2):min(x+w-3,x+3+cx+cw+2)],None,fx=3,fy=3))
    reads,_=OCR.text_rec(crops) if crops else ([],0)
    labels=[{'text':str(r[0]),'confidence':float(r[1]),'box':[x+3,a,x+w-3,b]} for (a,b),r in zip(boxes,reads)]
    allowed={'CANGTHINAI','CANGTANCANGMIENTRUNG','TANCANGMIENTRUNG','BENPHAOXANGDAUBINHDINH','BENPHAOXANGDAU','BENPHAOBINHDINH','PHAOXANGDAU'}
    closed=any(normal(r['text']) in allowed and r['confidence']>=.85 for r in labels)
    return {'reader':SCOPE_READER,'closed':closed,'labels':labels,'image_sha256':image['sha256']}


def parse_image(image, title_day, first=False, context=None, previous=None):
    """Read bounded table cells directly; do not run a text detector over unrelated ports."""
    import cv2
    import numpy as np
    if not first and (not context or not context.get('from')):
        return {'status':'continuation_requires_review','rows':[],'rejected':[]}
    im=cv2.imread(image['path'])
    if im is None:raise ValueError('Image cannot be decoded')
    gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    binary=cv2.adaptiveThreshold(gray,255,cv2.ADAPTIVE_THRESH_MEAN_C,cv2.THRESH_BINARY_INV,15,10)
    horizontal=cv2.morphologyEx(binary,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_RECT,(im.shape[1]//3,1)))
    vertical=cv2.morphologyEx(binary,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_RECT,(1,20)))
    contours,_=cv2.findContours(horizontal|vertical,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    tables=sorted((cv2.boundingRect(c) for c in contours if cv2.boundingRect(c)[2]>im.shape[1]*.7 and cv2.boundingRect(c)[3]>60),key=lambda r:r[1])
    def crop_text(x1,y1,x2,y2,scale=3):
        crop=im[max(0,int(y1)):min(im.shape[0],int(y2)),max(0,int(x1)):min(im.shape[1],int(x2))]
        if crop.size==0:return None
        ink=cv2.adaptiveThreshold(cv2.cvtColor(crop,cv2.COLOR_BGR2GRAY),255,cv2.ADAPTIVE_THRESH_MEAN_C,cv2.THRESH_BINARY_INV,15,10)
        points=cv2.findNonZero(ink)
        if points is None:return None
        x,y,w,h=cv2.boundingRect(points)
        crop=crop[max(0,y-2):y+h+2,max(0,x-2):x+w+2]
        return cv2.resize(crop,None,fx=scale,fy=scale)
    def recognize(x1,y1,x2,y2,scale=3):
        crop=crop_text(x1,y1,x2,y2,scale)
        if crop is None:return '',0
        result,_=OCR.text_rec([crop])
        return (str(result[0][0]).strip(),float(result[0][1])) if result else ('',0)
    def text_lines(x1,y1,x2,y2):
        ink=(binary[int(y1):int(y2),int(x1):int(x2)]>0).sum(axis=1)
        # Recover complete contiguous ink bands (not just their centers).
        spans=[]
        for index in np.where(ink>max(1,(x2-x1)*.003))[0]:
            if not spans or index-spans[-1][-1]>2:spans.append([int(index)])
            else:spans[-1].append(int(index))
        return [(y1+s[0],y1+s[-1]+1) for s in spans if s[-1]-s[0]>=3]
    if not tables:
        bands=text_lines(20,0,im.shape[1]-20,int(im.shape[0]*.42))
        texts=[recognize(20,a-1,im.shape[1]-20,b+1)[0] for a,b in bands]
        if not first and context and sum(any(marker in normal(t) for t in texts) for marker in ('LAPKEHOACH','GIAMDOC'))==2:
            return {'status':'signature_page','from':context['from'],'through':context['through'],'rows':[],'rejected':[],'page_scope_complete':True}
        if any(normal(t) in ('KHONGCOKEHOACHTAU','KHONGCOKEHOACH') for t in texts):
            start,end=window(' '.join(texts),title_day)
            return {'status':'explicit_no_plan','from':start,'through':end,'rows':[],'rejected':[],'table_scope':'regional_explicit_no_plan','page_scope_complete':True}
        raise ValueError('No source table grid')
    left,top,width,height=tables[0];bottom=top+height
    if first and not previous:
        header_bands=text_lines(left+3,0,left+width-3,max(1,top-2))[-5:]
        header_text=[recognize(left+2,a-1,left+width-2,b+1)[0] for a,b in header_bands]
        if not any(normal(s)=='CANGQUYNHON' for s in header_text):
            raise ValueError('First source table is not labeled Cang Quy Nhon')
        start,end=window(' '.join(header_text),title_day)
    elif first:
        start,end=previous['from'],previous['through']
    else:
        captions=[recognize(left+2,a-1,left+width-2,b+1)[0] for a,b in text_lines(left+3,0,left+width-3,max(1,top-2))]
        if any(normal(t) in ('CANGTHINAI','CANGTANCANGMIENTRUNG','TANCANGMIENTRUNG','BENPHAOXANGDAUBINHDINH','BENPHAOXANGDAU','BENPHAOBINHDINH','PHAOXANGDAU') for t in captions):
            return {'status':'outside_qnp_scope','from':context['from'],'through':context['through'],'rows':[],'rejected':[],'page_scope_complete':True,'scope_heading':captions}
        if top>70:raise ValueError('Continuation is not an unlabeled carry-over grid')
        start,end=context['from'],context['through']
    ys=groups(np.where((horizontal[top:bottom]>0).sum(axis=1)>im.shape[1]*.7)[0])
    ys=[top+y for y in ys]
    if len(ys)<2:raise ValueError('QNP row grid not recognized')
    header_bottom=next((y for y in ys if y>top+20),None) if first else ys[0]
    if header_bottom is None:raise ValueError('QNP header grid missing')
    grid=binary[top:bottom]
    v=cv2.morphologyEx(grid,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_RECT,(1,max(15,int(height*.7)))))
    xs=groups(np.where((v>0).sum(axis=0)>height*.65)[0])
    if not 11<=len(xs)<=14:raise ValueError('Unexpected QNP column grid')
    if first:
        labels={col:normal(recognize(xs[col]+2,header_bottom-22,xs[col+1]-2,header_bottom-1)[0]) for col in (5,6)}
        candidates=[c for c,label in labels.items() if label=='DWT']
        if len(candidates)!=1:raise ValueError('Missing or ambiguous QNP DWT header')
        dwt_col=candidates[0]
    else:
        if len(xs)!=context['column_count']:raise ValueError('Continuation column grid differs from QNP')
        dwt_col=context['dwt_col']
    if first and previous:
        index,confidence=recognize(xs[0]+3,ys[-2]+3,xs[1]-3,ys[-1]-2)
        if not index.isdigit() or confidence<.85:raise ValueError('Cannot read last QNP row number')
        count=sum(b-a>=12 for a,b in zip(ys,ys[1:]) if a>=header_bottom)
        first_index,first_confidence=recognize(xs[0]+3,header_bottom+3,xs[1]-3,next(y for y in ys if y>header_bottom)-2)
        if first_index!='1' or first_confidence<.85:raise ValueError('QNP first row number is not anchored')
        return {**previous,'page_scope_complete':scope_footer(image)['closed'],'column_count':len(xs),'dwt_col':dwt_col,'last_index':max(int(index),count)}
    crops=[]
    def queue_cell(a,b,col,scale=3):
        margin=1 if col==0 else 3
        x1,x2=xs[col]+margin,xs[col+1]-margin;y1,y2=a+margin,b-(1 if col==0 else 2)
        lines=text_lines(x1,y1,x2,y2)
        refs=[]
        for c,d in lines:
            crop=crop_text(x1,c-1,x2,d+1,scale)
            if crop is not None:refs.append(len(crops));crops.append(crop)
        return refs
    rows=[];rejected=[]
    data_y=[y for y in ys if y>=header_bottom]
    plans=[]
    for a,b in zip(data_y,data_y[1:]):
        if b-a<12:continue
        plans.append((a,b,[queue_cell(a,b,c,scale) for c,scale in [(0,3),(1,3),(2,3),(len(xs)-4,3),(len(xs)-3,3),(dwt_col,2),(dwt_col,3)]]))
    batch,_=OCR.text_rec(crops) if crops else ([],0)
    def resolved(refs):
        return ' '.join(str(batch[i][0]).strip() for i in refs),min((float(batch[i][1]) for i in refs),default=0)
    last_index=0 if first else context['last_index']
    for a,b,refs in plans:
        (index,ic),(raw_time,tc),(vessel,vc),(origin,oc),(destination,dc),(raw_dwt,wc),check=[resolved(r) for r in refs]
        if not first:
            if not index and not raw_time:continue  # A clipped tail of the preceding page row has no new identity.
            if normal(index) in ('ST','STT','T') and normal(vessel)=='TENTAU':continue
            if not index.isdigit() or int(index)!=last_index+1 or ic<.85:raise ValueError(f'Continuation row numbers do not follow QNP page: expected {last_index+1}, read {index!r}, confidence {ic:.3f}')
        if index.isdigit():last_index=int(index)
        raw_row={'time':raw_time,'vessel':vessel,'dwt':raw_dwt,'from':origin,'to':destination,'confidence':{'time':tc,'vessel':vc,'from':oc,'to':dc,'dwt':wc},'box':[xs[0],a,xs[-1],b]}
        try:
            timestamp=event_time(raw_time,start,end)
            if min(tc,vc,oc,dc)<.80 or not vessel or not origin or not destination:raise ValueError('Row identity or berth confidence too low')
            value=weight(raw_dwt)
            if min(wc,check[1])<.90 or value!=weight(check[0]):value=None
            rows.append({'time':timestamp,'vessel':vessel,'dwt':value,'from':berth(origin),'to':berth(destination),'raw':raw_row,'dwt_crosscheck':check,'image_sha256':image['sha256']})
        except ValueError as e:rejected.append({'reason':str(e),'raw':raw_row})
    next_caption=[]
    if len(tables)>1:
        for a,b in text_lines(left+3,bottom+2,left+width-3,tables[1][1]-2):next_caption.append(recognize(left+2,a-1,left+width-2,b+1)[0])
    complete=any((normal(s).startswith('CANG') or normal(s).startswith('TANCANG')) and normal(s)!='CANGQUYNHON' for s in next_caption)
    if not complete:complete=scope_footer(image)['closed']
    return {'status':'parsed','from':start,'through':end,'rows':rows,'rejected':rejected,'table_scope':'CANG QUY NHON','page_scope_complete':complete,'column_count':len(xs),'dwt_col':dwt_col,'last_index':last_index}


PUBLISHED=None
def published_seed(item):
    """Reuse versioned cells only after newly archived source image hashes match exactly."""
    global PUBLISHED
    if PUBLISHED is None:
        target=ROOT/'packages/modules/port/src/qnp-history-data.ts'
        text=target.read_text(encoding='utf-8') if target.exists() else ''
        match=re.search(r'export const qnpAuthorityBulletins:QnpBulletin\[\]=(\[.*\]);',text,re.S)
        PUBLISHED={s['id']:s for s in json.loads(match[1])} if match else {}
    source=PUBLISHED.get(item['id'])
    if not source or source.get('parser_version')!=VERSION:return {}
    expected=[{k:image[k] for k in ('url','sha256')} for image in item['images']]
    if source.get('images')!=expected:return {}
    quality=source.get('quality',{})
    pages=[]
    for i,image in enumerate(item['images']):
        rows=[r for r in source['rows'] if r.get('image_sha256')==image['sha256']]
        if i and not rows:continue
        pages.append({'status':'explicit_no_plan' if quality.get('explicit_no_plan') else 'parsed',
                      'from':source['from'],'through':source['through'],'rows':rows,'rejected':[],
                      'page_scope_complete':bool(quality.get('page_scope_complete')),
                      'seed_rejected_rows':quality.get('rejected_rows',0) if i==0 else 0,
                      'seed_duplicate_rows':quality.get('duplicate_rows',0) if i==0 else 0,
                      'seed_conflicting_groups':quality.get('conflicting_groups',0) if i==0 else 0})
    return {**item,'parser_version':VERSION,'ocr_config':'grid-cells-upright','parsed_at':source['parsed_at'],
            'from':source['from'],'through':source['through'],'rows':source['rows'],'pages':pages,'continuation_reader':source.get('continuation_reader'),
            'errors':[] if not source.get('source_error') else [{'error':source['source_error']}],
            'seeded_from_versioned_hashes':True,**({'checked_at':source['last_checked_at']} if source.get('last_checked_at') else {}),'history_complete':False,'automatic_promotion':False}


def extract(item):
    prior={}
    ident = str(item['id']); cache = OUT/'parsed'/(ident+'.json')
    if cache.exists():
        try:prior = json.loads(cache.read_text(encoding='utf-8'))
        except json.JSONDecodeError:prior={}
    else:prior=published_seed(item)
    if prior:
        if prior.get('parser_version') == VERSION and prior.get('ocr_config')=='grid-cells-upright' and prior.get('images') == item['images'] and prior.get('from') and not prior.get('errors'):
            checked_changed=bool(item.get('checked_at') and item['checked_at']!=prior.get('checked_at'))
            if item.get('checked_at'):prior['checked_at']=item['checked_at']
            incomplete=bool(prior.get('pages') and not prior['pages'][-1].get('page_scope_complete'))
            if not incomplete or prior.get('continuation_reader')=='qnp-continuation/7':
                if not cache.exists() or checked_changed:
                    temp=cache.with_suffix('.tmp');temp.write_text(json.dumps(prior,ensure_ascii=False,indent=2),encoding='utf-8');temp.replace(cache)
                return prior
    pages = []; errors = []
    for i,image in enumerate(item['images']):
        if i and pages and pages[-1].get('page_scope_complete'):
            break  # The next port heading already closes the QNP table on page one.
        try:
            pages.append(parse_image(image,item['title_day'],i==0,pages[-1] if i and pages else None,prior['pages'][0] if i==0 and prior.get('from') and prior.get('images')==item['images'] and prior.get('pages') else None))
        except Exception as e:
            errors.append({'image':image['url'],'error':str(e)})
    first = pages[0] if pages else {}
    combined=[r for page in pages for r in page.get('rows',[])]
    result = {**item,'parser_version':VERSION,'ocr_config':'grid-cells-upright','continuation_reader':'qnp-continuation/7','parsed_at':dt.datetime.now(dt.timezone.utc).isoformat(),'pages':pages,'errors':errors,'rows':combined,'from':first.get('from'),'through':first.get('through'),'history_complete':False,'automatic_promotion':False}
    temp=cache.with_suffix('.tmp');temp.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');temp.replace(cache)
    return result


def main():
    p=argparse.ArgumentParser();p.add_argument('--limit',type=int);p.add_argument('--workers',type=int,default=3);p.add_argument('--refresh-recent',type=int,default=0);args=p.parse_args()
    for name in ('images','ocr','parsed'):
        (OUT/name).mkdir(parents=True,exist_ok=True)
    items=json.loads((OUT/'candidates.json').read_text(encoding='utf-8'))['schedules']
    if args.limit:
        items=items[:args.limit]
    archived=[];failures=[];retained=[]
    recent=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()-dt.timedelta(days=args.refresh_recent)
    active=[]
    for item in items:
        if args.refresh_recent>0 and dt.date.fromisoformat(item['title_day'])<recent:
            ident=int(re.search(r'id=(\d+)',item['url'])[1])
            # Load the versioned catalogue, then retain old facts without claiming a new source check.
            published_seed({'id':ident,'images':[]})
            source=PUBLISHED.get(ident)
            if source and not source.get('source_error'):
                images=[{**image,'path':str(OUT/'evidence'/image['sha256'])} for image in source['images']]
                seed=published_seed({**item,'id':ident,'images':images})
                if seed:
                    seed['retained_without_remote_recheck']=True
                    target=OUT/'parsed'/f'{ident}.json';temp=target.with_suffix('.tmp')
                    temp.write_text(json.dumps(seed,ensure_ascii=False,indent=2),encoding='utf-8');temp.replace(target)
                    retained.append(seed);continue
        active.append(item)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures={pool.submit(archive,item,args.refresh_recent>0):item for item in active}
        for future in concurrent.futures.as_completed(futures):
            try:archived.append(future.result())
            except Exception as e:failures.append({'url':futures[future]['url'],'error':str(e)})
    print(f'Retained {len(retained)} versioned historical schedules without a new remote check; archived {len(archived)} current/new schedules; {len(failures)} fetch failures',flush=True)
    results=retained.copy()
    with concurrent.futures.ProcessPoolExecutor(max_workers=args.workers,initializer=init_worker) as pool:
        futures={pool.submit(extract,item):item for item in archived}
        for future in concurrent.futures.as_completed(futures):
            try:results.append(future.result())
            except Exception as e:failures.append({'url':futures[future]['url'],'error':str(e)})
            if len(results)%20==0:print(f'Extracted {len(results)} schedules, {sum(len(r["rows"]) for r in results)} source rows',flush=True)
    result={'parser_version':VERSION,'refresh_window_days':args.refresh_recent,'retained_historical_documents':len(retained),'current_documents_archived':len(archived),'schedules':results,'failures':failures,'automatic_promotion':False,'history_complete':False}
    (OUT/'extracted.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'schedules':len(results),'rows':sum(len(r['rows']) for r in results),'failures':len(failures)}))


if __name__=='__main__':
    main()
