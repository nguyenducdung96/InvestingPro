import json
from pathlib import Path
import runpy
import tempfile
import unittest
from unittest.mock import patch

module = runpy.run_path(str(Path(__file__).with_name('collect-dungquat-history.py')))
ROOT = Path(__file__).resolve().parents[1]
CHECKED = '2026-10-25T05:00:00+00:00'


class HistoryContract(unittest.TestCase):
    def source(self, index=0):
        name = 'dungquat-spring-breeze.json' if index == 0 else 'dungquat-glorious-lotus.json'
        return json.loads((ROOT / 'tests/fixtures' / name).read_text(encoding='utf-8'))

    def parse(self, data, index=0):
        return module['parse'](json.dumps(data, ensure_ascii=False).encode(), module['REVIEWS'][index], CHECKED)

    def test_cargo_is_not_dwt_and_publication_is_not_event_date(self):
        event = self.parse(self.source())
        self.assertEqual(event['day'], '2025-02-10')
        self.assertNotEqual(event['day'], event['source']['published_at'][:10])
        self.assertIsNone(event['dwt'])
        self.assertIsNone(event['time'])

    def test_explicit_dwt(self):
        event = self.parse(self.source(1), 1)
        self.assertEqual(event['day'], '2022-06-04')
        self.assertEqual(event['dwt'], 49602)
        self.assertIsNone(event['gt'])

    def test_evidence_change_fails_closed(self):
        data = self.source()
        data['excerpt']['rendered'] = data['excerpt']['rendered'].replace('ngày 10 tháng 02 năm 2025', 'ngày 11 tháng 02 năm 2025')
        with self.assertRaises(ValueError):
            self.parse(data)
        data = self.source(1)
        data['content']['rendered'] = data['content']['rendered'].replace('49,602', '59,602')
        with self.assertRaises(ValueError):
            self.parse(data, 1)

    def test_private_or_other_article_is_rejected(self):
        for field in ('protected', 'identity'):
            data = self.source()
            if field == 'protected':
                data['content']['protected'] = True
            else:
                data['id'] = 99999
            with self.assertRaises(ValueError):
                self.parse(data)

    def test_failed_refresh_retains_original_evidence_and_reports_errors(self):
        original = module['main'].__globals__
        events = [self.parse(self.source()), self.parse(self.source(1), 1)]
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            target = root / 'packages/modules/port/src/dungquat-history-data.ts'
            target.parent.mkdir(parents=True)
            before = {'events': events, 'quality': {'last_success': CHECKED}}
            target.write_text('export const dungquatHistory = ' + json.dumps(before) + ' as const;\n', encoding='utf-8')
            with patch.dict(original, {'ROOT': root, 'fetch': lambda _: (_ for _ in ()).throw(RuntimeError('test outage'))}):
                with self.assertRaises(SystemExit):
                    module['main']()
            after = json.loads(target.read_text(encoding='utf-8').split(' = ', 1)[1].removesuffix(' as const;\n'))
            self.assertEqual(sorted(after['events'], key=lambda e: e['key']), sorted(events, key=lambda e: e['key']))
            self.assertEqual(after['quality']['last_success'], CHECKED)
            self.assertEqual(len(after['quality']['source_errors']), 2)


if __name__ == '__main__':
    unittest.main()
