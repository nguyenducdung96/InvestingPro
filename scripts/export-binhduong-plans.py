"""Compile GMD Binh Duong direct published plans from reviewed Dong Nai archives.

Does not write PDN data. Shifting resources are deliberately outside this edition.
"""
import argparse,base64,collections,datetime as dt,gzip,hashlib,importlib.util,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];MODULE=ROOT/'packages/modules/port/src'
spec=importlib.util.spec_from_file_location('dongnai',ROOT/'scripts/export-pdn-plans.py')
dn=importlib.util.module_from_spec(spec);spec.loader.exec_module(dn)
TERMINALS={'BC198':('gmd_binh_duong','Cảng Bình Dương')}

def compile_day(day,rawdir):
 events=[];proof=[]
 for direction in ['arrival','departure']:
  path=rawdir/f'{day}-{direction}.json.gz'
  e=json.loads(gzip.decompress(path.read_bytes()))
  if e['day']!=day or e['direction']!=direction:raise ValueError('Wrong archive day/section')
  expected_date=dt.date.fromisoformat(day).strftime('%d/%m/%Y')
  field='timeOfArrival' if direction=='arrival' else 'timeOfDeparture'
  if e['parameters'].get(field)!=expected_date or e['parameters'].get('maritimeCode')!=11 or e['parameters'].get('shipBoat')!='SHIP':raise ValueError('Wrong source filter')
  parsed,bad=dn.parse(e,TERMINALS,require_route=False)
  if bad:raise ValueError('Unmapped Binh Duong terminal label')
  proof.append({'section':direction,'sha256':e['sha256'],'checked_at':e['checked_at'],'source_rows':len(e['response']['data'])})
  unique={}
  for r in parsed:
   key=(r['time'],r['vessel'].upper(),r['from'],r['to'])
   if key in unique:
    if unique[key]['dwt']!=r['dwt']:raise ValueError('Conflicting source weights')
    continue
   unique[key]=r
  for r in unique.values():
   events.append({'asset':'gmd_binh_duong','day':day,'direction':direction,'vessel':r['vessel'],'time':r['time'],'dwt':r['dwt'],'from':r['from'] or None,'to':r['to'] or None,'raw':[],'sha256':r['sha256'],'checked_at':r['checked_at'],'source_url':dn.SOURCE,'source_id':r['source_id'],'harbour_code':r['harbour_code'],'wharf_code':r['wharf_code'],'raw_time':r['raw_time'],'raw_dwt':r['raw_dwt']})
 values={}
 for direction in ['arrival','departure']:
  rows=[r for r in events if r['direction']==direction];weights=[r['dwt'] for r in rows if r['dwt'] is not None]
  values[direction]=[len(rows),sum(weights) if weights else None,len(rows)-len(weights)]
 checked=max(p['checked_at'] for p in proof)
 daily={'day':day,'sha256':hashlib.sha256(''.join(p['sha256'] for p in proof).encode()).hexdigest(),'checked_at':checked,'last_attempt':checked,'error':None,'assets':{'gmd_binh_duong':values} if events else {},'rejected':0,'internal':0}
 return daily,events,proof

def main():
 # A standalone Binh Duong edition never changes PDN's publication or cutoff.
 cutoff=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()-dt.timedelta(days=1)
 parser=argparse.ArgumentParser();parser.add_argument('--through',default=str(cutoff));options=parser.parse_args()
 start=dt.date(2025,1,1);end=dt.date.fromisoformat(options.through)
 if not start<=end<=cutoff:raise ValueError('Invalid elapsed history window')
 daily=[];events=[];sources=[]
 for n in range((end-start).days+1):
  day=str(start+dt.timedelta(days=n));d,rows,proof=compile_day(day,ROOT/'.local/pdn/raw')
  daily.append(d);events.extend(rows);sources.append({'day':day,'responses':proof})
 ids=collections.defaultdict(set)
 for e in events:ids[(e['direction'],e['source_id'])].add(e['day'])
 if any(len(v)>1 for v in ids.values()):raise ValueError('Native ID appears on different days')
 monthly={};grouped=collections.defaultdict(list)
 for e in events:
  month=e['day'][:7];grouped[month].append(e)
  v=monthly.setdefault(month,{}).setdefault('gmd_binh_duong',{}).setdefault(e['direction'],{'rows':0,'dwt':None,'missing_dwt':0})
  v['rows']+=1
  if e['dwt'] is None:v['missing_dwt']+=1
  else:v['dwt']=(v['dwt'] or 0)+e['dwt']
 ledgerpath=ROOT/'docs/catalog-review/binhduong-history-ledger.json'
 if ledgerpath.exists():
  old=json.loads(ledgerpath.read_text(encoding='utf8'))
  for month,assets in old['monthly'].items():
   for direction,value in assets['gmd_binh_duong'].items():
    if monthly.get(month,{}).get('gmd_binh_duong',{}).get(direction,{}).get('rows',0)<value['rows']*.95:raise ValueError('Unexpected history loss')
 metadata={'parser_version':'binhduong-direct-plan/1.0.0','source_url':dn.SOURCE,'from':str(start),'through':str(end),'checked_at':max(d['checked_at'] for d in daily),'requested_days':len(daily),'responses':len(sources)*2,'events':len(events),'first_observation':min((e['day'] for e in events),default=None),'last_observation':max((e['day'] for e in events),default=None),'source_errors':[],'semantics':'authority_published_plan','movement_scope':'berth','included_resources':['arrival','departure'],'shifting_included':False,'actual_verified':False,'full_scope_certified':False}
 compact=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'))
 target=MODULE/'binhduong-journal-data';target.mkdir(exist_ok=True)
 for month,rows in grouped.items():
  raw=compact(rows).encode();encoded=base64.b64encode(gzip.compress(raw,mtime=0)).decode()
  if gzip.decompress(base64.b64decode(encoded))!=raw:raise ValueError('Journal codec mismatch')
  (target/f'{month}.ts').write_text('export const southJournalGzip='+json.dumps(encoded)+';\n',encoding='utf8')
 (MODULE/'binhduong-history-data.ts').write_text("import type {SouthDay} from './south-plans';\nexport const binhduongMetadata="+compact(metadata)+";\nexport const binhduongDaily:SouthDay[]="+compact(daily)+';\n',encoding='utf8')
 (MODULE/'binhduong-journal-loader.ts').write_text("import type {SouthEvent} from './south-plans';\nimport {decodeSouthJournal} from './south-journal-codec';\nexport async function loadBinhduongJournal(month:string):Promise<SouthEvent[]>{switch(month){\n"+'\n'.join(f"case '{m}':return decodeSouthJournal((await import('./binhduong-journal-data/{m}')).southJournalGzip);" for m in sorted(grouped))+"\ndefault:return [];}}\n",encoding='utf8')
 ledgerpath.write_text(json.dumps({'metadata':metadata,'monthly':monthly,'sources':sources},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(json.dumps(metadata,ensure_ascii=False))
if __name__=='__main__':main()
