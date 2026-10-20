"""Read-only PHP Slice 2A evidence capture; no database writes or event promotion.

Only explicit public official URLs are fetched. Raw captures stay in .local;
the JSON receipt records hashes and observed structure, not operational KPIs.
"""
import concurrent.futures
import datetime as dt
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / '.local/php-slice2a'
OUT = BASE / dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
SOURCES = {
    'authority-home': 'https://csdltau.cangvuhaiphong.gov.vn/',
    'authority-position': 'https://csdltau.cangvuhaiphong.gov.vn/pages/position.aspx',
    'authority-plan': 'https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx?d=-1',
    'operator-ships': 'https://container.haiphongport.com.vn/vi/thongtintau.ttt.html',
    'operator-members': 'https://haiphongport.com.vn/vi/don-vi-thanh-vien',
    'tanvu-profile': 'https://haiphongport.com.vn/vi/don-vi-thanh-vien/chi-nhanh-cang-tan-vu-389.html',
    'hdcv-profile': 'https://haiphongport.com.vn/vi/don-vi-thanh-vien/cong-ty-tnhh-mot-thanh-vien-cang-hoang-dieu-chua-ve-2423.html',
    'htit-profile': 'https://haiphongport.com.vn/vi/don-vi-thanh-vien/cong-ty-tnhh-cang-quoc-te-til-cang-hai-phong-htit-2213.html',
    'htit-first-call': 'https://haiphongport.com.vn/vi/san-xuat-kinh-doanh/chuyen-tau-thuong-mai-dau-tien-buoc-khoi-dau-moi-cho-hoat-dong-khai-thac-cang-htit-thuoc-cong-ty-cp-cang-hai-phong.html',
    'operator-newsletters': 'https://haiphongport.com.vn/vi/ban-tin-thang',
    'newsletter-2025-index': 'https://haiphongport.com.vn/en/support/port-of-hai-phong-monthly-newsletter-2025.html',
    'newsletter-2026-03': 'https://haiphongport.com.vn/FileUpload/Documents/BAN%20TIN%20THANG/2026/tieng-viet-Newsletter-thang03-2026.pdf',
    'htit-home': 'https://htit.com.vn/en.html',
    'htit-vessels': 'https://eport.htit.com.vn/search?item=vessel',
    'annual-2025': 'https://haiphongport.com.vn/FileUpload/Documents/bao_cao_thuong_nien_nam_2025pdf.pdf',
}


class InspectHTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.text, self.links, self.frames, self.scripts, self.headers = [], [], [], [], []
        self.in_header = False
        self.rows = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style'):
            self.hidden += 1
        if tag == 'script' and a.get('src'):
            self.scripts.append(a['src'])
        if tag == 'a' and a.get('href'):
            self.links.append(a['href'])
        if tag == 'iframe' and a.get('src'):
            self.frames.append(a['src'])
        if tag == 'th':
            self.in_header = True
        if tag == 'tr':
            self.rows += 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.hidden = max(0, self.hidden - 1)
        if tag == 'th':
            self.in_header = False

    def handle_data(self, value):
        if not self.hidden:
            self.text.append(value)
            if self.in_header and value.strip():
                self.headers.append(value.strip())


def inspect(item):
    name, url = item
    target = OUT / (name + '.raw')
    timeout = 55 if url.endswith('.pdf') else 25
    result = subprocess.run([
        'curl.exe', '--silent', '--show-error', '--location', '--max-redirs', '3',
        '--max-time', str(timeout), '--max-filesize', '16000000', '--proto', '=https',
        '--proto-redir', '=https', '--write-out', '%{http_code}\n%{content_type}\n%{url_effective}',
        url, '-o', str(target),
    ], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout + 5)
    meta = result.stdout.splitlines()
    row = dict(id=name, url=url, fetched_at=dt.datetime.now(dt.timezone.utc).isoformat(),
               curl_exit=result.returncode, http_status=meta[0] if meta else None,
               content_type=meta[1] if len(meta) > 1 else None,
               final_url=meta[2] if len(meta) > 2 else None)
    if result.returncode:
        row['error'] = result.stderr.strip()[:240]
    if target.exists() and result.returncode == 0:
        raw = target.read_bytes()
        row.update(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                   local_raw=str(target.relative_to(ROOT)))
        if 'html' in str(row['content_type']):
            page = InspectHTML()
            page.feed(raw.decode('utf-8-sig', errors='replace'))
            text = ' '.join(' '.join(page.text).split())
            row.update(table_rows=page.rows, headers=page.headers, frames=page.frames,
                       scripts=page.scripts, links=page.links,
                       dates_seen=sorted(set(re.findall(r'\b\d{1,2}/\d{1,2}/20\d{2}\b', text))),
                       signals={key: key.casefold() in text.casefold() for key in
                                ['DWT', 'ATD', 'ATA', 'ETA', 'KẾ HOẠCH', 'Cập bến DK',
                                 'Rời bến DK', 'TAN VU', 'CHUA VE', 'HOANG DIEU', 'HTIT']})
            (OUT / (name + '.visible.txt')).write_text(text, encoding='utf-8')
    return row


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        rows = list(pool.map(inspect, SOURCES.items()))
    receipt = dict(scope='PHP Slice 2A official-source inspection only',
                   production_refresh_verified=False, actual_event_history_verified=False,
                   sources=rows)
    path = OUT / 'receipt.json'
    serialized = json.dumps(receipt, ensure_ascii=False, indent=2) + '\n'
    path.write_text(serialized, encoding='utf-8')
    (BASE / 'receipt.json').write_text(serialized, encoding='utf-8')
    print(json.dumps([dict(id=r['id'], status=r['http_status'], bytes=r.get('bytes'),
                           rows=r.get('table_rows'), error=r.get('error')) for r in rows],
                     ensure_ascii=False, indent=2))
    print('Receipt:', path)


if __name__ == '__main__':
    main()
