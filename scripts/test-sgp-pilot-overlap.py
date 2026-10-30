import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('overlap', Path(__file__).with_name('review-sgp-pilot-overlap.py'))
overlap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(overlap)

def event(**extra):
    return {'section': 'arrival', 'vessel': 'HAI PHAT 135', 'matched_berths': ['TT2'], 'status_flags': [],
            'requires_review': False, 'scheduled_time': None, 'dwt': None, 'grt': 6282, **extra}

def official(**extra):
    return {'section': 'arrival', 'vessel': 'HAI PHAT 135', 'time': '12:00', 'from': None,
            'to': 'TAN.T.2', 'call_sign': None, 'dwt': 13399, 'raw': [], **extra}

class Tests(unittest.TestCase):
    def test_missing_authority_is_not_no_overlap_and_weights_are_never_backfilled(self):
        self.assertEqual(overlap.compare(event(), None)['status'], 'authority_day_unavailable')
        result = overlap.compare(event(), [official()])
        self.assertEqual(result['status'], 'possible_overlap_time_unverified')
        self.assertIsNone(result['pilot_dwt'])
        self.assertEqual(result['pilot_grt'], 6282)
        self.assertEqual(result['candidates'][0]['authority_dwt'], 13399)
        self.assertFalse(result['weight_backfilled'])
        self.assertFalse(result['automatically_merged'])

    def test_exact_candidate_conflicting_time_and_ambiguity_are_separate(self):
        self.assertEqual(overlap.compare(event(scheduled_time='12:00'), [official()])['status'], 'exact_candidate_overlap')
        self.assertEqual(overlap.compare(event(scheduled_time='11:00'), [official()])['status'], 'time_conflict')
        self.assertEqual(overlap.compare(event(scheduled_time='12:00'), [official(), official(time='14:00')])['status'], 'ambiguous_candidates')

    def test_buoy_other_terminal_direction_and_cancelled_plans_cannot_be_merged(self):
        for change in [{'to': 'B.TT2'}, {'to': 'TTD'}, {'to': 'K17'}, {'section': 'departure'}]:
            self.assertEqual(overlap.compare(event(), [official(**change)])['status'], 'no_candidate_in_available_board')
        self.assertEqual(overlap.compare(event(status_flags=['cancelled']), [official()])['status'], 'cancelled_or_postponed_pilot_plan')

if __name__ == '__main__':
    unittest.main()
