"""Bounded research only: compare frozen board cases with national documents."""
import argparse
import datetime as dt
import hashlib
import html
import http.cookiejar
import importlib.util
import json
from pathlib import Path
import re
import time
import urllib.error
import urllib.request
import pdfplumber

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('review',ROOT/'scripts/review-hcm-national-source.py')
review=importlib.util.module_from_spec(spec);spec.loader.exec_module(review)
n=review.national;compact=review.geometry.compact
DEFAULT_CASES=ROOT/'docs/catalog-review/hcm-national-matrix-cases-20261031.json'

def label_agrees(endpoint,label):
    key=compact(label)
    return any(compact(piece)==key or (len(key)>=10 and compact(piece).endswith(key)) for piece in endpoint.split('/'))

def compare(case,documents):
    event=case['event'];direction=event['section'];label=event['to'] if direction=='arrival' else event['from']
    identity_sufficient=compact(event['call_sign']) not in {'','KHONGCO','NIL','NA','NONE','0'}
    candidates=[];clearances=[]
    for doc in documents:
        if not identity_sufficient or compact(doc['vessel'])!=compact(event['vessel']) or compact(doc['call_sign'])!=compact(event['call_sign']):continue
        if doc['kind']=='clearance':
            p=doc['parsed']
            if direction=='departure' and p.get('day')==case['day'] and p.get('time')==event['time']:clearances.append(doc['key'])
            continue
        for row in doc['parsed']['rows']:
            if compact(row['vessel'])!=compact(event['vessel']) or row['planned_day']!=case['day']:continue
            endpoint=row['to'] if direction=='arrival' else row['from']
            if not label_agrees(endpoint,label):continue
            weights=row['dwt'] is not None and event['dwt'] is not None and abs(row['dwt']-event['dwt'])<.001
            candidates.append({'document_key':doc['key'],'sha256':doc['sha256'],'source_url':doc['source_url'],
                'time':row['planned_time'],'dwt':row['dwt'],'from':row['from'],'to':row['to'],
                'time_agrees':row['planned_time']==event['time'],'dwt_agrees':weights})
    exact=[c for c in candidates if c['time_agrees'] and c['dwt_agrees']]
    if not identity_sufficient:status='identity_insufficient'
    elif exact:status='exact_fields_with_conflicts' if any(not(c['time_agrees'] and c['dwt_agrees']) for c in candidates) else 'exact_fields_candidate'
    elif candidates:status='different_plan_fields'
    elif clearances:status='clearance_time_only'
    else:status='no_correspondence_in_bounded_query'
    # Candidates are never new calls. Keep provenance pairs even for identical payloads.
    return {'case_id':case['case_id'],'year':case['year'],'asset':case['asset'],'direction':direction,
        'status':status,'plan_candidates':candidates,'clearance_time_candidates':clearances,
        'source_documents_considered':len(documents),'asset_mapping_verified':False,'actual_verified':False,
        'replacement_verified':False,'missing_dwt_borrowed':False}

def clearance_pdf(path):
    with pdfplumber.open(path) as pdf:text='\n'.join(page.extract_text() or '' for page in pdf.pages)
    if 'GIAYPHEPROICANG' not in compact(text):raise ValueError('Not a port-clearance PDF')
    match=re.search(r'Thời gian rời cảng:\s*(\d{1,2})\s*giờ\s*(\d{1,2})\s*ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})',text)
    result={'day':None,'time':None,'dwt':None,'semantics':'departure_permission','actual_verified':False}
    if match:
        h,mi,d,mo,y=map(int,match.groups());stamp=dt.datetime(y,mo,d,h,mi);result.update(day=str(stamp.date()),time=stamp.strftime('%H:%M'))
    return result

class Audit:
    def __init__(self,out,max_queries,max_documents,offline=False):
        self.out=out;self.max_queries=max_queries;self.max_documents=max_documents
        self.offline=offline
        self.queries=0;self.downloads=0;self.sessions={};self.documents={};self.query_records=[]
        for name in ['queries','documents','pdf']:(out/name).mkdir(parents=True,exist_ok=True)
        n.read=self.read
    def read(self,url,fields=None,opener=None):
        if self.offline:raise RuntimeError('Offline review cannot fetch missing evidence')
        if n.qp.urlsplit(url).hostname!='hanghai.moc.gov.vn' or n.qp.urlsplit(url).scheme!='https':raise ValueError('Unexpected origin')
        request=urllib.request.Request(url,data=n.qp.urlencode(fields).encode() if fields is not None else None,
            headers={'User-Agent':'InvestingPro bounded official-source review','Referer':n.BASE})
        # In particular do not hide/retry 429; stop and preserve resumable evidence.
        with (opener or n.make_opener()).open(request,timeout=25) as response:
            raw=response.read(8_000_001)
            if len(raw)>8_000_000:raise ValueError('Response exceeds research cap')
        time.sleep(.25)
        return raw
    def session(self,kind):
        if kind not in self.sessions:
            if kind=='plan':op,raw,page,form=n.bootstrap()
            else:
                op=n.make_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
                page=n.parse(self.read(n.BASE,opener=op));form=next(f for f in page.forms if f['fields'].get('flagMenu')=='1')
            self.sessions[kind]=(op,form)
        return self.sessions[kind]
    def query(self,kind,authority,vessel,start,end):
        params={'kind':kind,'authority':authority,'vessel':vessel,'from':start,'through':end}
        key=hashlib.sha256(json.dumps(params,sort_keys=True).encode()).hexdigest();path=self.out/'queries'/(key+'.json')
        if path.exists():
            saved=json.loads(path.read_text(encoding='utf8'))
            if saved['parameters']!=params:raise ValueError('Cached query mismatch')
            self.query_records.append(saved);return saved
        if self.offline:raise ValueError('Offline query evidence missing')
        if self.queries>=self.max_queries:raise RuntimeError('Listing-query cap reached; resume from cache')
        self.queries+=1;op,form=self.session(kind)
        fields={**form['fields'],'maritimeCode':authority,'portCode':'','shipName':vessel,'certificateNumber':'','callSign':'',
            'shipDateFrom':dt.date.fromisoformat(start).strftime('%d/%m/%Y 00:00'),'shipDateTo':dt.date.fromisoformat(end).strftime('%d/%m/%Y 23:59')}
        raw=self.read(form['action'],fields,op);page=n.parse(raw)
        if page.selected.get('maritimeCode')!=authority or any(page.inputs.get(k)!=fields[k] for k in ['shipName','shipDateFrom','shipDateTo']):raise ValueError('Filters lost')
        total=n.total_rows(page)
        if total>20:raise ValueError('Target query exceeds single-page research cap; cannot claim complete')
        if kind=='plan':rows=n.listing_rows(page)
        else:
            rows=[]
            for r in page.rows:
                cells=[' '.join(c.split()) for c in r['cells']]
                if len(cells)!=8 or not cells[0].isdigit():continue
                links=[a['href'] for a in r['links'] if 'viewKetQuaHoSoEnglish(' in a.get('href','')]
                if len(links)!=1:raise ValueError('Ambiguous clearance view')
                match=re.search(r"viewKetQuaHoSoEnglish\('([^']+)'",links[0]);url=n.safe_url(match[1]);q=n.qp.parse_qs(n.qp.urlsplit(url).query)
                native={k.removeprefix(n.NS):v[0] for k,v in q.items() if k.startswith(n.NS)}
                if native.get('MESSAGE_TYPE')!='60' or native.get('jspPage')!='/html/report_export.jsp':raise ValueError('Wrong clearance resource')
                rows.append({'cells':cells,'view_url':url,'native':native,'key':hashlib.sha256(url.encode()).hexdigest()})
        if len(rows)!=total:raise ValueError('Incomplete bounded listing')
        saved={'parameters':params,'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'raw_sha256':hashlib.sha256(raw).hexdigest(),
            'total':total,'complete_listing':True,'rows':rows}
        path.write_text(json.dumps(saved,ensure_ascii=False,indent=2)+'\n',encoding='utf8');self.query_records.append(saved)
        self.sessions[kind]=(op,next(f for f in page.forms if f['fields'].get('flagMenu')==('2' if kind=='plan' else '1')))
        return saved
    def document(self,row,kind):
        key=row['key'];path=self.out/'documents'/(key+'.json')
        if key in self.documents:return self.documents[key]
        if path.exists():
            doc=json.loads(path.read_text(encoding='utf8'));pdf=self.out/'pdf'/(doc['sha256']+'.pdf')
            if not pdf.exists() or hashlib.sha256(pdf.read_bytes()).hexdigest()!=doc['sha256']:raise ValueError('Cached PDF integrity failure')
        else:
            if self.offline:raise ValueError('Offline PDF evidence missing')
            if self.downloads>=self.max_documents:raise RuntimeError('PDF cap reached; resume from cache')
            self.downloads+=1;detail=self.read(row['view_url']).decode('utf8');match=re.search(r'<object[^>]+data=["\']([^"\']+)',detail,re.I)
            if not match:raise ValueError('Public PDF missing')
            url=n.safe_url(n.qp.urljoin(n.BASE,html.unescape(match[1])))
            if not n.qp.urlsplit(url).path.startswith(('/documents/','/TichHopGiaoThong-portlet/export/')):raise ValueError('Unreviewed PDF path')
            raw=self.read(url)
            if not raw.startswith(b'%PDF'):raise ValueError('Not PDF')
            sha=hashlib.sha256(raw).hexdigest();pdf=self.out/'pdf'/(sha+'.pdf');pdf.write_bytes(raw)
            doc={'key':key,'kind':kind,'vessel':row['cells'][2],'call_sign':row['cells'][4],'listing_cells':row['cells'],
                'sha256':sha,'source_url':url,'view_url':row['view_url'],'native':row['native'],
                'checked_at':dt.datetime.now(dt.timezone.utc).isoformat()}
            path.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
        if doc['kind']!=kind:raise ValueError('Cached resource kind mismatch')
        # Reparse the archived bytes, never trust stale cached extraction after code changes.
        parsed=review.sample_pdf(pdf,allow_vung_tau=True) if kind=='plan' else clearance_pdf(pdf)
        if kind=='clearance':
            with pdfplumber.open(pdf) as book:text='\n'.join(page.extract_text() or '' for page in book.pages)
            if compact(doc['vessel']) not in compact(text) or (compact(doc['call_sign']) and compact(doc['call_sign']) not in compact(text)):
                raise ValueError('Clearance PDF identity differs from listing')
        doc['parsed']=parsed;doc['parser_version']='hcm-national-matrix-document/1'
        path.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
        self.documents[key]=doc;return doc

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--max-queries',type=int,default=160);parser.add_argument('--max-documents',type=int,default=120);parser.add_argument('--offline',action='store_true');args=parser.parse_args()
    if not 1<=args.max_queries<=160 or not 1<=args.max_documents<=120:raise ValueError('Invalid research limits')
    manifest=json.loads(DEFAULT_CASES.read_text(encoding='utf8'));cases=manifest['cases']
    if len(cases)>44 or manifest['review_version']!='hcm-national-matrix/1':raise ValueError('Unexpected case matrix')
    out=ROOT/'.local/hcm-national-matrix';audit=Audit(out,args.max_queries,args.max_documents,args.offline)
    receipt={'review_version':'hcm-national-matrix/1','started_at':dt.datetime.now(dt.timezone.utc).isoformat(),
        'case_manifest_sha256':hashlib.sha256(DEFAULT_CASES.read_bytes().replace(b'\r\n',b'\n')).hexdigest(),
        'windows':manifest['windows'],'case_count':len(cases),'no_observations':manifest['no_observations'],'cases':[],
        'replacement_verified':False,'publication_performed':False,'actual_verified':False,'production_accepted':False}
    try:
        for i,case in enumerate(cases):
            case={**case,'case_id':str(i+1)};event=case['event'];day=dt.date.fromisoformat(case['day']);docs={};errors=[]
            for kind in ['plan']+(['clearance'] if event['section']=='departure' else []):
                for authority in ['21','12']:
                    try:
                        listing=audit.query(kind,authority,event['vessel'],str(day-dt.timedelta(days=2)),str(day+dt.timedelta(days=2)))
                        for row in listing['rows']:
                            if compact(row['cells'][2])!=compact(event['vessel']) or compact(row['cells'][4])!=compact(event['call_sign']):continue
                            doc=audit.document(row,kind);docs[doc['key']]=doc
                    except urllib.error.HTTPError as error:
                        if error.code==429:receipt['retry_after']=error.headers.get('Retry-After');raise
                        errors.append({'resource':kind,'authority':authority,'error':type(error).__name__+': '+str(error)})
                    except (OSError,ValueError) as error:errors.append({'resource':kind,'authority':authority,'error':type(error).__name__+': '+str(error)})
            result=compare(case,list(docs.values()));result['query_errors']=errors
            if errors:result['query_coverage_complete']=False
            else:result['query_coverage_complete']=True
            receipt['cases'].append(result)
            (out/'audit.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
            print(json.dumps({'processed':i+1,'cases':len(cases),'queries':audit.queries,'pdfs':audit.downloads,'status':result['status'],'errors':len(errors)}),flush=True)
        receipt['status']='completed'
    except Exception as error:
        receipt['status']='stopped';receipt['error']=type(error).__name__+': '+str(error);raise
    finally:
        receipt['finished_at']=dt.datetime.now(dt.timezone.utc).isoformat();receipt['network_queries']=audit.queries;receipt['new_pdf_downloads']=audit.downloads
        receipt['documents']=list(audit.documents.values());receipt['queries']=audit.query_records
        (out/'audit.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if __name__=='__main__':main()
