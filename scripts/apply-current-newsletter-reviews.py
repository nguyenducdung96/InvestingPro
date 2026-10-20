"""Replay only reviewed hashes that are still current; revised PDFs stay pending."""
import json
from pathlib import Path
import sqlite3
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
out = ROOT / '.local/php-newsletters'
review = json.loads((ROOT / 'docs/catalog-review/tanvu-newsletters-reviewed-20261021.json').read_text(encoding='utf-8'))
with sqlite3.connect(out / 'newsletters.sqlite') as db:
    current = set(db.execute('select url,latest_sha from documents'))
review['items'] = [r for r in review['items'] if (r['url'], r['sha256']) in current]
path = out / 'current-reviews.json'
path.write_text(json.dumps(review, ensure_ascii=False), encoding='utf-8')
proposals=[]
with sqlite3.connect(out / 'newsletters.sqlite') as db:
    for url,digest in db.execute('select url,latest_sha from documents where latest_sha is not null'):
        source=out / 'extracted' / digest / 'page-1.json'
        if (url,digest) not in {(r['url'],r['sha256']) for r in review['items']} and source.exists():
            data=json.loads(source.read_text(encoding='utf-8'))
            proposals.append(dict(url=url,sha256=digest,status='pending_visual_review',proposal=data.get('proposal')))
(out / 'pending-proposals.json').write_text(json.dumps(proposals,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if review['items']:
    subprocess.run([sys.executable, str(ROOT / 'scripts/php_newsletters.py'), 'review', '--file', str(path)], check=True)
else:
    print('No previously reviewed hash is current; all new or revised facts remain pending.')
