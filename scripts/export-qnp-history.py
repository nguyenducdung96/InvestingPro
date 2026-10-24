"""Validate extracted official observations and produce the versioned server dataset."""
import datetime as dt
import json
import pathlib
import re
import importlib.util

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'.local/qnp-authority'
TARGET=ROOT/'packages/modules/port/src/qnp-history-data.ts'


def scope(label):
    for key,pattern in [('qnp_cau1',r'(?:C1[TN]?|1[ABC])(?: (?:TL|HL))?'),('qnp_cau2',r'(?:C2[TN]?|2[AB])(?: (?:TL|HL))?'),('qnp_cau3',r'C3[TN]?(?: (?:TL|HL))?'),('qnp_cau4',r'C4[TN]?(?: (?:TL|HL))?'),('qnp_tc1',r'TC1')]:
        if re.fullmatch(pattern,label):return key
    return None


def ledger(sources,cutoff):
    events=[]
    for s in sorted(sources,key=lambda s:(s['issued_on'],s['published_at'] or '',s['id'])):
        events=[r for r in events if not s['from']<=r['time']<=s['through']]
        events.extend(s['rows'])
    events=[r for r in events if '2025-01-01'<=r['time'][:10]<=str(cutoff)]
    def metric(items):
        known=[r['dwt'] for r in items if r['dwt'] is not None]
        return {'rows':len(items) if items else None,'dwt':round(sum(known),4) if known else None,'missing_dwt':sum(r['dwt'] is None for r in items)}
    result={}
    for direction in ('arrival','departure'):
        counted=[r for r in events if r['from']=='P0' and scope(r['to'])] if direction=='arrival' else [r for r in events if scope(r['from']) and r['to']=='P0']
        months=sorted({r['time'][:7] for r in counted})
        result[direction]={'months':{m:metric([r for r in counted if r['time'].startswith(m)]) for m in months},
                           'ytd':metric([r for r in counted if str(cutoff.year)+'-01-01'<=r['time'][:10]<=str(cutoff)]),
                           'prior_ytd':metric([r for r in counted if f'{cutoff.year-1}-01-01'<=r['time'][:10]<=f'{cutoff.year-1}{str(cutoff)[4:]}']),
                           'scopes':{s:metric([r for r in counted if scope(r['to'] if direction=='arrival' else r['from'])==s]) for s in ('qnp_cau1','qnp_cau2','qnp_cau3','qnp_cau4','qnp_tc1')}}
    return {'cutoff':str(cutoff),'directions':result,'source_events':len(events)}


def main():
    spec=importlib.util.spec_from_file_location('authority',ROOT/'scripts/collect-qnp-authority.py')
    parser=importlib.util.module_from_spec(spec);spec.loader.exec_module(parser)
    bundle=json.loads((OUT/'extracted.json').read_text(encoding='utf-8'))
    if bundle['parser_version']!='qnp-authority-grid/1.0.0':
        raise ValueError('Unknown authority parser')
    sources=[];failures=[];duplicate_rows=0
    previous=[]
    if TARGET.exists():
        match=re.search(r'export const qnpAuthorityBulletins:QnpBulletin\[\]=(\[.*\]);',TARGET.read_text(encoding='utf-8'),re.S)
        if match:previous=json.loads(match[1])
    for item in sorted(bundle['schedules'],key=lambda x:(x['title_day'],x['id'])):
        if item.get('ocr_config')!='grid-cells-upright':
            raise ValueError('Re-extract the prototype full-page results before publication')
        pages=item.get('pages',[])
        previous_complete=next((s for s in previous if s['id']==item['id'] and s.get('quality',{}).get('page_scope_complete')),None)
        if item.get('errors') and previous_complete:
            sources.append({**previous_complete,'source_error':'Latest source page attempt failed; retained the prior complete document version'})
            continue
        explicit_empty=bool(pages and pages[0]['status']=='explicit_no_plan')
        if not item.get('from') or (not item['rows'] and not explicit_empty):
            failures.append({'id':item['id'],'title_day':item['title_day'],'errors':item['errors'],'page_status':[p['status'] for p in pages]})
            continue
        html=(OUT/f'detail-{item["id"]}.html').read_text(encoding='utf-8-sig')
        published=re.search(r'class="dateNews">[^<]*?(\d{2})/(\d{2})/(\d{4}),\s*(\d{2}):(\d{2})',html)
        published_at=dt.datetime(*map(int,[published[3],published[2],published[1],published[4],published[5]])).isoformat()+'+07:00' if published else None
        rows=[];keys={};conflicted=set();source_duplicates=0;conflict_rows=0
        for r in item['rows']:
            key=(r['time'],re.sub(r'\s+','',r['vessel']).upper(),r['from'],r['to'])
            if key in keys:
                source_duplicates+=1
                if keys[key]['dwt']!=r['dwt']:conflicted.add(key)
                continue
            keys[key]=r
        duplicate_rows+=source_duplicates
        for key,r in keys.items():
            if key in conflicted:
                conflict_rows+=1;continue
            if not item['from']<=r['time']<=item['through'] or r['dwt'] is not None and not 0<r['dwt']<=1_000_000:
                raise ValueError('Invalid authority row')
            if r['dwt'] is not None and (r['dwt']!=parser.weight(r['raw']['dwt']) or r['dwt']!=parser.weight(r['dwt_crosscheck'][0]) or min(r['raw']['confidence']['dwt'],r['dwt_crosscheck'][1])<.90):
                raise ValueError('DWT has not passed both source cell readings')
            rows.append({k:r[k] for k in ('time','vessel','dwt','from','to','raw','image_sha256','dwt_crosscheck')})
        sources.append({'id':item['id'],'source_kind':'authority','parser_version':bundle['parser_version'],
                        'continuation_reader':item.get('continuation_reader'),'url':item['url'],'image':item['images'][0]['url'],'sha256':item['images'][0]['sha256'],
                        'images':[{k:i[k] for k in ('url','sha256')} for i in item['images']],
                        'issued_on':item['from'][:10],'published_at':published_at,'parsed_at':item['parsed_at'],
                        'last_checked_at':item.get('checked_at'),'from':item['from'],'through':item['through'],'quality':{
                            'rejected_rows':sum(len(p.get('rejected',[]))+p.get('seed_rejected_rows',0) for p in pages)+conflict_rows,
                            'missing_dwt':sum(r['dwt'] is None for r in rows),
                            'continuation_pages':sum(p['status']=='continuation_requires_review' for p in pages)+len(item.get('errors',[])),
                            'page_scope_complete':bool(pages and pages[-1].get('page_scope_complete',False) and not item.get('errors')),'explicit_no_plan':explicit_empty,'duplicate_rows':source_duplicates,'conflicting_groups':conflict_rows},'rows':rows,**({'source_error':'One or more source pages did not pass validation; available QNP rows retained'} if item.get('errors') else {})})
    present={s['id'] for s in sources}
    failed_ids={f['id'] for f in failures}|{int(re.search(r'id=(\d+)',f['url'])[1]) for f in bundle['failures']}
    for source in previous:
        if source['id'] in failed_ids and source['id'] not in present and source['parser_version']==bundle['parser_version']:
            sources.append({**source,'source_error':'Latest source attempt failed validation; retained the prior successful image version'})
    # Do not ship another one-month sample. Every elapsed calendar month must have source rows.
    months={r['time'][:7] for s in sources for r in s['rows'] if r['time']>='2025-01-01'}
    cutoff=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()-dt.timedelta(days=1)
    expected={f'{year}-{month:02}' for year in range(2025,cutoff.year+1) for month in range(1,13) if f'{year}-{month:02}'<=str(cutoff)[:7]}
    if not expected.issubset(months) or len(sources)<500:
        raise ValueError('Historical month matrix incomplete; preserve the published dataset')
    totals=ledger(sources,cutoff)
    if any(not expected.issubset(totals['directions'][direction]['months']) for direction in ('arrival','departure')):
        raise ValueError('Owned-berth month matrix incomplete; preserve the published dataset')
    metadata={'source_url':'https://cangvuhanghaiquynhon.gov.vn/index.aspx?page=news&cat=2014',
              'parser_version':bundle['parser_version'],'continuation_reader':'qnp-continuation/7','collected_at':dt.datetime.now(dt.timezone.utc).isoformat(),
              'candidate_documents':len(bundle['schedules'])+len(bundle['failures']),
              'parsed_documents':len(sources),'failed_documents':len(failures)+len(bundle['failures']),
              'rejected_rows':sum(s['quality']['rejected_rows'] for s in sources),
              'missing_dwt':sum(s['quality']['missing_dwt'] for s in sources),
              'continuation_documents':sum(s['quality']['continuation_pages']>0 for s in sources),
              'explicit_no_plan_documents':sum(s['quality']['explicit_no_plan'] for s in sources),
              'exact_or_conflicting_repeated_rows':duplicate_rows,
              'source_rows':sum(len(s['rows']) for s in sources),'months':sorted(months),
              'history_complete':False,'full_coverage_verified':False}
    # This is an image parser output, never mislabeled as manual/factual review.
    content="// Generated only from archived official QNP authority images. See scripts/export-qnp-history.py.\nimport type {QnpBulletin} from './qnp-plans';\n"
    content+='export const qnpHistoryMetadata='+json.dumps(metadata,ensure_ascii=False,separators=(',',':'))+';\n'
    content+='export const qnpAuthorityBulletins:QnpBulletin[]=[\n'+',\n'.join(json.dumps(source,ensure_ascii=False,separators=(',',':')) for source in sources)+'\n];\n'
    TARGET.write_text(content,encoding='utf-8')
    (ROOT/'docs/catalog-review/qnp-history-ledger.json').write_text(json.dumps(totals,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/'export-receipt.json').write_text(json.dumps({'metadata':metadata,'unavailable_documents':failures,'fetch_failures':bundle['failures']},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(metadata,ensure_ascii=False))


if __name__=='__main__':
    main()
