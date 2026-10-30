"""Review possible pilot/authority overlaps without merging or publishing rows."""
import argparse
import datetime as dt
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('hcm', ROOT/'scripts/collect-south-plans.py')
hcm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hcm)
ALIASES_FOR_REVIEW = {'K12': {'K12'}, 'TT2': {'TT2', 'TAN.T.2'}}

def vessel_key(value):
    # Whitespace and periods vary across boards; do not collapse combined ship names.
    return re.sub(r'[\s.]+', '', value.upper())

def compare(event, authority):
    if authority is None:
        return {'status': 'authority_day_unavailable', 'candidates': []}
    labels = set().union(*(ALIASES_FOR_REVIEW[label] for label in event['matched_berths']))
    candidates = []
    for row in authority:
        if row['section'] != event['section'] or vessel_key(row['vessel']) != vessel_key(event['vessel']):
            continue
        berth = row['to'] if row['section'] == 'arrival' else row['from']
        if row['section'] == 'internal':
            matched = row['from'] in labels or row['to'] in labels
        else:
            matched = berth in labels
        if matched:
            candidates.append({'vessel': row['vessel'], 'section': row['section'], 'time': row['time'],
                               'from': row['from'], 'to': row['to'], 'call_sign': row.get('call_sign'),
                               'authority_dwt': row['dwt'], 'raw': row['raw']})
    if any(flag in event['status_flags'] for flag in ['cancelled', 'postponed']):
        status = 'cancelled_or_postponed_pilot_plan'
    elif event['requires_review'] or len(candidates) > 1:
        status = 'ambiguous_candidates'
    elif not candidates:
        status = 'no_candidate_in_available_board'
    elif not event['scheduled_time']:
        status = 'possible_overlap_time_unverified'
    elif event['scheduled_time'] != candidates[0]['time']:
        status = 'time_conflict'
    else:
        status = 'exact_candidate_overlap'
    return {'status': status, 'candidates': candidates, 'automatically_merged': False,
            'pilot_dwt': event['dwt'], 'pilot_grt': event['grt'], 'weight_backfilled': False}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pilot-dir', type=Path, default=ROOT/'.local/sgp-pilot')
    parser.add_argument('--authority-dir', type=Path, default=ROOT/'.local/south-plans/parsed')
    parser.add_argument('--authority-raw-dir', type=Path, default=ROOT/'.local/south-plans/archive')
    args = parser.parse_args()
    receipt = json.loads((args.pilot_dir/'collect-receipt.json').read_text(encoding='utf8'))
    if not receipt.get('source_capture_success'):
        raise ValueError('Current pilot capture did not succeed')
    sha = receipt['sha256']
    if not re.fullmatch(r'[a-f0-9]{64}', sha):
        raise ValueError('Invalid pilot checksum')
    raw = gzip.decompress((args.pilot_dir/'archive'/(sha+'.html.gz')).read_bytes())
    if hashlib.sha256(raw).hexdigest() != sha:
        raise ValueError('Pilot archive checksum mismatch')
    pilot_spec = importlib.util.spec_from_file_location('pilot', ROOT/'scripts/collect-sgp-pilot-plans.py')
    pilot = importlib.util.module_from_spec(pilot_spec)
    pilot_spec.loader.exec_module(pilot)
    parsed = pilot.parse(raw, dt.date.fromisoformat(max(receipt['days'])))
    results, coverage = [], []
    for day in parsed['days']:
        path = args.authority_dir/(day['day']+'.json')
        official = None
        source = None
        if path.exists():
            source = json.loads(path.read_text(encoding='utf8'))
            source_sha = source.get('sha256', '')
            if not re.fullmatch(r'[a-f0-9]{64}', source_sha):
                raise ValueError('Invalid authority checksum')
            authority_raw = gzip.decompress((args.authority_raw_dir/(source_sha+'.html.gz')).read_bytes())
            if hashlib.sha256(authority_raw).hexdigest() != source_sha:
                raise ValueError('Authority archive checksum mismatch')
            official = hcm.parse(authority_raw, day['day'])['events']
            if official != source['events']:
                raise ValueError('Authority parsed rows differ from raw archive')
        coverage.append({'day': day['day'], 'available': official is not None, 'sha256': source['sha256'] if source else None})
        for event in day['events']:
            results.append({'pilot_day': day['day'], 'pilot_sha256': sha, 'pilot_observation_id': event['observation_id'],
                            'pilot_vessel': event['vessel'], 'pilot_section': event['section'],
                            'pilot_berth': event['berth_raw'], 'pilot_scheduled_time': event['scheduled_time'],
                            'pilot_notes_raw': event['notes_raw'], **compare(event, official)})
    report = {'reviewed_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'pilot_sha256': sha,
              'authority_days': coverage, 'results': results, 'alias_hypotheses_for_review': {k: sorted(v) for k, v in ALIASES_FOR_REVIEW.items()},
              'product_edition_modified': False, 'issuer_totals_modified': False, 'actual_verified': False,
              'limitation': 'Candidate relations only; source times may have different meanings. TAN.T.2 is a reviewed alias hypothesis, not a public product mapping. Missing authority days are unverified, not proof of no overlap.'}
    pilot.write_json(args.pilot_dir/'overlap-review.json', report)
    print(json.dumps({'reviewed_rows': len(results), 'authority_days': coverage,
                      'statuses': [r['status'] for r in results], 'product_edition_modified': False}), flush=True)

if __name__ == '__main__':
    main()
