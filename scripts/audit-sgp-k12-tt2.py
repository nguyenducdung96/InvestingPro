"""Audit reviewed HCM boards for SGP scope research; never export product data.

Uses local immutable raw archives. Does not fetch sources or modify editions.
"""
import collections
import datetime as dt
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('hcm', ROOT/'scripts/collect-south-plans.py')
hcm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hcm)
LABELS = ['K12', 'TT2', 'B.TT2', 'TTD', 'K17']

def audit():
    counts = collections.Counter()
    routes = collections.Counter()
    months = collections.Counter()
    examples = collections.defaultdict(list)
    sources = []
    errors = []
    for path in sorted((ROOT/'.local/south-plans/parsed').glob('*.json')):
        archived = json.loads(path.read_text(encoding='utf8'))
        day = archived['day']
        raw = gzip.decompress((ROOT/'.local/south-plans/archive'/(archived['sha256']+'.html.gz')).read_bytes())
        if hashlib.sha256(raw).hexdigest() != archived['sha256']:
            raise ValueError('Archive hash mismatch: '+day)
        parsed = hcm.parse(raw, day)
        if parsed['events'] != archived['events']:
            raise ValueError('Reviewed parser output differs: '+day)
        sources.append({'day': day, 'sha256': archived['sha256'], 'checked_at': archived['checked_at']})
        if archived.get('source_error'):
            errors.append({'day': day, 'error': archived['source_error']})
        for event in parsed['events']:
            for label in set([event.get('from'), event.get('to')]) & set(LABELS):
                key = (label, event['section'])
                counts[key] += 1
                routes[(label, event['section'], event['raw'][-1])] += 1
                months[(label, day[:7], event['section'])] += 1
                if len(examples[key]) < 2:
                    examples[key].append({'day': day, 'sha256': archived['sha256'], **event})
        if len(sources) % 100 == 0:
            print('Verified archived boards:', len(sources), flush=True)
    if not sources:
        raise ValueError('No local HCM raw archives; do not fabricate research counts')
    expected = (dt.date.fromisoformat(sources[-1]['day'])-dt.date.fromisoformat(sources[0]['day'])).days+1
    if len(sources) != expected:
        raise ValueError('Non-contiguous archive window')
    result = {
        'audited_at': dt.datetime.now(dt.timezone.utc).isoformat(),
        'source_url': hcm.URL,
        'from': sources[0]['day'], 'through': sources[-1]['day'],
        'verified_boards': len(sources), 'source_errors': errors,
        'parser_version': hcm.VERSION,
        'counts': {label: {section: counts[(label, section)] for section in ['arrival', 'departure', 'internal']} for label in LABELS},
        'routes': [{'label': label, 'section': section, 'route': route, 'candidate_rows': n} for (label, section, route), n in sorted(routes.items())],
        'monthly': [{'label': label, 'month': month, 'section': section, 'candidate_rows': n} for (label, month, section), n in sorted(months.items())],
        'examples': {label+'/'+section: rows for (label, section), rows in examples.items()},
        'sources': sources,
        'meaning': 'Candidate labels in archived published plans; not SGP-attributed calls or verified actuals. Internal movements remain separate. Zero label matches do not imply zero operations.',
        'product_edition_modified': False,
    }
    out = ROOT/'.local/sgp-k12-tt2'
    out.mkdir(parents=True, exist_ok=True)
    (out/'verified-archive-audit.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    print(json.dumps({k: result[k] for k in ['verified_boards', 'from', 'through', 'counts', 'source_errors']}), flush=True)

if __name__ == '__main__':
    audit()
