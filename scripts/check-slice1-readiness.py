"""Validate the offline Slice 1 handoff and enumerate remaining acceptance gaps.

No network, database writes, publication or source approvals. Default checks
bundle integrity; --require-complete also fails for unresolved acceptance gaps.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(root, name):
    return json.loads((root / name).read_text(encoding='utf-8'))


def assess(root):
    prefix = 'docs/catalog-review/'
    bundle = read(root, prefix + 'company-catalog-handoff-manifest.json')
    universe = read(root, prefix + 'issuer-universe-manifest.json')
    portfolios = read(root, prefix + 'company-portfolios-manifest.json')
    artifacts = read(root, prefix + 'evidence-artifacts.json')['artifacts']
    receipt = read(root, prefix + 'r2-additional-readback-20261016.json')
    sql = (root / 'supabase/imports/slice1_company_catalog.handoff.sql').read_text(encoding='utf-8')
    errors = []
    for item in bundle['input_sql']:
        path = root / 'supabase/imports' / item['file']
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != item['sha256']:
            errors.append('Input SQL missing or changed: ' + item['file'])
            continue
        source_sql = path.read_text(encoding='utf-8-sig').replace('\r\n', '\n')
        starts = list(re.finditer(r'^begin;\s*$', source_sql, re.M | re.I))
        ends = list(re.finditer(r'^commit;\s*$', source_sql, re.M | re.I))
        if len(starts) != 1 or len(ends) != 1 or source_sql[starts[0].end():ends[0].start()].strip() not in sql:
            errors.append('Combined handoff omits or changes input: ' + item['file'])
    if len(re.findall(r'^begin;\s*$', sql, re.M | re.I)) != 1 or len(re.findall(r'^commit;\s*$', sql, re.M | re.I)) != 1:
        errors.append('Combined handoff must have exactly one outer transaction')
    referenced = set(re.findall(r'catalog-evidence/sha256/([a-f0-9]{64})', sql))
    checked = {a['content_hash'] for a in receipt['items'] if a['status'] == 'sha256_readback_verified' and a['raw_storage_key'] == 'catalog-evidence/sha256/' + a['content_hash']}
    if receipt['bucket'] != 'investing-pro-evidence-staging' or receipt['public_access_changed'] or receipt['publication_performed']:
        errors.append('Archive receipt has unexpected scope')
    if referenced - checked:
        errors.append(f'{len(referenced - checked)} referenced raw artifacts lack a private readback receipt')
    issuers = {a['ticker']: a for a in universe['items']}
    dossiers = {a['ticker']: a for a in portfolios['items']}
    if set(issuers) != set(dossiers) or len(issuers) != bundle['company_count']:
        errors.append('Registry and portfolio issuer coverage disagree')
    if sum(a['first_trading_date_as_reported'] is not None for a in issuers.values()) != bundle['listing_history_count']:
        errors.append('Listing count disagrees with the handoff manifest')
    companies = []
    for ticker, dossier in sorted(dossiers.items()):
        missing = []
        unmatched = []
        for asset in dossier['assets']:
            name = asset.get('name', asset.get('canonical_terminal_name', 'Unnamed observation'))
            if asset['effective_from'] is None:
                missing.append(name)
            if not asset.get('canonical_terminal_id'):
                unmatched.append(name)
        companies.append(dict(ticker=ticker, company_id=issuers[ticker]['company_id'],
                              historical_listing_date=issuers[ticker]['first_trading_date_as_reported'],
                              current_status_verified=dossier['current_status_verified'],
                              asset_observations=len(dossier['assets']),
                              missing_effective_dates=missing, observations_without_canonical_terminal=unmatched,
                              review_gaps=dossier['unresolved']))
    gaps = []
    snapshot_scope = (root / prefix / 'reported-catalog-manifest.json').exists()
    if not snapshot_scope and (not universe['universe_complete'] or not portfolios['universe_complete']):
        gaps.append('Market universe has not been reconciled across HOSE/HNX/UPCoM')
    undated = sum(len(c['missing_effective_dates']) for c in companies)
    if undated and not snapshot_scope:
        gaps.append(f'{undated} asset observations lack exact relationship dates')
    current = sum(not c['current_status_verified'] for c in companies)
    if current and not snapshot_scope:
        gaps.append(f'{current} issuer dossiers lack current-status verification')
    if not snapshot_scope and any(c['review_gaps'] for c in companies):
        gaps.append('Company-specific identity, asset, legal or indirect-chain reviews remain open')
    unreviewed_sources = sum(a['rights_status'] != 'approved' for a in artifacts)
    if unreviewed_sources:
        gaps.append(f'{unreviewed_sources} artifact source-rights entries remain unapproved (not distinct legal publishers)')
    execution_path = root / prefix / 'company-catalog-cloud-import-receipt-20261016.json'
    execution = read(root, prefix + execution_path.name) if execution_path.exists() else {}
    cloud_applied = (execution.get('cloud_applied') is True
                     and execution.get('bundle_sha256') == hashlib.sha256((root / 'supabase/imports/slice1_company_catalog.handoff.sql').read_bytes()).hexdigest()
                     and execution.get('project_id') == 'loapslojajawgzekozfv'
                     and execution.get('counts', {}).get('handoff_companies') == bundle['company_count']
                     and execution.get('counts', {}).get('handoff_listings') == bundle['listing_history_count']
                     and execution.get('counts', {}).get('handoff_pending_interests') == bundle['new_interest_proposal_count'])
    if not cloud_applied:
        gaps.append('Latest company/asset handoff has not been applied and accepted on staging')
    # This is an offline evidence check, never proof of publication or live UI.
    gaps.append('Live admin decisions, public API/UI and per-issuer coverage need a staging acceptance receipt')
    return dict(scope='public_publication_readiness' if snapshot_scope else 'offline_handoff_readiness_only', complete=False,
                snapshot_acceptance_report='reported-catalog-acceptance.json' if snapshot_scope else None,
                integrity_ok=not errors, integrity_errors=errors, acceptance_gaps=gaps,
                summary=dict(company_count=len(companies), listing_history_count=bundle['listing_history_count'],
                             pending_interest_proposals=bundle['new_interest_proposal_count'],
                             asset_observations=sum(c['asset_observations'] for c in companies),
                             observations_without_exact_effective_date=undated,
                             archive_receipt_items=len(receipt['items']), cloud_applied=cloud_applied),
                companies=companies)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--require-complete', action='store_true')
    parser.add_argument('--write-report', action='store_true')
    args = parser.parse_args()
    result = assess(ROOT)
    if args.write_report:
        (ROOT / 'docs/catalog-review/slice1-readiness.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k != 'companies'}, ensure_ascii=False, indent=2))
    return int(not result['integrity_ok'] or (args.require_complete and not result['complete']))


if __name__ == '__main__':
    raise SystemExit(main())
