"""Validate archived anonymous public responses and compile PDN berth plans."""
import argparse,collections,datetime as dt,gzip,hashlib,json,math,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'.local/pdn';MODULE=ROOT/'packages/modules/port/src'
SOURCE='http://123.25.204.166/web/guest/public-kh#/tra-cuu/ke_hoach/0/0/KeHoachDieuDongTau2'
VERSION='pdn-public-plan/1.0.0'
TERMINALS={'BC185':('pdn_long_binh_tan','Bến cảng Đồng Nai - Phân cảng Long Bình Tân'),'BC186':('pdn_go_dau_a','Bến cảng Gò Dầu A'),'BC187':('pdn_go_dau_b','Bến cảng Gò Dầu B')}
def norm(s):return re.sub(r'\s+',' ',unicodedata.normalize('NFC',str(s))).strip()
def terminal(code,label):
 if code not in TERMINALS:return None
 asset,name=TERMINALS[code]
 # Require the independently identified authority harbour code AND exact terminal label.
 parts=[norm(x) for x in label.split(',')]
 return asset if name in parts else None

def weight(v):
 return float(v) if isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) and 0<v<=1_000_000 else None

def parse(e):
 day=e['day'];section=e['direction'];rows=e['response']['data'];result=[];unmapped=0
 raw=e.get('raw_response',json.dumps(e['response'],ensure_ascii=False,separators=(',',':')))
 if hashlib.sha256(raw.encode()).hexdigest()!=e['sha256'] or json.loads(raw)!=e['response']:raise ValueError('Archive checksum mismatch')
 if e['source_url']!=SOURCE or not re.fullmatch('[a-f0-9]{64}',e['sha256']) or e['response']['total']!=len(rows):raise ValueError('Invalid archive')
 ids=set()
 for row in rows:
  moving=section=='movement';field='shiftingDate' if moving else 'timeOfArrival' if section=='arrival' else 'timeOfDeparture'
  raw_time=row[field]
  # The official public formatter emits 010 for hour 10. Preserve that exact evidence.
  normalized_time=re.sub(r':010$',':10',re.sub(r' 010:',' 10:',raw_time))
  time=dt.datetime.strptime(normalized_time,'%d/%m/%Y %H:%M')
  if str(time.date())!=day:raise ValueError('Wrong response date')
  native=str(row['vmaScheduleShiftingId' if moving else 'vmaItineraryScheduleId'])
  if native in ids:raise ValueError('Duplicate native ID')
  ids.add(native)
  if moving:
   from_=norm(row['from']);to=norm(row['to']);fr=terminal(row.get('anchoringPortHarbourCode'),from_);dest=terminal(row.get('shiftingPortHarbourCode'),to)
   if (row.get('anchoringPortHarbourCode') in TERMINALS and not fr) or (row.get('shiftingPortHarbourCode') in TERMINALS and not dest):unmapped+=1;continue
   kind='internal' if fr and dest else 'departure' if fr else 'arrival' if dest else None
   asset=fr if kind in ['internal','departure'] else dest
   code=row.get('anchoringPortHarbourCode' if kind in ['internal','departure'] else 'shiftingPortHarbourCode','');wharf=row.get('anchoringPortWharfCode' if kind in ['internal','departure'] else 'shiftingPortWharfCode','')
  else:
   label=norm(row.get('anchoringPortWharfName',''));code=row.get('portHarbourCode','');wharf=row.get('portWharfCode','');asset=terminal(code,label);kind=section if asset else None
   from_=norm(row.get('initFrom','')) if section=='arrival' else label;to=label if section=='arrival' else norm(row.get('initFrom',''))
  if not moving:fr=asset if section=='departure' else None;dest=asset if section=='arrival' else None
  if not asset:
   if code in TERMINALS:unmapped+=1
   continue
  vessel=norm(row.get('nameOfShip',''))
  if not vessel or not from_ or not to:raise ValueError('Incomplete matched row')
  result.append(dict(id=section+':'+native,day=day,time=time.isoformat(timespec='seconds')+'+07:00',vessel=vessel,imo=str(row.get('imoNumber') or '') or None,dwt=weight(row.get('dwt')),gt=weight(row.get('gt')),from_=from_,to=to,asset=asset,kind=kind,section=section,source_id=native,sha256=e['sha256'],checked_at=e['checked_at'],harbour_code=code,wharf_code=wharf,raw_dwt=row.get('dwt'),conflicting_dwt=False,from_asset=fr,to_asset=dest,unit_dwt=norm(row.get('unitDwt','')) or None,raw_time=raw_time,time_normalized=raw_time!=normalized_time))
 for r in result:r['from']=r.pop('from_')
 return result,unmapped

def published_json(path,marker):
 text=path.read_text(encoding='utf-8-sig')
 return json.loads(text.split(marker,1)[1].rsplit(';',1)[0])

def main():
 args=argparse.ArgumentParser();args.add_argument('--recent-only',action='store_true',help='Validate last seven raw days plus the reviewed immutable historical edition');options=args.parse_args()
 previous_path=ROOT/'docs/catalog-review/pdn-history-ledger.json'
 previous=json.loads(previous_path.read_text(encoding='utf8')) if previous_path.exists() else None
 published_days={d['day']:d for d in published_json(MODULE/'pdn-history-data.ts','export const pdnDaily:PdnDay[]=')} if previous else {}
 previous_sources={d['day']:d for d in previous['sources']} if previous else {}
 old_months={}
 today=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date();end=today-dt.timedelta(days=1);start=dt.date(2025,1,1);daily=[];events=[];sources=[];unmapped=0
 for n in range((end-start).days+1):
  day=str(start+dt.timedelta(days=n));group=[];proof=[];day_unmapped=0
  paths=[OUT/'raw'/f'{day}-{direction}.json.gz' for direction in ['arrival','departure','movement']]
  recent=day>=str(end-dt.timedelta(days=6))
  if (options.recent_only and not recent) or not all(p.exists() for p in paths):
   if recent or not previous or day not in published_days or day not in previous_sources:raise ValueError(f'Missing archived response {day}; keeping published edition')
   if previous['metadata']['source_url']!=SOURCE or previous['metadata']['parser_version']!=VERSION:raise ValueError('Unreviewed historical edition')
   proof=previous_sources[day]['responses'];day_unmapped=previous_sources[day].get('unmapped_terminal_rows',0)
   if {p['section'] for p in proof}!={'arrival','departure','movement'} or len(proof)!=3 or any(not re.fullmatch('[a-f0-9]{64}',p['sha256']) for p in proof):raise ValueError('Invalid preserved source proof')
   month=day[:7]
   if month not in old_months:
    old_path=MODULE/'pdn-journal-data'/f'{month}.ts'
    if not old_path.exists() and previous['monthly'].get(month):raise ValueError('Missing preserved month journal')
    old_months[month]=published_json(old_path,'export const pdnEvents:PdnEvent[]=') if old_path.exists() else []
   group=[r for r in old_months[month] if r['day']==day]
   for r in group:
    if r['sha256'] not in [p['sha256'] for p in proof] or not r['time'].startswith(day+'T') or r['asset'] not in [v[0] for v in TERMINALS.values()] or r['kind'] not in ['arrival','departure','internal'] or (r['dwt'] is not None and weight(r['dwt']) is None):raise ValueError('Invalid preserved event')
  else:
   for path in paths:
    e=json.loads(gzip.decompress(path.read_bytes()));parsed,bad=parse(e);group.extend(parsed);day_unmapped+=bad
    proof.append(dict(section=e['direction'],sha256=e['sha256'],checked_at=e['checked_at'],source_rows=len(e['response']['data'])))
  unmapped+=day_unmapped
  # Collapse exact repeated published movement keys. Conflicting weights stay missing.
  unique={}
  for r in group:
   key=(r['time'],norm(r['vessel']).upper(),r['from'],r['to'])
   prev=unique.get(key)
   if prev:
    if prev['asset']!=r['asset'] or prev['kind']!=r['kind']:raise ValueError('Conflicting scope for a movement')
    if prev['dwt']!=r['dwt']:prev['dwt']=None;prev['conflicting_dwt']=True
   else:unique[key]=r
  group=list(unique.values());events.extend(group);assets={}
  for asset in [v[0] for v in TERMINALS.values()]:
   values={}
   for direction in ['arrival','departure']:
    rs=[r for r in group if r['asset']==asset and r['kind']==direction];weights=[r['dwt'] for r in rs if r['dwt'] is not None];values[direction]=[len(rs),sum(weights) if weights else None,len(rs)-len(weights)]
   if any(v[0] for v in values.values()):assets[asset]=values
  digest=hashlib.sha256(''.join(p['sha256'] for p in proof).encode()).hexdigest();checked=max(p['checked_at'] for p in proof)
  daily.append(dict(day=day,sha256=digest,checked_at=checked,assets=assets,source_errors=[]));sources.append(dict(day=day,responses=proof,unmapped_terminal_rows=day_unmapped))
 ids=collections.defaultdict(set)
 for r in events:ids[r['id']].add(r['day'])
 if any(len(days)>1 for days in ids.values()):raise ValueError('Native event moved across dates; review before publication')
 metadata=dict(parser_version=VERSION,source_url=SOURCE,from_day=str(start),through=str(end),checked_at=max(d['checked_at'] for d in daily),days=len(daily),responses=len(sources)*3,events=len(events),internal=sum(r['kind']=='internal' for r in events),unmapped_terminal_rows=unmapped,normalized_time_rows=sum(r['time_normalized'] for r in events),actual_verified=False,full_scope_certified=False)
 monthly={}
 for r in events:
  if r['kind']=='internal':continue
  key=r['day'][:7];m=monthly.setdefault(key,{})
  v=m.setdefault(r['asset'],{}).setdefault(r['kind'],dict(rows=0,dwt=None,missing_dwt=0));v['rows']+=1
  if r['dwt'] is None:v['missing_dwt']+=1
  else:v['dwt']=(v['dwt'] or 0)+r['dwt']
 if previous:
  for month,assets in previous['monthly'].items():
   for asset,dirs in assets.items():
    for direction,value in dirs.items():
     current=monthly.get(month,{}).get(asset,{}).get(direction,{}).get('rows',0)
     if current<value['rows']*.95:raise ValueError('Unexpected published month row loss; keeping last good edition')
 target=MODULE/'pdn-journal-data';target.mkdir(exist_ok=True)
 compact=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'))
 grouped=collections.defaultdict(list)
 for e in events:grouped[e['day'][:7]].append(e)
 for month,rows in grouped.items():(target/f'{month}.ts').write_text("import type {PdnEvent} from '../pdn-plans';\nexport const pdnEvents:PdnEvent[]="+compact(sorted(rows,key=lambda r:(r['time'],r['id'])))+';\n',encoding='utf8')
 (MODULE/'pdn-history-data.ts').write_text("import type {PdnDay} from './pdn-plans';\nexport const pdnHistoryMetadata="+compact(metadata)+";\nexport const pdnDaily:PdnDay[]="+compact(daily)+';\n',encoding='utf8')
 (MODULE/'pdn-journal-loader.ts').write_text("import type {PdnEvent} from './pdn-plans';\nexport async function loadPdnJournal(month:string):Promise<PdnEvent[]>{switch(month){\n"+'\n'.join(f"case '{m}':return (await import('./pdn-journal-data/{m}')).pdnEvents;" for m in sorted(grouped))+"\ndefault:return [];}}\n",encoding='utf8')
 ledger=dict(metadata=metadata,monthly=monthly,sources=sources)
 (ROOT/'docs/catalog-review/pdn-history-ledger.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 (OUT/'export-receipt.json').write_text(json.dumps(metadata,indent=2)+'\n')
 print(json.dumps(metadata))
if __name__=='__main__':main()
