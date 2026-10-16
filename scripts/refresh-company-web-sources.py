"""Check declared supporting pages for changes, preserving private raw evidence.

HTML changes only request a review; they never establish a changed business fact.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import time
from urllib.request import Request, build_opener
from urllib.error import HTTPError
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('refresh', ROOT / 'scripts/refresh-company-data.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def check(source, output):
    url = urlsplit(source['url'])
    if url.scheme != 'https' or not url.hostname or url.username or url.password:
        raise ValueError('Expected public HTTPS source')
    path = output / (m.digest(source['id'].encode()) + '.json')
    previous = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    headers = {'User-Agent': 'InvestingPro-ReferenceReview/1.0', 'Accept': 'text/html'}
    if previous.get('etag'):
        headers['If-None-Match'] = previous['etag']
    if previous.get('last_modified'):
        headers['If-Modified-Since'] = previous['last_modified']
    now = m.datetime.now(m.timezone.utc).isoformat()
    try:
        with build_opener(m.NoRedirect()).open(Request(source['url'], headers=headers), timeout=30) as response:
            content_type = response.headers.get('Content-Type', '')
            if 'html' not in content_type:
                raise ValueError('Source is not HTML')
            raw = response.read(m.MAX_BYTES + 1)
            if not raw or len(raw) > m.MAX_BYTES:
                raise ValueError('Source body empty or too large')
            hash_ = m.digest(raw)
            archive = output / 'raw' / (hash_ + '.html')
            archive.parent.mkdir(parents=True, exist_ok=True)
            if archive.exists() and m.digest(archive.read_bytes()) != hash_:
                raise ValueError('Archive checksum mismatch')
            if not archive.exists():
                archive.write_bytes(raw)
            result = dict(**source, checked_at=now, raw_sha256=hash_,
                          status='unchanged' if previous.get('raw_sha256') == hash_ else 'baseline' if not previous else 'page_changed_review_required',
                          etag=response.headers.get('ETag'), last_modified=response.headers.get('Last-Modified'),
                          publication_performed=False)
    except HTTPError as error:
        if error.code != 304 or not previous:
            raise ValueError('Source request failed') from None
        result = {**previous, 'checked_at': now, 'status': 'unchanged'}
    m.atomic_json(output / 'history' / (m.digest(m.encode(result)) + '.json'), result)
    m.atomic_json(path, result)
    return {k: result[k] for k in ('id', 'ticker', 'url', 'checked_at', 'raw_sha256', 'status')}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--config', type=Path, default=ROOT / 'config/company-web-sources.json')
    p.add_argument('--output', type=Path, default=ROOT / '.local/company-refresh/web')
    args = p.parse_args()
    results = []
    for source in json.loads(args.config.read_text(encoding='utf-8'))['sources']:
        try:
            results.append(check(source, args.output))
        except Exception as error:
            results.append(dict(id=source['id'], ticker=source['ticker'], status='failed', error_type=type(error).__name__))
        time.sleep(2)
    m.atomic_json(args.output / 'last-run.json', results)
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return int(any(r['status'] == 'failed' for r in results))


if __name__ == '__main__':
    raise SystemExit(main())
