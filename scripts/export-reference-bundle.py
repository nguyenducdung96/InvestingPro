"""Export checksum-verified scoped API snapshots for the authenticated admin UI."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def export(output=None):
    base=output or ROOT/'.local/company-refresh'
    scope=json.loads((ROOT/'docs/catalog-review/reported-catalog-manifest.json').read_text(encoding='utf-8'))['items']
    entries=[]
    for company in scope:
        ticker=company['ticker']; folder=base/'by-ticker'/ticker
        path=folder/'vnstock-vci/organizations/latest.json'
        if not path.exists():
            continue
        state=json.loads(path.read_text(encoding='utf-8'))
        raw=(folder/'raw'/(state['raw_sha256']+'.json')).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=state['raw_sha256']:
            raise ValueError('Raw checksum mismatch: '+ticker)
        rows=json.loads(raw)
        if len(rows)!=1 or rows[0].get('symbol')!=ticker:
            raise ValueError('Raw ticker mismatch: '+ticker)
        entries.append(dict(company_id=company['company_id'],ticker=ticker,provider='vnstock-vci',fetched_at=state['fetched_at'],raw_sha256=state['raw_sha256'],raw_text=raw.decode('utf-8')))
    if not entries:raise ValueError('No snapshots available')
    bundle=dict(schema='slice1-reference-refresh-v1',entries=entries)
    (base/'staging-bundle.json').write_text(json.dumps(bundle,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    return len(entries)


if __name__=='__main__':
    print('Exported',export(),'profiles to .local/company-refresh/staging-bundle.json')
