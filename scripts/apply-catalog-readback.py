"""Apply proven private R2 readbacks to local artifact metadata only.

No database connection, source approval, or market status certification.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/catalog-review'
path = DOC / 'evidence-artifacts.json'
data = json.loads(path.read_text(encoding='utf-8'))
receipt = json.loads((DOC / 'r2-additional-readback-20261016.json').read_text(encoding='utf-8'))
if receipt['bucket'] != 'investing-pro-evidence-staging' or receipt['publication_performed'] or receipt['public_access_changed']:
    raise ValueError('Unexpected receipt scope')
verified = {}
for row in receipt['items']:
    if row['status'] != 'sha256_readback_verified':
        raise ValueError('Unverified receipt')
    digest = row['content_hash']
    if row['raw_storage_key'] != 'catalog-evidence/sha256/' + digest:
        raise ValueError('Unexpected object key')
    cached = ROOT / '.local/catalog-research/r2-readback-20261016' / digest
    if hashlib.sha256(cached.read_bytes()).hexdigest() != digest:
        raise ValueError('Remote readback cache changed')
    verified[row['artifact_label']] = row
count = 0
for artifact in data['artifacts']:
    row = verified.get(artifact['artifact_label'])
    if row is None:
        continue
    if artifact['content_hash'] != row['content_hash']:
        raise ValueError('Acquisition and receipt hash mismatch')
    artifact.update(r2_verified=True, storage_upload_status='uploaded', sha256_readback_status='verified', r2_checked_at=row['checked_at'], archival_receipt='r2-additional-readback-20261016.json')
    count += 1
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{count} artifact storage statuses updated; rights and fact approvals unchanged.')
