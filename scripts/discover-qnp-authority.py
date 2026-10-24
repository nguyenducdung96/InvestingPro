"""Read-only archive of the authority's dated schedule index; no OCR or metric publication."""
import datetime as dt
import hashlib
import html
from html.parser import HTMLParser
import json
import pathlib
import re
import urllib.parse
import urllib.request

BASE = 'https://cangvuhanghaiquynhon.gov.vn/'
INDEX = BASE + 'index.aspx?page=news&cat=2014'
OUT = pathlib.Path(__file__).resolve().parents[1] / '.local/qnp-authority'


class HiddenInputs(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.fields = {}; self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'input' and a.get('type') == 'hidden' and a.get('name'):
            self.fields[a['name']] = a.get('value', '')


def main():
    OUT.mkdir(exist_ok=True)
    found = {}; pages = []
    body = None
    for page in range(1, 185):
        req = urllib.request.Request(INDEX, data=body, headers={'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/x-www-form-urlencoded'})
        with urllib.request.urlopen(req, timeout=40) as response:
            if response.geturl() != INDEX:
                raise ValueError('Unexpected authority redirect')
            raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError('Index too large')
        text = raw.decode('utf-8-sig')
        current = re.search(r'id="ctl22_LabelCurrentPage">(\d+)</span>', text)
        if not current or int(current[1]) != page:
            raise ValueError('Authority page did not advance')
        (OUT / f'index-{page}.html').write_bytes(raw)
        pages.append({'page': page, 'sha256': hashlib.sha256(raw).hexdigest()})
        dates = []
        for href, title in re.findall(r'<a href="([^"]+)" class="titleNewsNormal">(.*?)</a>', text, re.S):
            title = html.unescape(re.sub('<[^>]*>', '', title)).strip()
            match = re.search(r'NGÀY\s+(\d{1,2})/(\d{1,2})/(\d{4})', title, re.I)
            if not match:
                raise ValueError('Authority dated title schema changed')
            day = dt.date(int(match[3]), int(match[2]), int(match[1])); dates.append(day)
            if day < dt.date(2025, 1, 1):
                continue
            url = urllib.parse.urljoin(BASE, html.unescape(href))
            if not re.fullmatch(re.escape(BASE) + r'index\.aspx\?page=detail&id=\d+', url):
                raise ValueError('Unexpected authority detail link')
            found[url] = {'url': url, 'title': title, 'title_day': str(day), 'status': 'pending_document_extraction'}
        if not dates:
            raise ValueError('No dated authority entries')
        if min(dates) < dt.date(2025, 1, 1):
            break
        fields = HiddenInputs(text).fields
        fields.update({'ctl22$ImageButton_NavNext.x': '1', 'ctl22$ImageButton_NavNext.y': '1'})
        body = urllib.parse.urlencode(fields).encode()
        if page % 5 == 0:
            print(f'Archived {page} pages, {len(found)} candidate schedules', flush=True)
    result = {'fetched_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'source': INDEX,
              'history_complete': False, 'automatic_promotion': False, 'pages': pages, 'schedules': list(found.values())}
    (OUT / 'candidates.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'pages': len(pages), 'candidate_schedules': len(found), 'history_complete': False}))


if __name__ == '__main__':
    main()
