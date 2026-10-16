"""Propose exact issuer IDs from visually read reports, preserving reviewed identities."""
import hashlib
import json
import re
import uuid
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/catalog-review'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def identity(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, 'investingpro:registry-id-enrichment-20261016:' + key))


def literal(value):
    return 'NULL' if value is None else "'" + str(value).replace("'", "''") + "'"


def compile_import():
    registry = {r['ticker']: r for r in read(DOC / 'registry-proposals-manifest.json')}
    artifacts = {a['artifact_label']: a for a in read(DOC / 'evidence-artifacts.json')['artifacts']}
    rows = read(ROOT / 'supabase/imports/data/registry-identity-enrichment.reviewed.json')['items']
    sql = ['-- OFFLINE ONLY. Fill missing IDs on unchanged pending identities; preserve reviewed profiles.', 'begin;']
    manifest = []
    for row in rows:
        if not re.fullmatch(r'\d{10}', row['enterprise_id']):
            raise ValueError('Issuer ID must match the visually read ten-digit value')
        old, artifact = registry[row['ticker']], artifacts[row['artifact_label']]
        if hashlib.sha256((ROOT / '.local/catalog-research' / row['artifact_label']).read_bytes()).hexdigest() != artifact['content_hash']:
            raise ValueError('Evidence hash mismatch')
        if not row['reviewed_pages'] or any(not 1 <= p <= artifact['page_count'] for p in row['reviewed_pages']):
            raise ValueError('Review pages required')
        company = old['company_id']
        source, record = identity(row['ticker'] + ':source'), identity(row['ticker'] + ':record:' + artifact['content_hash'])
        sql.append(f"do $$ begin if not exists(select 1 from catalog.companies where id={literal(company)}) or exists(select 1 from catalog.companies where enterprise_id={literal(row['enterprise_id'])} and id<>{literal(company)}) or exists(select 1 from catalog.companies where id={literal(company)} and enterprise_id is not null and enterprise_id<>{literal(row['enterprise_id'])}) then raise exception '{row['ticker']} identity collision; reconcile before enrichment'; end if; end $$;")
        parsed = urlparse(artifact['source_url'])
        sql.extend([
            'insert into core.sources(id,code,name,owner,source_class,base_url,rights_status,rights_notes) values',
            '(' + ','.join(map(literal, (source, 'issuer_id_20261016_' + row['ticker'].lower(), old['legal_name'] + ' – định danh từ báo cáo, chờ duyệt', old['legal_name'], 'official_company', row['website'] or parsed.scheme + '://' + parsed.netloc, 'to_verify', row['note']))) + ') on conflict do nothing;',
            'insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,fetched_at,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status) values',
            '(' + ','.join(map(literal, (record, source, artifact['source_url'], artifact['source_url'], row['ticker'] + ':issuer-id:pages-' + '-'.join(map(str, row['reviewed_pages'])), artifact['published_at'], artifact['fetched_at'], artifact['content_type'], artifact['content_hash'], artifact['raw_storage_key'], 'manual-visual-issuer-id-review', 'issuer-id-v1', 'incomplete'))) + ') on conflict do nothing;',
            f"update catalog.entities set source_record_id={literal(record)} where id={literal(company)} and quality_status='incomplete' and source_record_id={literal(old['source_record_id'])} and name={literal(old['legal_name'])};",
            f"update catalog.companies set enterprise_id={literal(row['enterprise_id'])},official_website=coalesce(official_website,{literal(row['website'])}) where id={literal(company)} and exists(select 1 from catalog.entities where id={literal(company)} and quality_status='incomplete' and source_record_id={literal(record)}) and (enterprise_id is null or (official_website is null and {literal(row['website'])} is not null));",
        ])
        manifest.append(dict(**row,company_id=company,old_source_record_id=old['source_record_id'],source_record_id=record,source_id=source,artifact=artifact,application_rule='unchanged_pending_identity_only'))
    sql.extend(['commit;', ''])
    (ROOT / 'supabase/imports/registry_identity_enrichment.proposals.sql').write_text('\n'.join(sql),encoding='utf-8',newline='\n')
    (DOC / 'registry-identity-enrichment-manifest.json').write_text(json.dumps(dict(publication_status='pending',cloud_applied=False,items=manifest),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Prepared nine issuer-ID evidence dossiers; reviewed identities are preserved.')


if __name__ == '__main__':
    compile_import()
