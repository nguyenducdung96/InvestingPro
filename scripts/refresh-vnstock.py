"""Low-cost reference refresh via the pinned official Vnstock distribution.

Explicit source, bounded ticker scope, no fallback, no stock prices or trading.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import time
import re

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('company_refresh', ROOT / 'scripts/refresh-company-data.py')
refresh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)


def fetch_frame(company, method, source):
    for attempt in range(3):
        try:
            return getattr(company, method)(source=source)
        except Exception as error:
            if getattr(error, 'code', None) != 'VNSTOCK_AUTH_MINUTE_LIMIT' or attempt == 2:
                raise
            time.sleep(60)


def print_summary(report, output):
    statuses = {}
    for result in report['results']:
        statuses[result['status']] = statuses.get(result['status'], 0) + 1
    print(json.dumps(dict(source=report['requested_source'], results=len(report['results']),
                          statuses=statuses, failures=[r for r in report['results'] if r['status'] == 'failed'],
                          details=str(output / 'vnstock-last-run.json')), ensure_ascii=False, indent=2))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--tickers', default='GMD,PHP,MVN', help='Comma separated codes in accepted Slice 1 scope')
    p.add_argument('--source', choices=['vci', 'kbs'], default='vci')
    p.add_argument('--datasets', choices=['all', 'organizations', 'relationships'], default='organizations')
    p.add_argument('--force', action='store_true', help='Ignore the 24-hour local cache')
    p.add_argument('--output', type=Path, default=ROOT / '.local/company-refresh')
    args = p.parse_args()
    scope = {r['ticker'] for r in json.loads((ROOT / 'docs/catalog-review/reported-catalog-manifest.json').read_text(encoding='utf-8'))['items']}
    tickers = list(dict.fromkeys(s.strip().upper() for s in args.tickers.split(',') if s.strip()))
    if not tickers or any(s not in scope for s in tickers):
        p.error('Choose tickers in the fixed Slice 1 issuer scope')
    import vnstock
    from importlib.metadata import version
    installed = version('vnstock')
    pinned = next(line.split('==', 1)[1] for line in (ROOT / 'config/requirements-company-refresh.txt').read_text().splitlines() if line.startswith('vnstock=='))
    if installed != pinned:
        raise SystemExit('Install the pinned Vnstock version in the project virtual environment')
    # Guest/community access only. No automatic signup, activation or source fallback.
    ref = vnstock.Reference()
    report = dict(library_version=installed, requested_source=args.source,
                  checked_at=refresh.datetime.now(refresh.timezone.utc).isoformat(), results=[])
    failed = False
    for ticker in tickers:
        for dataset, method in [('organizations', 'info'), ('relationships', 'subsidiaries')]:
            if args.datasets != 'all' and dataset != args.datasets:
                continue
            try:
                snapshot = args.output / 'by-ticker' / ticker / ('vnstock-' + args.source) / dataset / 'latest.json'
                if snapshot.exists() and not args.force:
                    saved = json.loads(snapshot.read_text(encoding='utf-8'))
                    age = (refresh.datetime.now(refresh.timezone.utc) - refresh.datetime.fromisoformat(saved['fetched_at'])).total_seconds()
                    if 0 <= age < 86400:
                        report['results'].append(dict(ticker=ticker, dataset=dataset, status='cached', raw_sha256=saved['raw_sha256']))
                        refresh.atomic_json(args.output / 'vnstock-last-run.json', report)
                        continue
                company = ref.company(ticker)
                frame = fetch_frame(company, method, args.source)
                actual = str(frame.attrs.get('source', '')).lower()
                if actual != args.source:
                    raise ValueError('Response source differs or source metadata absent')
                raw = frame.to_json(orient='records', force_ascii=False, date_format='iso').encode('utf-8')
                rows = json.loads(raw)
                if any(r.get('symbol') != ticker for r in rows):
                    raise ValueError('Response ticker differs from requested ticker')
                receipt = refresh.refresh(raw, dataset, args.output / 'by-ticker' / ticker,
                                          [], provider='vnstock-' + actual)
                report['results'].append(dict(ticker=ticker, dataset=dataset,
                                              source=actual, route=frame.attrs.get('route'),
                                              row_count=receipt['row_count'], status=receipt['status'],
                                              raw_sha256=receipt['raw_sha256'], changes=len(receipt['changes'])))
            except Exception as error:
                # Provider exception strings may contain URLs/tokens. Record type only.
                code = str(getattr(error, 'code', ''))
                code = code if re.fullmatch(r'[A-Z0-9_]{1,80}', code) else None
                report['results'].append(dict(ticker=ticker, dataset=dataset, status='failed',
                                              error_type=type(error).__name__, error_code=code))
                failed = True
                # Auth, entitlement or challenge needs operator input, never another source.
                if any(s in type(error).__name__.lower() for s in ('auth', 'entitlement', 'challenge', 'rate')):
                    refresh.atomic_json(args.output / 'vnstock-last-run.json', report)
                    print_summary(report, args.output)
                    return 1
            refresh.atomic_json(args.output / 'vnstock-last-run.json', report)
            time.sleep(12)
    refresh.atomic_json(args.output / 'vnstock-last-run.json', report)
    print_summary(report, args.output)
    return int(failed)


if __name__ == '__main__':
    raise SystemExit(main())
