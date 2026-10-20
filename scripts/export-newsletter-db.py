"""Generate a pending-only PostgreSQL handoff from the live collector SQLite DB.

Does not publish evidence/rights or execute SQL. Raw PDFs remain local until archived.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sqlite3
import uuid

ROOT = Path(__file__).resolve().parents[1]
SOURCE = str(uuid.uuid5(uuid.NAMESPACE_URL, 'investingpro:php-monthly-newsletters'))


def literal(value):
    if value is None:
        return 'null'
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def handoff(folder):
    db = sqlite3.connect(f'file:{folder / "newsletters.sqlite"}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    bundle = dict(schema='php-newsletters-pending-v1', documents=[], records=[], facts=[])
    statements = ['-- Pending research only. Does not approve rights, archive PDFs, or publish facts.', 'begin;']
    receipt_path = folder / 'r2-newsletters-readback.json'
    archive = {}
    if receipt_path.exists():
        receipt = json.loads(receipt_path.read_text(encoding='utf-8'))
        if receipt['bucket'] != 'investing-pro-evidence-staging':
            raise ValueError('Unexpected archive bucket')
        archive = {i['sha256']: i['raw_storage_key'] for i in receipt['items'] if i['status']=='sha256_readback_verified' and i['raw_storage_key']=='catalog-evidence/sha256/'+i['sha256']}
    statements.append(f"""insert into core.sources(id,code,name,owner,source_class,base_url,rights_notes)
values('{SOURCE}','php-monthly-newsletters','Cảng Hải Phòng · bản tin tháng','Cảng Hải Phòng','official_company','https://haiphongport.com.vn','Pending source-rights review; local extraction is not publication approval.') on conflict do nothing;""")
    for d in db.execute('select * from documents where latest_sha is not null order by url'):
        raw = folder / 'raw' / f'{d["latest_sha"]}.pdf'
        if hashlib.sha256(raw.read_bytes()).hexdigest() != d['latest_sha']:
            raise ValueError('Raw evidence hash mismatch')
        vals = [d[k] for k in ['url', 'latest_sha', 'last_success', 'last_attempt', 'error']]
        bundle['documents'].append(dict(zip(['source_url','latest_sha','last_success','last_attempt','error'],vals)))
        statements.append('insert into port.newsletter_documents(source_url,latest_sha,last_success,last_attempt,error) values (' + ','.join(map(literal, vals)) + ''')
on conflict(source_url) do update set latest_sha=excluded.latest_sha,last_success=excluded.last_success,last_attempt=excluded.last_attempt,error=excluded.error
where excluded.last_attempt>=port.newsletter_documents.last_attempt;''')
    for r in db.execute('''select r.*,v.captured_at from reviews r join documents d on d.url=r.url and d.latest_sha=r.sha
      join revisions v on v.url=r.url and v.sha=r.sha order by r.period,r.url'''):
        # Corrected same-PDF values get a new fact; never overwrite a reviewed row.
        evidence_id = str(uuid.uuid5(uuid.NAMESPACE_URL, r['url'] + '#' + r['sha']))
        fact_id = str(uuid.uuid5(uuid.NAMESPACE_URL, evidence_id + json.dumps([r['period'], r['cargo_tonnes'], r['container_teu']], separators=(',', ':'))))
        storage_key = archive.get(r['sha'], 'local:php-newsletters/raw/' + r['sha'] + '.pdf')
        if r['sha'] in archive:
            bundle['records'].append(dict(id=evidence_id,source_url=r['url'],fetched_at=r['captured_at'],content_hash=r['sha'],raw_storage_key=storage_key))
            bundle['facts'].append(dict(id=fact_id,period=r['period']+'-01',publication_month=r['publication_month']+'-01',cargo_tonnes=r['cargo_tonnes'],container_teu=r['container_teu'],source_record_id=evidence_id,extraction_note=r['note']))
        evidence = [evidence_id, SOURCE, r['url'], r['url'], r['url'], r['captured_at'], 'application/pdf', r['sha'], storage_key, 'php-newsletters', '1.0.0', 'incomplete']
        statements.append('insert into core.source_records(id,source_id,source_url,canonical_url,external_id,fetched_at,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status) values (' + ','.join(map(literal, evidence)) + ') on conflict do nothing;')
        values = [fact_id, 'tan_vu', r['period'] + '-01', r['publication_month'] + '-01', r['cargo_tonnes'], r['container_teu'], evidence_id, 1, r['note']]
        statements.append('insert into port.monthly_throughput(id,asset_code,period,publication_month,cargo_tonnes,container_teu,source_record_id,pdf_page,extraction_note) values (' + ','.join(map(literal, values)) + ') on conflict(id) do nothing;')
    statements.append('commit;')
    db.close()
    (folder / 'staging-bundle.json').write_text(json.dumps(bundle,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return '\n'.join(statements) + '\n'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=ROOT / '.local/php-newsletters')
    args = parser.parse_args()
    output = args.out / 'monthly-throughput.pending.sql'
    output.write_text(handoff(args.out.resolve()), encoding='utf-8')
    print(output)
