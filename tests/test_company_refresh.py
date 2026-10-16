import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from unittest.mock import Mock
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location('refresh', Path(__file__).parents[1] / 'scripts/refresh-company-data.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
spec_web = importlib.util.spec_from_file_location('web_refresh', Path(__file__).parents[1] / 'scripts/refresh-company-web-sources.py')
web = importlib.util.module_from_spec(spec_web)
spec_web.loader.exec_module(web)
spec_vn = importlib.util.spec_from_file_location('vn_refresh', Path(__file__).parents[1] / 'scripts/refresh-vnstock.py')
vn = importlib.util.module_from_spec(spec_vn)
spec_vn.loader.exec_module(vn)


class RefreshTests(unittest.TestCase):
    def test_changes_replay_and_failed_response_preserves_snapshot(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)
            row = dict(OrganCode='TEST', Ticker='TEST', OrganName='Synthetic', Status=1)
            raw = json.dumps([row]).encode()
            self.assertEqual(len(m.refresh(raw, 'organizations', out, [])['changes']), 1)
            self.assertEqual(m.refresh(raw, 'organizations', out, [])['status'], 'unchanged')
            path = out / 'fiingroup/organizations/latest.json'
            before = path.read_bytes()
            for bad in (b'[]', b'{}', b'<html>denied</html>', json.dumps([row, row]).encode()):
                with self.assertRaises(ValueError):
                    m.refresh(bad, 'organizations', out, [])
                self.assertEqual(path.read_bytes(), before)
            row['Status'] = 2
            result = m.refresh(json.dumps([row]).encode(), 'organizations', out, [])
            self.assertEqual(result['changes'][0]['after']['Status'], 2)
            self.assertFalse(result['publication_performed'])
            self.assertEqual(len(list((out / 'fiingroup/organizations/batches').glob('*.json'))), 3)

    def test_relationship_codes_not_guessed_and_no_date_inference(self):
        row = dict(LeftOrganCode='A', RightOrganCode='B', LeftRoleId=12,
                   RightRoleId=11, Status=1, CreateDate='1753-01-01T00:00:00')
        rows = m.normalize([row], 'relationships')
        self.assertNotIn('relationship_started_on', next(iter(rows.values())))
        self.assertNotIn('ownership_pct', next(iter(rows.values())))
        self.assertEqual(m.changes(rows, {})[1], list(rows))

    def test_wrapper_and_schema_fail_closed(self):
        self.assertEqual(m.records({'data': {'items': [1]}}, ['data', 'items']), [1])
        with self.assertRaises(ValueError):
            m.records({'error': 'denied'}, ['data'])
        with self.assertRaises(ValueError):
            m.normalize([dict(OrganCode='A', Ticker='A', OrganName='A')], 'organizations')
        with self.assertRaises(ValueError):
            m.fetch(dict(endpoint='https://datafeed.fiingroup.vn/api'))

    def test_transport_retries_and_never_retries_unauthorized(self):
        cfg = dict(endpoint='https://example.org/Company/GetOrganization',
                   method='GET', complete_response_confirmed=True, headers_from_env={'X-Key': 'TEST_FEED_KEY'})
        class Response:
            headers = {'Content-Type': 'application/json'}
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, limit): return b'[]'
        with patch.dict(m.os.environ, {'TEST_FEED_KEY': 'test-secret'}), patch.object(m, 'build_opener') as builder, patch.object(m.time, 'sleep'):
            opener = builder.return_value
            opener.open.side_effect = [HTTPError(cfg['endpoint'], 429, 'rate', {}, None), Response()]
            self.assertEqual(m.fetch(cfg), b'[]')
            self.assertEqual(opener.open.call_count, 2)
            opener.open.reset_mock()
            opener.open.side_effect = HTTPError(cfg['endpoint'], 401, 'secret-body', {}, None)
            with self.assertRaisesRegex(ValueError, 'HTTP 401'):
                m.fetch(cfg)
            self.assertEqual(opener.open.call_count, 1)

    def test_vnstock_fraction_is_not_asset_ownership(self):
        row = dict(symbol='GMD', name='Synthetic subsidiary', sub_symbol=None, rate=0.65)
        result = next(iter(m.normalize_vnstock([row], 'relationships').values()))
        self.assertEqual(result['rate'], 0.65)
        self.assertNotIn('asset_id', result)
        self.assertNotIn('relationship_started_on', result)
        with self.assertRaises(ValueError):
            m.normalize_vnstock([{**row, 'rate': 65}], 'relationships')

    def test_web_conditional_refresh_keeps_evidence_and_failed_request_keeps_state(self):
        source = dict(id='test', ticker='GMD', url='https://example.org/company', purpose='Synthetic')
        class Response:
            headers = {'Content-Type': 'text/html', 'ETag': 'test-etag'}
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, limit): return b'<html>synthetic</html>'
        with tempfile.TemporaryDirectory() as d, patch.object(web, 'build_opener') as builder:
            out = Path(d)
            builder.return_value.open.return_value = Response()
            first = web.check(source, out)
            self.assertEqual(first['status'], 'baseline')
            builder.return_value.open.side_effect = HTTPError(source['url'], 304, '', {}, None)
            again = web.check(source, out)
            self.assertEqual(again['raw_sha256'], first['raw_sha256'])
            self.assertEqual(again['status'], 'unchanged')
            builder.return_value.open.side_effect = HTTPError(source['url'], 500, '', {}, None)
            path = out / (m.digest(b'test') + '.json')
            before = path.read_bytes()
            with self.assertRaises(ValueError):
                web.check(source, out)
            self.assertEqual(path.read_bytes(), before)

    def test_only_documented_minute_limit_retries_same_source(self):
        class ProviderError(Exception): pass
        limited = ProviderError()
        limited.code = 'VNSTOCK_AUTH_MINUTE_LIMIT'
        company = Mock()
        company.info.side_effect = [limited, 'data']
        with patch.object(vn.time, 'sleep') as sleep:
            self.assertEqual(vn.fetch_frame(company, 'info', 'vci'), 'data')
            sleep.assert_called_once_with(60)
        limited.code = 'VNSTOCK_TIER_ROUTE'
        company.info.reset_mock()
        company.info.side_effect = limited
        with self.assertRaises(ProviderError), patch.object(vn.time, 'sleep') as sleep:
            vn.fetch_frame(company, 'info', 'vci')
        sleep.assert_not_called()
        self.assertEqual(company.info.call_count, 1)


if __name__ == '__main__':
    unittest.main()
