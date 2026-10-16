"""Check the agreed report-snapshot scope, separately from public licensing.

No network or approvals. A matching deployment receipt is required to record
staging acceptance; missing historical start dates are informational only.
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/catalog-review'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def assess():
    manifest = read(DOC / 'reported-catalog-manifest.json')
    portfolios = read(DOC / 'company-portfolios-manifest.json')['items']
    archive = read(DOC / 'r2-additional-readback-20261016.json')
    known = {r['content_hash'] for r in archive['items'] if r['status'] == 'sha256_readback_verified'}
    errors = []
    if set(r['ticker'] for r in manifest['items']) != set(d['ticker'] for d in portfolios) or len(manifest['items']) != 41:
        errors.append('The fixed 41-issuer scope is incomplete or changed')
    if sum(r['observation_count'] for r in manifest['items']) != 63 or manifest['observation_count'] != 63:
        errors.append('Observation coverage differs from the reviewed snapshot')
    for d in portfolios:
        if not d['reviewed_pages'] or not d['notes'].strip() or d['evidence']['content_hash'] not in known:
            errors.append('Missing pages, review result or archived primary evidence: ' + d['ticker'])
        for support in d.get('supporting_artifacts', []):
            if support['evidence']['content_hash'] not in known:
                errors.append('Unarchived supporting evidence: ' + d['ticker'])
    digest = hashlib.sha256((ROOT / 'supabase/imports/reported_catalog_2025.pending.sql').read_bytes()).hexdigest()
    if digest != manifest['sql_sha256']:
        errors.append('Snapshot SQL changed after manifest generation')
    receipt_path = DOC / 'reported-catalog-staging-receipt-20261016.json'
    receipt = read(receipt_path) if receipt_path.exists() else {}
    applied = receipt.get('sql_sha256') == digest and receipt.get('project_id') == 'loapslojajawgzekozfv' and receipt.get('counts', {}).get('dossiers') == 41 and receipt.get('counts', {}).get('observations') == 63
    deployed = applied and receipt.get('authenticated_ui_verified') is True and receipt.get('pending_publication_hidden') is True and receipt.get('rls_enabled') is True
    return dict(scope_version=manifest['scope_version'],
                snapshot_scope_status='accepted_on_staging' if deployed and not errors else 'ready_for_staging_verification' if not errors else 'failed',
                integrity_errors=errors, cloud_snapshot_applied=applied, authenticated_ui_verified=deployed,
                summary=dict(dossiers=41, observations=63, research_paths=manifest['research_path_count'], unknown_relationship_start_dates=sum(a.get('date_basis') != 'reported_first_vessel_and_operation' or a['effective_from'] is None for d in portfolios for a in d['assets'])),
                historical_dates_required_for_snapshot_acceptance=False,
                public_publication_status='pending_source_and_fact_review',
                not_certified=['Current trading/ownership status','Complete market-wide universe','Public redistribution rights for pending sources'],
                acceptance_receipt=receipt_path.name if applied else None)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write-report', action='store_true')
    parser.add_argument('--require-deployed', action='store_true')
    args = parser.parse_args()
    result = assess()
    if args.write_report:
        (DOC / 'reported-catalog-acceptance.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(int(bool(result['integrity_errors']) or args.require_deployed and not result['authenticated_ui_verified']))
