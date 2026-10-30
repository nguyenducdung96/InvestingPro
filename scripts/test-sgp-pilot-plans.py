import datetime as dt
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('pilot', Path(__file__).with_name('collect-sgp-pilot-plans.py'))
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)
DAY = dt.date(2026, 10, 31)
HEADERS = {
    '1': ['N.', 'Hoa tiêu', 'Tàu vào cảng', "M'n", 'Dài', 'GRT', 'Cầu bến', 'Cano', 'T.g', 'Ghi chú'],
    '2': ['N.', 'Hoa tiêu', 'Tàu rời cảng', "M'n", 'Dài', 'GRT', 'Cầu bến', 'T.g', 'Ghi chú'],
    '3': ['N.', 'Hoa tiêu', 'Tàu dời tại cảng', "M'n", 'Dài', 'GRT', 'Cầu bến', 'T.g', 'Ghi chú'],
}

def row(berth='TT2', section='1', number='1', clock='', note='Eta 1200 TÀU CHẬM'):
    return [number, 'PILOT', 'TEST SHIP', '8.2', '120', '6282', berth]+(['23:45'] if section == '1' else [])+[clock, note]

def fixture(rows=None, days=('2026-10-31', '2026-10-30')):
    rows = rows if rows is not None else {('2026-10-31', '1'): [row()]}
    options = ''.join(f'<option value="{i}">KẾ HOẠCH DẪN TÀU TRONG NGÀY {dt.date.fromisoformat(day):%d.%m.%Y}</option>' for i, day in enumerate(days, 1))
    tabs = []
    for i, day in enumerate(days, 1):
        groups = []
        for section, header in HEADERS.items():
            body = ''.join('<tr>'+''.join('<td>'+value+'</td>' for value in values)+'</tr>' for values in rows.get((day, section), []))
            groups.append(f'<div class="wrap-table-group" table-id="{section}"><table><thead><tr>'+''.join('<th>'+value+'</th>' for value in header)+'</tr></thead><tbody>'+body+'</tbody></table></div>')
        tabs.append(f'<div class="tab-content" id="tab{i}">'+''.join(groups)+'</div>')
    return ('<html><input><div class="ajax-select-date"><select>'+options+'</select></div>'+''.join(tabs)+'</html>').encode()

class Tests(unittest.TestCase):
    def test_two_days_three_roles_and_missing_time_never_becomes_midnight_or_dwt(self):
        parsed = pilot.parse(fixture(), DAY)
        self.assertEqual([d['day'] for d in parsed['days']], ['2026-10-30', '2026-10-31'])
        event = parsed['days'][1]['events'][0]
        self.assertEqual(event['grt'], 6282)
        self.assertIsNone(event['dwt'])
        self.assertIsNone(event['scheduled_time'])
        self.assertEqual(event['boarding_time_raw'], '23:45')
        self.assertEqual(event['notes_raw'], 'Eta 1200 TÀU CHẬM')
        self.assertEqual(event['status_flags'], ['delayed'])
        self.assertFalse(event['actual_verified'])
        self.assertFalse(event['included_in_issuer_totals'])

    def test_only_exact_target_labels_and_internal_rows_stay_internal(self):
        for berth in ['K12A', 'B.TT2', 'TTD', 'K17', 'NEO K12']:
            self.assertFalse(pilot.parse(fixture({('2026-10-31', '1'): [row(berth)]}), DAY)['days'][1]['events'])
        data = pilot.parse(fixture({('2026-10-31', '3'): [row('K12-TT2', '3', clock='22:00')]}), DAY)
        event = data['days'][1]['events'][0]
        self.assertEqual(event['section'], 'internal')
        self.assertEqual(event['matched_berths'], ['K12', 'TT2'])
        self.assertEqual(event['scheduled_time'], '22:00')

    def test_cancelled_and_postponed_rows_are_preserved_with_flags(self):
        notes = '●(Bỏ) ●(Lùi ngày; Đổi giờ; ĐX)'
        event = pilot.parse(fixture({('2026-10-31', '2'): [row('K12', '2', note=notes)]}), DAY)['days'][1]['events'][0]
        self.assertEqual(set(event['status_flags']), {'cancelled', 'postponed', 'time_changed', 'additional'})
        self.assertEqual(event['notes_raw'], notes)

    def test_missing_section_header_changes_and_date_tab_mismatches_fail(self):
        raw = fixture()
        for broken in [raw.replace(b'table-id="3"', b'table-id="4"', 1), raw.replace(b'GRT', b'DWT', 1), raw.replace(b'id="tab2"', b'id="tab9"'), raw.replace(b'31.10.2026', b'31.02.2026')]:
            with self.assertRaises(ValueError):
                pilot.parse(broken, DAY)

    def test_stale_unexpected_future_and_duplicate_day_options_fail(self):
        for days in [('2026-10-28', '2026-10-27'), ('2026-11-03', '2026-11-02'), ('2026-10-31', '2026-10-31')]:
            with self.assertRaises(ValueError):
                pilot.parse(fixture(days=days), DAY)

    def test_duplicate_source_numbers_fail_and_multiple_same_candidate_rows_need_review(self):
        with self.assertRaises(ValueError):
            pilot.parse(fixture({('2026-10-31', '1'): [row(), row()]}), DAY)
        second = row(number='2', clock='14:00')
        parsed = pilot.parse(fixture({('2026-10-31', '1'): [row(), second]}), DAY)
        self.assertEqual(len(parsed['days'][1]['events']), 2)
        self.assertTrue(all(e['requires_review'] for e in parsed['days'][1]['events']))

    def test_same_vessel_arrival_and_departure_remain_distinct(self):
        data = pilot.parse(fixture({('2026-10-31', '1'): [row('K12')], ('2026-10-31', '2'): [row('K12', '2', clock='22:00')]}), DAY)
        events = data['days'][1]['events']
        self.assertEqual(len(events), 2)
        self.assertNotEqual(events[0]['candidate_key'], events[1]['candidate_key'])

    def test_replay_is_byte_identical_and_time_revision_is_kept(self):
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder)
            first = pilot.capture(fixture(), out, DAY)
            before = {str(p): p.read_bytes() for p in out.rglob('*') if p.is_file()}
            pilot.capture(fixture(), out, DAY)
            self.assertEqual(before, {str(p): p.read_bytes() for p in out.rglob('*') if p.is_file()})
            new = pilot.capture(fixture({('2026-10-31', '1'): [row(clock='13:00', note='●(Đổi giờ)')]}), out, DAY)
            self.assertNotEqual(first['sha256'], new['sha256'])
            self.assertEqual(len(list((out/'archive').glob('*.gz'))), 2)
            self.assertFalse(new['review_required'])

    def test_empty_board_cannot_erase_previous_candidate_and_rollover_keeps_history(self):
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder)
            first = pilot.capture(fixture(), out, DAY)
            changed = pilot.capture(fixture({}), out, DAY)
            index = json.loads((out/'index.json').read_text(encoding='utf8'))
            self.assertTrue(changed['review_required'])
            self.assertEqual(index['days']['2026-10-31']['accepted_sha256'], first['sha256'])
            pilot.capture(fixture({}, ('2026-11-01', '2026-10-31')), out, DAY)
            self.assertEqual(len(json.loads((out/'index.json').read_text(encoding='utf8'))['days']), 3)

    def test_invalid_new_revision_or_corrupt_archive_does_not_change_index(self):
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder)
            receipt = pilot.capture(fixture(), out, DAY)
            before = (out/'index.json').read_bytes()
            with self.assertRaises(ValueError):
                pilot.capture(b'<html>Source error</html>', out, DAY)
            self.assertEqual((out/'index.json').read_bytes(), before)
            path = out/'archive'/(receipt['sha256']+'.html.gz')
            path.write_bytes(b'broken')
            with self.assertRaises(OSError):
                pilot.capture(fixture(), out, DAY)
            self.assertEqual((out/'index.json').read_bytes(), before)

    def test_corrupt_historical_parsed_revision_cannot_approve_a_later_source(self):
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder)
            receipt = pilot.capture(fixture(), out, DAY)
            before = (out/'index.json').read_bytes()
            path = out/'revisions'/pilot.VERSION.replace('/', '-')/(receipt['sha256']+'.json')
            previous = json.loads(path.read_text(encoding='utf8'))
            previous['days'][1]['events'] = []
            path.write_text(json.dumps(previous), encoding='utf8')
            with self.assertRaisesRegex(ValueError, 'Historical revision'):
                pilot.capture(fixture({('2026-10-31', '1'): [row(clock='13:00')]}), out, DAY)
            self.assertEqual((out/'index.json').read_bytes(), before)

if __name__ == '__main__':
    unittest.main()
