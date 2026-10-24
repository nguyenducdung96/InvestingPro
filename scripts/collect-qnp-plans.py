"""Archive public QNP bulletin candidates. Images/OCR never enter reviewed metrics automatically."""
import argparse
import datetime as dt
import hashlib
import json
import pathlib
import re
import urllib.parse
import urllib.request

BASE = 'https://quynhonport.vn'
ROOT = pathlib.Path(__file__).resolve().parents[1]


def allowed(url):
    parsed = urllib.parse.urlsplit(url)
    return parsed.scheme == 'https' and parsed.netloc == 'quynhonport.vn' and not parsed.fragment


def fetch(url):
    if not allowed(url):
        raise ValueError('Unexpected source URL')
    with urllib.request.urlopen(url, timeout=45) as response:
        if not allowed(response.geturl()):
            raise ValueError('Unexpected source redirect')
        raw = response.read(12_000_001)
        if len(raw) > 12_000_000:
            raise ValueError('Source too large')
        return raw, response.headers


def candidates(post):
    title = post['title']['rendered']
    if not re.search(r'kế hoạch (?:bố trí cầu bến|khai thác tàu)', title, re.I):
        return None
    if not allowed(post['link']):
        raise ValueError('Unexpected bulletin link')
    images = re.findall(r'<img[^>]+src="([^"]+)"', post['content']['rendered'])
    if any(not re.fullmatch(r'https://quynhonport\.vn/wp-content/uploads/\d{4}/\d{2}/[a-zA-Z0-9._-]+\.(?:png|jpg|jpeg)', u) for u in images):
        raise ValueError('Bulletin image schema changed')
    return {'id': post['id'], 'url': post['link'], 'title': title,
            'published_at': post['date'], 'modified_at': post['modified'],
            'images': images, 'status': 'pending_image_review' if images else 'source_no_images'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--from-date', default='2025-01-01')
    parser.add_argument('--download-images', action='store_true')
    args = parser.parse_args()
    start = dt.date.fromisoformat(args.from_date)
    out = ROOT / '.local/qnp-plans'
    out.mkdir(parents=True, exist_ok=True)
    archive = out / 'archive'
    archive.mkdir(exist_ok=True)
    fetched = dt.datetime.now(dt.timezone.utc).isoformat()
    found = {}
    page = 1
    while True:
        query = urllib.parse.urlencode({'search': 'kế hoạch', 'per_page': 100, 'page': page,
                                       'after': str(start) + 'T00:00:00', 'orderby': 'date', 'order': 'desc'})
        raw, headers = fetch(BASE + '/wp-json/wp/v2/posts?' + query)
        (archive / f'index-{page}.json').write_bytes(raw)
        for post in json.loads(raw):
            item = candidates(post)
            if item:
                found[item['id']] = item
        if page >= int(headers['X-WP-TotalPages']):
            break
        page += 1
    if args.download_images:
        for item in found.values():
            item['evidence'] = []
            for url in item['images']:
                raw, _ = fetch(url)
                digest = hashlib.sha256(raw).hexdigest()
                (archive / f'{digest}{pathlib.PurePosixPath(urllib.parse.urlsplit(url).path).suffix}').write_bytes(raw)
                item['evidence'].append({'url': url, 'sha256': digest})
    manifest = {'fetched_at': fetched, 'source': BASE + '/chuyen-muc/ke-hoach-khai-thac-tau/',
                'from_date': str(start), 'pages': page, 'candidate_bulletins': len(found),
                'automatic_promotion': False, 'history_complete': False,
                'bulletins': list(found.values())}
    (out / 'candidates.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in manifest.items() if k != 'bulletins'}, ensure_ascii=True))


if __name__ == '__main__':
    main()
