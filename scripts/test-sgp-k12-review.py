"""Scope adjudication tests; no network or conversion of snapshots to movements."""
import copy
import gzip
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('review', Path(__file__).with_name('review-sgp-k12.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.event = {'day': '2026-10-24', 'section': 'arrival', 'vessel': 'FORTUNE NAVIGATOR',
                      'time': '20:00', 'dwt': 8649, 'raw': ['76', '* FORTUNE NAVIGATOR',
                      'VIET NAM', 'XVPF', '8649', '119.16']}
        self.record = {'source_type': 'NEO', 'ten_tau': 'FORTUNE NAVIGATOR',
                       'ten_cang': 'BẾN CẢNG SÀI GÒN', 'cau_phao': 'K12',
                       'ngay_den': '24/10/2026', 'gio_den': '20:00',
                       'ngay_gio_vao_cau': '24/10/2026 20:00',
                       'ngay_roi': '25/10/2026', 'gio_roi': '12:30',
                       'loa': 119.16, 'dwt': 8649,
                       'cau_phao_info': {'idcauphao': 52, 'phanloai': 'Cầu',
                       'tencauphao': 'K12', 'bencang': 'BẾN CẢNG SÀI GÒN'}}

    def test_exact_registered_berth_corroborates_an_existing_plan(self):
        self.assertEqual(m.adjudicate(self.event, [self.record])[0], 'corroborated_sgp_berth_plan')

    def test_departure_needs_its_own_existing_plan_and_exact_time(self):
        e = {**self.event, 'day': '2026-10-25', 'section': 'departure', 'time': '12:30'}
        self.assertEqual(m.adjudicate(e, [self.record])[0], 'corroborated_sgp_berth_plan')
        e['time'] = '12:00'
        self.assertEqual(m.adjudicate(e, [self.record])[0], 'unresolved_no_exact_visit_registration')

    def test_anchorage_homonym_is_not_the_pier(self):
        r = copy.deepcopy(self.record)
        r['ten_cang'] = 'KHU NEO VŨNG TÀU'
        r['cau_phao_info'].update(idcauphao=403, phanloai='Neo', bencang='KHU NEO VŨNG TÀU')
        self.assertEqual(m.adjudicate(self.event, [r])[0], 'different_registered_facility')

    def test_catalog_enrichment_cannot_override_original_port(self):
        self.record['ten_cang'] = 'BẾN CẢNG TỔNG HỢP THỊ VẢI (ODA)'
        self.assertEqual(m.adjudicate(self.event, [self.record])[0], 'different_registered_facility')

    def test_same_vessel_and_route_do_not_attribute_other_dates(self):
        self.event['day'] = '2026-10-23'
        self.event['raw'].append('SÀI GÒN - VŨNG TÀU')
        self.assertEqual(m.adjudicate(self.event, [self.record])[0], 'unresolved_no_exact_visit_registration')

    def test_conflicting_dimensions_remain_in_review(self):
        self.record['dwt'] = 12400
        self.assertEqual(m.adjudicate(self.event, [self.record])[0], 'identity_dimensions_conflict')
        self.record['dwt'] = 8649
        self.record['loa'] = float('nan')
        self.assertEqual(m.adjudicate(self.event, [self.record])[0], 'identity_dimensions_conflict')

    def test_missing_weight_is_preserved_without_backfill(self):
        self.event['dwt'] = None
        original = copy.deepcopy(self.event)
        self.assertEqual(m.adjudicate(self.event, [self.record])[0], 'corroborated_sgp_berth_plan')
        self.assertEqual(self.event, original)
        self.assertIsNone(self.event['dwt'])

    def test_internal_movements_are_not_promoted(self):
        self.event['section'] = 'internal'
        self.assertEqual(m.adjudicate(self.event, [self.record])[0], 'unresolved_no_exact_visit_registration')

    def test_repeated_snapshot_is_not_an_extra_registration(self):
        second = {**self.record, '_evidence_sha256': 'b'*64}
        status, rows = m.adjudicate(self.event, [self.record, second])
        self.assertEqual(status, 'corroborated_sgp_berth_plan')
        self.assertEqual(len(rows), 1)

    def test_conflicting_facilities_at_the_same_time_are_held(self):
        second = {**self.record, 'ten_cang': 'KHU NEO VŨNG TÀU'}
        self.assertEqual(m.adjudicate(self.event, [self.record, second])[0], 'conflicting_or_multiple_registrations')

    def test_invalid_chronology_is_not_accepted(self):
        self.record['ngay_gio_vao_cau'] = '26/10/2026 20:00'
        e = {**self.event, 'day': '2026-10-25', 'section': 'departure', 'time': '12:30'}
        self.assertEqual(m.adjudicate(e, [self.record])[0], 'unresolved_no_exact_visit_registration')

    def test_port_entry_and_berth_entry_times_are_not_interchanged(self):
        self.record['ngay_gio_vao_cau'] = '24/10/2026 23:00'
        self.record['ten_cang'] = 'BẾN CẢNG TỔNG HỢP THỊ VẢI (ODA)'
        self.assertEqual(m.adjudicate(self.event, [self.record])[0], 'unresolved_port_entry_vs_berth_time')

    def test_cached_reads_are_allowed_but_new_requests_obey_cooldown(self):
        previous = m.OUT
        try:
            with tempfile.TemporaryDirectory() as tmp:
                m.OUT = Path(tmp)
                (m.OUT/'rate-limit.json').write_text(json.dumps({'retry_not_before': '2999-01-01T00:00:00+00:00'}))
                with self.assertRaises(m.SourceRateLimited):
                    m.map_day('2026-10-24')
        finally:
            m.OUT = previous

    def test_cached_evidence_must_have_the_recorded_hash(self):
        previous = m.OUT
        try:
            with tempfile.TemporaryDirectory() as tmp:
                m.OUT = Path(tmp)
                (m.OUT/'days').mkdir()
                (m.OUT/'archive').mkdir()
                (m.OUT/'days/2026-10-24.json').write_text(json.dumps({'sha256': 'a'*64}))
                (m.OUT/'archive'/('a'*64+'.json.gz')).write_bytes(gzip.compress(b'{}'))
                with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                    m.map_day('2026-10-24')
        finally:
            m.OUT = previous

    def reviewed_manifest(self):
        event = copy.deepcopy(self.event)
        event['raw'] += ['8.1', 'CONTAINER 6000', 'K12']
        entry = {'day': event['day'], 'event': event, 'row_id': m.row_id(event['day'], event),
                 'registered_record': copy.deepcopy(self.record), 'evidence_sha256': 'b'*64,
                 'evidence_url': m.API+'?ngay=24%2F10%2F2026', 'evidence_record_index': 117, 'evidence_checked_at': '2026-10-31T06:20:00+00:00'}
        return {'review_version': m.VERSION, 'actual_verified': False, 'reviewed_rows': [entry]}

    def test_gate_requires_exact_reviewed_raw_row_and_preserves_weight(self):
        manifest = self.reviewed_manifest()
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'review.json'
            path.write_text(json.dumps(manifest), encoding='utf8')
            _, approved, sha = m.load_reviewed_rows(path)
            e = manifest['reviewed_rows'][0]['event']
            proof = m.reviewed_evidence(e['day'], e, approved)
            self.assertEqual(proof['facility_id'], 52)
            self.assertEqual(proof['sha256'], 'b'*64)
            self.assertEqual(len(sha), 64)
            self.assertEqual(e['dwt'], 8649)
            revised = copy.deepcopy(e)
            revised['raw'][0] = '77'
            self.assertIsNone(m.reviewed_evidence(e['day'], revised, approved))

    def test_gate_rejects_duplicate_and_wrong_facility_certificates(self):
        manifest = self.reviewed_manifest()
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'review.json'
            manifest['reviewed_rows'] *= 2
            path.write_text(json.dumps(manifest), encoding='utf8')
            with self.assertRaisesRegex(ValueError, 'duplicate'):
                m.load_reviewed_rows(path)
            manifest['reviewed_rows'] = manifest['reviewed_rows'][:1]
            manifest['reviewed_rows'][0]['registered_record']['cau_phao_info']['idcauphao'] = 403
            path.write_text(json.dumps(manifest), encoding='utf8')
            with self.assertRaisesRegex(ValueError, 'facility evidence'):
                m.load_reviewed_rows(path)


if __name__ == '__main__':
    unittest.main()
