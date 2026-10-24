"""Official plan history with complete-month and partial-month comparisons."""
import argparse
import collections
import calendar
import concurrent.futures
import datetime as dt
import decimal
import hashlib
import gzip
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


def parse_day(raw, day, url, berth_alias='TAN VU'):
    digest = hashlib.sha256(raw).hexdigest()
    result = probe.measure(raw, day, url)
    if not all(k in result['sections'] for k in ('Vao', 'Roi', 'DiChuyen')):
        raise ValueError('Missing expected movement section')
    events, duplicates, seen = [], 0, set()
    for section, berth_col, direction in (('Vao', 'Đến', 'arrival'), ('Roi', 'Từ', 'departure')):
        for row in result['sections'][section]['pilot_rows']:
            if not all(k in row for k in ('Tên tàu', 'Thời gian', 'DWT', 'GT', 'Từ', 'Đến', 'Đại lý')):
                raise ValueError('Required columns changed')
            if row[berth_col] != berth_alias:
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
            'source_empty_sections':[k for k,v in result['sections'].items() if v.get('source_empty')],
            'exact_duplicates_removed': duplicates,
            'ambiguous_repeated_route_groups': sum(n > 1 for n in groups.values()), 'events': events}

def collect(day, anchor):
    url = f'{probe.BASE}?d={(day-anchor).days}'
    try:
        raw = fetch(url)
        digest = hashlib.sha256(raw).hexdigest()
        (RAW / f'{digest}.html.gz').write_bytes(gzip.compress(raw,mtime=0))
        return parse_day(raw,day,url)
    except Exception as exc:
        return {'date': str(day), 'status': 'failed', 'url_at_fetch': url, 'error': str(exc)}
    finally:
        time.sleep(0.4)


def summarize(days, periods=None, cutoff=None):
    result = []
    for month in periods if periods is not None else sorted({d['date'][:7] for d in days}):
        subset = [d for d in days if d['date'].startswith(month)]
        good = [d for d in subset if d['status'] == 'parsed']
        year, number = map(int, month.split('-'))
        expected_days = calendar.monthrange(year, number)[1]
        period_end = min(dt.date(year,number,expected_days),cutoff) if cutoff else dt.date(year,number,expected_days)
        elapsed_days = max(0,period_end.day if period_end.strftime('%Y-%m')==month else expected_days)
        expected_dates = {f'{month}-{day:02}' for day in range(1,elapsed_days+1)}
        parsed_dates = {d['date'] for d in good}
        ambiguous = sum(d['ambiguous_repeated_route_groups'] for d in good)
        row = {'month': month, 'expected_days': expected_days, 'parsed_days': len(parsed_dates),
               'elapsed_days':elapsed_days, 'through':str(period_end),
               'status':'partial_month' if elapsed_days<expected_days else 'closed_month',
               'failed_days': sorted(expected_dates-parsed_dates),
               'source_empty_sections':[{'date':d['date'],'sections':d['source_empty_sections']} for d in good if d.get('source_empty_sections')],
               'exact_duplicates_removed': sum(d['exact_duplicates_removed'] for d in good),
               'ambiguous_repeated_route_groups': ambiguous}
        for direction in ('arrival', 'departure'):
            events = [e for d in good for e in d['events'] if e['direction'] == direction]
            known = [decimal.Decimal(e['dwt']) for e in events if e['dwt'] is not None]
            complete = parsed_dates == expected_dates and len(good) == elapsed_days and ambiguous == 0
            row[direction] = {'observed_rows': len(events), 'dwt_missing_rows': len(events)-len(known),
                              'observed_dwt_sum': str(sum(known, decimal.Decimal(0))),
                              'period_rows':len(events) if complete else None,
                              'period_dwt':str(sum(known,decimal.Decimal(0))) if complete and len(known)==len(events) else None,
                              'monthly_rows': len(events) if complete and elapsed_days==expected_days else None,
                              'monthly_dwt': str(sum(known, decimal.Decimal(0)))
                              if complete and elapsed_days==expected_days and len(known) == len(events) else None}
        result.append(row)
    return result




def comparison(days, start, end, direction):
    selected=[d for d in days if start<=dt.date.fromisoformat(d['date'])<=end]
    expected=(end-start).days+1
    dates={d['date'] for d in selected if d['status']=='parsed'}
    valid=len(dates)==expected and len(selected)==expected
    ambiguous=sum(d.get('ambiguous_repeated_route_groups',0) for d in selected)
    events=[e for d in selected if d['status']=='parsed' for e in d['events'] if e['direction']==direction]
    known=[decimal.Decimal(e['dwt']) for e in events if e['dwt'] is not None]
    return {'from':str(start),'through':str(end),'expected_days':expected,'parsed_days':len(dates),
            'rows':len(events) if valid and not ambiguous else None,
            'dwt':str(sum(known,decimal.Decimal(0))) if valid and not ambiguous and len(known)==len(events) else None}


def comparisons(days, periods, cutoff):
    result=[]
    for month in periods:
        year,number=map(int,month.split('-'))
        month_end=dt.date(year,number,calendar.monthrange(year,number)[1])
        end=min(month_end,cutoff)
        previous_last_day=calendar.monthrange(year-1,number)[1]
        previous_end=dt.date(year-1,number,previous_last_day if end==month_end else min(end.day,previous_last_day))
        for direction in ('arrival','departure'):
            result.append({'month':month,'direction':direction,
                'current':comparison(days,dt.date(year,number,1),end,direction),
                'previous':comparison(days,dt.date(year-1,number,1),previous_end,direction)})
    return result


def render(receipt):
    esc=html.escape
    fetched_local=dt.datetime.fromisoformat(receipt['checked_at']).astimezone(dt.timezone(dt.timedelta(hours=7))).strftime('%H:%M:%S %d/%m/%Y')+' UTC+7'
    def fmt(value):
        if value is None:return '—'
        number=decimal.Decimal(str(value))
        formatted=f'{number:,f}'
        integer,separator,fraction=formatted.partition('.')
        fraction=fraction.rstrip('0')
        return integer.replace(',','.')+(','+fraction if fraction else '')
    pct=lambda a,b: '—' if a is None or b is None or decimal.Decimal(str(b))==0 else f'{(decimal.Decimal(str(a))/decimal.Decimal(str(b))-1)*100:+.2f}%'
    parts=['<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tân Vũ — lịch sử theo tháng</title>',
        '<style>body{font:15px system-ui;background:#f5f7fa;color:#142b38;max-width:1160px;margin:auto;padding:22px}h1{font-size:26px}section{background:white;padding:18px;margin:20px 0;border:1px solid #d6dfe3}table{width:100%;border-collapse:collapse}th,td{padding:10px;text-align:right;border-bottom:1px solid #d6dfe3;white-space:nowrap}th:first-child,td:first-child{text-align:left}.scroll{overflow:auto}a{color:#006b64}summary{cursor:pointer;padding:6px}tr.partial{background:#fff4d6}select{padding:8px;font:inherit}small{display:block;color:#4c626c}.chart{display:flex;align-items:end;gap:7px;height:220px;min-width:1020px;padding-top:24px}.group{display:flex;align-items:end;gap:2px;position:relative;padding-bottom:24px;min-width:36px}.bar{width:15px;background:#087f76;min-height:2px}.previous{background:#b4c6ce}.month{position:absolute;bottom:0;font-size:10px}.dwt{font-variant-numeric:tabular-nums}.note{background:#fff4d6;padding:12px}button{cursor:pointer;padding:8px}details details{padding-left:12px}</style>',
        '<h1>Tân Vũ · lượt và DWT theo lịch điều động</h1>',
        '<p>Phạm vi '+esc(receipt['from'])+' → '+esc(receipt['through'])+' (UTC+7). Tháng đang tích lũy được tô vàng; so cùng ngày đầu tháng đến ngày chốt ở năm trước. Không đưa ngày tương lai vào tổng.</p>',
        '<p>Theo lịch Cảng vụ công bố, chưa xác nhận actual. DWT là trọng tải thiết kế, không phải tấn hàng; vào/rời tách riêng. Không cộng thành lượt ghé.</p>',
        '<label for="direction">Chiều: </label><select id="direction" onchange="document.querySelectorAll(\'[data-direction]\').forEach(e=>e.hidden=e.dataset.direction!==this.value)"><option value="departure">Tàu rời</option><option value="arrival">Tàu vào</option></select>',
        '<style>.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.kpis section{margin:8px 0}</style>',
        '<p><small>Thu thập '+esc(fetched_local)+' · Bản review local, chưa thay staging. Có thể chạy lại collector để cập nhật nguồn.</small></p>']
    for direction,label in [('departure','Tàu rời'),('arrival','Tàu vào')]:
        hidden='' if direction=='departure' else ' hidden'
        parts.append(f'<div data-direction="{direction}"{hidden}>')
        comps=[c for c in receipt['comparisons'] if c['direction']==direction]
        latest=comps[-1]
        parts.append('<div class="kpis">')
        for heading,current,previous in [('Tháng đang theo dõi',latest['current'],latest['previous']),('Lũy kế năm cùng phạm vi',receipt['ytd'][direction]['current'],receipt['ytd'][direction]['previous'])]:
            parts.append('<section><h2>'+heading+' · '+label+'</h2><p>'+current['from']+' → '+current['through']+'</p><p><strong>'+fmt(current['dwt'])+' DWT</strong> · '+fmt(current['rows'])+' lượt theo lịch · YoY DWT '+pct(current['dwt'],previous['dwt'])+'</p><small>Cùng kỳ '+previous['from']+' → '+previous['through']+': '+fmt(previous['dwt'])+' DWT · '+fmt(previous['rows'])+' lượt.</small></section>')
        parts.append('</div>')
        for metric,title in [('dwt','DWT theo tháng'),('rows','Lượt theo tháng')]:
            maximum=max([float(c[p][metric]) for c in comps for p in ['current','previous'] if c[p][metric] is not None]+[1])
            parts.append('<section><h2>'+title+'</h2><p>Xanh: kỳ theo dõi · Xám: cùng phạm vi năm trước. Rê chuột hoặc dùng bảng bên dưới để xem giá trị.</p><div class="scroll"><div class="chart">')
            for c in comps:
                parts.append('<div class="group">')
                for period,cls in [('previous','previous'),('current','')]:
                    value=c[period][metric]
                    text=f'{c["month"]} {period}: {fmt(value)}; {c[period]["from"]} → {c[period]["through"]}'
                    parts.append(f'<div class="bar {cls}" role="img" aria-label="{esc(text)}" title="{esc(text)}" style="height:{180*float(value)/maximum if value is not None else 0}px;opacity:{1 if value is not None else 0}"></div>')
                parts.append('<span class="month">'+c['month'][2:]+'</span></div>')
            parts.append('</div></div></section>')
        parts.append('<section><h2>Bảng tháng · '+label+'</h2><div class="scroll"><table><thead><tr><th>Kỳ / phạm vi</th><th>Lượt</th><th>DWT</th><th>Cùng kỳ DWT</th><th>YoY DWT</th><th>Ngày nguồn</th><th>Trạng thái</th></tr></thead><tbody>')
        for m,c in zip(receipt['months'],comps):
            partial=m['status']=='partial_month'
            status='Đang tích lũy' if partial else 'Tháng đã qua'
            if m['failed_days']:status+=' · thiếu ngày'
            if m['ambiguous_repeated_route_groups']:status+=' · cần đối chiếu giờ'
            parts.append('<tr'+(' class="partial"' if partial else '')+'><td><a href="#days-'+m['month']+'">'+m['month']+'</a>'+(' · 01–'+m['through'][-2:] if partial else '')+'</td><td>'+fmt(c['current']['rows'])+'</td><td>'+fmt(c['current']['dwt'])+'</td><td>'+fmt(c['previous']['dwt'])+'</td><td>'+pct(c['current']['dwt'],c['previous']['dwt'])+'</td><td>'+str(m['parsed_days'])+'/'+str(m['elapsed_days'])+'</td><td>'+status+'</td></tr>')
        first_year=int(receipt['from'][:4])
        parts.append(f'</tbody></table></div><small>Phạm vi thu thập bắt đầu từ {esc(receipt["from"])}; cùng kỳ {first_year-1} chưa có trong bộ dữ liệu này. Dấu — là thiếu dữ liệu, không phải 0.</small></section></div>')
    parts.append('<section><h2>Chất lượng và nhật ký nguồn</h2><p>Ngày thiếu không phải zero. Tổng chính thức của tháng để trống nếu thiếu ngày hoặc có nhóm cùng tàu/tuyến khác giờ cần đối chiếu. Bản lịch có thể được sửa; chưa nghiệm thu ghép lượt qua nhiều ngày.</p>')
    for m in receipt['months']:
        parts.append('<details id="days-'+m['month']+'"><summary>'+m['month']+' · '+str(m['parsed_days'])+'/'+str(m['elapsed_days'])+' ngày · '+str(m['ambiguous_repeated_route_groups'])+' nhóm cần đối chiếu</summary>')
        for d in receipt['days']:
            if not d['date'].startswith(m['month']):continue
            parts.append('<details><summary>'+d['date']+' · '+d['status']+'</summary>')
            if d['status']!='parsed':parts.append('<p>'+esc(d['error'])+'</p>')
            else:
                parts.append('<p><a href="'+esc(d['url_at_fetch'])+'">Nguồn tại lúc thu thập</a> · URL d thay đổi theo ngày server.</p><small>SHA-256 '+d['sha256']+'</small><div class="scroll"><table><tr><th>Chiều</th><th>Giờ</th><th>Tàu</th><th>DWT</th><th>Từ → Đến</th></tr>')
                for e in d['events']:
                    r=e['source_row'];parts.append('<tr>'+''.join('<td>'+esc(str(v))+'</td>' for v in [e['direction'],r['Thời gian'],r['Tên tàu'],fmt(e['dwt']),r['Từ']+' → '+r['Đến']])+'</tr>')
                parts.append('</table></div>')
                if d.get('source_empty_sections'):
                    parts.append('<p>Mục không có dòng công bố trên nguồn: '+esc(', '.join(d['source_empty_sections']))+'. Đây không phải xác nhận không có tàu thực tế.</p>')
            parts.append('</details>')
        parts.append('</details>')
    parts.append('</section></html>')
    (OUT/'review.html').write_text(''.join(parts),encoding='utf8')


def history_window(start, source_day, today, through=None):
    cutoff=through if through is not None else min(source_day,today)-dt.timedelta(days=1)
    if start>cutoff or cutoff>=today or cutoff>=source_day:
        raise ValueError('Use elapsed source days only; cutoff must precede today and source day')
    dates=[start+dt.timedelta(days=n) for n in range((cutoff-start).days+1)]
    return cutoff, dates


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--from',dest='start',default='2025-01-01')
    parser.add_argument('--through',default=None,help='Default: last elapsed Vietnam/source day')
    parser.add_argument('--days-file',type=pathlib.Path,help='Server-selected missing/new days and revision window')
    args=parser.parse_args()
    anchor_raw = fetch(probe.BASE+'?d=0')
    match = re.search(r'KẾ HOẠCH ĐIỀU ĐỘNG TÀU NGÀY\s+(\d{2}/\d{2}/\d{4})', probe.plain(anchor_raw.decode('utf8')))
    if not match:
        raise ValueError('Cannot calibrate server day')
    anchor = dt.datetime.strptime(match[1], '%d/%m/%Y').date()
    today=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()
    start=dt.date.fromisoformat(args.start)
    cutoff,dates=history_window(start,anchor,today,dt.date.fromisoformat(args.through) if args.through else None)
    if args.days_file:
        wanted=json.loads(args.days_file.read_text(encoding='utf8'))
        if not isinstance(wanted,list) or not wanted:raise ValueError('Empty or invalid day selection')
        dates=sorted({dt.date.fromisoformat(value) for value in wanted})
        if any(day<start or day>cutoff for day in dates):raise ValueError('Day selection outside elapsed source range')
    periods=sorted({d.strftime('%Y-%m') for d in dates})
    cache={}
    candidates={}
    if (OUT/'receipt.json').exists():
        old=json.loads((OUT/'receipt.json').read_text(encoding='utf8'))
        candidates={d['date']:d for d in old['days']}
    checkpoints=OUT/'day-cache'
    checkpoints.mkdir(exist_ok=True)
    for path in checkpoints.glob('*.json'):
        try:
            d=json.loads(path.read_text(encoding='utf8'));candidates[d['date']]=d
        except (ValueError,KeyError):continue
    for d in candidates.values():
        if d['status']!='parsed' or dt.date.fromisoformat(d['date'])>=cutoff-dt.timedelta(days=3):continue
        try:
            path=RAW/f'{d["sha256"]}.html.gz'
            raw=gzip.decompress(path.read_bytes()) if path.exists() else (RAW/f'{d["sha256"]}.html').read_bytes()
            if hashlib.sha256(raw).hexdigest()!=d['sha256']:raise ValueError('Cache hash mismatch')
            probe.measure(raw,dt.date.fromisoformat(d['date']),d['url_at_fetch'])
            cache[d['date']]=d
        except (OSError,ValueError):continue  # corrupt/missing cache is fetched again, never served
    print(json.dumps({'requested_days':len(dates),'cached_days':len(cache),'through':str(cutoff)}),flush=True)
    def get_day(day):
        result=cache.get(str(day)) or collect(day,anchor)
        (checkpoints/f'{day}.json').write_text(json.dumps(result,ensure_ascii=False),encoding='utf8')
        return result
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        days=[]
        for result in pool.map(get_day,dates):
            days.append(result)
            if len(days)%60==0:print(json.dumps({'processed_days':len(days),'requested_days':len(dates)}),flush=True)
    compare=comparisons(days,periods,cutoff)
    previous_cutoff=dt.date(cutoff.year-1,cutoff.month,min(cutoff.day,calendar.monthrange(cutoff.year-1,cutoff.month)[1]))
    ytd={direction:{'current':comparison(days,dt.date(cutoff.year,1,1),cutoff,direction),
                   'previous':comparison(days,dt.date(cutoff.year-1,1,1),previous_cutoff,direction)} for direction in ('arrival','departure')}
    receipt = {'checked_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'server_day': str(anchor),
               'parser_version': 'haiphong-plan-pilot/1.1.0', 'from':str(start),'through':str(cutoff),
               'asset': 'TAN VU', 'semantics': 'authority_published_plan', 'actual_verified': False,
               'revision_window_verified': False, 'months': summarize(days,periods,cutoff),
               'comparisons':compare,'ytd':ytd,'days': days}
    serialized = json.dumps(receipt, ensure_ascii=False, indent=2)
    run_id = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    (OUT/f'receipt-{run_id}.json').write_text(serialized,encoding='utf8')
    (OUT/'receipt.json').write_text(serialized,encoding='utf8')
    render(receipt)
    print(json.dumps({'months':len(receipt['months']), 'days':len(days),
                      'parsed_days':sum(d['status']=='parsed' for d in days),
                      'through':str(cutoff),'latest_month':receipt['months'][-1],
                      'failures':[d for d in days if d['status']=='failed']}))
    if any(d['status'] != 'parsed' for d in days):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
