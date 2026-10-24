"""Read-only official public CDN schedules, never actual port calls."""
import argparse, math, collections, concurrent.futures, datetime as dt, decimal, gzip, hashlib, json, pathlib, re, time, unicodedata, urllib.parse, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'.local/cdn-plans'
BASE='http://tttb.cangvuhanghaidanang.gov.vn/public-kh'
VERSION='danang-public-plan/1.0.1'
class UnavailableReport(ValueError):pass

def request(url):
 for attempt in range(3):
  try:
   with urllib.request.urlopen(url,timeout=30) as response:
    if urllib.parse.urlsplit(response.geturl()).hostname!='tttb.cangvuhanghaidanang.gov.vn':raise ValueError('Unexpected public destination')
    raw=response.read(3_000_001)
    if len(raw)>3_000_000:raise ValueError('Source response too large')
    return json.loads(raw)
  except OSError:
   if attempt==2:raise
   time.sleep(1+attempt)

def url_params(url,params):
 u=urllib.parse.urlsplit(url)
 if u.scheme!='http' or u.netloc!='tttb.cangvuhanghaidanang.gov.vn' or not re.fullmatch(r'/(?:web/guest/)?public-kh(?:;jsessionid=[A-Za-z0-9._+-]+)?',u.path):raise ValueError('Unexpected public resource: '+u.scheme+' '+str(u.hostname)+' '+u.path.split(';')[0])
 q=urllib.parse.parse_qs(u.query);q.update({k:[str(v)] for k,v in params.items()})
 return urllib.parse.urlunsplit((u.scheme,u.netloc,u.path,urllib.parse.urlencode(q,doseq=True),''))

def initialize():
 params={'p_p_id':'vma_WAR_TichHopGiaoThongportlet','p_p_lifecycle':2,'p_p_state':'normal','p_p_mode':'view','p_p_cacheability':'cacheLevelPage','p_p_resource_id':'getURLInit'}
 meta=request(BASE+'?'+urllib.parse.urlencode(params))
 allowed={'arrival':('getVmaItinerarySchedule_Come_URL','vma_itinerary_schedule_come'),'departure':('getVmaItinerarySchedule_Leave_URL','vma_itinerary_schedule_leave')}
 endpoints={}
 for direction,(key,resource) in allowed.items():
  target=meta[key];u=urllib.parse.urlsplit(url_params(target,{}));actual=urllib.parse.parse_qs(u.query).get('p_p_resource_id',[''])[0]
  if actual!=resource:raise ValueError('Unexpected public schedule resource: '+actual)
  endpoints[direction]=target
 category_url=url_params(meta['getDmGtReportCategoriesURL'],{})
 if urllib.parse.parse_qs(urllib.parse.urlsplit(category_url).query).get('p_p_resource_id')!=['getDmGtReportCategories']:raise ValueError('Unexpected authority category resource')
 cats=request(url_params(category_url,{'isDelete':0,'start':-1,'end':-1}))
 if len(cats.get('data',[]))!=1 or str(cats['data'][0].get('category'))!='18':raise ValueError('Authority category changed')
 return endpoints

def fetch_day(endpoints,day):
 result={'date':str(day),'format':'danang-public-plan-v1'}
 for direction in ['arrival','departure']:
  rows=[];total=None
  for start in range(0,1000,100):
   params={'start':start,'end':start+100,'noticeShipType':1 if direction=='arrival' else 2,'maritimeCode':18,'markedAsArrival' if direction=='arrival' else 'markedAsDeparture':'3,4,5,7,8,9','shipBoat':'SHIP','timeOfArrival' if direction=='arrival' else 'timeOfDeparture':day.strftime('%d/%m/%Y')}
   page=request(url_params(endpoints[direction],params))
   if not isinstance(page.get('total'),int) or not 0<=page['total']<=1000 or not isinstance(page.get('data'),list):raise ValueError('Invalid public schedule page')
   if total is None:total=page['total']
   if total!=page['total'] or len(page['data'])!=min(100,total-start):raise ValueError('Incomplete public schedule pagination')
   rows.extend(page['data'])
   if len(rows)==total:break
  if len(rows)!=total:raise ValueError('Schedule total differs')
  result[direction]={'total':total,'data':rows}
 return json.dumps(result,ensure_ascii=False,separators=(',',':')).encode('utf8')

def parse_day(raw,day,fetched_at=None):
 value=json.loads(raw)
 if value.get('format')!='danang-public-plan-v1' or value.get('date')!=str(day):raise ValueError('Source report date mismatch')
 events=[];seen={};duplicates=0;invalid_dwt=0;source_rows={};labels=collections.Counter()
 for direction in ['arrival','departure']:
  page=value[direction];rows=page['data'];source_rows[direction]=len(rows)
  if page['total']!=len(rows):raise ValueError('Incomplete source rows')
  ids=set()
  for r in rows:
   required=['vmaItineraryScheduleId','nameOfShip','portHarbourCode','anchoringPortWharfName','timeOfArrival' if direction=='arrival' else 'timeOfDeparture','dwt','noticeShipType']
   if any(k not in r for k in required):raise ValueError('Source schema changed')
   identity=str(r['vmaItineraryScheduleId'])
   if not identity.isdigit() or identity in ids:raise ValueError('Duplicate or missing schedule identity')
   ids.add(identity)
   if r['noticeShipType']!=(1 if direction=='arrival' else 2):raise ValueError('Source direction changed')
   parsed=dt.datetime.strptime(r['timeOfArrival' if direction=='arrival' else 'timeOfDeparture'],'%d/%m/%Y %H:%M')
   if parsed.date()!=day:raise UnavailableReport('Source has a row dated outside requested day')
   label=r['anchoringPortWharfName'];code=r['portHarbourCode']
   if code!='BC78':continue
   normalized=''.join(c for c in unicodedata.normalize('NFKD',label) if not unicodedata.combining(c)).lower()
   if 'tien sa' not in normalized:raise ValueError('Tien Sa code/label mismatch')
   labels[label]+=1;vessel=r['nameOfShip']
   if not isinstance(vessel,str) or not 1<=len(vessel.strip())<=200:raise ValueError('Invalid vessel name')
   weight=r['dwt']
   if weight is not None and (not isinstance(weight,(int,float)) or isinstance(weight,bool)):raise ValueError('Source DWT type changed')
   invalid=weight is not None and (not math.isfinite(weight) or not 0<=weight<=1_000_000)
   if invalid:invalid_dwt+=1
   dwt=None if weight is None or weight==0 or invalid else str(decimal.Decimal(str(weight)))
   opposite=r.get('shortInitFrom') or r.get('initFrom')
   if not isinstance(opposite,str) or not opposite.strip():raise ValueError('Missing opposite endpoint')
   origin,destination=(opposite,'TIEN SA') if direction=='arrival' else ('TIEN SA',opposite)
   planned_time=parsed.strftime('%H:%M');key=(str(day),direction,vessel,planned_time,origin,destination)
   event={'key':list(key),'direction':direction,'dwt':dwt,'source_row':{'Tên tàu':vessel,'Thời gian':planned_time,'Từ':origin,'Đến':destination}}
   if key in seen:
    if seen[key]!=event:raise UnavailableReport('Source has conflicting DWT for the same schedule key')
    duplicates+=1;continue
   seen[key]=event;events.append(event)
 if not any(source_rows.values()):raise UnavailableReport('No public source rows; cannot certify zero')
 groups=collections.Counter((e['direction'],e['source_row']['Tên tàu'],e['source_row']['Từ'],e['source_row']['Đến']) for e in events)
 return {'date':str(day),'status':'parsed','url_at_fetch':BASE,'fetched_at':fetched_at or dt.datetime.now(dt.timezone.utc).isoformat(),'sha256':hashlib.sha256(raw).hexdigest(),'source_request':{'method':'GET','resource':'public arrival/departure schedule','report_day':str(day),'maritimeCode':'18','harbourCode':'BC78'},'source_rows':source_rows,'source_empty_sections':[label for direction,label in [('arrival','Vao'),('departure','Roi')] if source_rows[direction]==0],'semantics':'authority_published_plan','movement_scope':'port','exact_duplicates_removed':duplicates,'invalid_source_dwt_kept_null':invalid_dwt,'ambiguous_repeated_route_groups':sum(n>1 for n in groups.values()),'observed_labels':dict(labels),'events':events}

def main():
 p=argparse.ArgumentParser();p.add_argument('--days-file',type=pathlib.Path);p.add_argument('--workers',type=int,choices=[1,2,3,4],default=2);args=p.parse_args();raw_dir=OUT/'raw';cache=OUT/'day-cache'
 raw_dir.mkdir(parents=True,exist_ok=True);cache.mkdir(exist_ok=True)
 fields=initialize();server_day=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()
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
     raw=gzip.decompress((raw_dir/f'{item["sha256"]}.json.gz').read_bytes())
     if hashlib.sha256(raw).hexdigest()!=item['sha256']:raise ValueError('Raw archive hash mismatch')
     parse_day(raw,day,item['fetched_at']);used=True;fetched_at=item['fetched_at']
    except (OSError,ValueError):used=False
   if not used:raw=fetch_day(fields,day)
   archive_sha=hashlib.sha256(raw).hexdigest();(raw_dir/f'{archive_sha}.json.gz').write_bytes(gzip.compress(raw,mtime=0))
   result=parse_day(raw,day,fetched_at);(raw_dir/f'{result["sha256"]}.json.gz').write_bytes(gzip.compress(raw,mtime=0))
   (cache/f'{day}.json').write_text(json.dumps({'date':str(day),'sha256':result['sha256'],'fetched_at':result['fetched_at']}),encoding='utf8')
   return result
  except Exception as e:return {'date':str(day),'status':'unavailable' if isinstance(e,UnavailableReport) else 'failed','url_at_fetch':BASE,'fetched_at':dt.datetime.now(dt.timezone.utc).isoformat(),'sha256':hashlib.sha256(raw).hexdigest() if raw else None,'source_request':{'method':'GET','resource':'public schedule','report_day':str(day)},'error':str(e)}
  finally:time.sleep(0.4)
 days=[];print(json.dumps({'requested_days':len(dates),'through':str(cutoff),'semantics':'authority_published_plan'}),flush=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
  for n,result in enumerate(pool.map(collect,dates),1):
   days.append(result)
   if n%60==0:print(json.dumps({'processed_days':n,'failed':sum(d['status']!='parsed' for d in days)}),flush=True)
 receipt={'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'through':str(cutoff),'parser_version':VERSION,'semantics':'authority_published_plan','movement_scope':'port','assets':{'tien_sa':days}}
 (OUT/'receipt.json').write_text(json.dumps(receipt,ensure_ascii=False),encoding='utf8')
 errors=[{'day':d['date'],'error':d['error']} for d in days if d['status']!='parsed'];print(json.dumps({'days':len(days),'events':sum(len(d.get('events',[])) for d in days),'errors':errors},ensure_ascii=True),flush=True)
 if any(d['status']=='failed' for d in days):raise SystemExit(1)

if __name__=='__main__':main()
