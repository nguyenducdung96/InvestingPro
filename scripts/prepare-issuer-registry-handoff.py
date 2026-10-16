"""Combine reviewed research outputs into one pending-only, atomic import.

This prepares files locally. It never connects to a database or publishes data.
"""
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/catalog-review'
IMPORT = ROOT / 'supabase/imports'
BATCHES = [
    ('registry-proposals-manifest.json', 'hnx_registry.proposals.sql', None),
    ('issuer-registry-proposals-manifest.json', 'hose_registry.proposals.sql', 'companies'),
    ('vsc-registry-proposals-manifest.json', 'vsc_registry.proposals.sql', 'single'),
    ('expanded-issuer-registry-manifest.json', 'expanded_issuer_registry.proposals.sql', 'items'),
    ('market-issuer-registry-manifest.json', 'market_issuer_registry.proposals.sql', 'items'),
    ('final-issuer-identities-manifest.json', 'final_issuer_identities.proposals.sql', 'items'),
]


def compile_bundle():
    items, bodies, inputs = [], [], []
    for manifest_name, sql_name, key in BATCHES:
        manifest = json.loads((DOC / manifest_name).read_text(encoding='utf-8'))
        rows = [manifest] if key == 'single' else manifest[key] if key else manifest
        for row in rows:
            items.append({
                'ticker': row['ticker'], 'company_id': row['company_id'],
                'legal_name': row['legal_name'],
                'exchange_as_reported': row.get('exchange', 'HOSE'),
                'first_trading_date_as_reported': row.get('first_trading_date'),
                'enterprise_id_as_reported': row.get('enterprise_id'),
                'group': row.get('group', 'requires_asset_scope_review'),
                'current_status_verified': False,
                'lineage_manifest': manifest_name,
            })
        raw = (IMPORT / sql_name).read_bytes()
        sql = raw.decode('utf-8-sig').replace('\r\n', '\n')
        start = list(re.finditer(r'^begin;\s*$', sql, re.M | re.I))
        end = list(re.finditer(r'^commit;\s*$', sql, re.M | re.I))
        if len(start) != 1 or len(end) != 1 or start[0].end() >= end[0].start():
            raise ValueError(f'Expected one outer transaction: {sql_name}')
        bodies.append(f'-- Input: {sql_name}\n' + sql[start[0].end():end[0].start()].strip())
        inputs.append({'file': sql_name, 'sha256': hashlib.sha256(raw).hexdigest()})
    if len({x['ticker'] for x in items}) != len(items) or len({x['company_id'] for x in items}) != len(items):
        raise ValueError('Duplicate ticker or company identity; reconcile before bundling')
    items.sort(key=lambda x: x['ticker'])
    ids = ','.join("'" + x['company_id'] + "'" for x in items)
    result = {
        'publication_status': 'pending', 'cloud_applied': False,
        'universe_complete': False, 'current_market_status_certified': False,
        'company_count': len(items),
        'listing_history_count': sum(x['first_trading_date_as_reported'] is not None for x in items),
        'missing_listing_dates': [x['ticker'] for x in items if x['first_trading_date_as_reported'] is None],
        'input_sql': inputs, 'items': items,
    }
    (DOC / 'issuer-universe-manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    checks = f"""
select 'companies' as dataset,count(*) as rows from catalog.companies where id in ({ids})
union all
select 'listing_histories',count(*) from catalog.company_listings where company_id in ({ids});
"""
    output = '-- OFFLINE ONLY: pending proposals; no source approval or publication.\n'
    output += '-- Keep the whole transaction. Any conflict requires reconciliation, never skip a guard.\n'
    output += 'begin;\n\n' + '\n\n'.join(bodies) + '\n\ncommit;\n' + checks
    (IMPORT / 'issuer_registry_all.handoff.sql').write_text(output, encoding='utf-8', newline='\n')
    # Asset imports need the canonical catalog already installed. Keep them in
    # a separate explicitly named handoff instead of changing registry-only SQL.
    asset_bodies, asset_inputs = [], []
    for name in ['vgr_operator.proposal.sql', 'dvp_assets.proposals.sql', 'pap_assets.proposals.sql', 'inland_depots.proposals.sql', 'registry_identity_enrichment.proposals.sql']:
        raw = (IMPORT / name).read_bytes()
        sql = raw.decode('utf-8-sig').replace('\r\n', '\n')
        start = list(re.finditer(r'^begin;\s*$', sql, re.M | re.I))
        end = list(re.finditer(r'^commit;\s*$', sql, re.M | re.I))
        if len(start) != 1 or len(end) != 1 or start[0].end() >= end[0].start():
            raise ValueError(f'Expected one asset transaction: {name}')
        asset_bodies.append(f'-- Input: {name}\n' + sql[start[0].end():end[0].start()].strip())
        asset_inputs.append({'file': name, 'sha256': hashlib.sha256(raw).hexdigest()})
    combined = '-- OFFLINE ONLY. Requires the existing canonical catalog; no approvals or cloud execution.\n'
    combined += 'begin;\n\n' + '\n\n'.join(bodies + asset_bodies) + '\n\ncommit;\n' + checks
    combined += f"select i.asset_kind,i.verification_status,count(*) as rows from port.company_asset_interests i where i.company_id in ({ids}) group by i.asset_kind,i.verification_status order by i.asset_kind,i.verification_status;\n"
    (IMPORT / 'slice1_company_catalog.handoff.sql').write_text(combined, encoding='utf-8', newline='\n')
    (DOC / 'company-catalog-handoff-manifest.json').write_text(json.dumps({
        'publication_status': 'pending', 'cloud_applied': False,
        'prerequisite': 'Existing reviewed canonical catalog, including 505 commercial subset',
        'input_sql': inputs + asset_inputs,
        'company_count': len(items), 'listing_history_count': result['listing_history_count'],
        'new_interest_proposal_count': 9,
        'warning': 'Research dossiers with unknown dates are not emitted as interests. This is not a complete market coverage certification.',
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Prepared {result['company_count']} company identities / {result['listing_history_count']} listing histories; not applied to cloud")


if __name__ == '__main__':
    compile_bundle()
