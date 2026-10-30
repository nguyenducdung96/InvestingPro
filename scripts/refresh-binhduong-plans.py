"""Refresh only GMD Binh Duong; retain reviewed history on cold runners."""
import concurrent.futures as cf
import datetime as dt
import gzip
import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('collector', ROOT/'scripts/collect-pdn-plans.py')
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

def archive(path):
    if not path.exists():
        return
    payload = path.read_bytes()
    envelope = json.loads(gzip.decompress(payload))
    raw = envelope['raw_response'].encode('utf8')
    if hashlib.sha256(raw).hexdigest() != envelope['sha256'] or json.loads(raw) != envelope['response']:
        raise ValueError('Invalid raw archive checksum')
    # Keep original envelope bytes for every revision, including repeated checks.
    target = collector.OUT/'archive'/envelope['sha256']/f'{hashlib.sha256(payload).hexdigest()}.json.gz'
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        with target.open('xb') as stream:
            stream.write(payload)

def collect(day, direction, urls):
    path = collector.OUT/'raw'/f'{day}-{direction}.json.gz'
    archive(path)
    status = collector.collect(day, direction, urls, True)
    archive(path)
    return status

def main():
    end = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()-dt.timedelta(days=1)
    ledger = json.loads((ROOT/'docs/catalog-review/binhduong-history-ledger.json').read_text(encoding='utf8'))
    start = min(end-dt.timedelta(days=6), dt.date.fromisoformat(ledger['metadata']['through'])+dt.timedelta(days=1))
    collector.OUT = ROOT/'.local/binhduong'
    collector.OUT.mkdir(parents=True, exist_ok=True)
    receipt = {'checked_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'from': str(start), 'through': str(end),
               'source_refresh_success': False, 'export_success': False, 'scheduled_refresh_verified': False}
    try:
        urls = collector.bootstrap()
        tasks = [(str(start+dt.timedelta(days=i)), d) for i in range((end-start).days+1) for d in ['arrival', 'departure']]
        counts = {}
        with cf.ThreadPoolExecutor(max_workers=3) as pool:
            futures = [pool.submit(collect, day, direction, urls) for day, direction in tasks]
            for future in cf.as_completed(futures):
                status = future.result()
                counts[status] = counts.get(status, 0)+1
        receipt['counts'] = counts
        if counts.get('failed') or counts.get('ok') != len(tasks):
            raise ValueError('Source refresh incomplete; retaining published edition')
        receipt['source_refresh_success'] = True
        subprocess.run([sys.executable, str(ROOT/'scripts/export-binhduong-plans.py'), '--through', str(end),
                        '--raw-dir', str(collector.OUT/'raw'), '--recent-only'], check=True, cwd=ROOT)
        receipt['export_success'] = True
    except Exception as error:
        receipt['error'] = str(error)
        raise
    finally:
        (collector.OUT/'collect-receipt.json').write_text(json.dumps(receipt, indent=2)+'\n', encoding='utf8')
        print(json.dumps(receipt), flush=True)

if __name__ == '__main__':
    main()
