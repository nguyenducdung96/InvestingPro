"""Public HCM authority schedule history via the same date form as the website.

The form's requested date, selected date and visible heading must agree. Port
arrival/departure sections are separate from internal movements and snapshots.
"""
import argparse
import concurrent.futures
import datetime as dt
import gzip
import hashlib
from html.parser import HTMLParser
import json
import math
import os
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.local/south-plans'
URL='https://cangvuhanghaitphcm.gov.vn/index.aspx?page=shipschedule&cat=3146'
VERSION='hcm-authority-schedule/1.0.0'
HEADERS={
 'arrival':['STT','Tên tàu','Quốc tịch','Hô hiệu','DWT','Chiều dài','Mớn nước','Loại hàng hóa','Vị trí neo đậu','Dự kiến đến VT','Thời gian rời VT','Tàu lai','Đại lý','Tuyến luồng'],
 'departure':['STT','Tên tàu','Quốc tịch','Hô hiệu','DWT','Chiều dài','Mớn nước','Loại hàng hóa','Vị trí neo đậu','Dự kiến rời SG','Tàu lai','Đại lý','Tuyến luồng'],
 'internal':['STT','Tên tàu','Quốc tịch','Hô hiệu','DWT','Chiều dài','Mớn nước','Loại hàng hóa','Vị trí neo đậu Từ','Vị trí neo đậu Đến','Giờ dời','Tàu lai','Đại lý','Tuyến luồng'],
}
TABLES={'ctl22_GridView_TauDen':'arrival','ctl22_GridView_TauRoi':'departure','ctl22_GridView_TauDiChuyen':'internal'}

class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.fields={};self.tables={};self.stack=[];self.rows=[];self.text=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='input' and a.get('name'):self.fields[a['name']]=a.get('value','')
  if tag=='table':self.stack.append(a.get('id'))
  if self.stack and self.stack[-1] in TABLES:
   if tag=='tr':self.rows.append([])
   if tag in ('td','th') and self.rows:self.rows[-1].append('')
 def handle_data(self,data):
  self.text.append(data)
  if self.stack and self.stack[-1] in TABLES and self.rows and self.rows[-1]:self.rows[-1][-1]+=data
 def handle_endtag(self,tag):
  if tag=='table' and self.stack:
   name=self.stack.pop()
   if name in TABLES:
    if TABLES[name] in self.tables:raise ValueError('Duplicate movement table')
    self.tables[TABLES[name]]=[[' '.join(c.split()) for c in row] for row in self.rows];self.rows=[]

def parse(raw,day):
 page=Page();page.feed(raw.decode('utf-8-sig'))
 wanted=dt.date.fromisoformat(day)
 if page.fields.get('ctl22$txtDate')!=day or ('Kế hoạch điều động tàu ngày '+wanted.strftime('%d/%m/%Y')) not in ' '.join(page.text):
  raise ValueError('Requested date and source heading/selected date disagree')
 if set(page.tables)!=set(HEADERS):raise ValueError('Missing movement section')
 events=[];rejected=[];labels=set();counts={}
 for kind,rows in page.tables.items():
  if not rows or rows[0]!=HEADERS[kind]:raise ValueError('Schedule header changed: '+kind)
  counts[kind]=len(rows)-1
  for row in rows[1:]:
   if len(row)!=len(HEADERS[kind]) or not row[0].isdigit():raise ValueError('Schedule row schema changed')
   labels.add(row[8]);
   if kind=='internal':labels.add(row[9])
   weight=row[4];dwt=float(weight) if re.fullmatch(r'\d+(?:\.\d+)?',weight) and math.isfinite(float(weight)) and float(weight)>0 else None
   vessel=row[1].removeprefix('*').strip()
   if not vessel:
    rejected.append({'kind':kind,'raw':row,'reason':'Missing vessel name'});continue
   # Unknown or compound time stays in quarantine, not midnight or fetch time.
   clock=row[10] if kind=='internal' else row[9]
   try:
    if not re.fullmatch(r'\d{2}:\d{2}',clock):raise ValueError('Unrecognized schedule time')
    dt.time.fromisoformat(clock)
   except ValueError:
    rejected.append({'kind':kind,'raw':row,'reason':'Invalid source time'});continue
   events.append({'section':kind,'vessel':vessel,'call_sign':row[3] or None,'time':clock,'dwt':dwt,'from':row[8] if kind!='arrival' else None,'to':row[9] if kind=='internal' else row[8] if kind=='arrival' else None,'raw':row})
 return {'day':day,'events':events,'rejected':rejected,'section_rows':counts,'labels':sorted(labels)}

def request(data=None):
 req=urllib.request.Request(URL,data=data,headers={'User-Agent':'InvestingPro public source research','Content-Type':'application/x-www-form-urlencoded'} if data else {'User-Agent':'InvestingPro public source research'})
 with urllib.request.urlopen(req,timeout=35) as response:
  if response.geturl()!=URL:raise ValueError('Unexpected authority redirect')
  raw=response.read(4_000_001)
  if len(raw)>4_000_000:raise ValueError('Authority response too large')
  return raw

def initial_request():
 for attempt in range(3):
  try:return request()
  except (OSError,ValueError):
   if attempt==2:raise
   time.sleep(attempt+1)

def write_run(out,run):
 (out/'last-run.json').write_text(json.dumps(run,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 if os.environ.get('GITHUB_OUTPUT'):
  with open(os.environ['GITHUB_OUTPUT'],'a',encoding='utf-8') as stream:stream.write('exportable='+str(run['exportable']).lower()+'\n')

def post_fields(raw,day):
 p=Page();p.feed(raw.decode('utf-8-sig'))
 fields={k:v for k,v in p.fields.items() if k.startswith('__') or k.startswith('ctl22_txtDate')}
 y,m,d=map(int,day.split('-'));display=f'{d:02}/{m:02}/{y}'
 fields.update({'__EVENTTARGET':'','__EVENTARGUMENT':'','ctl22$txtDate':day,'ctl22$txtDate$dateInput':display,'ctl22$btnSearch':'Tìm kiếm','ctl22_txtDate_dateInput_ClientState':json.dumps({'enabled':True,'emptyMessage':'','validationText':day+'-00-00-00','valueAsString':day+'-00-00-00','lastSetTextBoxValue':display}),'ctl22_txtDate_calendar_SD':'[]','ctl22_txtDate_calendar_AD':json.dumps([[1980,1,1],[2099,12,30],[y,m,d]])})
 return urllib.parse.urlencode(fields).encode()

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--from',dest='start',default='2025-01-01');parser.add_argument('--through');parser.add_argument('--workers',type=int,default=3);parser.add_argument('--refresh-recent',type=int,default=4);args=parser.parse_args()
 cutoff=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()-dt.timedelta(days=1)
 end=dt.date.fromisoformat(args.through) if args.through else cutoff;start=dt.date.fromisoformat(args.start)
 if start>end or end>cutoff or args.workers<1 or args.workers>3:raise ValueError('Invalid elapsed history window')
 rawdir=OUT/'archive';parsed=OUT/'parsed';rawdir.mkdir(parents=True,exist_ok=True);parsed.mkdir(exist_ok=True)
 dates=[(start+dt.timedelta(days=n)).isoformat() for n in range((end-start).days+1)]
 try:base=initial_request()
 except (OSError,ValueError) as exc:
  run={'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'stage':'bootstrap','status':'failed','exportable':False,'requested_days':len(dates),'error':str(exc),'source_url':URL}
  write_run(OUT,run);print(json.dumps(run),flush=True);raise SystemExit(1)
 def collect(day):
  path=parsed/(day+'.json')
  if path.exists() and dt.date.fromisoformat(day)<end-dt.timedelta(days=args.refresh_recent):
   old=json.loads(path.read_text(encoding='utf-8'))
   if not old.get('source_error') and old.get('parser_version')==VERSION:
    stored=rawdir/(old['sha256']+'.html.gz')
    if stored.exists() and hashlib.sha256(gzip.decompress(stored.read_bytes())).hexdigest()==old['sha256']:return old
  checked=dt.datetime.now(dt.timezone.utc).isoformat()
  for attempt in range(3):
   try:
    raw=request(post_fields(base,day));data=parse(raw,day);sha=hashlib.sha256(raw).hexdigest()
    (rawdir/(sha+'.html.gz')).write_bytes(gzip.compress(raw,mtime=0))
    result={**data,'sha256':sha,'checked_at':checked,'last_attempt':checked,'source_error':None,'parser_version':VERSION,'source_url':URL,'method':'POST'}
    path.write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8');return result
   except (OSError,ValueError) as exc:
    if attempt<2:time.sleep(attempt+1)
    else:
     old=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'day':day,'events':[],'rejected':[],'labels':[],'section_rows':{},'sha256':None,'checked_at':None,'parser_version':VERSION,'source_url':URL}
     old.update(last_attempt=checked,source_error=str(exc));path.write_text(json.dumps(old,ensure_ascii=False),encoding='utf-8');return old
 print(json.dumps({'requested_days':len(dates),'from':str(start),'through':str(end)}),flush=True)
 results=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
  for n,data in enumerate(pool.map(collect,dates),1):
   results.append(data)
   if n%60==0:print(json.dumps({'processed':n,'errors':sum(bool(d.get('source_error')) for d in results)}),flush=True)
 receipt={'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'requested_days':len(dates),'errors':[{'day':d['day'],'error':d['source_error']} for d in results if d.get('source_error')],'labels':sorted(set(label for d in results for label in d['labels']))}
 (OUT/'receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
 write_run(OUT,{'checked_at':receipt['checked_at'],'stage':'collection','status':'failed' if receipt['errors'] else 'success','exportable':True,'requested_days':len(dates),'parsed_days':sum(bool(d.get('sha256')) for d in results),'error_days':len(receipt['errors']),'source_url':URL})
 print(json.dumps({'parsed':len(results),'errors':len(receipt['errors'])}),flush=True)
 if receipt['errors']:raise SystemExit(1)

if __name__=='__main__':main()
