"""Anonymous read-only daily Dong Nai published plans; never persist Liferay session URLs."""
import argparse, concurrent.futures as cf, datetime as dt, gzip, hashlib, json, time, urllib.parse as p, urllib.request as u
from pathlib import Path
BASE='http://123.25.204.166/web/guest/public-kh'
SOURCE=BASE+'#/tra-cuu/ke_hoach/0/0/KeHoachDieuDongTau2'
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.local/pdn'
def read(url):
 with u.urlopen(u.Request(url,headers={'User-Agent':'InvestingPro public source research'}),timeout=45) as r:
  if r.geturl().split('?')[0].split(';')[0] not in [BASE,'http://123.25.204.166/public-kh']:raise ValueError('Unexpected redirect')
  b=r.read(8_000_001)
  if len(b)>8_000_000:raise ValueError('Response too large')
  return b

def bootstrap():
 q=dict(p_p_id='vma_WAR_TichHopGiaoThongportlet',p_p_lifecycle=2,p_p_state='normal',p_p_mode='view',p_p_cacheability='cacheLevelPage',p_p_col_id='column-1',p_p_col_count=1,p_p_resource_id='getURLInit')
 m=json.loads(read(BASE+'?'+p.urlencode(q)))
 def target(key):
  url=m[key];expected={'getDmGtReportCategoriesURL':'getDmGtReportCategories','getVmaItinerarySchedule_Come_URL':'vma_itinerary_schedule_come','getVmaItinerarySchedule_Leave_URL':'vma_itinerary_schedule_leave','getVmaScheduleShiftingURL':'vma_schedule_shifting'}[key];a=p.urlsplit(url);qs=p.parse_qs(a.query)
  if a.scheme!='http' or a.netloc!='123.25.204.166' or a.path.split(';')[0] not in ['/web/guest/public-kh','/public-kh'] or qs.get('p_p_id')!=['vma_WAR_TichHopGiaoThongportlet'] or qs.get('p_p_lifecycle')!=['2'] or qs.get('p_p_resource_id')!=[expected]:raise ValueError('Unexpected public resource')
  return url
 categories=json.loads(read(target('getDmGtReportCategoriesURL')+'&'+p.urlencode(dict(isDelete=0,start=-1,end=-1))))
 if categories['data'][0]['category']!='11':raise ValueError('Wrong authority')
 return {d:target(k) for d,k in [('arrival','getVmaItinerarySchedule_Come_URL'),('departure','getVmaItinerarySchedule_Leave_URL'),('movement','getVmaScheduleShiftingURL')]}

def collect(day,direction,urls,refresh=False):
 path=OUT/'raw'/f'{day}-{direction}.json.gz'
 if path.exists() and not refresh:return 'cached'
 args=dict(start=-1,end=-1,maritimeCode=11,shipBoat='SHIP',noticeShipType=1 if direction=='arrival' else 2)
 args['markedAsArrival' if direction=='arrival' else 'markedAsDeparture']='3,4,5,7,8,9'
 args['timeOfArrival' if direction=='arrival' else 'timeOfDeparture']=dt.date.fromisoformat(day).strftime('%d/%m/%Y')
 if direction=='movement':args=dict(start=-1,end=-1,maritimeCode=11,requestState=4,noticeShipType=4,shiftingDate=dt.date.fromisoformat(day).strftime('%d/%m/%Y'))
 for attempt in range(3):
  try:
   raw=read(urls[direction]+'&'+p.urlencode(args));v=json.loads(raw)
   if not isinstance(v.get('data'),list) or v.get('total')!=len(v['data']):raise ValueError('Incomplete page')
   field='shiftingDate' if direction=='movement' else 'timeOfArrival' if direction=='arrival' else 'timeOfDeparture'
   for row in v['data']:
    if not row.get(field,'').startswith(args[field]+' '):raise ValueError('Date filter mismatch')
   previous=json.loads(gzip.decompress(path.read_bytes())) if path.exists() else None
   if previous and len(v['data'])<len(previous['response']['data'])*.95:raise ValueError('Unexpected row loss; keeping last good')
   envelope=dict(day=day,direction=direction,source_url=SOURCE,parameters=args,sha256=hashlib.sha256(raw).hexdigest(),checked_at=dt.datetime.now(dt.timezone.utc).isoformat(),response=v)
   path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix('.tmp');tmp.write_bytes(gzip.compress(json.dumps(envelope,ensure_ascii=False).encode()));tmp.replace(path)
   return 'ok'
  except Exception:
   if attempt==2:return 'failed'
   time.sleep(attempt+1)

def main():
 a=argparse.ArgumentParser();a.add_argument('--from',dest='start',default='2025-01-01');a.add_argument('--to',dest='end',default=str(dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()-dt.timedelta(days=1)));a.add_argument('--refresh-days',type=int,default=7);a.add_argument('--directions',default='arrival,departure,movement');o=a.parse_args()
 urls=bootstrap();start=dt.date.fromisoformat(o.start);end=dt.date.fromisoformat(o.end);tasks=[(str(start+dt.timedelta(days=i)),d) for i in range((end-start).days+1) for d in o.directions.split(',')]
 counts={}
 with cf.ThreadPoolExecutor(max_workers=3) as pool:
  futures=[pool.submit(collect,day,d,urls,day>=str(end-dt.timedelta(days=o.refresh_days-1))) for day,d in tasks]
  for i,f in enumerate(cf.as_completed(futures),1):
   r=f.result();counts[r]=counts.get(r,0)+1
   if i%100==0:print(i,len(tasks),counts,flush=True)
 print(counts,flush=True)
 if counts.get('failed'):raise SystemExit(1)
if __name__=='__main__':main()
