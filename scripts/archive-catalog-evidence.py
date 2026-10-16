"""Upload selected research artifacts privately and verify every remote readback.

Dry-run by default. This never approves sources, imports SQL or changes bucket
access. Requires an existing Wrangler login and the project's bundled Wrangler.
"""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/catalog-review'
RAW = ROOT / '.local/catalog-research'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--verify-existing', action='store_true', help='Read back the earlier archive without uploading or overwriting objects')
    parser.add_argument('--verify-auxiliary', action='store_true', help='Read back original exchange snapshots and HOSE identity/date supplements')
    parser.add_argument('--label', action='append', help='Exact artifact label; repeat to select a subset')
    args = parser.parse_args()
    artifacts = json.loads((DOC / 'evidence-artifacts.json').read_text(encoding='utf-8'))['artifacts']
    market = json.loads((ROOT / 'supabase/imports/data/market-issuer-registry.reviewed.json').read_text(encoding='utf-8'))['items']
    # Only the later research batch, not the previously uploaded archive.
    rows = artifacts[:30] if args.verify_existing else artifacts[30:] + market
    if args.verify_auxiliary:
        profiles = json.loads((DOC / 'registry-proposals-manifest.json').read_text(encoding='utf-8'))
        hose = json.loads((DOC / 'issuer-registry-proposals-manifest.json').read_text(encoding='utf-8'))['artifacts']
        rows = [dict(r, artifact_label=r['ticker'].lower() + '-profile.snapshot.txt') for r in profiles]
        rows += [dict(r, artifact_label=r['label']) for r in hose]
    selected = set(args.label or [])
    if selected:
        if selected - {r['artifact_label'] for r in rows}:
            raise ValueError('Unknown artifact label')
        rows = [r for r in rows if r['artifact_label'] in selected]
    rows.sort(key=lambda r: (RAW / r['artifact_label']).stat().st_size)
    for row in rows:
        raw = (RAW / row['artifact_label']).read_bytes()
        if hashlib.sha256(raw).hexdigest() != row['content_hash']:
            raise ValueError('Local evidence hash mismatch: ' + row['artifact_label'])
        if row['raw_storage_key'] != 'catalog-evidence/sha256/' + row['content_hash']:
            raise ValueError('Unexpected object key')
    if not args.execute:
        print(f'{len(rows)} artifacts ready; use --execute to upload and read back. No remote changes.')
        return
    node = shutil.which('node.exe') or shutil.which('node')
    wrangler = ROOT / 'apps/web/node_modules/wrangler/bin/wrangler.js'
    if not node or not wrangler.is_file():
        raise RuntimeError('Project Node/Wrangler runtime missing')
    bucket = 'investing-pro-evidence-staging'
    receipt_path = DOC / 'r2-additional-readback-20261016.json'
    receipt = json.loads(receipt_path.read_text(encoding='utf-8')) if receipt_path.exists() else dict(bucket=bucket, public_access_changed=False, publication_performed=False, items=[])
    if receipt['bucket'] != bucket:
        raise ValueError('Receipt bucket mismatch')
    readback = RAW / 'r2-readback-20261016'
    readback.mkdir(exist_ok=True)

    def run(arguments):
        result = subprocess.run([node, str(wrangler), *arguments], cwd=ROOT / 'apps/web', env=dict(os.environ, CLOUDFLARE_ACCOUNT_ID='5e84958e47290692c6ec2817fa1d9af6'), capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=900)
        if result.returncode:
            raise RuntimeError(result.stdout[-2500:] + result.stderr[-2500:])

    for n, row in enumerate(rows, 1):
        label, digest = row['artifact_label'], row['content_hash']
        destination = readback / digest
        checked = next((i for i in receipt['items'] if i['content_hash'] == digest and i['status'] == 'sha256_readback_verified'), None)
        if checked and destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest() == digest:
            print(f'{n}/{len(rows)} retained proven readback: {label}', flush=True)
            continue
        if not checked and not args.verify_existing and not args.verify_auxiliary:
            print(f'{n}/{len(rows)} uploading privately: {label}', flush=True)
            run(['r2', 'object', 'put', bucket + '/' + row['raw_storage_key'], '--file', str(RAW / label), '--content-type', row['content_type'], '--remote'])
        run(['r2', 'object', 'get', bucket + '/' + row['raw_storage_key'], '--file', str(destination), '--remote'])
        if hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
            raise ValueError('REMOTE readback mismatch: ' + label)
        receipt['items'] = [i for i in receipt['items'] if i['artifact_label'] != label]
        receipt['items'].append(dict(artifact_label=label, content_hash=digest, raw_storage_key=row['raw_storage_key'], bytes=destination.stat().st_size, status='sha256_readback_verified', checked_at=datetime.now(timezone.utc).isoformat()))
        receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'{n}/{len(rows)} private R2 readback verified: {label}', flush=True)


if __name__ == '__main__':
    main()
