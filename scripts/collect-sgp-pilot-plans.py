"""Archive SGP K12/TT2 pilot plans for review, independently of product editions."""
import argparse
import collections
import datetime as dt
import gzip
import hashlib
from html.parser import HTMLParser
import io
import json
import os
from pathlib import Path
import re
import time
import unicodedata
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://www.pilotcosouth.vn/ke-hoach-dieu-dong-tau/hoa-tieu-hang-hai-mien-nam-khu-vuc-tphcm-2'
VERSION = 'sgp-pilot-review/1.0.0'
TARGETS = {'K12', 'TT2'}
ROLES = {'1': 'arrival', '2': 'departure', '3': 'internal'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

def norm(value):
    return ' '.join(unicodedata.normalize('NFC', value).split())

def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))

def digest(value):
    return hashlib.sha256(value).hexdigest()

class Node:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def find(self, predicate):
        found = [self] if predicate(self) else []
        for child in self.children:
            if isinstance(child, Node):
                found.extend(child.find(predicate))
        return found

    def text(self):
        return norm(' '.join(child.text() if isinstance(child, Node) else child for child in self.children))

    def has_class(self, value):
        return value in self.attrs.get('class', '').split()

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Node(tag, attrs))

    def handle_endtag(self, tag):
        for index in range(len(self.stack)-1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)

def flags(notes):
    plain = ''.join(c for c in unicodedata.normalize('NFD', notes).upper() if not unicodedata.combining(c)).replace('Đ', 'D')
    checks = {'cancelled': r'\(\s*BO\s*\)', 'postponed': r'LUI\s+NGAY', 'time_changed': r'DOI\s+GIO',
              'additional': r'\bDX\b', 'delayed': r'TAU\s+CHAM'}
    return [key for key, expression in checks.items() if re.search(expression, plain)]

def clock(value):
    if re.fullmatch(r'\d{2}:\d{2}', value):
        try:
            return dt.time.fromisoformat(value).strftime('%H:%M')
        except ValueError:
            pass
    return None

def number(value):
    if re.fullmatch(r'\d+(?:\.\d+)?', value) and 0 < float(value) <= 1_000_000:
        return float(value)
    return None

def locations(value, section):
    if section != 'internal':
        return [value] if value in TARGETS else []
    # Never substring-match K12A, NEO K12, B.TT2, TTD or K17 into the target scope.
    candidates = []
    for match in re.finditer('-', value):
        left, right = norm(value[:match.start()]), norm(value[match.end():])
        if left and right and (left in TARGETS or right in TARGETS):
            candidates.append((left, right))
    return sorted(set(part for pair in candidates for part in pair if part in TARGETS))

def parse(raw, as_of):
    page = Page()
    page.feed(raw.decode('utf-8-sig'))
    selectors = page.root.find(lambda n: n.has_class('ajax-select-date'))
    if len(selectors) != 1:
        raise ValueError('Missing or ambiguous pilot day selector')
    days = {}
    for option in selectors[0].find(lambda n: n.tag == 'option'):
        match = re.search(r'KẾ HOẠCH DẪN TÀU TRONG NGÀY (\d{2})\.(\d{2})\.(\d{4})', option.text())
        value = option.attrs.get('value')
        if not match or not re.fullmatch(r'\d+', value or '') or value in days:
            raise ValueError('Invalid or duplicate pilot day option')
        day, month, year = map(int, match.groups())
        days[value] = str(dt.date(year, month, day))
    ordered = sorted(days.values())
    if len(ordered) != 2 or (dt.date.fromisoformat(ordered[1])-dt.date.fromisoformat(ordered[0])).days != 1:
        raise ValueError('Expected two distinct consecutive pilot days')
    if not as_of-dt.timedelta(days=1) <= dt.date.fromisoformat(ordered[-1]) <= as_of+dt.timedelta(days=1):
        raise ValueError('Stale or unexpected future pilot board')
    tabs = page.root.find(lambda n: n.has_class('tab-content') and re.fullmatch(r'tab\d+', n.attrs.get('id', '')))
    if len(tabs) != len(days) or {tab.attrs['id'][3:] for tab in tabs} != set(days):
        raise ValueError('Pilot date options and tabs disagree')
    result = []
    for tab in tabs:
        day = days[tab.attrs['id'][3:]]
        groups = tab.find(lambda n: n.has_class('wrap-table-group'))
        if len(groups) != 3 or {g.attrs.get('table-id') for g in groups} != set(ROLES):
            raise ValueError('Missing or duplicate pilot movement section')
        events, counts = [], {}
        for group in groups:
            section = ROLES[group.attrs['table-id']]
            tables = group.find(lambda n: n.tag == 'table')
            if len(tables) != 1:
                raise ValueError('Ambiguous pilot table')
            rows = tables[0].find(lambda n: n.tag == 'tr')
            title = {'arrival': 'Tàu vào cảng', 'departure': 'Tàu rời cảng', 'internal': 'Tàu dời tại cảng'}[section]
            expected = ['N.', 'Hoa tiêu', title, "M'n", 'Dài', 'GRT', 'Cầu bến']+(['Cano'] if section == 'arrival' else [])+['T.g', 'Ghi chú']
            cells = lambda row: [n.text() for n in row.children if isinstance(n, Node) and n.tag in ['th', 'td']]
            if not rows or cells(rows[0]) != expected:
                raise ValueError('Pilot table schema changed: '+section)
            counts[section] = 0
            numbers = set()
            for row in rows[1:]:
                values = cells(row)
                if not values or (len(values) == 1 and not values[0]):
                    continue
                if len(values) != len(expected) or not values[0].isdigit() or values[0] in numbers:
                    raise ValueError('Invalid or duplicate pilot source row')
                numbers.add(values[0])
                counts[section] += 1
                label = values[6].upper()
                matched = locations(label, section)
                if not matched:
                    continue
                if not values[2]:
                    raise ValueError('Matched pilot row has no vessel')
                notes = values[-1]
                event = {'day': day, 'section': section, 'vessel': values[2], 'berth_raw': values[6],
                         'matched_berths': matched, 'grt': number(values[5]), 'grt_raw': values[5] or None,
                         'dwt': None, 'scheduled_time': clock(values[-2]), 'scheduled_time_raw': values[-2] or None,
                         'boarding_time_raw': (values[7] or None) if section == 'arrival' else None,
                         'notes_raw': notes or None, 'status_flags': flags(notes), 'source_row': int(values[0]),
                         'raw_cells': values, 'semantics': 'pilot_published_plan', 'actual_verified': False,
                         'issuer_attribution': 'sgp_candidate', 'included_in_issuer_totals': False}
                event['candidate_key'] = digest(compact([day, section, norm(values[2]).upper(), label]).encode())
                event['observation_id'] = digest(compact([day, section, values]).encode())
                events.append(event)
        duplicates = collections.Counter(e['candidate_key'] for e in events)
        for event in events:
            event['requires_review'] = duplicates[event['candidate_key']] > 1
        result.append({'day': day, 'source_rows': counts, 'events': events,
                       'duplicate_candidate_keys': sorted(key for key, count in duplicates.items() if count > 1)})
    return {'parser_version': VERSION, 'source_url': URL, 'sha256': digest(raw), 'days': sorted(result, key=lambda d: d['day']),
            'actual_verified': False, 'included_in_issuer_totals': False}

def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    temporary.replace(path)

def capture(raw, out, as_of):
    sha = digest(raw)
    archive = out/'archive'/(sha+'.html.gz')
    archive.parent.mkdir(parents=True, exist_ok=True)
    if archive.exists():
        if gzip.decompress(archive.read_bytes()) != raw:
            raise ValueError('Existing raw archive is corrupt')
    else:
        buffer = io.BytesIO()
        with gzip.GzipFile(fileobj=buffer, mode='wb', filename='', mtime=0) as stream:
            stream.write(raw)
        with archive.open('xb') as stream:
            stream.write(buffer.getvalue())
    parsed = parse(raw, as_of)
    revision_path = out/'revisions'/VERSION.replace('/', '-')/(sha+'.json')
    if revision_path.exists():
        if json.loads(revision_path.read_text(encoding='utf8')) != parsed:
            raise ValueError('Immutable parsed revision differs')
    else:
        write_json(revision_path, parsed)
    index_path = out/'index.json'
    had_history = index_path.exists()
    index = json.loads(index_path.read_text(encoding='utf8')) if had_history else {'parser_version': VERSION, 'days': {}}
    if index['parser_version'] != VERSION:
        raise ValueError('Historical index parser version needs review')
    reviews = []
    for day in parsed['days']:
        entry = index['days'].setdefault(day['day'], {'revisions': [], 'accepted_sha256': None})
        if sha not in entry['revisions']:
            entry['revisions'].append(sha)
        removed = []
        if entry['accepted_sha256']:
            if not isinstance(entry['accepted_sha256'], str) or not re.fullmatch(r'[a-f0-9]{64}', entry['accepted_sha256']):
                raise ValueError('Invalid historical revision checksum')
            previous = json.loads((revision_path.parent/(entry['accepted_sha256']+'.json')).read_text(encoding='utf8'))
            previous_raw = gzip.decompress((archive.parent/(entry['accepted_sha256']+'.html.gz')).read_bytes())
            if digest(previous_raw) != entry['accepted_sha256'] or previous != parse(previous_raw, dt.date.fromisoformat(max(d['day'] for d in previous['days']))):
                raise ValueError('Historical revision differs from its raw archive')
            previous_day = next(d for d in previous['days'] if d['day'] == day['day'])
            # A change of time/status stays traceable; unexplained disappeared candidates need review.
            removed = sorted({e['candidate_key'] for e in previous_day['events']}-{e['candidate_key'] for e in day['events']})
        if removed or day['duplicate_candidate_keys']:
            reviews.append({'day': day['day'], 'removed_candidate_keys': removed, 'duplicate_candidate_keys': day['duplicate_candidate_keys']})
        else:
            entry['accepted_sha256'] = sha
        entry['latest_seen_sha256'] = sha
    write_json(index_path, index)
    return {'source_url': URL, 'sha256': sha, 'parser_version': VERSION, 'days': [d['day'] for d in parsed['days']],
            'selected_rows': sum(len(d['events']) for d in parsed['days']), 'retained_history_days': len(index['days']),
            'cold_runner': not had_history, 'history_from': min(index['days']), 'history_through': max(index['days']),
            'review_required': reviews, 'source_capture_success': True, 'product_edition_modified': False,
            'scheduled_refresh_verified': False, 'actual_verified': False}

def fetch():
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(URL, headers={'User-Agent': 'InvestingPro public source research'}), timeout=30) as response:
                if response.geturl() != URL:
                    raise ValueError('Unexpected pilot source redirect')
                raw = response.read(1_000_001)
                if len(raw) > 1_000_000:
                    raise ValueError('Pilot board too large')
                return raw
        except (OSError, ValueError):
            if attempt == 2:
                raise
            time.sleep(attempt+1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, default=ROOT/'.local/sgp-pilot')
    parser.add_argument('--input', type=Path, help='Replay a saved public HTML without network')
    parser.add_argument('--as-of', type=dt.date.fromisoformat, help='Collection date in Vietnam; for offline replay only')
    args = parser.parse_args()
    if args.as_of and not args.input:
        raise ValueError('--as-of is only valid for offline replay')
    checked = dt.datetime.now(dt.timezone.utc)
    receipt = {'checked_at': checked.isoformat(), 'source_capture_success': False,
               'event_name': os.environ.get('GITHUB_EVENT_NAME', 'local'),
               'run_id': os.environ.get('GITHUB_RUN_ID'), 'run_attempt': os.environ.get('GITHUB_RUN_ATTEMPT'),
               'product_edition_modified': False}
    try:
        raw = args.input.read_bytes() if args.input else fetch()
        receipt.update(capture(raw, args.out, args.as_of or checked.astimezone(dt.timezone(dt.timedelta(hours=7))).date()))
        receipt['offline_replay'] = bool(args.input)
    except Exception as error:
        receipt['error'] = str(error)
        raise
    finally:
        write_json(args.out/'collect-receipt.json', receipt)
        print(json.dumps(receipt, ensure_ascii=True), flush=True)

if __name__ == '__main__':
    main()
