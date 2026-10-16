"""Refresh Slice 1 company reference data; changes are research proposals only.

No database writes, publication, or implicit source fallback. Credentials are read
from named environment variables and never persisted. Provider transport details
must come from the supplied account's integration guide, not the docs website.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile
import time
from datetime import datetime, timezone
from urllib.request import Request, urlopen, HTTPRedirectHandler, build_opener
from urllib.parse import urlsplit
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/catalog-review'
MAX_BYTES = 10 * 1024 * 1024
FIELDS = {
    'organizations': ('OrganCode', 'Ticker', 'OrganName', 'OrganShortName',
                      'ComGroupCode', 'IsinCode', 'ListingDate', 'Status', 'UpdateDate'),
    'relationships': ('LeftOrganCode', 'RightOrganCode', 'LeftRoleId',
                      'RightRoleId', 'Status', 'UpdateDate'),
}


def digest(value):
    return hashlib.sha256(value).hexdigest()


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write('\n')
        temp = f.name
    os.replace(temp, path)


def records(payload, records_path):
    for key in records_path:
        if not isinstance(payload, dict) or key not in payload:
            raise ValueError('Configured records_path does not match provider response')
        payload = payload[key]
    if not isinstance(payload, list) or not payload:
        raise ValueError('Empty/non-array response withheld; previous snapshot retained')
    return payload


def normalize(rows, dataset):
    result = {}
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('Provider row is not an object')
        required = ('OrganCode', 'Ticker', 'OrganName') if dataset == 'organizations' else (
            'LeftOrganCode', 'RightOrganCode', 'LeftRoleId', 'RightRoleId')
        if any(row.get(k) is None or str(row[k]).strip() == '' for k in required):
            raise ValueError('Required provider identity fields missing')
        if type(row.get('Status')) is not int or row['Status'] not in (0, 1, 2):
            raise ValueError('Missing/unknown provider record status')
        clean = {k: row.get(k) for k in FIELDS[dataset]}
        # IDs remain provider IDs. Role codes are not guessed as ownership/operator.
        key_fields = ('OrganCode',) if dataset == 'organizations' else required
        key = json.dumps([row[k] for k in key_fields], separators=(',', ':'))
        if key in result:
            raise ValueError('Duplicate provider identity; snapshot withheld')
        result[key] = clean
    return result


def changes(previous, current):
    updates = []
    for key, row in current.items():
        old = previous.get(key)
        if old != row:
            updates.append(dict(key=key, change='added' if old is None else 'changed',
                                before=old, after=row, verification_status='pending'))
    missing = [k for k in previous if k not in current]
    # Omission may be filtering/pagination; never infer deletion from absence.
    return updates, missing


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Provider redirected; verify configured API destination')


def fetch(cfg):
    endpoint = cfg.get('endpoint', '')
    url = urlsplit(endpoint)
    if url.scheme != 'https' or not url.hostname or url.username or url.password or url.query or url.fragment:
        raise ValueError('Use an HTTPS API endpoint without credentials/query/fragment')
    if url.hostname == 'datafeed.fiingroup.vn':
        raise ValueError('Documentation website is not the account API endpoint')
    headers = {'Accept': 'application/json'}
    for header, env_name in cfg.get('headers_from_env', {}).items():
        value = os.environ.get(env_name)
        if not value:
            raise ValueError('Missing configured credential environment variable: ' + env_name)
        headers[header] = value
    method = cfg.get('method')
    if method not in ('GET', 'POST'):
        raise ValueError('Account guide must specify GET or POST')
    if not cfg.get('complete_response_confirmed'):
        raise ValueError('Confirm account pagination/filter contract before refreshing')
    body = encode(cfg['body']) if method == 'POST' else None
    if body is not None:
        headers['Content-Type'] = 'application/json'
    opener = build_opener(NoRedirect())
    for attempt in range(3):
        try:
            with opener.open(Request(endpoint, data=body, headers=headers, method=method), timeout=30) as r:
                if 'json' not in r.headers.get('Content-Type', '').lower():
                    raise ValueError('Provider did not return JSON')
                raw = r.read(MAX_BYTES + 1)
                if len(raw) > MAX_BYTES:
                    raise ValueError('Response exceeds 10 MiB; configure a bounded export')
                return raw
        except HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise ValueError('Provider request failed (HTTP ' + str(e.code) + ')') from None
            time.sleep(2 ** attempt)
        except (URLError, TimeoutError):
            raise ValueError('Provider connection failed; previous snapshot retained') from None


def normalize_vnstock(rows, dataset):
    result = {}
    for row in rows:
        required = ('symbol', 'name')
        if not isinstance(row, dict) or any(not isinstance(row.get(k), str) or not row[k].strip() for k in required):
            raise ValueError('Missing Vnstock identity')
        fields = ('symbol', 'name', 'short_name', 'sector', 'profile', 'listing_date', 'issued_share') if dataset == 'organizations' else ('symbol', 'name', 'rate', 'sub_symbol')
        clean = {k: row.get(k) for k in fields}
        if dataset == 'relationships' and clean['rate'] is not None:
            rate = clean['rate']
            if isinstance(rate, bool) or not isinstance(rate, (int, float)) or not 0 <= rate <= 1:
                raise ValueError('Vnstock relationship rate must be a fraction from 0 to 1')
        key = json.dumps([row['symbol']] if dataset == 'organizations' else [row['symbol'], row.get('sub_symbol'), row['name']], ensure_ascii=False)
        if key in result:
            raise ValueError('Duplicate Vnstock identity')
        result[key] = clean
    return result


def refresh(raw, dataset, output, records_path, provider='fiingroup', now=None):
    if provider not in ('fiingroup', 'vnstock-vci', 'vnstock-kbs'):
        raise ValueError('Unsupported provider schema')
    now = now or datetime.now(timezone.utc).isoformat()
    rows = records(json.loads(raw), records_path)
    current = normalize(rows, dataset) if provider == 'fiingroup' else normalize_vnstock(rows, dataset)
    path = output / provider / dataset / 'latest.json'
    previous = json.loads(path.read_text(encoding='utf-8'))['records'] if path.exists() else {}
    updates, missing = changes(previous, current)
    hash_ = digest(raw)
    archive = output / 'raw' / (hash_ + '.json')
    archive.parent.mkdir(parents=True, exist_ok=True)
    if archive.exists() and digest(archive.read_bytes()) != hash_:
        raise ValueError('Existing archive checksum mismatch')
    if not archive.exists():
        archive.write_bytes(raw)
    receipt = dict(provider=provider, dataset=dataset, fetched_at=now, raw_sha256=hash_,
                   row_count=len(current), changes=updates, missing_keys=missing,
                   publication_performed=False, status='review_required' if updates or missing else 'unchanged')
    # Content-addressed batches preserve previous unresolved changes on reruns.
    batch = output / provider / dataset / 'batches' / (digest(encode(receipt)) + '.json')
    atomic_json(batch, receipt)
    atomic_json(path, dict(provider=provider, dataset=dataset, fetched_at=now,
                           raw_sha256=hash_, records=current))
    return receipt


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--dataset', choices=list(FIELDS), required=True)
    source = p.add_mutually_exclusive_group(required=True)
    source.add_argument('--input', type=Path, help='JSON export from provider account')
    source.add_argument('--config', type=Path, help='Private API transport config')
    p.add_argument('--records-path', default='', help='Dot-separated wrapper path for input export')
    p.add_argument('--output', type=Path, default=ROOT / '.local/company-refresh')
    args = p.parse_args()
    try:
        cfg = json.loads(args.config.read_text(encoding='utf-8')) if args.config else {}
        if cfg and cfg.get('dataset') != args.dataset:
            raise ValueError('Config dataset mismatch')
        raw = fetch(cfg) if args.config else args.input.read_bytes()
        if len(raw) > MAX_BYTES:
            raise ValueError('Input exceeds 10 MiB')
        result = refresh(raw, args.dataset, args.output,
                         cfg.get('records_path', []) if cfg else args.records_path.split('.') if args.records_path else [])
        print(json.dumps({k: v for k, v in result.items() if k not in ('changes', 'missing_keys')}, ensure_ascii=False))
        print('Changes:', len(result['changes']), '| Missing (not deleted):', len(result['missing_keys']))
    except (ValueError, OSError, KeyError):
        # Do not echo provider bodies, URLs, config contents, or credentials.
        print('Refresh failed: check schema, input, account configuration and connectivity. Previous snapshot retained.')
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
