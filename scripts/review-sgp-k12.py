"""Review individual K12 plan rows using registered facility evidence.

Map NEO records only corroborate the registered facility of the same visit.
They never create movements, supply missing DWT, or certify actual execution.
Run --fetch explicitly to archive the bounded set of candidate arrival days.
"""
import argparse
import datetime as dt
import gzip
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'.local/sgp-k12-review'
API = 'https://apikehoach.cangvuhanghaitphcm.gov.vn:5000/api/cangvu/getDSTau4'
VERSION = 'sgp-k12-row-review/1.0.0'


class SourceRateLimited(ValueError):
    pass


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                    separators=(',', ':')).encode()).hexdigest()


def row_id(day, event):
    return digest({'day': day, 'direction': event['section'], 'raw': event['raw']})


def name(value):
    return re.sub(r'[\s.]', '', (value or '').upper())


def date(value):
    try:
        return dt.datetime.strptime(value, '%d/%m/%Y').date().isoformat()
    except (ValueError, TypeError):
        return None


def berth_time(record):
    try:
        return dt.datetime.strptime(record.get('ngay_gio_vao_cau', ''), '%d/%m/%Y %H:%M').strftime('%Y-%m-%d %H:%M')
    except (ValueError, TypeError):
        return None


def visit_key(record):
    value = {k: record.get(k) for k in ['ten_tau', 'ten_cang', 'cau_phao', 'source_type',
             'ngay_den', 'gio_den', 'ngay_roi', 'gio_roi', 'ngay_gio_vao_cau', 'loa', 'dwt', 'mmsi']}
    info = record.get('cau_phao_info') or {}
    value['facility_identity'] = {k: info.get(k) for k in ['idcauphao', 'phanloai', 'bencang', 'tencauphao']}
    return digest(value)


def facility(record):
    info = record.get('cau_phao_info') or {}
    # Require original port/berth fields AND the provider-namespaced facility.
    # Coordinates/grid placement alone are never vessel-location evidence.
    return (record.get('source_type') == 'NEO'
            and record.get('ten_cang') == 'BẾN CẢNG SÀI GÒN'
            and record.get('cau_phao') == 'K12'
            and info.get('idcauphao') == 52
            and info.get('phanloai') == 'Cầu'
            and info.get('bencang') == 'BẾN CẢNG SÀI GÒN'
            and info.get('tencauphao') == 'K12')


def matches(event, record):
    if name(event['vessel']) != name(record.get('ten_tau')):
        return False
    entered = berth_time(record)
    if not entered or not date(record.get('ngay_den')) or date(record['ngay_den']) > entered[:10]:
        return False
    if event['section'] == 'arrival':
        when = entered
        if date(record.get('ngay_den'))+' '+str(record.get('gio_den') or '') != when:
            return False
    elif event['section'] == 'departure':
        when = (date(record.get('ngay_roi')) or '')+' '+str(record.get('gio_roi') or '')
        if when < entered:
            return False
    else:
        return False
    return when == event['day']+' '+str(event['time'])


def dimensions_agree(event, record):
    try:
        loa = float(event['raw'][5])
        if not math.isfinite(loa) or loa <= 0 or record.get('loa') is None or not math.isfinite(float(record['loa'])) or abs(loa-float(record['loa'])) > .011:
            return False
        # Missing source weights stay missing; do not backfill from the map.
        return (event['dwt'] is None or record.get('dwt') is None
                or (math.isfinite(float(record['dwt'])) and abs(event['dwt']-float(record['dwt'])) < .011))
    except (ValueError, TypeError, IndexError):
        return False


def adjudicate(event, registrations):
    candidates = {visit_key(r): r for r in registrations if matches(event, r)}
    compatible = [r for r in candidates.values() if dimensions_agree(event, r)]
    scoped = [r for r in compatible if facility(r)]
    if len(candidates) == 1 and len(scoped) == 1:
        return 'corroborated_sgp_berth_plan', scoped
    if len(candidates) > 1:
        return 'conflicting_or_multiple_registrations', compatible
    if candidates and not compatible:
        return 'identity_dimensions_conflict', list(candidates.values())
    if compatible:
        return 'different_registered_facility', compatible
    context = [r for r in registrations if name(r.get('ten_tau')) == name(event['vessel'])
               and event['section'] == 'arrival' and date(r.get('ngay_den')) == event['day']
               and r.get('gio_den') == event['time']]
    if context:
        return 'unresolved_port_entry_vs_berth_time', list({visit_key(r): r for r in context}.values())
    return 'unresolved_no_exact_visit_registration', []


def source_candidates():
    spec = importlib.util.spec_from_file_location('hcm', ROOT/'scripts/collect-south-plans.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    candidates, sources, internal = [], [], []
    for path in sorted((ROOT/'.local/south-plans/parsed').glob('*.json')):
        d = json.loads(path.read_text(encoding='utf8'))
        raw = gzip.decompress((ROOT/'.local/south-plans/archive'/(d['sha256']+'.html.gz')).read_bytes())
        if hashlib.sha256(raw).hexdigest() != d['sha256'] or module.parse(raw, d['day'])['events'] != d['events']:
            raise ValueError('Authority raw/hash/reparse mismatch: '+d['day'])
        sources.append({'day': d['day'], 'sha256': d['sha256']})
        for e in d['events']:
            if e['section'] == 'internal':
                if 'K12' in [e['from'], e['to']]:
                    internal.append({'day': d['day'], 'sha256': d['sha256'], **e})
            elif (e['to'] if e['section'] == 'arrival' else e['from']) == 'K12':
                candidates.append({'day': d['day'], 'sha256': d['sha256'],
                                   'review_row_id': row_id(d['day'], e), **e})
    if not sources:
        raise ValueError('No archived boards')
    return candidates, sources, internal


def load_reviewed_rows(path):
    raw = path.read_bytes()
    manifest = json.loads(raw)
    if manifest['review_version'] != VERSION or manifest.get('actual_verified') is not False:
        raise ValueError('Unsupported K12 scope review')
    approved = {}
    for entry in manifest['reviewed_rows']:
        event = entry['event']
        key = row_id(entry['day'], event)
        if key != entry['row_id'] or key in approved:
            raise ValueError('Invalid or duplicate reviewed K12 row')
        if event['section'] not in ['arrival', 'departure'] or event['raw'][8] != 'K12':
            raise ValueError('Review may only select existing direct K12 plan rows')
        if adjudicate({**event, 'day': entry['day']}, [entry['registered_record']])[0] != 'corroborated_sgp_berth_plan':
            raise ValueError('Reviewed row no longer satisfies facility evidence')
        if not re.fullmatch(r'[a-f0-9]{64}', entry['evidence_sha256']):
            raise ValueError('Invalid registered facility evidence hash')
        approved[key] = entry
    return manifest, approved, hashlib.sha256(raw).hexdigest()


def reviewed_evidence(day, event, approved):
    if event['section'] not in ['arrival', 'departure']:
        return None
    key = row_id(day, event)
    entry = approved.get(key)
    if entry is None:
        return None
    if adjudicate({**event, 'day': day}, [entry['registered_record']])[0] != 'corroborated_sgp_berth_plan':
        raise ValueError('Current plan differs from reviewed facility identity')
    return {'review_version': VERSION, 'row_id': key,
            'source_url': entry['evidence_url'], 'sha256': entry['evidence_sha256'],
            'record_index': entry['evidence_record_index'], 'checked_at': entry['evidence_checked_at'],
            'facility_namespace': 'hcm-kehoach/getDSTau4', 'facility_id': 52,
            'semantics': 'registered_facility_corroboration_only', 'actual_verified': False}


def map_day(day):
    dt.date.fromisoformat(day)
    index = OUT/'days'/(day+'.json')
    if index.exists():
        record = json.loads(index.read_text(encoding='utf8'))
        raw = gzip.decompress((OUT/'archive'/(record['sha256']+'.json.gz')).read_bytes())
        if hashlib.sha256(raw).hexdigest() != record['sha256']:
            raise ValueError('Registered facility archive hash mismatch')
        return record, json.loads(raw)
    cooldown = OUT/'rate-limit.json'
    if cooldown.exists():
        until = dt.datetime.fromisoformat(json.loads(cooldown.read_text(encoding='utf8'))['retry_not_before'])
        if dt.datetime.now(dt.timezone.utc) < until:
            raise SourceRateLimited('Source cooldown remains in force until '+until.isoformat())
    query = dt.date.fromisoformat(day).strftime('%d/%m/%Y')
    url = API+'?'+urllib.parse.urlencode({'ngay': query})
    with tempfile.TemporaryDirectory(prefix='sgp-k12-') as tmp:
        path = Path(tmp)/'response.json'
        response = subprocess.run(['curl.exe' if os.name == 'nt' else 'curl', '--location',
                        '--silent', '--show-error', '--max-time', '40', '--output', str(path),
                        '--write-out', '%{http_code}', url],
                       check=True, capture_output=True)
        raw = path.read_bytes()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {}
    if response.stdout.strip() == b'429':
        now = dt.datetime.now(dt.timezone.utc)
        OUT.mkdir(parents=True, exist_ok=True)
        error_sha = hashlib.sha256(raw).hexdigest()
        (OUT/'errors').mkdir(exist_ok=True)
        error_path = OUT/'errors'/(error_sha+'.json.gz')
        if not error_path.exists():
            error_path.write_bytes(gzip.compress(raw, mtime=0))
        (OUT/'rate-limit.json').write_text(json.dumps({'observed_at': now.isoformat(),
            'retry_not_before': (now+dt.timedelta(minutes=15)).isoformat(),
            'source_url': url, 'http_status': 429, 'raw_sha256': error_sha,
            'message': data.get('message', 'Rate limited')},
            ensure_ascii=False, indent=2)+'\n', encoding='utf8')
        raise SourceRateLimited('Source requested a 15 minute cooldown')
    if response.stdout.strip() != b'200':
        raise ValueError('Facility source HTTP '+response.stdout.decode('ascii', errors='replace'))
    if data.get('success') is not True or not isinstance(data.get('data'), list) or not data['data']:
        raise ValueError('Invalid or empty facility response: '+day)
    sha = hashlib.sha256(raw).hexdigest()
    record = {'requested_day': day, 'source_url': url, 'sha256': sha,
              'checked_at': dt.datetime.now(dt.timezone.utc).isoformat(),
              'rows': len(data['data']), 'semantics': 'registered_facility_snapshot_not_movements'}
    (OUT/'archive').mkdir(parents=True, exist_ok=True)
    (OUT/'days').mkdir(parents=True, exist_ok=True)
    archive = OUT/'archive'/(sha+'.json.gz')
    if archive.exists():
        if gzip.decompress(archive.read_bytes()) != raw:
            raise ValueError('Immutable registration archive differs')
    else:
        with tempfile.NamedTemporaryFile(dir=archive.parent, delete=False) as staged:
            staged.write(gzip.compress(raw, mtime=0))
            staged_path = Path(staged.name)
        staged_path.replace(archive)
    staged_index = index.with_suffix('.json.tmp')
    staged_index.write_text(json.dumps(record, indent=2)+'\n', encoding='utf8')
    staged_index.replace(index)
    return record, data


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--fetch', action='store_true')
    parser.add_argument('--max-new-days', type=int, default=30)
    parser.add_argument('--newest-first', action='store_true')
    parser.add_argument('--spread-days', action='store_true')
    parser.add_argument('--write-reviewed-manifest', action='store_true')
    args = parser.parse_args()
    candidates, sources, internal = source_candidates()
    days = sorted({e['day'] for e in candidates if e['section'] == 'arrival'})
    if args.fetch:
        if not 1 <= args.max_new_days <= 80:
            raise ValueError('Use 1–80 new days per bounded batch')
        pending = [day for day in days if not (OUT/'days'/(day+'.json')).exists()]
        pending.sort(reverse=args.newest_first)
        batch = pending[:args.max_new_days]
        if args.spread_days and len(pending) > args.max_new_days and args.max_new_days > 1:
            batch = [pending[round(i*(len(pending)-1)/(args.max_new_days-1))] for i in range(args.max_new_days)]
        for n, day in enumerate(batch, 1):
            try:
                map_day(day)
            except SourceRateLimited as error:
                print(str(error)+'; saved evidence remains available', flush=True)
                break
            print('Archived new candidate day:', n, day, flush=True)
            time.sleep(2)
    records, snapshots, missing = [], [], []
    candidate_names = {name(e['vessel']) for e in candidates}
    for day in days:
        if not (OUT/'days'/(day+'.json')).exists():
            missing.append(day)
            continue
        source, data = map_day(day)
        snapshots.append(source)
        for record_index, row in enumerate(data['data']):
            # Keep only names under review; the immutable raw retains all records.
            if name(row.get('ten_tau')) in candidate_names:
                records.append({**row, '_evidence_sha256': source['sha256'],
                                '_requested_day': day, '_evidence_url': source['source_url'], '_record_index': record_index, '_evidence_checked_at': source['checked_at']})
    reviewed = []
    for event in candidates:
        status, evidence = adjudicate(event, records)
        reviewed.append({**event, 'status': status, 'registered_visits': evidence})
    result = {'review_version': VERSION, 'reviewed_at': dt.datetime.now(dt.timezone.utc).isoformat(),
              'source_from': sources[0]['day'], 'source_through': sources[-1]['day'],
              'verified_board_count': len(sources), 'boards': sources, 'snapshots': snapshots,
              'missing_candidate_arrival_days': missing, 'direct_candidates': reviewed,
              'source_cooldown': json.loads((OUT/'rate-limit.json').read_text(encoding='utf8')) if (OUT/'rate-limit.json').exists() else None,
              'internal_candidates': internal, 'actual_verified': False,
              'product_edition_modified': False, 'issuer_totals_modified': False,
              'limitations': 'NEO is only registered facility corroboration for an existing published plan row. No AIS/actual certification, inferred movement, weight transfer, route-only allocation or global K12 alias. Snapshot query dates are requested dates; original raw registration timestamps govern the match.'}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/'review.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    from collections import Counter
    if args.write_reviewed_manifest:
        selected = []
        for event in reviewed:
            if event['status'] != 'corroborated_sgp_berth_plan':
                continue
            evidence = event['registered_visits'][0]
            selected.append({'row_id': event['review_row_id'], 'day': event['day'],
                             'authority_sha256_at_review': event['sha256'],
                             'event': {k: event[k] for k in ['section', 'vessel', 'call_sign', 'time', 'dwt', 'from', 'to', 'raw']},
                             'evidence_url': evidence['_evidence_url'],
                             'evidence_sha256': evidence['_evidence_sha256'],
                             'evidence_record_index': evidence['_record_index'], 'evidence_checked_at': evidence['_evidence_checked_at'],
                             'registered_record': {k: v for k, v in evidence.items() if not k.startswith('_')}})
        manifest = {'review_version': VERSION, 'reviewed_at': result['reviewed_at'],
                    'actual_verified': False, 'source_from': result['source_from'],
                    'source_through': result['source_through'],
                    'candidate_rows': len(reviewed), 'internal_excluded': len(internal),
                    'status_counts': Counter(e['status'] for e in reviewed),
                    'snapshot_days': len(snapshots), 'candidate_arrival_days': len(days),
                    'unfetched_arrival_days': missing, 'reviewed_rows': selected,
                    'limitations': result['limitations']}
        target = ROOT/'docs/catalog-review/sgp-k12-reviewed-rows.json'
        target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
        load_reviewed_rows(target)
        (ROOT/'docs/catalog-review/sgp-k12-row-review-20261031.json').write_text(
            json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    print(json.dumps({'reviewed_rows': len(reviewed), 'snapshot_days': len(snapshots),
                      'missing_days': len(missing), 'statuses': Counter(e['status'] for e in reviewed)}), flush=True)


if __name__ == '__main__':
    main()
