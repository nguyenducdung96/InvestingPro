"""Build a reviewable immutable edition from locally archived authority boards."""
import base64
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('collector',ROOT/'scripts/collect-south-plans.py');collector=importlib.util.module_from_spec(spec);spec.loader.exec_module(collector)
review_spec=importlib.util.spec_from_file_location('k12_review',ROOT/'scripts/review-sgp-k12.py');k12_review=importlib.util.module_from_spec(review_spec);review_spec.loader.exec_module(k12_review)
ALIASES={
 'gemalink':['CAI MEP GEMADEPT-TERMINAL LINK'],
 'sg_hiep_phuoc':['CAU CANG SO 1 SG-HP','CAU CANG SO 2 SG-HP','CAU CANG SO 3 SG-HP'],
 'cmit':['CẢNG QUỐC TẾ CAI MÉP (CMIT)'],
 'sp_psa':['CẦU CẢNG SỐ 1 - SP-PSA','CẦU CẢNG SỐ 2 - SP-PSA'],
 'ssit':['CẦU CẢNG SỐ 1 - SSIT','CẦU CẢNG SỐ 2 (BẾN SÀ LAN) - SSIT','CẦU CẢNG SỐ 3 (BẾN SÀ LAN) - SSIT'],
 'sg_tan_thuan':['K12A','K12B','K12C','K12C1'],
 'sg_tan_thuan_2':['TAN.T.2'],
 'cll_berth7':['C.LAI 7'],
 'cll_b7':['CAU CANG 2.200 DWT'],
 'swc_buoys':['SOWATCO-ĐT1','SOWATCO-ĐT2','SOWATCO-ĐT3','SOWATCO-TL9'],
 'vgp_k16':['K16'],
}
def check_retention(stats,previous):
 for asset,old in previous.get('metadata',{}).get('assets',{}).items():
  if old.get('rows',0)>=20 and stats.get(asset,{}).get('rows',0)<old['rows']*.95:
   raise ValueError('Selected history shrank by more than 5%; preserve published edition and review '+asset)
def main():
 source=ROOT/'.local/south-plans';days=[];journals={};stats={a:{'rows':0,'first_day':None,'last_day':None} for a in ALIASES};seen_days=set()
 manifest,reviewed,review_sha=k12_review.load_reviewed_rows(ROOT/'docs/catalog-review/sgp-k12-reviewed-rows.json');used_reviewed=set()
 for path in sorted((source/'parsed').glob('*.json')):
  d=json.loads(path.read_text(encoding='utf-8'));day=d['day']
  if day in seen_days:raise ValueError('Duplicate source day')
  seen_days.add(day)
  if d.get('sha256'):
   raw=gzip.decompress((source/'archive'/(d['sha256']+'.html.gz')).read_bytes())
   if hashlib.sha256(raw).hexdigest()!=d['sha256']:raise ValueError('Archive hash mismatch')
   fresh=collector.parse(raw,day)
   if fresh['events']!=d['events']:raise ValueError('Parsed events differ from archive')
  matched=[];seen=set()
  for e in d['events']:
   if e['section']=='internal':continue
   label=e['to'] if e['section']=='arrival' else e['from']
   evidence=k12_review.reviewed_evidence(day,e,reviewed) if label=='K12' else None
   for asset,aliases in ALIASES.items():
    if label not in aliases and not (asset=='sg_tan_thuan' and evidence):continue
    key=(asset,e['section'],e['vessel'],e['call_sign'],e['time'],e['from'],e['to'])
    if key in seen:raise ValueError('Duplicate selected row requires review')
    seen.add(key);matched.append({'asset':asset,'day':day,'direction':e['section'],'vessel':e['vessel'],'time':e['time'],'dwt':e['dwt'],'from':e['from'],'to':e['to'],'raw':e['raw'],'sha256':d['sha256'],'checked_at':d['checked_at']})
    if evidence:
     matched[-1]['scope_review']=evidence;used_reviewed.add(evidence['row_id'])
    s=stats[asset];s['rows']+=1;s['first_day']=s['first_day'] or day;s['last_day']=day
  sgp_assets={'sg_hiep_phuoc','cmit','sp_psa','ssit','sg_tan_thuan','sg_tan_thuan_2'}
  for row in matched:
   if not row.get('scope_review'):continue
   overlaps=[other for other in matched if other['asset'] in sgp_assets and other['direction']==row['direction'] and other['time']==row['time'] and k12_review.name(other['vessel'])==k12_review.name(row['vessel'])]
   if len(overlaps)!=1:raise ValueError('Reviewed K12 row overlaps another SGP plan; preserve edition and review')
  summary={}
  for asset in ALIASES:
   events=[e for e in matched if e['asset']==asset]
   if not events:continue
   summary[asset]={}
   for direction in ('arrival','departure'):
    rows=[e for e in events if e['direction']==direction];weights=[e['dwt'] for e in rows if e['dwt'] is not None]
    summary[asset][direction]=[len(rows),sum(weights) if weights else None,len(rows)-len(weights)]
  journals.setdefault(day[:7],[]).extend(matched)
  days.append({'day':day,'sha256':d.get('sha256'),'checked_at':d.get('checked_at'),'last_attempt':d['last_attempt'],'error':d.get('source_error'),'assets':summary,'rejected':len(d['rejected']),'internal':d['section_rows'].get('internal',0)})
 previous_path=ROOT/'docs/catalog-review/south-history-ledger.json'
 if used_reviewed!=set(reviewed):raise ValueError('A reviewed K12 row is absent or changed; preserve edition and review its source revision')
 receipt=json.loads((source/'receipt.json').read_text(encoding='utf-8'))
 # A one-day probe must never redefine the immutable history window.
 import datetime as dt
 previous=json.loads(previous_path.read_text(encoding='utf-8')) if previous_path.exists() else None
 first=previous['metadata']['from'] if previous else days[0]['day']
 end=max(previous['metadata']['through'],days[-1]['day']) if previous else days[-1]['day']
 expected=(dt.date.fromisoformat(end)-dt.date.fromisoformat(first)).days+1
 if len(days)!=expected or days[0]['day']!=first or days[-1]['day']!=end:raise ValueError('Incomplete requested edition')
 if not previous and len(days)!=receipt['requested_days']:raise ValueError('Incomplete first edition')
 if previous:check_retention(stats,previous)
 metadata={'checked_at':max(d['checked_at'] for d in days if d['checked_at']),'source_url':collector.URL,'parser_version':collector.VERSION,'from':days[0]['day'],'through':days[-1]['day'],'requested_days':len(days),'source_errors':[{'day':d['day'],'error':d['error']} for d in days if d['error']],'assets':stats,'actual_verified':False,'full_scope_certified':False,'source_rights':'publicly_accessible; republication_rights_not_certified'}
 metadata['scope_review_sha256']=review_sha
 metadata['k12_scope_review']={k:manifest[k] for k in ['review_version','source_from','source_through','candidate_rows','internal_excluded','status_counts','snapshot_days','candidate_arrival_days']}
 dest=ROOT/'packages/modules/port/src';journal=dest/'south-journal-data';journal.mkdir(exist_ok=True)
 compact=lambda value:json.dumps(value,ensure_ascii=False,separators=(',',':'))
 (dest/'south-history-data.ts').write_text("// Generated by scripts/export-south-plans.py; archive hashes retained per day.\nimport type {SouthDay} from './south-plans';\nexport const southDaily:SouthDay[]="+compact(days)+";\nexport const southHistoryMetadata="+compact(metadata)+";\n",encoding='utf-8')
 cases=[]
 for month,events in journals.items():
  existing=journal/(month+'.ts')
  if existing.exists():
   content=existing.read_text(encoding='utf-8');old=gzip.decompress(base64.b64decode(json.loads(content.partition('=')[2].strip().rstrip(';'))))
   if old==compact(events).encode():
    cases.append("case '"+month+"':return decodeSouthJournal((await import('./south-journal-data/"+month+"')).southJournalGzip);");continue
  raw=compact(events).encode();encoded=base64.b64encode(gzip.compress(raw,mtime=0)).decode()
  if gzip.decompress(base64.b64decode(encoded))!=raw:raise ValueError('Journal codec mismatch')
  (journal/(month+'.ts')).write_text('export const southJournalGzip='+json.dumps(encoded)+';\n',encoding='utf-8')
  cases.append("case '"+month+"':return decodeSouthJournal((await import('./south-journal-data/"+month+"')).southJournalGzip);")
 (dest/'south-journal-loader.ts').write_text("import type {SouthEvent} from './south-plans';\nimport {decodeSouthJournal} from './south-journal-codec';\nexport async function loadSouthJournal(month:string):Promise<SouthEvent[]>{switch(month){\n"+'\n'.join(cases)+"\ndefault:return [];}}\n",encoding='utf-8')
 ledger={}
 for month,events in journals.items():
  ledger[month]={}
  for asset in ALIASES:
   ledger[month][asset]={}
   for direction in ('arrival','departure'):
    rows=[e for e in events if e['asset']==asset and e['direction']==direction];weights=[e['dwt'] for e in rows if e['dwt'] is not None]
    ledger[month][asset][direction]={'rows':len(rows) if rows else None,'dwt':sum(weights) if weights else None,'missing_dwt':len(rows)-len(weights)}
 (ROOT/'docs/catalog-review/south-history-ledger.json').write_text(json.dumps({'metadata':metadata,'monthly':ledger},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(metadata,ensure_ascii=False))
if __name__=='__main__':main()
