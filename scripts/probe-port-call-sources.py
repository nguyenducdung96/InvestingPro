"""Bounded, read-only source inspection. Never sends credentials or calls paid APIs."""
import concurrent.futures
import datetime
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.local' / 'port-call-source-review'

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.hidden = 0; self.text = []; self.frames = []; self.links = []; self.tables = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('script','style'): self.hidden += 1
        if tag == 'table': self.tables += 1
        if tag == 'iframe' and attrs.get('src'): self.frames.append(attrs['src'])
        if tag == 'a' and attrs.get('href'): self.links.append(attrs['href'])
    def handle_endtag(self, tag):
        if tag in ('script','style'): self.hidden = max(0,self.hidden-1)
    def handle_data(self, value):
        if not self.hidden: self.text.append(value)

def inspect(source):
    target = OUT / (source['id']+'.raw')
    args = ['curl.exe','--silent','--show-error','--location','--max-redirs','3','--max-time','25','--max-filesize','8000000',
            '--write-out','%{http_code}\n%{content_type}\n%{url_effective}',source['url'],'-o',str(target)]
    result = subprocess.run(args,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=35)
    meta = result.stdout.splitlines()
    record = {'id':source['id'],'url':source['url'],'curl_exit':result.returncode,'http_status':meta[0] if meta else None,
              'content_type':meta[1] if len(meta)>1 else None,'final_url':meta[2] if len(meta)>2 else None}
    if result.returncode:
        record['error'] = result.stderr.strip()[:240]
    if target.exists():
        raw = target.read_bytes(); record.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
        if 'html' in str(record['content_type']):
            page = Page(); page.feed(raw.decode('utf-8-sig',errors='replace'))
            text = ' '.join(' '.join(page.text).split())
            record.update(html_tables=page.tables,iframes=page.frames,
                data_links=[u for u in page.links if re.search(r'\.pdf|\.xls|vtttc|vitritau|ship_|schedule|detail|khai-thac',u,re.I)][:25],
                dates_seen=sorted(set(re.findall(r'\b\d{1,2}/\d{1,2}/20\d{2}\b',text)))[:30],
                content_signals={k:k.casefold() in text.casefold() for k in ['DWT','IMO','ATA','ATD','ETA','ETD','ETB','ERROR','Đăng nhập']})
            (OUT/(source['id']+'.visible.txt')).write_text(text,encoding='utf-8')
    return record

def main():
    manifest = json.loads((ROOT/'docs/catalog-review/port-call-sources-20261017.json').read_text(encoding='utf-8'))
    OUT.mkdir(parents=True,exist_ok=True)
    # Fetch only the explicitly reviewed public website URLs, not API services.
    sources=[s for s in manifest['sources'] if s['kind'] in ('authority','operator')]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        records=list(pool.map(inspect,sources))
    result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'records':records}
    (OUT/'probe.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    for r in records: print(json.dumps({k:r.get(k) for k in ('id','http_status','curl_exit','html_tables','iframes')},ensure_ascii=True))

if __name__ == '__main__': main()
