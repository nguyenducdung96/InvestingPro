"""Compile the visually reviewed CQN operating certificate into pending berths.

Offline only. The issue date documents authorization, not first operation or
present validity. No whole-terminal interest or physical ownership is inferred.
"""
import hashlib
import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/catalog-review'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def identity(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, 'investingpro:cqn-certificate-88-2020:' + key))


def literal(value):
    return 'NULL' if value is None else "'" + str(value).replace("'", "''") + "'"


def compile_import():
    artifact = next(a for a in read(DOC / 'evidence-artifacts.json')['artifacts'] if a['artifact_label'] == 'cqn-port-license.pdf')
    raw = (ROOT / '.local/catalog-research' / artifact['artifact_label']).read_bytes()
    if hashlib.sha256(raw).hexdigest() != artifact['content_hash'] or not artifact['r2_verified']:
        raise ValueError('Certificate must match the privately archived evidence')
    dossier = next(d for d in read(ROOT / 'supabase/imports/data/company-portfolios.reviewed.json')['items'] if d['ticker'] == 'CQN')
    asset = dossier['assets'][0]
    if asset['effective_from'] != '2020-06-24' or asset['role'] != 'operator' or asset['terminal_number'] != 11:
        raise ValueError('Certificate review scope changed; review before compiling')
    catalog = next(t for t in read(ROOT / 'supabase/imports/data/505-commercial-catalog.reviewed.json')['terminals'] if t['number'] == 11)
    expected = ['Cầu cảng Tạm', 'Cầu cảng số 1', 'Cầu cảng số 5', 'Cầu cảng số 6', 'Cầu cảng số 7']
    if asset['berth_subset'] != expected:
        raise ValueError('Certificate covers only the temporary berth and berths 1/5/6/7')
    company = next(c for c in read(DOC / 'registry-proposals-manifest.json') if c['ticker'] == 'CQN')['company_id']
    source, record = identity('source'), identity('record:' + artifact['content_hash'])
    note = dossier['notes']
    sql = ['-- OFFLINE: CQN certificate 88/2020, pending operator proposals only.', 'begin;',
           f"do $$ begin if not exists(select 1 from catalog.companies where id={literal(company)} and enterprise_id='5700100231') then raise exception 'CQN legal identity mismatch'; end if; end $$;",
           'insert into core.sources(id,code,name,owner,source_class,base_url,rights_status,rights_notes) values',
           '(' + ','.join(map(literal, (source, 'cqn_certificate_88_2020_research', 'CQN – giấy chứng nhận 88/2020, chờ duyệt', 'Công ty Cổ phần Cảng Quảng Ninh (lưu bản Cục Hàng hải Việt Nam cấp)', 'official_company', 'https://quangninhport.com.vn', 'to_verify', 'Phạm vi giấy chứng nhận trang PDF 1; chưa duyệt quyền nguồn, hiệu lực hiện tại hoặc sở hữu.'))) + ') on conflict do nothing;',
           'insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,fetched_at,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status) values',
           '(' + ','.join(map(literal, (record, source, artifact['source_url'], artifact['canonical_url'], 'CQN:88/2020/GCN-CHHVN:p1', artifact['published_at'], artifact['fetched_at'], artifact['content_type'], artifact['content_hash'], artifact['raw_storage_key'], 'manual-visual-certificate-review', 'cqn-license-v1', 'incomplete'))) + ') on conflict do nothing;']
    rows = []
    for name in expected:
        display = name + ' – ' + catalog['name'].removeprefix('Bến cảng ')
        berth = str(uuid.uuid5(uuid.NAMESPACE_URL, f"investingpro:505-2026:berth:11:{catalog['berths'].index(name)+1}"))
        interest = identity('operator:' + berth + ':' + asset['effective_from'])
        sql.append(f"do $$ begin if not exists(select 1 from catalog.entities e join port.berths b on b.id=e.id where e.id={literal(berth)} and e.kind='berth' and e.name={literal(display)} and b.terminal_id={literal(str(uuid.uuid5(uuid.NAMESPACE_URL, 'investingpro:505-2026:terminal:11')))}) then raise exception 'CQN berth identity mismatch'; end if; end $$;")
        sql += ['insert into port.company_asset_interests(id,company_id,asset_id,asset_kind,interest_type,valid_from,source_record_id,verification_source_id,evidence_excerpt,resolution_method,confidence) values',
                '(' + ','.join(map(literal, (interest, company, berth, 'berth', 'operator', asset['effective_from'], record, source, note, 'document_evidence', '0.95'))) + ') on conflict do nothing;']
        # A deterministic-ID collision must never silently preserve different facts.
        sql.append(f"do $$ begin if not exists(select 1 from port.company_asset_interests i join core.source_records r on r.id=i.source_record_id where i.id={literal(interest)} and i.company_id={literal(company)} and i.asset_id={literal(berth)} and i.asset_kind='berth' and i.interest_type='operator' and i.valid_from='2020-06-24' and i.valid_to is null and i.ownership_pct is null and r.content_hash={literal(artifact['content_hash'])}) then raise exception 'CQN proposal conflict; reconcile before import'; end if; end $$;")
        rows.append(dict(asset_id=berth, asset_name=display, interest_id=interest, asset_kind='berth', interest_type='operator', valid_from=asset['effective_from'], date_basis=asset['date_basis']))
    sql += ['commit;', '']
    (ROOT / 'supabase/imports/cqn_license.proposals.sql').write_text('\n'.join(sql), encoding='utf-8', newline='\n')
    (DOC / 'cqn-license-proposals-manifest.json').write_text(json.dumps(dict(publication_status='pending', cloud_applied=False, current_status_verified=False, company_id=company, enterprise_id='5700100231', source_id=source, source_record_id=record, artifact_label=artifact['artifact_label'], content_hash=artifact['content_hash'], reviewed_pages=[1, 2], items=rows, limitations=dossier['unresolved']), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Prepared five pending CQN berth operators; no terminal ownership or current-status claim.')


if __name__ == '__main__':
    compile_import()
