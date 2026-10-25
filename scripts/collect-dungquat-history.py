"""Refresh reviewed operator disclosures, without inferring a complete port-call feed.

Only two explicitly reviewed articles contribute events. News publication dates,
cargo tonnage, agency services and undated arrivals never become event facts.
"""
import datetime as dt
import hashlib
import html
import json
from pathlib import Path
import re
import subprocess
import shutil

ROOT = Path(__file__).resolve().parents[1]
VERSION = 'dungquat-reviewed-disclosures/1.0.0'
BASE = 'https://dqp.gemadept.com.vn/'
REVIEWS = [
    {'id': 4019, 'slug': 'gemadept-dung-quat-khai-thac-tau-vien-nen-lon-nhat-dau-tien-khu-vuc-dung-quat',
     'vessel': 'Spring Breeze', 'day': '2025-02-10', 'dwt': None,
     'field': 'excerpt', 'date_text': 'ngày 10 tháng 02 năm 2025',
     'scope_text': 'cảng Gemadept Dung Quất', 'event_text': 'tiếp nhận và khai thác',
     'note': 'Ngày tiếp nhận ghi trong phần dẫn; 27.500 MT là hàng viên nén, không phải DWT.'},
    {'id': 4051, 'slug': 'gemadept-dung-quat-khong-ngung-cai-tien-nang-cao-chat-luong-hang-dau-khu-vuc',
     'vessel': 'Glorious Lotus', 'day': '2022-06-04', 'dwt': 49602,
     'field': 'content', 'date_text': 'cập cảng ngày 04/06/2022',
     'scope_text': 'Cảng Gemadept Dung Quất', 'event_text': 'Tàu Glorious Lotus (DWT: 49,602)',
     'note': 'Ngày cập cảng và DWT nêu trực tiếp; 40.000 tấn là hàng dăm gỗ, giữ ngoài DWT.'},
]


def text(value):
    return ' '.join(html.unescape(re.sub('<[^>]+>', ' ', value)).split())


def parse(raw, review, checked):
    data = json.loads(raw)
    url = BASE + review['slug'] + '/'
    if data.get('id') != review['id'] or data.get('link') != url or data.get('status') != 'publish':
        raise ValueError('Reviewed article identity changed')
    for field in ('content', 'excerpt'):
        if not isinstance(data.get(field, {}).get('rendered'), str) or data[field].get('protected'):
            raise ValueError('Article no longer public or schema changed')
    evidence = text(data[review['field']]['rendered'])
    all_text = evidence + ' ' + text(data['content']['rendered'])
    if any(term.casefold() not in all_text.casefold() for term in
           (review['vessel'], review['scope_text'], review['date_text'], review['event_text'])):
        raise ValueError('Reviewed event evidence changed; manual review required')
    day = dt.date.fromisoformat(review['day'])
    if day > dt.datetime.fromisoformat(checked).astimezone(dt.timezone(dt.timedelta(hours=7))).date():
        raise ValueError('Future arrival is not a reported actual event')
    return {'key': 'dqp-disclosure-' + str(review['id']), 'asset': 'gemadept_dung_quat',
            'vessel': review['vessel'], 'kind': 'arrival', 'day': day.isoformat(), 'time': None,
            'precision': 'day', 'dwt': review['dwt'], 'gt': None,
            'source': {'url': url, 'api_url': BASE + 'wp-json/wp/v2/posts/' + str(review['id']),
                       'sha256': hashlib.sha256(raw).hexdigest(), 'published_at': data['date'],
                       'checked_at': checked, 'field': review['field'], 'note': review['note'],
                       'parser_version': VERSION}}


def fetch(url):
    if not url.startswith(BASE + 'wp-json/wp/v2/posts/'):
        raise ValueError('Unexpected source URL')
    curl = shutil.which('curl.exe') or shutil.which('curl')
    if not curl:
        raise RuntimeError('curl is required')
    result = subprocess.run([curl, '--fail', '--silent', '--show-error', '--location', '--max-redirs', '3',
                             '--max-time', '30', '--max-filesize', '4000000', url], capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf-8', errors='replace')[:300])
    return result.stdout


def main():
    archive = ROOT / '.local/dungquat/archive'
    archive.mkdir(parents=True, exist_ok=True)
    output = ROOT / 'packages/modules/port/src/dungquat-history-data.ts'
    previous = json.loads(output.read_text(encoding='utf-8').split(' = ', 1)[1].removesuffix(' as const;\n')) if output.exists() else {'events': []}
    checked = dt.datetime.now(dt.timezone.utc).isoformat()
    events, errors = [], []
    for review in REVIEWS:
        try:
            raw = fetch(BASE + 'wp-json/wp/v2/posts/' + str(review['id']))
            event = parse(raw, review, checked)
            (archive / (event['source']['sha256'] + '.json')).write_bytes(raw)
            events.append(event)
        except (ValueError, RuntimeError, KeyError, TypeError) as exc:
            # An outage or editorial change cannot erase an already evidenced event.
            events.extend(e for e in previous['events'] if e['key'] == 'dqp-disclosure-' + str(review['id']))
            errors.append({'article_id': review['id'], 'error': str(exc), 'attempted_at': checked})
    data = {'events': sorted(events, key=lambda e: (e['day'], e['key'])),
            'quality': {'semantics': 'operator_disclosed_terminal_activity', 'movement_scope': 'terminal',
                        'actual_verified': False, 'history_complete': False, 'regular_history_available': False,
                        'status': 'reviewed_subset', 'last_attempt': checked,
                        'last_success': checked if not errors else previous.get('quality', {}).get('last_success'),
                        'source_errors': errors, 'reviewed_articles': len(REVIEWS),
                        'excluded_disclosures': [
                            {'article_id': 4038, 'vessel': 'Dyna Floresta', 'reason': 'Ngày cập cảng không được nêu chính xác; không lấy ngày đăng làm ngày đến.'},
                            {'article_id': 4054, 'vessel': 'Golden Autumn', 'reason': 'Chỉ nêu đầu tháng 06/2022; không tạo ngày/giờ đến.'}],
                        'source_url': BASE + 'tin-tuc/', 'parser_version': VERSION}}
    output.write_text('// Generated by scripts/collect-dungquat-history.py.\nimport type {DungquatEvent} from \'./dungquat-activity\';\nexport const dungquatHistory: {events: readonly DungquatEvent[]; quality: {semantics:string;movement_scope:string;actual_verified:false;history_complete:false;regular_history_available:false;status:string;last_attempt:string;last_success:string|null;source_errors:readonly {article_id:number;error:string;attempted_at:string}[];reviewed_articles:number;excluded_disclosures:readonly {article_id:number;vessel:string;reason:string}[];source_url:string;parser_version:string}} = '
                      + json.dumps(data, ensure_ascii=False, indent=2) + ' as const;\n', encoding='utf-8')
    receipt = ROOT / '.local/dungquat/history-receipt.json'
    receipt.write_text(json.dumps(data['quality'], ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'events': len(events), 'source_errors': len(errors)}))
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
