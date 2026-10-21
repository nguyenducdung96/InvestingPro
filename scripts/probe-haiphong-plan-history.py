"""Bounded read-only archive probe; plans remain plans, no database writes."""
import datetime as dt
import hashlib
import html
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / '.local/php-slice2a/plan-history-recheck'
OUT.mkdir(parents=True, exist_ok=True)
TODAY = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()
BASE = 'https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx'


def plain(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', ' ', value))).strip()


def measure(raw, day, url):
    text = raw.decode('utf-8-sig')
    title = re.search(r'KẾ HOẠCH ĐIỀU ĐỘNG TÀU NGÀY\s+(\d{2}/\d{2}/\d{4})', plain(text))
    if not title or title[1] != day.strftime('%d/%m/%Y'):
        raise ValueError('Source report date does not match requested date')
    sections = {}
    for name in ('Roi', 'Vao', 'DiChuyen'):
        marker = re.search(r'id=["\']TD_ShowShipPlan_' + name + r'["\']', text)
        if not marker:
            continue
        content_start = text.find('>',marker.end())+1
        cell_end = text.find('</td>',content_start)
        start = text.find('<table', marker.end())
        if cell_end < 0:
            raise ValueError('Unclosed movement section')
        if start < 0 or start > cell_end:
            if plain(text[content_start:cell_end]):
                raise ValueError('Unexpected non-table movement section')
            sections[name] = {'rows':0,'pilot_rows':[], 'source_empty':True}
            continue
        stop = text.find('</table>', start)
        if start < 0 or stop < 0:
            raise ValueError('Missing source table')
        rows = [[plain(c) for c in re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>', row, re.S | re.I)]
                for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>', text[start:stop], re.S | re.I)]
        rows = [r for r in rows if r]
        if not rows or 'DWT' not in rows[0]:
            raise ValueError('DWT schema changed')
        header = rows[0]
        required = {'STT', 'Thời gian', 'Tên tàu', 'Mớn nước', 'LOA', 'DWT', 'GT',
                    'Tàu lai', 'T.Luồng', 'Từ', 'Đến', 'Đại lý', 'Hoa tiêu'}
        if set(header) != required or len(header) != len(required):
            raise ValueError('Movement columns changed')
        records = []
        for row in rows[1:]:
            if len(row) != len(header):
                raise ValueError('Unexpected column count')
            records.append(dict(zip(header, row)))
        sections[name] = {'rows': len(records), 'source_empty':not records, 'pilot_rows': [r for r in records
                            if r.get('Từ') in ('TAN VU', 'CHUA VE', 'HOANG DIEU', 'HTIT')
                            or r.get('Đến') in ('TAN VU', 'CHUA VE', 'HOANG DIEU', 'HTIT')]}
    if not sections:
        raise ValueError('No movement tables')
    return {'url': url, 'report_date': str(day), 'sha256': hashlib.sha256(raw).hexdigest(),
            'bytes': len(raw), 'semantics': 'authority_published_plan', 'sections': sections}


def main():
    results = []
    for day in (dt.date(2026, 10, 20), dt.date(2025, 10, 20), dt.date(2024, 10, 20)):
        offset = (day - TODAY).days
        url = f'{BASE}?d={offset}'
        with urllib.request.urlopen(url, timeout=30) as response:
            raw = response.read(2_000_001)
            if len(raw) > 2_000_000:
                raise ValueError('Response too large')
        (OUT / f'{day}.html').write_bytes(raw)
        result = measure(raw, day, url)
        results.append(result)
        print(json.dumps({'report_date': str(day), 'url': url,
                          'rows': {k: v['rows'] for k, v in result['sections'].items()},
                          'pilot_rows': {k: len(v['pilot_rows']) for k, v in result['sections'].items()}}))
    receipt = {'checked_at': dt.datetime.now(dt.timezone.utc).isoformat(),
               'scope': 'Three sampled days; not continuous monthly coverage or actual confirmation',
               'sources': results}
    (OUT / 'receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
