"""Bounded read-only HCM national plan samples; never publishes application data."""
import datetime as dt
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import pdfplumber
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.local/hcm-national-review'
spec=importlib.util.spec_from_file_location('national',ROOT/'scripts/collect-gemalink-national.py')
national=importlib.util.module_from_spec(spec);spec.loader.exec_module(national)
spec=importlib.util.spec_from_file_location('geometry',ROOT/'scripts/gemalink-national-parser.py')
geometry=importlib.util.module_from_spec(spec);spec.loader.exec_module(geometry)
SAMPLES=[('2025-01-01','HINANO'),('2026-10-25','NYK OCEANUS'),('2026-10-30','NEWSUN GREEN 03')]

def sample_pdf(path,allow_vung_tau=False):
    reader=PdfReader(path);text='\n'.join(page.extract_text() or '' for page in reader.pages)
    compact=geometry.compact(text)
    authorities=['CANGVUHANGHAITPHOCHIMINH','CANGVUHANGHAITHANHPHOHOCHIMINH']+(['CANGVUHANGHAIVUNGTAU'] if allow_vung_tau else [])
    if 'KEHOACHDIEUDONGTAUTHUYEN' not in compact or not any(label in compact for label in authorities):
        raise ValueError('Not an HCM authority published movement-plan PDF')
    rows=[]
    with pdfplumber.open(path) as pdf:
        for number,page in enumerate(pdf.pages,1):
            for table in page.find_tables():
                values=table.extract();header=values[0];indices=[]
                for mark in ['TIME','NAMEOFSHIP','DRAFT','LOA','DWT','TUGBOAT','CHANNEL','FROM','TO','AGENT']:
                    matches=[i for i,h in enumerate(header) if geometry.compact(h).endswith(mark)]
                    if len(matches)!=1:break
                    indices.append(matches[0])
                if len(indices)!=10 or len(set(indices))!=10:continue
                for row in values[1:]:
                    raw=[row[i] for i in indices];fields=[' '.join((s or '').split()) for s in raw]
                    match=re.fullmatch(r'(\d{2}/\d{2}/\d{4})[\s-]+(\d{2}):?(\d{2})(?:\s*LT)?',fields[0])
                    if not match:raise ValueError('Unrecognized movement plan time')
                    stamp=dt.datetime.strptime(match[1]+' '+match[2]+':'+match[3],'%d/%m/%Y %H:%M')
                    rows.append({'page':number,'raw':raw,'planned_day':str(stamp.date()),'planned_time':stamp.strftime('%H:%M'),
                        'vessel':fields[1],'dwt':geometry.source_number(fields[4]),'from':fields[7],'to':fields[8],
                        'direction':None,'asset_mapping_verified':False})
    if not rows:raise ValueError('Expected DWT/From/To table not found')
    return {'pages':len(reader.pages),'semantics':'authority_published_plan','rows':rows,'actual_verified':False}

def run():
    OUT.mkdir(parents=True,exist_ok=True)
    for name in ['documents','pdf','errors']:(OUT/name).mkdir(exist_ok=True)
    national.OUT=OUT
    receipt={'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'source_url':national.BASE,'maritime_code':'21',
        'status':'in_progress','samples':[],'publication_performed':False,'replacement_verified':False,
        'execution_environment':'github_actions' if os.environ.get('GITHUB_ACTIONS')=='true' else 'local',
        'run_id':os.environ.get('GITHUB_RUN_ID'),'cloud_samples_verified':False,
        'scheduled_refresh_verified':False,'actual_verified':False,'full_scope_certified':False}
    try:
        op,raw,page,form=national.bootstrap()
        if not re.search(r'<option[^>]+value=["\']21["\'][^>]*>\s*TP\.\s*HỒ CHÍ MINH',raw.decode('utf8')):
            raise ValueError('HCM authority option changed')
        for day,vessel in SAMPLES:
            d=dt.date.fromisoformat(day)
            fields={**form['fields'],'maritimeCode':'21','portCode':'','shipName':'','certificateNumber':'','callSign':'',
                'shipDateFrom':d.strftime('%d/%m/%Y 00:00'),'shipDateTo':d.strftime('%d/%m/%Y 23:59')}
            raw=national.read(form['action'],fields,op);page=national.parse(raw)
            if page.selected.get('maritimeCode')!='21' or any(page.inputs.get(k)!=fields[k] for k in ['shipDateFrom','shipDateTo']):
                raise ValueError('Public query filters lost')
            rows=national.listing_rows(page);selected=[row for row in rows if row['cells'][2]==vessel]
            if len(selected)!=1:raise ValueError('Expected bounded vessel sample missing or ambiguous')
            row=selected[0];result=national.fetch_document(row)
            if result not in ['ok','cached']:raise ValueError('Public PDF sample download failed: '+result)
            document=json.loads((OUT/'documents'/(row['key']+'.json')).read_text(encoding='utf8'))
            parsed=sample_pdf(OUT/'pdf'/(document['sha256']+'.pdf'))
            if not any(r['vessel']==vessel for r in parsed['rows']):raise ValueError('PDF vessel differs from selected listing')
            receipt['samples'].append({'query_day':day,'filters_verified':True,'listing_sha256':hashlib.sha256(raw).hexdigest(),
                'listing_total':national.total_rows(page),'listed_rows_inspected':len(rows),'listing_complete':False,
                'selected_listing_cells':row['cells'],'document':document,'parsed':parsed})
            form=next(f for f in page.forms if f['fields'].get('flagMenu')=='2')
        receipt['status']='success'
        receipt['cloud_samples_verified']=os.environ.get('GITHUB_ACTIONS')=='true'
        # Success proves only these samples, never full source equivalence or schedule acceptance.
    except Exception as error:
        receipt['status']='failed';receipt['error']=type(error).__name__+': '+str(error)
        raise
    finally:
        receipt['completed_at']=dt.datetime.now(dt.timezone.utc).isoformat()
        (OUT/'review.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
        print(json.dumps({'status':receipt['status'],'samples':len(receipt['samples']),'replacement_verified':False}),flush=True)

if __name__=='__main__':run()
