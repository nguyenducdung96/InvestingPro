"""Collect official PHP newsletters and maintain a revision-aware local research series.

Run with bundled Python (pypdf, pypdfium2). OCR additionally uses the existing
.local/ocr-runtime. No database credentials, cloud writes or production publication.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sqlite3
import subprocess
import sys
import tempfile
from urllib.parse import quote, unquote, urljoin, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
INDEXES = [
    'https://haiphongport.com.vn/en/port-of-hai-phong-monthly-newsletters-50',
    'https://haiphongport.com.vn/en/port-of-hai-phong-monthly-newsletters-50/port-of-hai-phong-monthly-newsletter-2024.html',
    'https://haiphongport.com.vn/en/support/port-of-hai-phong-monthly-newsletter-2025.html',
    'https://haiphongport.com.vn/en/port-of-hai-phong-monthly-newsletters-50/port-of-hai-phong-monthly-newsletter-2026.html',
]
METRICS = {'cargo_tonnes': 'tonnes', 'container_teu': 'TEU'}


def now():
    return datetime.now(timezone.utc).isoformat()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write('\n')
        temporary = Path(f.name)
    temporary.replace(path)


def official_url(value, pdf=False):
    u = urlsplit(urljoin('https://haiphongport.com.vn/', value))
    if u.scheme != 'https' or u.hostname != 'haiphongport.com.vn' or u.port or u.username or u.password:
        raise ValueError('Non-official source URL')
    path = unquote(u.path)
    if pdf and (not path.startswith('/FileUpload/Documents/') or not path.lower().endswith('.pdf')):
        raise ValueError('Not an official document link')
    if any(x in path for x in ('..', '\\', '\x00')) or u.query:
        raise ValueError('Unexpected source URL')
    return urlunsplit((u.scheme, u.netloc, quote(path, safe='/()-_.~'), '', ''))


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.pdfs, self.indexes = set(), set()

    def handle_starttag(self, tag, attrs):
        href = dict(attrs).get('href', '')
        if tag != 'a' or not href:
            return
        try:
            if unquote(urlsplit(href).path).lower().endswith('.pdf'):
                self.pdfs.add(official_url(href, pdf=True))
            elif 'monthly-newsletter-' in href and 'FileUpload' not in href:
                self.indexes.add(official_url(href))
        except ValueError:
            pass


def fetch(url, out):
    """Bounded HTTPS fetch; redirects never followed to a different host."""
    url = official_url(url)
    with tempfile.TemporaryDirectory(dir=out) as tmp:
        target = Path(tmp) / 'body'
        # No -L: inspect redirect destinations before requesting them.
        for _ in range(4):
            r = subprocess.run([
                'curl.exe' if sys.platform == 'win32' else 'curl',
                '--silent', '--show-error', '--max-time', '45', '--max-filesize', '16000000',
                '--proto', '=https', '--output', str(target), '--write-out',
                '%{http_code}\n%{redirect_url}', url,
            ], capture_output=True, text=True, timeout=50)
            if r.returncode:
                raise ValueError(f'Fetch failed (curl {r.returncode})')
            status, _, redirect = r.stdout.partition('\n')
            if status in ('301', '302', '303', '307', '308'):
                url = official_url(redirect.strip())
                continue
            if status != '200':
                raise ValueError(f'HTTP {status}')
            return target.read_bytes()
    raise ValueError('Too many redirects')


def connect(out):
    out.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(out / 'newsletters.sqlite')
    db.row_factory = sqlite3.Row
    db.executescript('''
      CREATE TABLE IF NOT EXISTS documents (
        url TEXT PRIMARY KEY, latest_sha TEXT, last_success TEXT, last_attempt TEXT,
        error TEXT, seen_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS revisions (
        url TEXT NOT NULL, sha TEXT NOT NULL, captured_at TEXT NOT NULL,
        raw_path TEXT NOT NULL, extraction_path TEXT, PRIMARY KEY(url,sha));
      CREATE TABLE IF NOT EXISTS reviews (
        url TEXT NOT NULL, sha TEXT NOT NULL, period TEXT NOT NULL,
        publication_month TEXT NOT NULL, cargo_tonnes INTEGER,
        container_teu INTEGER, reviewed_at TEXT NOT NULL,
        reviewer TEXT NOT NULL, note TEXT NOT NULL, PRIMARY KEY(url,sha));
      CREATE TABLE IF NOT EXISTS review_corrections (
        id INTEGER PRIMARY KEY, url TEXT NOT NULL, sha TEXT NOT NULL,
        before_json TEXT NOT NULL, after_json TEXT NOT NULL,
        corrected_at TEXT NOT NULL, reviewer TEXT NOT NULL, reason TEXT NOT NULL);
    ''')
    if any(r['name'] in METRICS and r['notnull'] for r in db.execute('PRAGMA table_info(reviews)')):
        with db:
            db.execute('ALTER TABLE reviews RENAME TO reviews_legacy_v1')
            db.execute('''CREATE TABLE reviews (url TEXT NOT NULL,sha TEXT NOT NULL,
              period TEXT NOT NULL,publication_month TEXT NOT NULL,cargo_tonnes INTEGER,
              container_teu INTEGER,reviewed_at TEXT NOT NULL,reviewer TEXT NOT NULL,
              note TEXT NOT NULL,PRIMARY KEY(url,sha))''')
            db.execute('INSERT INTO reviews SELECT * FROM reviews_legacy_v1')
            db.execute('DROP TABLE reviews_legacy_v1')
    return db


def archive(raw, out, extension):
    digest = sha(raw)
    path = out / 'raw' / (digest + extension)
    path.parent.mkdir(exist_ok=True)
    if not path.exists():
        path.write_bytes(raw)
    elif sha(path.read_bytes()) != digest:
        raise ValueError('Corrupt archived content')
    return digest, path


def record_pdf(db, out, url, raw, at):
    if not raw.startswith(b'%PDF-'):
        raise ValueError('Expected PDF, not HTML/login/error')
    from pypdf import PdfReader
    import io
    reader = PdfReader(io.BytesIO(raw))
    if reader.is_encrypted or not 1 <= len(reader.pages) <= 10:
        raise ValueError('Unexpected newsletter PDF')
    digest, path = archive(raw, out, '.pdf')
    with db:
        db.execute('INSERT OR IGNORE INTO revisions VALUES (?,?,?,?,NULL)', (url, digest, at, str(path)))
        db.execute('UPDATE documents SET latest_sha=?,last_success=?,last_attempt=?,error=NULL WHERE url=?',
                   (digest, at, at, url))
    return digest


def refresh(db, out):
    pending, visited, pdfs, failures = list(INDEXES), set(), set(), []
    while pending and len(visited) < 8:
        url = pending.pop(0)
        if url in visited:
            continue
        visited.add(url)
        try:
            raw = fetch(url, out)
            digest, _ = archive(raw, out, '.html')
            links = Links()
            links.feed(raw.decode('utf-8-sig', errors='strict'))
            if not links.pdfs and not links.indexes:
                raise ValueError('Index contains no official PDF/archive links')
            pdfs.update(links.pdfs)
            # Follow source-linked newer archive years as they appear, not a fixed UI year list.
            pending.extend(sorted(links.indexes - visited))
            atomic_json(out / 'indexes' / (digest + '.json'),
                        dict(url=url, fetched_at=now(), sha256=digest, pdfs=sorted(links.pdfs)))
        except Exception as e:
            failures.append(dict(url=url, error=str(e)))
    if set(pending) - visited:
        failures.append(dict(error='Archive discovery limit reached; remaining indexes need review'))
    if len(pdfs) > 80:
        raise ValueError('Unexpected discovery size; inspect source layout')
    at = now()
    with db:
        for url in pdfs:
            db.execute('INSERT INTO documents(url,seen_at) VALUES (?,?) ON CONFLICT(url) DO UPDATE SET seen_at=excluded.seen_at', (url, at))
    def download(url):
        try:
            return url, fetch(url, out), None
        except Exception as e:
            return url, None, str(e)
    with ThreadPoolExecutor(max_workers=3) as pool:
        for url, raw, error in pool.map(download, sorted(pdfs)):
            try:
                if error:
                    raise ValueError(error)
                record_pdf(db, out, url, raw, now())
            except Exception as e:
                with db:
                    db.execute('UPDATE documents SET last_attempt=?,error=? WHERE url=?', (now(), str(e), url))
                failures.append(dict(url=url, error=str(e)))
    result = dict(completed_at=now(), indexes_checked=len(visited), pdf_urls_discovered=len(pdfs),
                  failures=failures, scheduled_production_refresh=False)
    atomic_json(out / 'last-refresh.json', result)
    print(json.dumps(result, ensure_ascii=False), flush=True)
    return not failures


def extract(db, out, use_ocr):
    from pypdf import PdfReader
    import pypdfium2 as pdfium
    engine = None
    if use_ocr:
        sys.path.insert(0, str(ROOT / '.local/ocr-runtime'))
        from rapidocr_onnxruntime import RapidOCR
        engine = RapidOCR(intra_op_num_threads=2, inter_op_num_threads=1)
    failures = []
    for row in db.execute('SELECT DISTINCT sha,raw_path FROM revisions ORDER BY sha').fetchall():
        digest, path = row['sha'], Path(row['raw_path'])
        dest = out / 'extracted' / digest
        metadata = dest / 'page-1.json'
        if metadata.exists() and (not use_ocr or json.loads(metadata.read_text(encoding='utf-8')).get('ocr') is not None):
            continue
        try:
            if sha(path.read_bytes()) != digest:
                raise ValueError('Archived PDF hash mismatch')
            dest.mkdir(parents=True, exist_ok=True)
            doc = pdfium.PdfDocument(path)
            page = doc[0]
            bitmap = page.render(scale=2)
            image = bitmap.to_pil()
            image.save(dest / 'page-1.png')
            # Convenient review crop only. Full page always retained to check headings/scope.
            image.crop((0, int(image.height * .25), int(image.width * .36), image.height)).save(dest / 'charts.png')
            text = PdfReader(path).pages[0].extract_text() or ''
            ocr = None
            if engine:
                hits, _ = engine(str(dest / 'page-1.png'))
                ocr = [dict(box=x[0], text=x[1], confidence=float(x[2])) for x in (hits or [])]
            atomic_json(metadata, dict(sha256=digest, page=1, pdf_text=text, ocr=ocr,
                                       status='pending_visual_review', metric_values=None,
                                       proposal=propose(ocr, image.width, image.height) if ocr else None))
            bitmap.close()
            page.close()
            doc.close()
            with db:
                db.execute('UPDATE revisions SET extraction_path=? WHERE sha=?', (str(metadata), digest))
            print('Extracted', digest[:12], flush=True)
        except Exception as e:
            failures.append(dict(sha256=digest, error=str(e)))
    atomic_json(out / 'last-extraction.json', dict(completed_at=now(), failures=failures))
    return not failures


def propose(hits, width, height):
    """Layout-based OCR suggestions only; never emits approved facts."""
    month_names = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
                   'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER']
    def compact(s):
        return re.sub(r'[^A-Z0-9]', '', s.upper())
    publication, reporting = set(), set()
    for hit in hits:
        text = compact(hit['text'])
        if min(p[1] for p in hit['box']) > height * .45:
            continue
        for i, name in enumerate(month_names, 1):
            match = re.fullmatch(name + r'(20\d{2})', text)
            if match:
                publication.add(f'{match[1]}-{i:02}')
            if name + 'OPERATIONALRESULTS' in text:
                reporting.add(i)
    pub = next(iter(publication)) if len(publication) == 1 else None
    period = None
    if pub and len(reporting) == 1:
        month = next(iter(reporting))
        # Content explicitly names reporting month; rollover derives only its year.
        year, published_month = map(int, pub.split('-'))
        if month == (published_month - 2) % 12 + 1:
            period = f'{year - (published_month == 1)}-{month:02}'
    sections = []
    left = [h for h in hits if max(p[0] for p in h['box']) < width * .36]
    for h in left:
        t = compact(h['text'])
        if 'THROUGHPUT' in t:
            key = 'container_teu' if 'CONTAINER' in t and 'TEU' in t else (
                'cargo_tonnes' if 'TON' in t and 'GENERAL' not in t and 'CONTAINER' not in t else None)
            sections.append((sum(p[1] for p in h['box']) / 4, key))
    sections.sort()
    candidates = {}
    for i, (start, key) in enumerate(sections):
        if not key:
            continue
        end = sections[i + 1][0] if i + 1 < len(sections) else height
        region = [h for h in left if start < sum(p[1] for p in h['box']) / 4 < end]
        labels = [h for h in region if re.fullmatch(r'T[AI]NV[UGOA]', compact(h['text']))]
        numbers = [h for h in region if re.fullmatch(r'\d{1,3}(?:,\d{3})+', h['text'].strip())]
        if len(labels) != 1:
            continue
        y = sum(p[1] for p in labels[0]['box']) / 4
        nearby = [h for h in numbers if 0 <= y - sum(p[1] for p in h['box']) / 4 < height * .04]
        if len(nearby) == 1:
            h = nearby[0]
            candidates[key] = dict(value=int(h['text'].replace(',', '')), confidence=h['confidence'],
                                   box=h['box'], label=labels[0]['text'])
    return dict(publication_month=pub, period=period, metrics=candidates,
                status='pending_visual_review', period_basis='explicit content months; previous-year rollover only')


def valid_month(value):
    if not isinstance(value, str) or not re.fullmatch(r'20\d{2}-(0[1-9]|1[0-2])', value):
        raise ValueError('Expected explicit YYYY-MM from reviewed content')
    return value


def apply_reviews(db, out, data):
    """Review values are evidence data, never component defaults or OCR auto-approval."""
    if data.get('asset') != 'tan_vu' or data.get('status') != 'visually_reviewed':
        raise ValueError('Require explicit visual review of Tan Vu')
    if not data.get('reviewer'):
        raise ValueError('Missing reviewer')
    with db:
        for item in data['items']:
            url, digest = official_url(item['url'], pdf=True), item['sha256']
            row = db.execute('SELECT r.raw_path,r.extraction_path,d.latest_sha FROM revisions r JOIN documents d USING(url) WHERE r.url=? AND r.sha=?', (url, digest)).fetchone()
            if not row or row['latest_sha'] != digest or not row['extraction_path']:
                raise ValueError('Review must match an extracted current source revision')
            if sha(Path(row['raw_path']).read_bytes()) != digest:
                raise ValueError('Review raw hash mismatch')
            period = valid_month(item['period'])
            publication = valid_month(item['publication_month'])
            if period >= publication:
                raise ValueError('Operational month must precede publication month for this series')
            values = [item[k] for k in METRICS]
            if all(v is None for v in values) or any(v is not None and (type(v) is not int or v < 0 or v > 100000000) for v in values):
                raise ValueError('Expected at least one non-negative integer metric; missing values stay null')
            if item.get('pdf_page') != 1 or not item.get('note'):
                raise ValueError('Require reviewed page and scope note')
            existing = db.execute('SELECT * FROM reviews WHERE url=? AND sha=?', (url, digest)).fetchone()
            args = (period, publication, *values)
            if existing:
                if tuple(existing[k] for k in ('period', 'publication_month', *METRICS)) != args:
                    if not item.get('correction_reason'):
                        raise ValueError('Changing a reviewed fact requires an explicit correction reason')
                    db.execute('INSERT INTO review_corrections(url,sha,before_json,after_json,corrected_at,reviewer,reason) VALUES (?,?,?,?,?,?,?)',
                               (url, digest, json.dumps(dict(existing)), json.dumps(item), now(), data['reviewer'], item['correction_reason']))
                    db.execute('UPDATE reviews SET period=?,publication_month=?,cargo_tonnes=?,container_teu=?,reviewed_at=?,reviewer=?,note=? WHERE url=? AND sha=?',
                               (*args, now(), data['reviewer'], item['note'], url, digest))
                continue
            db.execute('INSERT INTO reviews VALUES (?,?,?,?,?,?,?,?,?)',
                       (url, digest, *args, now(), data['reviewer'], item['note']))


def build_series(rows):
    periods = {}
    for row in rows:
        periods.setdefault(row['period'], []).append(dict(row))
    months, conflicts = [], []
    for period, sources in sorted(periods.items()):
        variants = {(r['cargo_tonnes'], r['container_teu']) for r in sources}
        if len(variants) != 1:
            conflicts.append(dict(period=period, reason='Conflicting current reviewed publications', sources=sources))
            continue
        cargo, teu = next(iter(variants))
        months.append(dict(period=period, cargo_tonnes=cargo, container_teu=teu,
                           status='reported_month', sources=sources))
    lookup = {m['period']: m for m in months}
    for m in months:
        previous = lookup.get(f"{int(m['period'][:4])-1}{m['period'][4:]}")
        m['yoy_pct'] = {k: (m[k] / previous[k] - 1) * 100 if previous and m[k] is not None and previous[k] not in (None, 0) else None for k in METRICS}
    quarters = []
    for year in sorted({p[:4] for p in lookup}):
        for q in range(1, 5):
            required = [f'{year}-{m:02}' for m in range(q * 3 - 2, q * 3 + 1)]
            if not any(p in lookup for p in required):
                continue
            metric_missing = {k: [p for p in required if p not in lookup or lookup[p][k] is None] for k in METRICS}
            complete = not any(metric_missing.values())
            quarters.append(dict(period=f'{year}-Q{q}', complete=complete,
                                 missing_months=[p for p in required if p not in lookup],
                                 missing_metric_months=metric_missing,
                                 **{k: sum(lookup[p][k] for p in required) if not metric_missing[k] else None for k in METRICS}))
    ytd = []
    for year in sorted({p[:4] for p in lookup}):
        previous_year = str(int(year) - 1)
        shared = []
        for month in range(1, 13):
            current, previous = f'{year}-{month:02}', f'{previous_year}-{month:02}'
            if current not in lookup or previous not in lookup:
                break
            if any(lookup[p][k] is None for p in (current, previous) for k in METRICS):
                break
            shared.append((current, previous))
        if shared:
            totals = {k: sum(lookup[c][k] for c, _ in shared) for k in METRICS}
            baseline = {k: sum(lookup[b][k] for _, b in shared) for k in METRICS}
            ytd.append(dict(year=year, through_month=len(shared), current=totals, previous=baseline,
                            yoy_pct={k: (totals[k] / baseline[k] - 1) * 100 if baseline[k] else None for k in METRICS}))
    return dict(asset='tan_vu', metric_units=METRICS, months=months, quarters=quarters, conflicts=conflicts,
                ytd=ytd, dwt_available=False, production_publication=False)


def export(db, out):
    rows = db.execute('''SELECT r.* FROM reviews r JOIN documents d ON r.url=d.url
                        WHERE r.sha=d.latest_sha ORDER BY r.period,r.url''').fetchall()
    result = build_series(rows)
    dates = [m['period'] for m in result['months']]
    expected = []
    if dates:
        start, end = int(dates[0][:4]) * 12 + int(dates[0][5:]) - 1, int(dates[-1][:4]) * 12 + int(dates[-1][5:]) - 1
        expected = [f'{v//12}-{v%12+1:02}' for v in range(start, end + 1)]
    result['coverage'] = dict(first_reviewed_month=dates[0] if dates else None,
                              latest_reviewed_month=dates[-1] if dates else None,
                              missing_between_reviewed_months=[p for p in expected if p not in dates],
                              full_24_months_verified=len(dates) >= 24 and len(dates) == len(expected)
                              and all(m[k] is not None for m in result['months'] for k in METRICS))
    result.update(generated_at=now(), documents=[dict(r) for r in db.execute('SELECT * FROM documents ORDER BY url')])
    result['pending_reviews'] = [dict(r) for r in db.execute('''SELECT d.url,d.latest_sha,r.extraction_path
      FROM documents d JOIN revisions r ON d.url=r.url AND d.latest_sha=r.sha
      LEFT JOIN reviews v ON v.url=d.url AND v.sha=d.latest_sha WHERE v.sha IS NULL ORDER BY d.url''')]
    atomic_json(out / 'tanvu-series.json', result)
    print(json.dumps(dict(months=len(result['months']), conflicts=len(result['conflicts']),
                          pending_reviews=len(result['pending_reviews']), output=str(out / 'tanvu-series.json'))))
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('command', choices=['refresh', 'retry', 'extract', 'propose', 'review', 'export'])
    p.add_argument('--out', type=Path, default=ROOT / '.local/php-newsletters')
    p.add_argument('--ocr', action='store_true')
    p.add_argument('--file', type=Path)
    args = p.parse_args()
    out = args.out.resolve()
    with connect(out) as db:
        if args.command == 'propose':
            from PIL import Image
            for path in sorted((out / 'extracted').glob('*/page-1.json')):
                data = json.loads(path.read_text(encoding='utf-8'))
                if data.get('ocr') is not None:
                    with Image.open(path.parent / 'page-1.png') as image:
                        data['proposal'] = propose(data['ocr'], image.width, image.height)
                    atomic_json(path, data)
            export(db, out)
            return 0
        if args.command == 'retry':
            failures = []
            for row in db.execute('SELECT url FROM documents WHERE error IS NOT NULL').fetchall():
                try:
                    record_pdf(db, out, row['url'], fetch(row['url'], out), now())
                except Exception as e:
                    failures.append(dict(url=row['url'], error=str(e)))
            atomic_json(out / 'last-retry.json', dict(completed_at=now(), failures=failures))
            export(db, out)
            return 0 if not failures else 1
        if args.command == 'refresh':
            ok = refresh(db, out)
            export(db, out)
            return 0 if ok else 1
        if args.command == 'extract':
            ok = extract(db, out, args.ocr)
            export(db, out)
            return 0 if ok else 1
        if args.command == 'review':
            if not args.file:
                p.error('review requires --file')
            apply_reviews(db, out, json.loads(args.file.read_text(encoding='utf-8')))
        export(db, out)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
