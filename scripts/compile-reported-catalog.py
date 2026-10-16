"""Compile the fixed 41-issuer, 2025 report snapshot. Never approves sources.

Missing commencement dates and unmatched assets remain explicit, without
creating an effective ownership/operator interest or asserting current status.
"""
import hashlib
import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/catalog-review'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def key(value):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, 'investingpro:reported-catalog-2025-v1:' + value))


def lit(value):
    return 'NULL' if value is None else "'" + str(value).replace("'", "''") + "'"


def values(row):
    return '(' + ','.join(lit(v) for v in row) + ')'


def compile_catalog():
    universe = read(DOC / 'issuer-universe-manifest.json')
    dossiers = read(DOC / 'company-portfolios-manifest.json')['items']
    companies = {r['ticker']: r for r in universe['items']}
    icds = {(r['ticker'],r['name']):r['asset_id'] for r in read(DOC / 'inland-depots-proposals-manifest.json')['items']}
    if set(companies) != {d['ticker'] for d in dossiers} or len(dossiers) != 41:
        raise ValueError('Scope must contain exactly the agreed 41 issuer dossiers')
    sql = ['-- Report-period snapshots only. No rights approvals or effective interests.', 'begin;']
    exported = []
    for d in dossiers:
        ticker = d['ticker']
        company = companies[ticker]
        artifact = d['evidence']
        raw = (ROOT / '.local/catalog-research' / d['artifact_label']).read_bytes()
        if hashlib.sha256(raw).hexdigest() != artifact['content_hash'] or not artifact['r2_verified']:
            raise ValueError('Unarchived or changed evidence: ' + ticker)
        source, record, dossier = key(ticker + ':source'), key(ticker + ':record:' + artifact['content_hash']), key(ticker + ':dossier')
        sql.append(f"do $$ begin if not exists(select 1 from catalog.companies where id={lit(company['company_id'])}) then raise exception 'Missing scoped company: {ticker}'; end if; end $$;")
        sql += [
            'insert into core.sources(id,code,name,owner,source_class,base_url,rights_status,rights_notes) values ' + values((source, 'snapshot_2025_' + ticker.lower(), ticker + ' – dữ kiện theo báo cáo 2025, chờ duyệt nguồn', company['legal_name'], 'official_company', artifact['source_url'], 'to_verify', 'Chỉ phạm vi dữ kiện có dẫn trang của hồ sơ 2025; không cấp phép toàn báo cáo, website hoặc dữ liệu sàn.')) + ' on conflict do nothing;',
            'insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,fetched_at,reporting_period_start,reporting_period_end,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status) values ' + values((record, source, artifact['source_url'], artifact['source_url'], ticker + ':report-snapshot-2025', artifact['published_at'], artifact['fetched_at'], '2025-01-01', '2025-12-31', 'application/pdf', artifact['content_hash'], artifact['raw_storage_key'], 'manual-page-dossier-review', 'reported-catalog-v1', 'incomplete')) + ' on conflict do nothing;',
            'insert into port.catalog_dossiers(id,company_id,ticker,reporting_period_end,source_record_id,reviewed_pages,review_outcome,review_note,gaps,scope_version) values ' + values((dossier, company['company_id'], ticker, '2025-12-31', record, '{' + ','.join(map(str, d['reviewed_pages'])) + '}', 'reported_assets' if d['assets'] else 'no_assertable_assets', d['notes'], json.dumps(d['unresolved'], ensure_ascii=False), 'listed-port-candidates-41-report-2025-v1')) + ' on conflict do nothing;'
        ]
        dossier_expected = dict(company_id=company['company_id'],ticker=ticker,reporting_period_end='2025-12-31',source_record_id=record,reviewed_pages=d['reviewed_pages'],review_note=d['notes'],gaps=d['unresolved'])
        sql.append(f"do $$ begin if not exists(select 1 from port.catalog_dossiers d where d.id={lit(dossier)} and to_jsonb(d) @> {lit(json.dumps(dossier_expected,ensure_ascii=False))}::jsonb) then raise exception 'Dossier conflict: {ticker}; append a new scope version'; end if; end $$;")
        for index, asset in enumerate(d['assets']):
            # Prefer the asset's primary dossier; supporting documents retain
            # their own page/hash references rather than replacing its lineage.
            name = asset.get('name', asset.get('canonical_terminal_name'))
            if not name:
                raise ValueError('Unnamed observation: ' + ticker)
            kind = asset.get('asset_kind', 'terminal')
            canonical = asset.get('canonical_terminal_id') or icds.get((ticker,name))
            group = asset.get('scope_group','main')
            supporting = [dict(artifact_label=s['artifact_label'], reviewed_pages=s['reviewed_pages'], **s['evidence']) for s in d.get('supporting_artifacts', [])]
            row = (key(ticker + ':observation:' + str(index)), dossier, company['company_id'], canonical, name, kind, asset['role'], json.dumps(asset['via'], ensure_ascii=False), json.dumps(asset.get('berth_subset', []), ensure_ascii=False), '2025-12-31', asset['effective_from'], asset.get('date_basis'), record, json.dumps(supporting, ensure_ascii=False), '{' + ','.join(map(str, d['reviewed_pages'])) + '}', d['notes'],group)
            sql.append('insert into port.reported_asset_observations(id,dossier_id,company_id,asset_id,asset_name,asset_kind,reported_role,via,berth_scope,reporting_period_end,relationship_started_on,date_basis,source_record_id,supporting_evidence,evidence_pages,evidence_note,scope_group) values ' + values(row) + ' on conflict do nothing;')
            # Forward enrichment for unchanged pending rows from the initial snapshot import.
            sql.append(f"update port.reported_asset_observations set asset_id={lit(canonical)},scope_group={lit(group)} where id={lit(row[0])} and verification_status='pending' and source_record_id={lit(record)} and asset_name={lit(name)} and (asset_id is null or asset_id is not distinct from {lit(canonical)}::uuid) and (asset_id is distinct from {lit(canonical)}::uuid or scope_group<>{lit(group)});")
            expected = dict(dossier_id=dossier,company_id=company['company_id'],asset_id=canonical,asset_name=name,asset_kind=kind,reported_role=asset['role'],via=asset['via'],berth_scope=asset.get('berth_subset',[]),reporting_period_end='2025-12-31',relationship_started_on=asset['effective_from'],date_basis=asset.get('date_basis'),evidence_pages=d['reviewed_pages'],evidence_note=d['notes'],scope_group=group)
            sql.append(f"do $$ begin if not exists(select 1 from port.reported_asset_observations o join core.source_records r on r.id=o.source_record_id where o.id={lit(row[0])} and r.content_hash={lit(artifact['content_hash'])} and to_jsonb(o) @> {lit(json.dumps(expected,ensure_ascii=False))}::jsonb) then raise exception 'Observation conflict: {ticker}; reconcile before replay'; end if; end $$;")
        exported.append(dict(ticker=ticker, company_id=company['company_id'], dossier_id=dossier, observation_count=len(d['assets']), outcome='reported_assets' if d['assets'] else 'no_assertable_assets'))
    sql += ['commit;', "select 'dossiers' as dataset,count(*) from port.catalog_dossiers where scope_version='listed-port-candidates-41-report-2025-v1' union all select 'reported_observations',count(*) from port.reported_asset_observations o join port.catalog_dossiers d on d.id=o.dossier_id where d.scope_version='listed-port-candidates-41-report-2025-v1';", '']
    output = ROOT / 'supabase/imports/reported_catalog_2025.pending.sql'
    output.write_text('\n'.join(sql), encoding='utf-8', newline='\n')
    manifest = dict(scope_version='listed-port-candidates-41-report-2025-v1', reporting_period_end='2025-12-31', market_universe_complete=False, publication_status='pending', company_count=len(exported), observation_count=sum(x['observation_count'] for x in exported), sql_sha256=hashlib.sha256(output.read_bytes()).hexdigest(), items=exported)
    (DOC / 'reported-catalog-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Prepared {manifest['company_count']} dossiers and {manifest['observation_count']} report observations; no commencement dates inferred.")


if __name__ == '__main__':
    compile_catalog()
