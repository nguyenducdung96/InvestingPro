"""Compile SWC Long Binh direct published plans from reviewed Dong Nai archives.

Does not write PDN data. Shifting resources are deliberately outside this edition.
"""
import argparse,base64,collections,datetime as dt,gzip,hashlib,importlib.util,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];MODULE=ROOT/'packages/modules/port/src'
spec=importlib.util.spec_from_file_location('dongnai',ROOT/'scripts/export-pdn-plans.py')
dn=importlib.util.module_from_spec(spec);spec.loader.exec_module(dn)
TERMINALS={'K0005':('swc_long_binh','Cảng thủy nội địa Long Bình')}

# Harbour code and exact terminal name identify SWC, never PDN or the oil terminal.
# Reviewed source berth aliases; unexpected pairs are quarantined, not silently accepted.
BERTHS={'K0013':'Cầu cảng số 1','K0015':'Cầu cảng số 2','K0016':'Cầu cảng số 3',
        '70382':'Cầu số 1','70383':'Cầu số 2','55121':'Cầu cảng số 3',
        '70287':'Cầu cảng số 1','55124':'Cầu cảng số 3','55122':'Cầu cảng số 1'}
def review_berths(rows):
 accepted=[];quarantine=[]
 for r in rows:
  label=r['to'] if r['kind']=='arrival' else r['from']
  parts=[dn.norm(x) for x in label.split(',')]
  if (r['wharf_code'] not in BERTHS or parts[-1]!=BERTHS[r['wharf_code']]
      or 'SÔNG ĐỒNG NAI' not in label):
   quarantine.append({**r,'reason':'unreviewed_berth_or_waterway'})
  else:accepted.append(r)
 return accepted,quarantine

def check_event_retention(previous,current):
 # A blank board on a cold runner must not erase an already reviewed movement.
 # Corrections to weights remain possible; removals or route changes need review.
 key=lambda r:(r['day'],r['direction'],r['time'],r['vessel'].casefold(),r['from'],r['to'])
 if not {key(r) for r in previous}<={key(r) for r in current}:raise ValueError('Unexpected missing previously published movement')

def compile_day(day,rawdir):
 events=[];proof=[];quarantine=[]
 for direction in ['arrival','departure']:
  path=rawdir/f'{day}-{direction}.json.gz'
  e=json.loads(gzip.decompress(path.read_bytes()))
  if e['day']!=day or e['direction']!=direction:raise ValueError('Wrong archive day/section')
  expected_date=dt.date.fromisoformat(day).strftime('%d/%m/%Y')
  field='timeOfArrival' if direction=='arrival' else 'timeOfDeparture'
  if e['parameters'].get(field)!=expected_date or e['parameters'].get('maritimeCode')!=11 or e['parameters'].get('shipBoat')!='SHIP':raise ValueError('Wrong source filter')
  parsed,bad=dn.parse(e,TERMINALS,require_route=False)
  parsed,excluded=review_berths(parsed)
  quarantine.extend(excluded)
  if bad:raise ValueError('Unmapped Long Binh terminal label')
  proof.append({'section':direction,'sha256':e['sha256'],'checked_at':e['checked_at'],'source_rows':len(e['response']['data'])})
  unique={}
  for r in parsed:
   key=(r['time'],r['vessel'].upper(),r['from'],r['to'])
   if key in unique:
    if unique[key]['dwt'] is not None and r['dwt'] is not None and unique[key]['dwt']!=r['dwt']:raise ValueError('Conflicting source weights')
    proof[-1].setdefault('deduplicated',[]).append({'retained':r['source_id'] if unique[key]['dwt'] is None else unique[key]['source_id'],'ids':[unique[key]['source_id'],r['source_id']]})
    if unique[key]['dwt'] is None:unique[key]=r
    continue
   unique[key]=r
  for r in unique.values():
   events.append({'asset':'swc_long_binh','day':day,'direction':direction,'vessel':r['vessel'],'time':r['time'],'dwt':r['dwt'],'from':r['from'] or None,'to':r['to'] or None,'raw':[],'sha256':r['sha256'],'checked_at':r['checked_at'],'source_url':dn.SOURCE,'source_id':r['source_id'],'harbour_code':r['harbour_code'],'wharf_code':r['wharf_code'],'raw_time':r['raw_time'],'raw_dwt':r['raw_dwt']})
 values={}
 for direction in ['arrival','departure']:
  rows=[r for r in events if r['direction']==direction];weights=[r['dwt'] for r in rows if r['dwt'] is not None]
  values[direction]=[len(rows),sum(weights) if weights else None,len(rows)-len(weights)]
 checked=max(p['checked_at'] for p in proof)
 daily={'day':day,'sha256':hashlib.sha256(''.join(p['sha256'] for p in proof).encode()).hexdigest(),'checked_at':checked,'last_attempt':checked,'error':None,'assets':{'swc_long_binh':values} if events else {},'rejected':0,'internal':0}
 daily['rejected']=len(quarantine)
 return daily,events,proof,quarantine

def main():
 # A standalone Long Binh edition never changes PDN's publication or cutoff.
 cutoff=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()-dt.timedelta(days=1)
 parser=argparse.ArgumentParser();parser.add_argument('--through',default=str(cutoff));parser.add_argument('--raw-dir',type=Path,default=ROOT/'.local/pdn/raw');parser.add_argument('--recent-only',action='store_true');options=parser.parse_args()
 start=dt.date(2025,1,1);end=dt.date.fromisoformat(options.through)
 if not start<=end<=cutoff:raise ValueError('Invalid elapsed history window')
 previous_path=ROOT/'docs/catalog-review/swc-longbinh-history-ledger.json'
 previous=json.loads(previous_path.read_text(encoding='utf8')) if previous_path.exists() else None
 preserved_days={};preserved_sources={};preserved_months={}
 if options.recent_only:
  if not previous or previous['metadata']['source_url']!=dn.SOURCE or previous['metadata']['parser_version']!='swc-longbinh-direct-plan/1.0.0':raise ValueError('Missing reviewed historical edition')
  preserved_days={d['day']:d for d in dn.published_json(MODULE/'swc-longbinh-history-data.ts','export const swcLongbinhDaily:SouthDay[]=')}
  preserved_sources={d['day']:d['responses'] for d in previous['sources']}
 daily=[];events=[];sources=[];quarantined=[]
 for n in range((end-start).days+1):
  day=str(start+dt.timedelta(days=n))
  if options.recent_only and day<str(end-dt.timedelta(days=6)) and day<=previous['metadata']['through']:
   if day not in preserved_days or day not in preserved_sources:raise ValueError('Missing preserved day')
   d=preserved_days[day];proof=preserved_sources[day];month=day[:7]
   if {p['section'] for p in proof}!={'arrival','departure'} or len(proof)!=2:raise ValueError('Missing historical source proof')
   if hashlib.sha256(''.join(p['sha256'] for p in proof).encode()).hexdigest()!=d['sha256']:raise ValueError('Preserved daily checksum mismatch')
   if month not in preserved_months:
    path=MODULE/'swc-longbinh-journal-data'/f'{month}.ts'
    preserved_months[month]=json.loads(gzip.decompress(base64.b64decode(json.loads(path.read_text(encoding='utf8').split('export const southJournalGzip=',1)[1].rsplit(';',1)[0]),validate=True))) if path.exists() else []
   rows=[r for r in preserved_months[month] if r['day']==day]
   for r in rows:
    if (r['asset']!='swc_long_binh' or r['harbour_code']!='K0005' or r['wharf_code'] not in BERTHS
        or r['direction'] not in ['arrival','departure'] or not r['time'].startswith(day+'T')
        or r['source_url']!=dn.SOURCE or (r['dwt'] is not None and dn.weight(r['dwt']) is None)
        or not any(p['section']==r['direction'] and p['sha256']==r['sha256'] for p in proof)):raise ValueError('Invalid preserved event')
   for direction in ['arrival','departure']:
    selected=[r for r in rows if r['direction']==direction];weights=[r['dwt'] for r in selected if r['dwt'] is not None]
    expected=[len(selected),sum(weights) if weights else None,len(selected)-len(weights)]
    if d['assets'].get('swc_long_binh',{}).get(direction,[0,None,0])!=expected:raise ValueError('Preserved daily aggregate mismatch')
   rejected=[r for r in previous.get('quarantine',[]) if r['day']==day]
  else:d,rows,proof,rejected=compile_day(day,options.raw_dir)
  daily.append(d);events.extend(rows);quarantined.extend(rejected);sources.append({'day':day,'responses':proof})
 ids=collections.defaultdict(set)
 for e in events:ids[(e['direction'],e['source_id'])].add(e['day'])
 if any(len(v)>1 for v in ids.values()):raise ValueError('Native ID appears on different days')
 if previous:
  old_events=[]
  for month in previous['monthly']:
   path=MODULE/'swc-longbinh-journal-data'/f'{month}.ts'
   if path.exists():old_events.extend(json.loads(gzip.decompress(base64.b64decode(json.loads(path.read_text(encoding='utf8').split('export const southJournalGzip=',1)[1].rsplit(';',1)[0]),validate=True))))
   elif any(v['rows'] for v in previous['monthly'][month]['swc_long_binh'].values()):raise ValueError('Missing published journal')
  check_event_retention(old_events,events)
 monthly={};grouped=collections.defaultdict(list)
 for e in events:
  month=e['day'][:7];grouped[month].append(e)
  v=monthly.setdefault(month,{}).setdefault('swc_long_binh',{}).setdefault(e['direction'],{'rows':0,'dwt':None,'missing_dwt':0})
  v['rows']+=1
  if e['dwt'] is None:v['missing_dwt']+=1
  else:v['dwt']=(v['dwt'] or 0)+e['dwt']
 for d in daily:
  for direction in ['arrival','departure']:
   monthly.setdefault(d['day'][:7],{}).setdefault('swc_long_binh',{}).setdefault(direction,{'rows':None,'dwt':None,'missing_dwt':0})
 ledgerpath=ROOT/'docs/catalog-review/swc-longbinh-history-ledger.json'
 if ledgerpath.exists():
  old=json.loads(ledgerpath.read_text(encoding='utf8'))
  for month,assets in old['monthly'].items():
   for direction,value in assets['swc_long_binh'].items():
    if (monthly.get(month,{}).get('swc_long_binh',{}).get(direction,{}).get('rows') or 0)<(value['rows'] or 0)*.95:raise ValueError('Unexpected history loss')
 metadata={'parser_version':'swc-longbinh-direct-plan/1.0.0','source_url':dn.SOURCE,'from':str(start),'through':str(end),'checked_at':max(d['checked_at'] for d in daily),'requested_days':len(daily),'responses':len(sources)*2,'events':len(events),'first_observation':min((e['day'] for e in events),default=None),'last_observation':max((e['day'] for e in events),default=None),'source_errors':[],'semantics':'authority_published_plan','movement_scope':'berth','included_resources':['arrival','departure'],'shifting_included':False,'actual_verified':False,'full_scope_certified':False}
 metadata['last_observation_by_direction']={direction:max((e['day'] for e in events if e['direction']==direction),default=None) for direction in ['arrival','departure']}
 metadata['coverage_status']='partial'
 metadata['absence_means_zero']=False
 metadata['quarantined_rows']=len(quarantined)
 metadata['scheduled_refresh_verified']=False
 compact=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'))
 target=MODULE/'swc-longbinh-journal-data';target.mkdir(exist_ok=True)
 for month,rows in grouped.items():
  raw=compact(rows).encode();encoded=base64.b64encode(gzip.compress(raw,mtime=0)).decode()
  if gzip.decompress(base64.b64decode(encoded))!=raw:raise ValueError('Journal codec mismatch')
  (target/f'{month}.ts').write_text('export const southJournalGzip='+json.dumps(encoded)+';\n',encoding='utf8')
 (MODULE/'swc-longbinh-history-data.ts').write_text("import type {SouthDay} from './south-plans';\nexport const swcLongbinhMetadata="+compact(metadata)+";\nexport const swcLongbinhDaily:SouthDay[]="+compact(daily)+';\n',encoding='utf8')
 (MODULE/'swc-longbinh-journal-loader.ts').write_text("import type {SouthEvent} from './south-plans';\nimport {decodeSouthJournal} from './south-journal-codec';\nexport async function loadSwcLongbinhJournal(month:string):Promise<SouthEvent[]>{switch(month){\n"+'\n'.join(f"case '{m}':return decodeSouthJournal((await import('./swc-longbinh-journal-data/{m}')).southJournalGzip);" for m in sorted(grouped))+"\ndefault:return [];}}\n",encoding='utf8')
 ledgerpath.write_text(json.dumps({'metadata':metadata,'monthly':monthly,'sources':sources,'quarantine':quarantined},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(json.dumps(metadata,ensure_ascii=False))
if __name__=='__main__':main()
