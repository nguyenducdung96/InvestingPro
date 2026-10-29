"""Compile reviewed national PDF plans; leave the HCM and PDN editions untouched."""
import argparse,base64,collections,concurrent.futures as cf,datetime as dt,gzip,hashlib,importlib.util,json
from pathlib import Path
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'.local/gemalink-national';DEST=ROOT/'packages/modules/port/src'
spec=importlib.util.spec_from_file_location('pdfparser',ROOT/'scripts/gemalink-national-parser.py');parser=importlib.util.module_from_spec(spec);spec.loader.exec_module(parser)
SOURCE='https://hanghai.moc.gov.vn/tra-cuu-giay-phep'
def parse_cached(pair):
 sha,record=pair;cache=OUT/'parsed'/(sha+'.json')
 old=json.loads(cache.read_text(encoding='utf8')) if cache.exists() else None
 if old and old.get('parser_version')==parser.VERSION:return sha,old
 # Version 1.0.4 adds 12-column layouts and truly empty trailing pages. A
 # successful 1.0.3 extraction necessarily used the unchanged 10-column grid.
 # Reuse that geometry, re-parse its raw DWT, and re-read every problematic PDF.
 if old and old.get('parser_version')=='gemalink-national-plan/1.0.3' and not old.get('issues'):
  value={**old,'parser_version':parser.VERSION,'events':[{**e,'dwt':parser.source_number(e['raw'][4])} for e in old['events']]}
  cache.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf8');return sha,value
 try:value=parser.parse_pdf(OUT/'pdf'/(sha+'.pdf'))
 except Exception as error:value={'parser_version':parser.VERSION,'events':[],'contains_gemalink':True,'issues':[{'reason':'parse_exception','error':type(error).__name__}]}
 tmp=cache.with_suffix('.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf8');tmp.replace(cache)
 return sha,value
def event_key(event):return (event['day'],event['time'],parser.compact(event['vessel']),event['direction'])
def revision_rank(event):
 signed=dt.datetime.fromisoformat(event['signed_at']).astimezone(dt.timezone.utc) if event.get('signed_at') else dt.datetime.min.replace(tzinfo=dt.timezone.utc)
 return signed,event.get('sha256',''),event.get('request_code','')
def resolve_versions(events):
 groups=collections.defaultdict(list);superseded=[];ambiguous=[];selected=[]
 for event in events:groups[(event['document_year'],event['document_name'],parser.compact(event['vessel']),event['direction'])].append(event)
 for key,rows in groups.items():
  rows.sort(key=revision_rank)
  unique={tuple([*event_key(r),r['dwt'],parser.compact(r['from']),parser.compact(r['to'])]):r for r in rows}
  rows=list(unique.values())
  if len(rows)==1:selected.extend(rows);continue
  # A document number identifies the itinerary. Revised orders require an
  # unambiguous later PDF signing time, never a later list position or URL.
  if any(not r['signed_at'] for r in rows):ambiguous.extend(rows);continue
  rows.sort(key=revision_rank)
  if rows[-1]['signed_at']==rows[-2]['signed_at']:ambiguous.extend(rows);continue
  selected.append(rows[-1]);superseded.extend(rows[:-1])
 groups=collections.defaultdict(list)
 for event in selected:groups[event_key(event)].append(event)
 result=[]
 for key,rows in groups.items():
  rows.sort(key=revision_rank)
  if len({r['dwt'] for r in rows})>1:
   if any(not r['signed_at'] for r in rows):ambiguous.extend(rows);continue
   rows.sort(key=revision_rank)
   if rows[-1]['signed_at']==rows[-2]['signed_at']:ambiguous.extend(rows);continue
   superseded.extend(rows[:-1])
  result.append(rows[-1])
 return sorted(result,key=event_key),superseded,ambiguous
def main():
 cli=argparse.ArgumentParser();cli.add_argument('--parse-available',action='store_true');options=cli.parse_args()
 (OUT/'parsed').mkdir(exist_ok=True)
 records=[json.loads(p.read_text(encoding='utf8')) for p in sorted((OUT/'documents').glob('*.json'))]
 hashes={};proof=[]
 for record in records:
  sha=record['sha256'];path=OUT/'pdf'/(sha+'.pdf')
  if hashlib.sha256(path.read_bytes()).hexdigest()!=sha:raise ValueError('PDF evidence hash mismatch')
  hashes.setdefault(sha,record);proof.append({k:record[k] for k in ['key','native','source_url','sha256','checked_at']})
 parsed={}
 with cf.ProcessPoolExecutor(max_workers=3) as pool:
  for i,(sha,value) in enumerate(pool.map(parse_cached,hashes.items(),chunksize=8),1):
   parsed[sha]=value
   if i%100==0:print(json.dumps({'parsed_pdfs':i,'total':len(hashes)}),flush=True)
 if options.parse_available:
  print(json.dumps({'documents':len(records),'unique_pdfs':len(hashes),'matched_events':sum(len(v['events']) for v in parsed.values()),'issues':collections.Counter(issue['reason'] for v in parsed.values() for issue in v.get('issues',[]))}));return
 receipt=json.loads((OUT/'receipt.json').read_text())
 if not receipt['complete_download'] or len(records)!=receipt['documents']:raise ValueError('Incomplete download edition')
 first=dt.date(2025,1,1);last=dt.date(2025,7,31);events=[];quarantine=[];internal=[]
 for sha,value in parsed.items():
  record=hashes[sha];native=record['native']
  matched_scope=value.get('contains_gemalink',False)
  if not matched_scope and value.get('issues'):
   # Grid extraction and ordinary layout text can both fail on interleaved
   # columns. Independently inspect ordered PDF text before declaring a
   # problematic document out of scope.
   text=''.join(p.extract_text() or '' for p in PdfReader(OUT/'pdf'/(sha+'.pdf')).pages)
   matched_scope=parser.is_gemalink(text) or 'GEMALINK' in parser.compact(text)
  for issue in value.get('issues',[]):
   entry={'sha256':sha,'source_url':record['source_url'],**issue}
   if issue['reason'] in ['internal_gemalink','internal_movement']:internal.append(entry)
   elif matched_scope or issue['reason']=='unreadable_pdf':quarantine.append(entry)
  for row in value['events']:
   row={**row,'dwt':parser.source_number(row['raw'][4])}
   events.append({**row,'sha256':sha,'source_url':record['source_url'],'checked_at':record['checked_at'],'document_year':native['DOCUMENT_YEAR'],'document_name':native['DOCUMENT_NAME'],'request_code':native['REQUEST_CODE']})
 selected,superseded,ambiguous=resolve_versions(events)
 selected=[row for row in selected if str(first)<=row['day']<=str(last)]
 ambiguous=[row for row in ambiguous if str(first)<=row['day']<=str(last)]
 quarantine.extend({'reason':'ambiguous_revision',**r} for r in ambiguous)
 # The existing board owns an identical date/time/vessel/direction. Never add
 # national evidence to an already-recorded board event, including overlaps.
 hcm={}
 # Refuse a missing or stale overlap archive; otherwise a clean machine could
 # silently double-count the events already published by the HCM exporter.
 prefix='export const southDaily:SouthDay[]='
 daily_line=next(line for line in (DEST/'south-history-data.ts').read_text(encoding='utf8').splitlines() if line.startswith(prefix))
 board_days=json.loads(daily_line[len(prefix):].rstrip(';'))
 for expected in board_days:
  if not str(first)<=expected['day']<=str(last):continue
  path=ROOT/'.local/south-plans/parsed'/(expected['day']+'.json')
  if not path.exists():raise ValueError('Missing HCM overlap evidence: '+expected['day'])
  day=json.loads(path.read_text(encoding='utf8'))
  if day['day']!=expected['day'] or day['sha256']!=expected['sha256']:raise ValueError('Stale HCM overlap evidence: '+expected['day'])
  for row in day['events']:
   if row['section'] not in ['arrival','departure']:continue
   label=row['to'] if row['section']=='arrival' else row['from']
   if label=='CAI MEP GEMADEPT-TERMINAL LINK':hcm[(day['day'],row['time'],parser.compact(row['vessel']),row['section'])]=row
 overlap=[];retained=[]
 for row in selected:
  prior=hcm.get(event_key(row))
  if prior:
   overlap.append({'national_sha256':row['sha256'],'day':row['day'],'vessel':row['vessel'],'direction':row['direction'],'national_dwt':row['dwt'],'board_dwt':prior['dwt']});continue
  # Also quarantine a differently-timed board movement for the same ship/day:
  # a regional ETA and a berth plan clock are not separate arrivals by default.
  if any(k[0]==row['day'] and k[2:]==event_key(row)[2:] for k in hcm):
   overlap.append({'national_sha256':row['sha256'],'day':row['day'],'vessel':row['vessel'],'direction':row['direction'],'reason':'same_ship_day_different_source_clock'});continue
  retained.append(row)
 checked=receipt['checked_at'];daily=[];journals=collections.defaultdict(list);monthly={}
 for row in retained:
  event={k:row[k] for k in ['day','time','vessel','direction','dwt','from','to','raw','sha256','source_url','checked_at','signed_at','page','row']}
  event.update(asset='gemalink',national_document=row['document_year']+'/'+row['document_name'],parser_version=parser.VERSION)
  if row.get('source_columns'):event['source_columns']=row['source_columns']
  journals[row['day'][:7]].append(event)
 for n in range((last-first).days+1):
  day=str(first+dt.timedelta(days=n));rows=[r for r in retained if r['day']==day];values={}
  for direction in ['arrival','departure']:
   same=[r for r in rows if r['direction']==direction];weights=[r['dwt'] for r in same if r['dwt'] is not None]
   values[direction]=[len(same),sum(weights) if weights else None,len(same)-len(weights)]
  daily.append({'day':day,'sha256':hashlib.sha256(''.join(sorted(r['sha256'] for r in rows)).encode()).hexdigest() if rows else None,'checked_at':checked,'last_attempt':checked,'error':None,'assets':{'gemalink':values} if rows else {},'rejected':0,'internal':0})
 for month in [f'2025-{n:02}' for n in range(1,8)]:
  monthly[month]={}
  for direction in ['arrival','departure']:
   rows=[r for r in retained if r['day'].startswith(month) and r['direction']==direction];weights=[r['dwt'] for r in rows if r['dwt'] is not None]
   monthly[month][direction]={'rows':len(rows) if rows else None,'dwt':sum(weights) if weights else None,'missing_dwt':len(rows)-len(weights)}
 metadata={'parser_version':parser.VERSION,'source_url':SOURCE,'from':str(first),'through':str(last),'checked_at':checked,'requested_days':len(daily),'search_from':receipt['from'],'search_through':receipt['through'],'source_errors':[],'events':len(retained),'documents':len(records),'unique_pdfs':len(hashes),'duplicate_pdf_records':len(records)-len(hashes),'superseded_rows':len(superseded),'ambiguous_rows':len(ambiguous),'quarantined_rows':len(quarantine),'internal_rows':len(internal),'board_overlap':len(overlap),'semantics':'authority_published_plan','actual_verified':False,'full_scope_certified':False,'coverage_status':'partial','complete_listing_download':True}
 metadata['observations_by_direction']={direction:{'rows':sum(r['direction']==direction for r in retained),'first_day':min((r['day'] for r in retained if r['direction']==direction),default=None),'last_day':max((r['day'] for r in retained if r['direction']==direction),default=None)} for direction in ['arrival','departure']}
 (OUT/'review.json').write_text(json.dumps({'metadata':metadata,'quarantine':quarantine,'internal':internal,'superseded':superseded,'overlap':overlap},ensure_ascii=False,indent=2),encoding='utf8')
 if quarantine:raise ValueError(f'{len(quarantine)} unresolved PDF/revision rows; review before publishing')
 oldpath=ROOT/'docs/catalog-review/gemalink-national-ledger.json'
 if oldpath.exists():
  old=json.loads(oldpath.read_text(encoding='utf8'))
  if len(retained)<old['metadata']['events']*.95:raise ValueError('Unexpected backfill history loss')
 compact=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'))
 folder=DEST/'gemalink-national-journal-data';folder.mkdir(exist_ok=True);cases=[]
 for month,rows in sorted(journals.items()):
  raw=compact(rows).encode();b64=base64.b64encode(gzip.compress(raw,mtime=0)).decode();assert gzip.decompress(base64.b64decode(b64))==raw
  (folder/(month+'.ts')).write_text('export const southJournalGzip='+json.dumps(b64)+';\n',encoding='utf8')
  cases.append(f"case '{month}':return decodeSouthJournal((await import('./gemalink-national-journal-data/{month}')).southJournalGzip);")
 (DEST/'gemalink-national-data.ts').write_text("import type {SouthDay} from './south-plans';\nexport const gemalinkNationalMetadata="+compact(metadata)+";\nexport const gemalinkNationalDaily:SouthDay[]="+compact(daily)+';\n',encoding='utf8')
 (DEST/'gemalink-national-loader.ts').write_text("import type {SouthEvent} from './south-plans';\nimport {decodeSouthJournal} from './south-journal-codec';\nexport async function loadGemalinkNationalJournal(month:string):Promise<SouthEvent[]>{switch(month){\n"+'\n'.join(cases)+"\ndefault:return [];}}\n",encoding='utf8')
 oldpath.write_text(json.dumps({'metadata':metadata,'monthly':monthly,'documents':proof,'superseded':superseded,'board_overlap':overlap},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(json.dumps(metadata),flush=True)
if __name__=='__main__':main()
