import datetime as dt
import importlib.util
import pathlib
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('collector', pathlib.Path(__file__).with_name('collect-tanvu-plan-months.py'))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


def row(berth_from='CHINA', berth_to='TAN VU', dwt='12.345'):
    return {'Tên tàu': 'VESSEL A', 'Thời gian': '08:30', 'DWT': dwt, 'GT': '9.000',
            'Từ': berth_from, 'Đến': berth_to, 'Đại lý': 'AGENT'}


class PilotTests(unittest.TestCase):
    def collect(self, arrival, departure):
        measured = {'sections': {'Vao': {'rows':len(arrival),'pilot_rows':arrival},
                                 'Roi': {'rows':len(departure),'pilot_rows':departure},
                                 'DiChuyen': {'rows':9,'pilot_rows':[]}}}
        with patch.object(collector,'fetch',return_value=b'fixture'), patch.object(collector.probe,'measure',return_value=measured), patch.object(collector.time,'sleep'):
            return collector.collect(dt.date(2026,9,1),dt.date(2026,10,22))

    def test_dwt_is_not_gt_and_number_format_is_strict(self):
        self.assertEqual(collector.dwt('12.345,5'),'12345.5')
        self.assertIsNone(collector.dwt(''))
        for value in ('12.34','1,234.5','-5','NaN'):
            with self.assertRaises(ValueError): collector.dwt(value)

    def test_terminal_direction_and_exact_duplicates(self):
        result=self.collect([row(),row(),row('TAN VU','OTHER')],[row('TAN VU','CHINA')])
        self.assertEqual(result['status'],'parsed')
        self.assertEqual(result['exact_duplicates_removed'],1)
        self.assertEqual([e['direction'] for e in result['events']],['arrival','departure'])
        self.assertEqual(result['events'][0]['dwt'],'12345')

    def test_conflicting_same_key_fails_day(self):
        result=self.collect([row(),row(dwt='15.000')],[])
        self.assertEqual(result['status'],'failed')

    def test_changed_time_is_flagged_not_silently_merged(self):
        later={**row(),'Thời gian':'09:30'}
        result=self.collect([row(),later],[])
        self.assertEqual(result['ambiguous_repeated_route_groups'],1)
        summary=collector.summarize([result])[1]
        self.assertIsNone(summary['arrival']['monthly_dwt'])

    def test_missing_day_does_not_become_monthly_zero(self):
        result=self.collect([],[])
        summary=collector.summarize([result,{'date':'2026-09-02','status':'failed'}])[1]
        self.assertIsNone(summary['arrival']['monthly_rows'])
        self.assertIn('2026-09-02',summary['failed_days'])
        self.assertEqual(summary['expected_days'],30)

    def test_missing_dwt_keeps_count_but_blocks_dwt_total(self):
        result=self.collect([row(dwt='')],[])
        days=[{**result,'date':f'2026-09-{n:02}'} for n in range(1,31)]
        summary=collector.summarize(days)[1]
        self.assertEqual(summary['arrival']['monthly_rows'],30)
        self.assertIsNone(summary['arrival']['monthly_dwt'])

    def test_report_date_mismatch_fails(self):
        with self.assertRaises(ValueError):
            collector.probe.measure('KẾ HOẠCH ĐIỀU ĐỘNG TÀU NGÀY 02/09/2026'.encode(),dt.date(2026,9,1),'test')


if __name__=='__main__': unittest.main()
