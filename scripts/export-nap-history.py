"""Compile immutable reported visits, lean daily subtotals and an independent monthly ledger."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import unicodedata
import re

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'.local/nap'
TARGET=ROOT/'packages/modules/port/src'

def compile_reports(reports):
    visits={};repeats=0;corrections=0
    for report in sorted(reports,key=lambda r:(r.get('report_day',r['day']),r['published_at'],r['id'])):
        if report['status'] not in ('parsed','retained'):continue
        for row in report['rows']:
            name=re.sub(r'\s+',' ',unicodedata.normalize('NFC',row['vessel'])).strip().upper()
            anchor=row['arrival']['day']+'|'+(row['arrival']['time'] or 'day')
            key=hashlib.sha256(json.dumps([row['scope'],name,anchor],ensure_ascii=False).encode()).hexdigest()
            previous=visits.get(key)
            if previous:
                repeats+=1
                if (previous['dwt'],previous['departure'])!=(row['dwt'],row['departure']):corrections+=1
            # A later valid value may revise a reported fact. A blank in a later
            # daily snapshot is not a retraction of an already reported event.
            candidate={'key':key,'scope':row['scope'],'vessel':row['vessel'],'dwt':row['dwt'],'gt':row['gt'],
                         'arrival':row['arrival'],'departure':row['departure'],'reported_departure':row['departure'],'departure_error':row['departure_error'],
                         'source':{'id':report['id'],'url':report['url'],'attachment_url':report['attachment_url'],'sha256':report['sha256'],'html_sha256':report['html_sha256'],'report_day':report['report_day'],'published_at':report['published_at'],'checked_at':report['checked_at'],'parser_version':report['parser_version'],'row':row['row']},
                         'raw':{k:v for k,v in row['raw'].items() if k in ['B','F','G','H','I','T','U','V','W','Y']}}
            if previous and previous['source']['id']==report['id'] and previous['source']['report_day']==report['report_day']:
                weight_conflict=previous['source'].get('dwt_conflict',False) or (previous['dwt'] is not None and row['dwt'] is not None and previous['dwt']!=row['dwt'])
                prior_departure=previous.get('reported_departure',previous['departure'])
                departure_conflict=previous['source'].get('departure_conflict',False) or (prior_departure is not None and row['departure'] is not None and prior_departure!=row['departure'])
                if weight_conflict or departure_conflict:
                    candidate['source'].update(conflict_rows=sorted(set(previous['source'].get('conflict_rows',[previous['source']['row']])+[row['row']])),dwt_conflict=weight_conflict,departure_conflict=departure_conflict)
                    if weight_conflict:candidate['dwt']=None
                    if departure_conflict:candidate['departure']=None;candidate['departure_error']='conflicting_source_rows'
            if previous:
                if candidate['dwt'] is None and not candidate['source'].get('dwt_conflict'):
                    evidence=previous.get('arrival_evidence') or {k:previous[k] for k in ['source','raw','dwt','gt']}
                    if evidence['dwt'] is not None:candidate['arrival_evidence']=evidence
                if candidate['departure'] is None and previous['departure'] and not candidate['source'].get('departure_conflict'):
                    candidate['departure']=previous['departure']
                    candidate['departure_evidence']=previous.get('departure_evidence') or {k:previous[k] for k in ['source','raw','dwt','gt']}
                elif candidate['departure'] and candidate['dwt'] is None and not candidate['source'].get('dwt_conflict') and previous['departure']==candidate['departure']:
                    evidence=previous.get('departure_evidence') or {k:previous[k] for k in ['source','raw','dwt','gt']}
                    if evidence['dwt'] is not None:candidate['departure_evidence']=evidence
            visits[key]=candidate
    return sorted(visits.values(),key=lambda v:(v['arrival']['day'],v['key'])),repeats,corrections

def subtotals(visits,cutoff):
    daily={};monthly={}
    for v in visits:
        for direction in ['arrival','departure']:
            date=v[direction]
            if not date or not '2025-01-01'<=date['day']<=cutoff:continue
            evidence=v.get(direction+'_evidence') or v
            dwt=evidence['dwt']
            key=(date['day'],v['scope'])
            day=daily.setdefault(key,{'day':date['day'],'asset':v['scope'],'arrival_rows':None,'departure_rows':None,'arrival_dwt':None,'departure_dwt':None,'arrival_missing':0,'departure_missing':0})
            day[direction+'_rows']=(day[direction+'_rows'] or 0)+1
            if dwt is None:day[direction+'_missing']+=1
            else:day[direction+'_dwt']=(day[direction+'_dwt'] or 0)+dwt
            for scope in ['nap',v['scope']]:
                k=date['day'][:7]+'/'+scope+'/'+direction
                value=monthly.setdefault(k,{'rows':0,'dwt':None,'missing_dwt':0})
                value['rows']+=1
                if dwt is None:value['missing_dwt']+=1
                else:value['dwt']=(value['dwt'] or 0)+dwt
    for row in daily.values():
        for key in ['arrival_dwt','departure_dwt']:
            if row[key] is not None:row[key]=round(row[key],6)
    for row in monthly.values():
        if row['dwt'] is not None:row['dwt']=round(row['dwt'],6)
    return [daily[k] for k in sorted(daily)],dict(sorted(monthly.items()))

def main():
    history=json.loads((OUT/'history.json').read_text(encoding='utf-8'));reports=history['reports']
    parsed=[r for r in reports if r['status'] in ('parsed','retained')];failed=[{'id':r['id'],'day':r['day'],'error':r.get('error') or r.get('source_error'),'url':r['url']} for r in reports if r['status'] not in ('parsed','retained') or r.get('source_error')]
    if len(reports)<300 or len(parsed)<len(reports)*.9:raise ValueError('Unexpected historical report loss')
    visits,repeats,corrections=compile_reports(reports)
    cutoff=(dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()-dt.timedelta(days=1)).isoformat()
    daily,monthly=subtotals(visits,cutoff)
    months={k[:7] for k in monthly if '/nap/' in k}
    if len(months)<22:raise ValueError('Historical month matrix incomplete; review before publication')
    ledger={'cutoff':cutoff,'candidate_reports':len(reports),'parsed_reports':len(parsed),'source_rows':sum(len(r['rows']) for r in reports),'unique_visits':len(visits),'repeated_visit_rows':repeats,'revised_visit_rows':corrections,'monthly':monthly}
    previous=ROOT/'docs/catalog-review/nap-history-ledger.json'
    if previous.exists():
        old=json.loads(previous.read_text(encoding='utf-8'))
        if len(parsed)<old['parsed_reports']*.95:raise ValueError('Historical report regression')
    metadata={'source_url':history['source'],'checked_at':history['checked_at'],'parser_version':history['parser_version'],
              'candidate_reports':len(reports),'parsed_reports':len(parsed),'failed_reports':failed,
              'retained_reports':sum(r['status']=='retained' for r in parsed),
              'historical_retained_reports':sum(bool(r.get('historical_retained')) for r in parsed),
              'refresh_recent_days':history.get('refresh_recent_days'),
              'schema_warnings':[{'id':r['id'],'day':r['report_day'],'url':r['url'],'sections':r.get('schema_errors',[])} for r in parsed if r.get('schema_errors')],
              'report_days':sorted({r['report_day'] for r in parsed}),
              'first_report_day':min(r['report_day'] for r in parsed),'last_report_day':max(r['report_day'] for r in parsed),
              'source_rows':ledger['source_rows'],'unique_visits':len(visits),'repeated_visit_rows':repeats,'revised_visit_rows':corrections,
              'rejected_rows':sum(len(r['rejected']) for r in reports),'departure_errors':sum(bool(v['departure_error']) for v in visits),'missing_dwt_visits':sum(v['dwt'] is None for v in visits),
              'conflicting_visits':sum(bool(v['source'].get('conflict_rows')) for v in visits),
              'retained_event_evidence':sum(bool(v.get(direction+'_evidence')) for v in visits for direction in ['arrival','departure']),
              'history_complete':False,'full_coverage_verified':False,'actual_verified':False,'scheduled_refresh_verified':False}
    text="// Generated from archived official activity workbooks; see scripts/export-nap-history.py.\nimport type {NapDay} from './nap-activity';\n"
    text+='export const napHistoryMetadata='+json.dumps(metadata,ensure_ascii=False,separators=(',',':'))+';\n'
    text+='export const napDaily:NapDay[]=[\n'+',\n'.join(json.dumps(d,ensure_ascii=False,separators=(',',':')) for d in daily)+'\n];\n'
    (TARGET/'nap-history-data.ts').write_text(text,encoding='utf-8')
    journal=TARGET/'nap-journal-data';journal.mkdir(exist_ok=True)
    grouped={}
    for visit in visits:
        for month in {d['day'][:7] for d in [visit['arrival'],visit['departure']] if d and d['day']>='2025-01-01'}:grouped.setdefault(month,[]).append(visit)
    loader="// Generated explicit lazy imports; raw journal cells stay off regional requests.\nimport type {NapVisit} from './nap-activity';\nexport async function loadNapJournal(month:string):Promise<NapVisit[]>{switch(month){\n"
    for month,items in sorted(grouped.items()):
        detail="// Generated reported visits for journal events in this month.\nimport type {NapVisit} from '../nap-activity';\nexport const napVisits:NapVisit[]=[\n"+',\n'.join(json.dumps(v,ensure_ascii=False,separators=(',',':')) for v in items)+'\n];\n'
        (journal/(month+'.ts')).write_text(detail,encoding='utf-8')
        loader+="case '"+month+"':return (await import('./nap-journal-data/"+month+"')).napVisits;\n"
    loader+="default:return [];}}\n"
    (TARGET/'nap-journal-loader.ts').write_text(loader,encoding='utf-8')
    previous.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/'export-receipt.json').write_text(json.dumps({'quality':metadata,'ledger':ledger},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in metadata.items() if k not in ['report_days','failed_reports']}))

if __name__=='__main__':main()
