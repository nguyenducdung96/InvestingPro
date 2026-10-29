"""Read public TCIS vessel information; retain reported TNT berth observations.

EST fields, other sites, DWT guesses and container/customer lookups are excluded.
The rolling source window never retracts an earlier source-backed observation.
"""
import argparse, collections, datetime as dt, hashlib, json, re, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE='https://eport.tcis.co/Ships'
ENDPOINT='https://eport.tcis.co/ships/Searcher'
TARGET=ROOT/'packages/modules/port/src/tcl-berth-data.ts'
VERSION='tcis-tnt-berth/1.0.0'

def previous():
 if not TARGET.exists():return {'metadata':{},'events':[]}
 return json.loads(TARGET.read_text(encoding='utf8').split('export const tclBerthData=',1)[1].split(' satisfies ',1)[0].rsplit(';',1)[0])

def reported_time(raw,checked):
 value=str(raw or '').strip()
 if not value or value.startswith('EST:'):return None
 if not re.fullmatch(r'\d{2}:\d{2} \d{2}/\d{2}/\d{4}',value):raise ValueError('Unknown source time format')
 time=dt.datetime.strptime(value,'%H:%M %d/%m/%Y').replace(tzinfo=dt.timezone(dt.timedelta(hours=7)))
 if time.year<2000:return None
 if time>checked:raise ValueError('Unmarked future actual time')
 return time.isoformat(timespec='seconds')

def parse(raw,checked,sha):
 value=json.loads(raw)
 if value.get('type')!='success' or not isinstance(value.get('model'),list):raise ValueError('Source contract changed')
 events=[];estimated=collections.Counter();other=0;matched=0
 for index,row in enumerate(value['model']):
  if str(row.get('SITE_ID','')).strip()!='TNT':other+=1;continue
  matched+=1;vessel=str(row.get('VESSELNAME','')).strip();voyage=str(row.get('IN_OUT_VOYAGE','')).strip()
  if not vessel or not voyage:raise ValueError('Missing TNT vessel/voyage')
  proof={key:row.get(key) for key in ['SITE_ID','VESSELNAME','IN_OUT_VOYAGE','ACTUAL_BERTH_TIME','ACTUAL_DEPATURE_TIME']}
  for direction,field in [('arrival','ACTUAL_BERTH_TIME'),('departure','ACTUAL_DEPATURE_TIME')]:
   raw_time=str(row.get(field,'')).strip()
   if raw_time.startswith('EST:'):estimated[direction]+=1
   time=reported_time(raw_time,checked)
   if not time:continue
   key=hashlib.sha256(json.dumps(['TNT',vessel,voyage,direction,time],ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
   events.append({'key':key,'site_id':'TNT','vessel':vessel,'voyage':voyage,'direction':direction,'time':time,'day':time[:10],'dwt':None,'source_url':SOURCE,'sha256':sha,'checked_at':checked.isoformat(),'source_row':index+1,'raw_field':field,'raw_time':raw_time,'raw':proof})
 unique={e['key']:e for e in events}
 return list(unique.values()),{'source_rows':len(value['model']),'tnt_rows':matched,'other_site_rows_excluded':other,'duplicate_events':len(events)-len(unique),'estimated_fields':dict(estimated)}

def merge(old,new):
 combined={e['key']:e for e in old}
 for event in new:
  for prior in combined.values():
   if (prior['vessel'],prior['voyage'],prior['direction'])==(event['vessel'],event['voyage'],event['direction']) and prior['time']!=event['time'] and abs((dt.datetime.fromisoformat(prior['time'])-dt.datetime.fromisoformat(event['time'])).total_seconds())<21*86400:
    raise ValueError('Conflicting actual time for a recent voyage; review before replacing history')
  # Keep the first immutable source proof on repeated observations.
  combined.setdefault(event['key'],event)
 return sorted(combined.values(),key=lambda e:(e['time'],e['key']))

def write(data):
 TARGET.write_text("import type {TclBerthEvent} from './tcl-berth-activity';\nexport const tclBerthData="+json.dumps(data,ensure_ascii=False,separators=(',',':'))+" satisfies {metadata:Record<string,unknown>;events:TclBerthEvent[]};\n",encoding='utf8')

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--input',type=Path,help='Replay a saved source response without network');options=parser.parse_args()
 checked=dt.datetime.now(dt.timezone.utc);old=previous();out=ROOT/'.local/tcl';out.mkdir(parents=True,exist_ok=True)
 try:
  params={'siteId':'TNT','vesselName':''}
  if options.input:raw=options.input.read_bytes()
  else:
   req=urllib.request.Request(ENDPOINT,data=json.dumps(params).encode(),headers={'Content-Type':'application/json','User-Agent':'InvestingPro public source collection'},method='POST')
   with urllib.request.urlopen(req,timeout=45) as response:
    if response.geturl()!=ENDPOINT:raise ValueError('Unexpected redirect')
    raw=response.read(8000001)
    if len(raw)>8000000:raise ValueError('Response too large')
  sha=hashlib.sha256(raw).hexdigest();archive=out/'archive'/f'{sha}.json';archive.parent.mkdir(exist_ok=True);archive.write_bytes(raw)
  incoming,counts=parse(raw,checked,sha);events=merge(old['events'],incoming)
  if old['events'] and not incoming:raise ValueError('Unexpected empty TNT response; retaining last good edition')
  snapshots={s['sha256']:s for s in old['metadata'].get('snapshots',[])}
  snapshots.setdefault(sha,{'sha256':sha,'checked_at':checked.isoformat(),'parameters':params,**counts})
  metadata={'parser_version':VERSION,'source_url':SOURCE,'endpoint':ENDPOINT,'checked_at':checked.isoformat(),'last_attempt':checked.isoformat(),'last_success':checked.isoformat(),'source_error':None,'events':len(events),'semantics':'operator_reported_berth_activity','movement_scope':'berth','actual_verified':False,'full_scope_certified':False,'history_complete':False,'scheduled_refresh_verified':False,'absence_means_zero':False,'dwt_available':False,'first_observation':min((e['day'] for e in events),default=None),'last_observation':max((e['day'] for e in events),default=None),'snapshots':list(snapshots.values()),'latest_response':counts}
  write({'metadata':metadata,'events':events});receipt={'success':True,'metadata':metadata}
 except Exception as error:
  if old['events']:
   old['metadata'].update(last_attempt=checked.isoformat(),source_error=str(error));write(old)
  (out/'collect-receipt.json').write_text(json.dumps({'success':False,'error':str(error)},indent=2),encoding='utf8')
  raise
 (out/'collect-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps({'events':len(events),'new_events':len(events)-len(old['events']),**counts},ensure_ascii=False))

if __name__=='__main__':main()
