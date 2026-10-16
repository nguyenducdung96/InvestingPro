"""Prepare two pending inland depot dossiers and a pending GIC name correction.

Uses archived exact-date evidence, never inferred report dates; no cloud access.
"""
import hashlib
import json
import uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/catalog-review'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def identity(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, 'investingpro:inland-depots-20261016:' + key))


def literal(value):
    return 'NULL' if value is None else "'" + str(value).replace("'", "''") + "'"


def compile_import():
    artifacts = {a['artifact_label']: a for a in read(DOC / 'evidence-artifacts.json')['artifacts']}
    companies = {a['ticker']: a for a in read(DOC / 'issuer-universe-manifest.json')['items']}
    market = {a['ticker']: a for a in read(DOC / 'market-issuer-registry-manifest.json')['items']}
    rows = read(ROOT / 'supabase/imports/data/icd-opening-proposals.reviewed.json')['items']
    sql = ['-- OFFLINE ONLY. Pending ICDs and pending GIC identity correction. No approvals.', 'begin;']
    record_ids = {}

    def record(ticker, name, website):
        key = (ticker, name)
        if key in record_ids:
            return record_ids[key]
        a = artifacts[name]
        raw = (ROOT / '.local/catalog-research' / name).read_bytes()
        if hashlib.sha256(raw).hexdigest() != a['content_hash']:
            raise ValueError('Evidence changed: ' + name)
        source, evidence = identity(ticker + ':source:' + name), identity(ticker + ':record:' + a['content_hash'])
        government = name == 'dong-pho-moi-decision-landing.html'
        sql.extend([
            'insert into core.sources(id,code,name,owner,source_class,base_url,rights_status,rights_notes) values',
            '(' + ','.join(map(literal, (source, 'inland_20261016_' + ticker.lower() + '_' + name.replace('.', '_').replace('-', '_'), ticker + ' – ' + name + ', chờ duyệt', 'Bộ Xây dựng / kho văn bản Bộ GTVT' if government else 'Công ty Cổ phần VSC Green Logistics' if ticker == 'GIC' else companies[ticker]['legal_name'], 'official_government' if government else 'official_company', 'https://moc.gov.vn' if government else website, 'to_verify', 'Chỉ đề xuất dữ kiện có nguồn; chưa duyệt quyền, bản lưu R2 hoặc tình trạng hiện tại.'))) + ') on conflict do nothing;',
            'insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,fetched_at,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status) values',
            '(' + ','.join(map(literal, (evidence, source, a['source_url'], a['source_url'], ticker + ':inland-dossier:' + name, a['published_at'], a['fetched_at'], a['content_type'], a['content_hash'], a['raw_storage_key'], 'manual-visual-and-opening-review', 'inland-dossiers-v1', 'incomplete'))) + ') on conflict do nothing;',
        ])
        record_ids[key] = (source, evidence)
        return source, evidence

    manifest = []
    for row in rows:
        ticker = row['ticker']
        date.fromisoformat(row['valid_from'])
        if not row['date_basis']:
            raise ValueError('Exact date basis required')
        company = companies[ticker]['company_id']
        asset, interest = identity('icd:' + row['slug']), identity(ticker + ':' + row['slug'] + ':' + row['valid_from'])
        sql.append(f"do $$ begin if not exists(select 1 from catalog.companies where id={literal(company)} and enterprise_id={literal(row['enterprise_id'])}) or exists(select 1 from catalog.entities where kind='icd' and slug={literal(row['slug'])} and id<>{literal(asset)}) then raise exception '{ticker} company/ICD conflict; reconcile before import'; end if; end $$;")
        _, issuer_record = record(ticker, row['identity_artifact'], row['website'])
        source, opening_record = record(ticker, row['date_artifact'], row['website'])
        sql.extend([
            'insert into catalog.entities(id,kind,slug,name,source_record_id,quality_status) values',
            '(' + ','.join(map(literal, (asset, 'icd', row['slug'], row['name'], issuer_record, 'incomplete'))) + ') on conflict do nothing;',
            'insert into port.icds(id,address) values',
            '(' + ','.join(map(literal, (asset, row['address']))) + ') on conflict do nothing;',
            'insert into port.company_asset_interests(id,company_id,asset_id,asset_kind,interest_type,valid_from,source_record_id,verification_source_id,evidence_excerpt,resolution_method,confidence) values',
            '(' + ','.join(map(literal, (interest, company, asset, 'icd', 'operator', row['valid_from'], opening_record, source, row['date_basis'] + ': ' + row['note'], 'document_evidence', '0.90'))) + ') on conflict do nothing;',
        ])
        manifest.append(dict(**row, company_id=company, asset_id=asset, interest_id=interest, identity_record_id=issuer_record, opening_record_id=opening_record))

    # Original indexed spelling remains in its immutable evidence record.
    gic = market['GIC']
    company = gic['company_id']
    _, corrected_record = record('GIC', 'gic-2025.pdf', 'https://greenicd.com.vn')
    correction_name = 'Công ty Cổ phần VSC Green Logistics'
    sql.append(f"update catalog.entities set name={literal(correction_name)},source_record_id={literal(corrected_record)} where id={literal(company)} and quality_status='incomplete' and source_record_id={literal(gic['source_record_id'])} and name={literal(gic['legal_name'])};")
    sql.append(f"update catalog.companies set legal_name={literal(correction_name)},official_website='https://greenicd.com.vn' where id={literal(company)} and legal_name={literal(gic['legal_name'])} and exists(select 1 from catalog.entities where id={literal(company)} and quality_status='incomplete' and source_record_id={literal(corrected_record)});")
    sql.extend(['commit;', ''])
    (ROOT / 'supabase/imports/inland_depots.proposals.sql').write_text('\n'.join(sql), encoding='utf-8', newline='\n')
    (DOC / 'inland-depots-proposals-manifest.json').write_text(json.dumps(dict(publication_status='pending', cloud_applied=False, items=manifest, gic_correction=dict(company_id=company, old_record_id=gic['source_record_id'], new_record_id=corrected_record, reviewed_pages=[2,3])), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Prepared two pending ICD operator interests; GIC correction only touches unchanged pending identity.')


if __name__ == '__main__':
    compile_import()
