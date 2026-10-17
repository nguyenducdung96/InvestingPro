"""Build InvestingPro's factual, report-period editorial edition, not an API export.

Only the explicit public field list is emitted. Source documents, prose, API
profiles, provider investments and private evidence paths are never included.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def build():
    folder = ROOT / 'docs/catalog-review'
    universe = {x['ticker']: x for x in json.loads((folder/'issuer-universe-manifest.json').read_text(encoding='utf-8'))['items']}
    dossiers = json.loads((folder/'company-portfolios-manifest.json').read_text(encoding='utf-8'))['items']
    entries = []
    for d in dossiers:
        e = d['evidence']
        raw = (ROOT/'.local/catalog-research'/d['artifact_label']).read_bytes()
        if not e['r2_verified'] or hashlib.sha256(raw).hexdigest() != e['content_hash']:
            raise ValueError('Evidence not intact: '+d['ticker'])
        company = universe[d['ticker']]
        assets = []
        for a in d['assets']:
            assets.append(dict(name=a.get('name', a.get('canonical_terminal_name')), kind=a.get('asset_kind','terminal'), role=a['role'], via=a['via'], berth_scope=a.get('berth_subset',[]), scope_group=a.get('scope_group','main'), started_on=a['effective_from'] if a.get('date_basis')=='reported_first_vessel_and_operation' else None, documented_date=a['effective_from'], date_basis=a.get('date_basis')))
        market=company['exchange_as_reported']
        entries.append(dict(ticker=d['ticker'], company_id=company['company_id'], name=company['legal_name'], market_as_reported='UPCoM' if market=='UPCOM' else market, period=d['reporting_period_end'], source=dict(url=e['source_url'],sha256=e['content_hash'],pages=d['reviewed_pages']), assets=assets, research_paths=[dict(ticker=p['child_ticker'],asset=p['name']) for p in d.get('derived_candidates',[])]))
    if len(entries)!=41 or sum(len(x['assets']) for x in entries)!=63:
        raise ValueError('Unexpected editorial scope')
    return dict(schema='slice1-editorial-facts-v1', entries=sorted(entries,key=lambda x:x['ticker']))

if __name__=='__main__':
    data=build()
    out=ROOT/'.local/company-refresh/public-catalog.json'
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (ROOT/'docs/catalog-review/public-catalog-facts.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Exported 41 editorial dossiers / 63 reported facts; no provider payload or document prose')
