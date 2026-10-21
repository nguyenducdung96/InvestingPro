"""Two-month official plan pilot. No DB writes; no promotion to actual events."""
import collections
import calendar
import concurrent.futures
import datetime as dt
import decimal
import hashlib
import html
import importlib.util
import json
import pathlib
import re
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('plan_probe', ROOT / 'scripts/probe-haiphong-plan-history.py')
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
OUT = ROOT / '.local/php-slice2a/tanvu-month-pilot'
RAW = OUT / 'raw'
RAW.mkdir(parents=True, exist_ok=True)
PERIODS = ('2025-09', '2026-09')


def dwt(value):
    if not value.strip():
        return None
    if not re.fullmatch(r'(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?', value):
        raise ValueError('Unrecognized DWT number: ' + value)
    return str(decimal.Decimal(value.replace('.', '').replace(',', '.')))


def fetch(url):
    with urllib.request.urlopen(url, timeout=25) as response:
        if response.geturl().split('?')[0] != probe.BASE:
            raise ValueError('Unexpected resource destination')
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError('Response too large')
        return raw


def collect(day, anchor):
    url = f'{probe.BASE}?d={(day-anchor).days}'
    try:
        raw = fetch(url)
        digest = hashlib.sha256(raw).hexdigest()
        (RAW / f'{digest}.html').write_bytes(raw)
        result = probe.measure(raw, day, url)
        if not all(k in result['sections'] for k in ('Vao', 'Roi', 'DiChuyen')):
            raise ValueError('Missing expected movement section')
        events, duplicates, seen = [], 0, set()
        for section, berth_col, direction in (('Vao', 'Đến', 'arrival'), ('Roi', 'Từ', 'departure')):
            for row in result['sections'][section]['pilot_rows']:
                if not all(k in row for k in ('Tên tàu', 'Thời gian', 'DWT', 'GT', 'Từ', 'Đến', 'Đại lý')):
                    raise ValueError('Required columns changed')
                if row[berth_col] != 'TAN VU':
                    continue
                if not re.fullmatch(r'\d{2}:\d{2}', row['Thời gian']):
                    raise ValueError('Invalid plan time')
                dt.time.fromisoformat(row['Thời gian'])
                key = (str(day), direction, row['Tên tàu'], row['Thời gian'], row['Từ'], row['Đến'])
                if key in seen:
                    duplicates += 1
                    prior = next(e for e in events if tuple(e['key']) == key)
                    if prior['source_row'] != row:
                        raise ValueError('Conflicting rows share an event key')
                    continue
                seen.add(key)
                events.append({'key': list(key), 'date': str(day), 'direction': direction,
                               'dwt': dwt(row['DWT']), 'source_row': row, 'source_sha256': digest,
                               'semantics': 'authority_published_plan'})
        groups = collections.Counter((e['direction'], e['source_row']['Tên tàu'],
                                      e['source_row']['Từ'], e['source_row']['Đến']) for e in events)
        return {'date': str(day), 'status': 'parsed', 'url_at_fetch': url,
                'fetched_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'sha256': digest,
                'source_rows': {k: v['rows'] for k, v in result['sections'].items()},
                'exact_duplicates_removed': duplicates,
                'ambiguous_repeated_route_groups': sum(n > 1 for n in groups.values()), 'events': events}
    except Exception as exc:
        return {'date': str(day), 'status': 'failed', 'url_at_fetch': url, 'error': str(exc)}
    finally:
        time.sleep(0.4)


def summarize(days):
    result = []
    for month in PERIODS:
        subset = [d for d in days if d['date'].startswith(month)]
        good = [d for d in subset if d['status'] == 'parsed']
        year, number = map(int, month.split('-'))
        expected_days = calendar.monthrange(year, number)[1]
        expected_dates = {f'{month}-{day:02}' for day in range(1,expected_days+1)}
        parsed_dates = {d['date'] for d in good}
        ambiguous = sum(d['ambiguous_repeated_route_groups'] for d in good)
        row = {'month': month, 'expected_days': expected_days, 'parsed_days': len(parsed_dates),
               'failed_days': sorted(expected_dates-parsed_dates),
               'exact_duplicates_removed': sum(d['exact_duplicates_removed'] for d in good),
               'ambiguous_repeated_route_groups': ambiguous}
        for direction in ('arrival', 'departure'):
            events = [e for d in good for e in d['events'] if e['direction'] == direction]
            known = [decimal.Decimal(e['dwt']) for e in events if e['dwt'] is not None]
            complete = parsed_dates == expected_dates and len(good) == expected_days and ambiguous == 0
            row[direction] = {'observed_rows': len(events), 'dwt_missing_rows': len(events)-len(known),
                              'observed_dwt_sum': str(sum(known, decimal.Decimal(0))),
                              'monthly_rows': len(events) if complete else None,
                              'monthly_dwt': str(sum(known, decimal.Decimal(0)))
                              if complete and len(known) == len(events) else None}
        result.append(row)
    return result


def render(receipt):
    # Render from the collector output; the app does not import these review values.
    esc = html.escape
    summaries = receipt['months']
    parts = ['<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
             '<title>Tân Vũ — đối chiếu lịch điều động</title><style>body{font:16px system-ui;background:#f5f7fa;color:#142b38;max-width:1080px;margin:auto;padding:24px}h1{font-size:26px}section{background:white;padding:20px;margin:20px 0;border:1px solid #d6dfe3}table{width:100%;border-collapse:collapse}th,td{padding:10px;text-align:left;border-bottom:1px solid #d6dfe3}.bars{display:flex;gap:24px;align-items:end;height:200px}.bar{background:#087f76;width:90px;min-height:2px}.row{display:flex;gap:24px;flex-wrap:wrap}small{display:block}a{color:#006b64}summary{cursor:pointer}.scroll{overflow:auto}</style>',
             '<h1>Tân Vũ · lịch điều động Cảng vụ</h1><p>Tháng 9/2026 so với tháng 9/2025. Dữ liệu theo kế hoạch công bố; chưa xác nhận đã thực hiện. DWT là trọng tải thiết kế tàu, không phải tấn hàng. Vào và rời được tính riêng; không cộng thành lượt ghé.</p>',
             '<p>Thu thập UTC: '+esc(receipt['checked_at'])+'. Bản review được sinh lại từ nguồn, chưa đưa lên staging.</p>']
    for direction, label in [('arrival', 'Tàu vào'), ('departure', 'Tàu rời')]:
        parts.append('<section><h2>'+label+'</h2><div class="row">')
        for metric, title in [('monthly_rows','Lượt theo lịch'),('monthly_dwt','Tổng DWT theo lịch')]:
            values = [m[direction][metric] for m in summaries]
            maximum = max([float(v) for v in values if v is not None]+[1])
            parts.append('<div><h3>'+title+'</h3><div class="bars">')
            for m, value in zip(summaries, values):
                height = 140*float(value)/maximum if value is not None else 2
                display = f'{float(value):,.0f}' if value is not None else 'Chưa đủ dữ liệu'
                parts.append(f'<div><small>{display}</small><div class="bar" style="height:{height}px"></div><small>{m["month"]}</small></div>')
            parts.append('</div>')
            if all(v is not None for v in values) and float(values[0]) != 0:
                parts.append(f'<p>YoY: {(float(values[1])/float(values[0])-1)*100:+.2f}%</p>')
            else:
                parts.append('<p>YoY: chưa đủ điều kiện.</p>')
            parts.append('</div>')
        parts.append('</div></section>')
    parts.append('<section><h2>Độ phủ và chất lượng</h2><div class="scroll"><table><tr><th>Kỳ</th><th>Ngày parse / dự kiến</th><th>Trùng loại bỏ</th><th>Nhóm cần đối chiếu</th><th>DWT thiếu (vào/rời)</th></tr>')
    for m in summaries:
        parts.append(f'<tr><td>{m["month"]}</td><td>{m["parsed_days"]}/{m["expected_days"]}</td><td>{m["exact_duplicates_removed"]}</td><td>{m["ambiguous_repeated_route_groups"]}</td><td>{m["arrival"]["dwt_missing_rows"]}/{m["departure"]["dwt_missing_rows"]}</td></tr>')
    parts.append('</table></div><p>Đủ trang đã tải không chứng minh lịch nguồn đã đầy đủ mọi chuyến hoặc đã thực hiện. Bản sửa chưa được kiểm chứng qua nhiều lần quan sát.</p></section><section><h2>Nhật ký theo ngày và nguồn</h2>')
    for day in receipt['days']:
        parts.append('<details><summary>'+day['date']+' · '+day['status']+'</summary>')
        parts.append('<p><a href="'+esc(day['url_at_fetch'])+'">URL tại lúc thu thập</a> — tham số d thay đổi ý nghĩa theo ngày server, đối chiếu ngày trong receipt/hash.</p>')
        if day['status'] != 'parsed':
            parts.append('<p>'+esc(day['error'])+'</p>')
        else:
            parts.append('<p>SHA-256: '+day['sha256']+'</p><div class="scroll"><table><tr><th>Chiều</th><th>Giờ</th><th>Tàu</th><th>DWT</th><th>Từ → Đến</th></tr>')
            for e in day['events']:
                r=e['source_row']
                parts.append('<tr>'+''.join('<td>'+esc(str(v))+'</td>' for v in [e['direction'],r['Thời gian'],r['Tên tàu'],e['dwt'] or 'Thiếu',r['Từ']+' → '+r['Đến']])+'</tr>')
            parts.append('</table></div>')
        parts.append('</details>')
    parts.append('</section></html>')
    (OUT/'review.html').write_text(''.join(parts),encoding='utf-8')


def main():
    anchor_raw = fetch(probe.BASE+'?d=0')
    match = re.search(r'KẾ HOẠCH ĐIỀU ĐỘNG TÀU NGÀY\s+(\d{2}/\d{2}/\d{4})', probe.plain(anchor_raw.decode('utf8')))
    if not match:
        raise ValueError('Cannot calibrate server day')
    anchor = dt.datetime.strptime(match[1], '%d/%m/%Y').date()
    dates = [dt.date.fromisoformat(f'{month}-{day:02}') for month in PERIODS for day in range(1,31)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        days = list(pool.map(lambda day: collect(day, anchor), dates))
    receipt = {'checked_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'server_day': str(anchor),
               'parser_version': 'haiphong-plan-pilot/1.0.0',
               'asset': 'TAN VU', 'semantics': 'authority_published_plan', 'actual_verified': False,
               'revision_window_verified': False, 'months': summarize(days), 'days': days}
    serialized = json.dumps(receipt, ensure_ascii=False, indent=2)
    run_id = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    (OUT/f'receipt-{run_id}.json').write_text(serialized,encoding='utf8')
    (OUT/'receipt.json').write_text(serialized,encoding='utf8')
    render(receipt)
    print(json.dumps({'months':receipt['months'],'failures':[d for d in days if d['status']=='failed']}))
    if any(d['status'] != 'parsed' for d in days):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
