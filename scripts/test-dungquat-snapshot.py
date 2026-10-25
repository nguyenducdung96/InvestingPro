"""Contract checks for the authority position board, using a real-source excerpt."""
from pathlib import Path
import runpy
import unittest

module = runpy.run_path(str(Path(__file__).with_name('collect-dungquat-snapshot.py')))
parse, weight = module['parse'], module['weight']
fixture = Path(__file__).resolve().parents[1] / 'tests/fixtures/dungquat-position-excerpt.html'


class PositionContract(unittest.TestCase):
    def test_exact_position_not_agent(self):
        data = parse(fixture.read_bytes())
        self.assertEqual(data['source_rows'], 3)
        self.assertEqual(data['excluded_rows'], 2)
        self.assertEqual([r['vessel'] for r in data['observations']], ['HJ TIANHE'])
        row = data['observations'][0]
        self.assertEqual((row['dwt'], row['gt']), (60434, 49098))
        self.assertEqual(row['source_time_raw'], '11/6/2026 18:00')

    def test_weights(self):
        for raw in ['', '0', '-1', '60.43', 'NaN', '60,434.0']:
            self.assertIsNone(weight(raw))
        self.assertEqual(weight('60.434,5'), 60434.5)

    def test_schema_drift_fails_closed(self):
        raw = fixture.read_bytes()
        with self.assertRaises(ValueError):
            parse(raw.replace(b'DWT', b'GT'))
        with self.assertRaises(ValueError):
            parse(raw.replace(b'<td>GMD</td>', b'<td>GMD</td><td>extra</td>', 1))

    def test_no_observations_does_not_create_zero_events(self):
        raw = fixture.read_text(encoding='utf-8').replace('<td>GMD</td>', '<td>NEO</td>')
        self.assertEqual(parse(raw.encode())['observations'], [])

    def test_raw_preserved(self):
        result = parse(fixture.read_bytes())['observations'][0]
        self.assertEqual(result['raw'][5], '60.434')
        self.assertNotIn('arrival', result)
        self.assertNotIn('departure', result)


if __name__ == '__main__':
    unittest.main()
