"""Public ASP.NET date form, reported berth plans; never actual port calls."""
import argparse
import collections
import concurrent.futures
import datetime as dt
import decimal
import gzip
import hashlib
import html
from html.parser import HTMLParser
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'.local/cqn-plans'
BASE='https://kht1.cangvuhanghaiquangninh.gov.vn/'
VERSION='quangninh-berth-plan/1.0.0'
ALIASES=tuple(f'Cầu {n} - Cái Lân' for n in (1,5,6,7))
REGIONAL=['Thời gian TIME','Tên tàu VESSEL','Mớn nước DRAFT','Chiều dài LOA','Trong tải DWT','Dung tích GRT','Hoa tiêu PILOT','Tàu lai TUG','Tuyến luồng ROUTE','Từ FROM','Đến TO','Đại lý AGENT','Ghi chú NOTE']
COMMON=['STT O.N','Tên tàu VESSEL','Quốc tịch Country','Chiều dài LOA','Dung tích GT','Trong tải DWT','Mớn nước DRAFT']
SUFFIX=['Tuyến luồng ROUTE','Hoa tiêu PILOT','Tàu lai TUG','Đại lý AGENT']
HEADERS={'grvTauDen':COMMON+['Thời gian đến TIME','Vị trí đến Position']+SUFFIX,
 'grvTauDoi':COMMON+['Thời gian tàu rời cảng TIME','Vị trí neo đậu Position']+SUFFIX,
 'grvTauDC':COMMON+['Thời gian di chuyển TIME','Vị trí xuất phát FROM','Vị trí neo đâu TO']+SUFFIX}
TITLES={'grvTauDen':'KẾ HOẠCH TÀU ĐẾN CẢNG','grvTauDoi':'KẾ HOẠCH TÀU RỜI CẢNG','grvTauDC':'KẾ HOẠCH TÀU DI CHUYỂN'}

class UnavailableReport(ValueError):pass

def plain(value):
 return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',value))).strip()

class Inputs(HTMLParser):
 def __init__(self,text):
  super().__init__();self.values={};self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='input' and a.get('name'):self.values[a['name']]=a.get('value') or ''

def request(body=None):
 for attempt in range(3):
  try:
   req=urllib.request.Request(BASE,data=body,headers={'Content-Type':'application/x-www-form-urlencoded'} if body else {})
   with urllib.request.urlopen(req,timeout=30) as response:
    if response.geturl()!=BASE:raise ValueError('Unexpected official report destination')
    raw=response.read(2_000_001)
    if len(raw)>2_000_000:raise ValueError('Source report too large')
    return raw
  except OSError:
   if attempt==2:raise
   time.sleep(1+attempt)

def form_body(fields,day):
 f=dict(fields);display=day.strftime('%d-%m-%Y');value=f'{day}-00-00-00'
 f.update({'__EVENTTARGET':'rdptime','__EVENTARGUMENT':'','rdptime':str(day),'rdptime$dateInput':display,
  'rdptime_dateInput_ClientState':json.dumps({'enabled':True,'emptyMessage':'','validationText':value,'valueAsString':value,'minDateStr':'1980-01-01-00-00-00','maxDateStr':'2099-12-30-00-00-00','lastSetTextBoxValue':display})})
 return urllib.parse.urlencode(f).encode()

def number(value):
 if not value.strip():return None
 if not re.fullmatch(r'(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?',value):raise ValueError('Unrecognized source DWT')
 result=decimal.Decimal(value.replace('.','').replace(',','.'))
 if result<=0 or result>2_000_000:raise ValueError('Source DWT outside bounds')
 return str(result)

def table(text,name,header):
 matches=re.findall(r'<table\b[^>]*\bid="'+name+r'"[^>]*>(.*?)</table>',text,re.S|re.I)
 if len(matches)>1:raise ValueError('Duplicate source table')
 if not matches:return []
 rows=[[plain(c) for c in re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>',r,re.S|re.I)] for r in re.findall(r'<tr\b[^>]*>(.*?)</tr>',matches[0],re.S|re.I)]
 rows=[r for r in rows if r]
 if not rows or rows[0]!=header:raise ValueError('Source schema changed: '+name)
 if any(len(r)!=len(header) for r in rows[1:]):raise ValueError('Unexpected source column count: '+name)
 return rows[1:]

def timestamp(value,day):
 if not re.fullmatch(r'\d{2}:\d{2} \d{2}/\d{2}/\d{4}',value):raise ValueError('Invalid source event time')
 parsed=dt.datetime.strptime(value,'%H:%M %d/%m/%Y')
 if parsed.date()!=day:raise ValueError('Source row belongs to another report day')
 return parsed.strftime('%H:%M')

def parse_day(raw,day,fetched_at=None):
 text=raw.decode('utf-8-sig');fields=Inputs(text).values
 if fields.get('rdptime')!=str(day) or fields.get('rdptime$dateInput')!=day.strftime('%d-%m-%Y'):raise ValueError('Source report date mismatch')
 content=plain(text)
 if 'KẾ HOẠCH ĐIỀU ĐỘNG TÀU THUYỀN' not in content or 'QNH - KHU VỰC HÒN GAI' not in content:raise ValueError('Official report sections missing')
 plans={}
 for name,header in HEADERS.items():
  if TITLES[name] not in content:raise ValueError('Source movement section missing')
  rows=table(text,name,header)
  for r in rows:timestamp(r[7],day)
  plans[name]=rows
 if not any(plans.values()):raise UnavailableReport('No source plans; cannot certify an empty report')
 regional=table(text,'GridView_HonGai',REGIONAL)
 index={name:collections.defaultdict(list) for name in plans}
 for name,rows in plans.items():
  for r in rows:index[name][(r[1],r[7])].append(r)
 events=[];seen={};labels=collections.Counter();duplicates=0;kinds=collections.Counter()
 for r in regional:
  planned_time=timestamp(r[0],day);vessel=r[1];origin,destination=r[9:11]
  for label in (origin,destination):
   if 'Cái Lân' in label or 'tạm' in label.lower():labels[label]+=1
  if origin not in ALIASES and destination not in ALIASES:continue
  if not vessel:raise ValueError('Source vessel name missing')
  key=(vessel,r[0]);candidates=[]
  for candidate in index['grvTauDC'].get(key,[]):
   if candidate[8:10]==[origin,destination]:candidates.append(('internal',candidate))
  if origin=='P/S':
   candidates.extend(('arrival',c) for c in index['grvTauDen'].get(key,[]) if c[8]==origin)
  if destination=='P/S':
   candidates.extend(('departure',c) for c in index['grvTauDoi'].get(key,[]) if c[8]==destination)
  # STT, draft, pilot and agent are not part of the counted event identity.
  unique={(kind,number(c[5])) for kind,c in candidates}
  if len(unique)!=1:raise ValueError('Cannot reconcile CQN row with source movement section: '+vessel+' '+r[0])
  kind,candidate_dwt=next(iter(unique));dwt=number(r[4])
  if dwt!=candidate_dwt:raise ValueError('Regional and movement DWT conflict')
  kinds[kind]+=1
  for direction,berth in (('arrival',destination),('departure',origin)):
   if berth not in ALIASES:continue
   event_key=(str(day),direction,vessel,planned_time,origin,destination)
   source_row={'Tên tàu':vessel,'Thời gian':planned_time,'Từ':origin,'Đến':destination}
   event={'key':list(event_key),'direction':direction,'dwt':dwt,'plan_kind':kind,'source_row':source_row}
   if event_key in seen:
    if seen[event_key]!=event:raise ValueError('Conflicting repeated source key')
    duplicates+=1;continue
   seen[event_key]=event;events.append(event)
 groups=collections.Counter((e['direction'],e['source_row']['Tên tàu'],e['source_row']['Từ'],e['source_row']['Đến']) for e in events)
 return {'date':str(day),'status':'parsed','url_at_fetch':BASE,'fetched_at':fetched_at or dt.datetime.now(dt.timezone.utc).isoformat(),'sha256':hashlib.sha256(raw).hexdigest(),
  'source_request':{'method':'POST','event':'rdptime','report_day':str(day)},'source_rows':{k:len(v) for k,v in plans.items()},
  'source_empty_sections':[label for name,label in [('grvTauDen','Vao'),('grvTauDoi','Roi'),('grvTauDC','DiChuyen')] if not plans[name]],
  'semantics':'authority_published_berth_plan','movement_scope':'berth','source_plan_kinds':dict(kinds),'exact_duplicates_removed':duplicates,
  'ambiguous_repeated_route_groups':sum(n>1 for n in groups.values()),'observed_labels':dict(labels),'events':events}

def main():
 p=argparse.ArgumentParser();p.add_argument('--days-file',type=pathlib.Path);args=p.parse_args();raw_dir=OUT/'raw';cache=OUT/'day-cache'
 raw_dir.mkdir(parents=True,exist_ok=True);cache.mkdir(exist_ok=True)
 initial=request();fields=Inputs(initial.decode('utf-8-sig')).values;server_day=dt.date.fromisoformat(fields['rdptime'])
 cutoff=min(server_day,dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date())-dt.timedelta(days=1)
 dates=[dt.date(2025,1,1)+dt.timedelta(days=n) for n in range((cutoff-dt.date(2025,1,1)).days+1)]
 if args.days_file:
  selected=json.loads(args.days_file.read_text(encoding='utf8'))
  if not isinstance(selected,list) or not selected:raise ValueError('Invalid day selection')
  dates=sorted({dt.date.fromisoformat(d) for d in selected})
  if any(d<dt.date(2025,1,1) or d>cutoff for d in dates):raise ValueError('Day outside elapsed source range')
 def collect(day):
  try:
   used=False;fetched_at=None;raw=None
   if day<cutoff-dt.timedelta(days=3) and (cache/f'{day}.json').exists():
    item=json.loads((cache/f'{day}.json').read_text(encoding='utf8'))
    try:
     raw=gzip.decompress((raw_dir/f'{item["sha256"]}.html.gz').read_bytes())
     if hashlib.sha256(raw).hexdigest()!=item['sha256']:raise ValueError('Raw archive hash mismatch')
     parse_day(raw,day,item['fetched_at']);used=True;fetched_at=item['fetched_at']
    except (OSError,ValueError):used=False
   if not used:raw=request(form_body(fields,day))
   archive_sha=hashlib.sha256(raw).hexdigest();(raw_dir/f'{archive_sha}.html.gz').write_bytes(gzip.compress(raw,mtime=0))
   result=parse_day(raw,day,fetched_at);(raw_dir/f'{result["sha256"]}.html.gz').write_bytes(gzip.compress(raw,mtime=0))
   (cache/f'{day}.json').write_text(json.dumps({'date':str(day),'sha256':result['sha256'],'fetched_at':result['fetched_at']}),encoding='utf8')
   return result
  except Exception as e:return {'date':str(day),'status':'unavailable' if isinstance(e,UnavailableReport) else 'failed','url_at_fetch':BASE,'fetched_at':dt.datetime.now(dt.timezone.utc).isoformat(),'sha256':hashlib.sha256(raw).hexdigest() if raw else None,'source_request':{'method':'POST','event':'rdptime','report_day':str(day)},'error':str(e)}
  finally:time.sleep(0.4)
 days=[];print(json.dumps({'requested_days':len(dates),'through':str(cutoff),'semantics':'authority_published_berth_plan'}),flush=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for n,result in enumerate(pool.map(collect,dates),1):
   days.append(result)
   if n%60==0:print(json.dumps({'processed_days':n,'failed':sum(d['status']!='parsed' for d in days)}),flush=True)
 receipt={'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'through':str(cutoff),'parser_version':VERSION,'semantics':'authority_published_berth_plan','movement_scope':'berth','assets':{'cqn_cai_lan':days}}
 (OUT/'receipt.json').write_text(json.dumps(receipt,ensure_ascii=False),encoding='utf8')
 errors=[{'day':d['date'],'error':d['error']} for d in days if d['status']!='parsed'];print(json.dumps({'days':len(days),'events':sum(len(d.get('events',[])) for d in days),'errors':errors},ensure_ascii=True),flush=True)
 if any(d['status']=='failed' for d in days):raise SystemExit(1)

if __name__=='__main__':main()
