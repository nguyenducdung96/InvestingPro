"""Archive only current reviewed newsletter PDFs, once per hash, in private R2.

Dry run by default. Does not approve rights or publish facts. Temporary readback
copies are removed after hash verification; receipts contain metadata only.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BUCKET = 'investing-pro-evidence-staging'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--out', type=Path, default=ROOT / '.local/php-newsletters')
    args = parser.parse_args()
    out = args.out.resolve()
    with sqlite3.connect(out / 'newsletters.sqlite') as db:
        hashes = [r[0] for r in db.execute('''select distinct r.sha from reviews r join documents d
          on d.url=r.url and d.latest_sha=r.sha order by r.sha''')]
    rows = []
    for digest in hashes:
        path = out / 'raw' / (digest + '.pdf')
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != digest:
            raise ValueError('Local hash mismatch')
        rows.append(dict(sha256=digest, path=path, bytes=len(raw), key='catalog-evidence/sha256/' + digest))
    print(json.dumps(dict(pdf_count=len(rows), bytes=sum(r['bytes'] for r in rows), execute=args.execute)), flush=True)
    if not args.execute:
        return
    receipt_path = out / 'r2-newsletters-readback.json'
    receipt = json.loads(receipt_path.read_text(encoding='utf-8')) if receipt_path.exists() else dict(bucket=BUCKET, public_access_changed=False, publication_performed=False, items=[])
    if receipt['bucket'] != BUCKET:
        raise ValueError('Receipt bucket mismatch')
    node = shutil.which('node')
    wrangler = ROOT / 'apps/web/node_modules/wrangler/bin/wrangler.js'
    def run(command):
        r = subprocess.run([node, str(wrangler), *command], cwd=ROOT / 'apps/web',
                           env=dict(os.environ, CLOUDFLARE_ACCOUNT_ID='5e84958e47290692c6ec2817fa1d9af6'),
                           capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180)
        if r.returncode:
            raise RuntimeError(r.stdout[-1800:] + r.stderr[-1800:])
    for row in rows:
        if any(i['sha256'] == row['sha256'] and i['status'] == 'sha256_readback_verified' for i in receipt['items']):
            print('Already verified', row['sha256'][:12], flush=True)
            continue
        with tempfile.TemporaryDirectory(prefix='php-r2-readback-') as temp:
            readback = Path(temp) / 'source.pdf'
            # Check the immutable key first; do not overwrite a previously archived object.
            try:
                run(['r2','object','get',BUCKET+'/'+row['key'],'--file',str(readback),'--remote'])
            except RuntimeError as error:
                if not any(t in str(error).lower() for t in ('not found', 'does not exist', '404', 'no such key')):
                    raise
                run(['r2','object','put',BUCKET+'/'+row['key'],'--file',str(row['path']),'--content-type','application/pdf','--remote'])
                run(['r2','object','get',BUCKET+'/'+row['key'],'--file',str(readback),'--remote'])
            if hashlib.sha256(readback.read_bytes()).hexdigest() != row['sha256']:
                raise ValueError('Private R2 readback hash mismatch')
        receipt['items'].append(dict(sha256=row['sha256'], raw_storage_key=row['key'], bytes=row['bytes'], status='sha256_readback_verified', checked_at=datetime.now(timezone.utc).isoformat()))
        receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        print('Verified private archive', row['sha256'][:12], flush=True)


if __name__ == '__main__':
    main()
