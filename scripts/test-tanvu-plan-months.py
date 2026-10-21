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

    def test_partial_month_is_mtd_not_closed_month(self):
        sample=self.collect([row()],[])
        days=[{**sample,'date':f'2026-10-{n:02}'} for n in range(1,22)]
        month=collector.summarize(days,['2026-10'],dt.date(2026,10,21))[0]
        self.assertEqual(month['status'],'partial_month')
        self.assertEqual(month['elapsed_days'],21)
        self.assertEqual(month['failed_days'],[])
        self.assertEqual(month['arrival']['period_rows'],21)
        self.assertEqual(month['arrival']['period_dwt'],'259245')
        self.assertIsNone(month['arrival']['monthly_rows'])
        self.assertIsNone(month['arrival']['monthly_dwt'])

    def test_mtd_yoy_excludes_later_days_of_previous_year(self):
        sample=self.collect([row()],[])
        days=[{**sample,'date':f'{year}-10-{n:02}'}
              for year,limit in [(2025,31),(2026,21)] for n in range(1,limit+1)]
        result=collector.comparisons(days,['2026-10'],dt.date(2026,10,21))[0]
        self.assertEqual(result['current']['rows'],21)
        self.assertEqual(result['previous']['rows'],21)
        self.assertEqual(result['previous']['through'],'2025-10-21')
        self.assertEqual(result['previous']['dwt'],result['current']['dwt'])

    def test_missing_day_blocks_mtd_yoy(self):
        sample=self.collect([row()],[])
        days=[{**sample,'date':f'2026-10-{n:02}'} for n in range(1,21)]
        result=collector.comparisons(days,['2026-10'],dt.date(2026,10,21))[0]
        self.assertEqual(result['current']['parsed_days'],20)
        self.assertIsNone(result['current']['dwt'])

    def test_leap_month_counts_real_calendar_days(self):
        month=collector.summarize([],['2024-02'])[0]
        self.assertEqual(month['expected_days'],29)
        self.assertEqual(len(month['failed_days']),29)

    def test_explicit_empty_source_section_is_distinct_from_missing_section(self):
        raw=('KẾ HOẠCH ĐIỀU ĐỘNG TÀU NGÀY 22/07/2025'
             '<td id="TD_ShowShipPlan_Roi">  </td>'
             '<table><tr><td>Different table after section</td></tr></table>').encode()
        result=collector.probe.measure(raw,dt.date(2025,7,22),'test')
        self.assertTrue(result['sections']['Roi']['source_empty'])
        self.assertEqual(result['sections']['Roi']['rows'],0)
        self.assertNotIn('Vao',result['sections'])
        broken=raw.replace(b'>  </td>',b'>Error</td>')
        with self.assertRaises(ValueError):collector.probe.measure(broken,dt.date(2025,7,22),'test')

    def test_closed_february_compares_whole_previous_february(self):
        result=collector.comparisons([],['2025-02'],dt.date(2026,10,21))[0]
        self.assertEqual(result['current']['through'],'2025-02-28')
        self.assertEqual(result['previous']['through'],'2024-02-29')


if __name__=='__main__': unittest.main()
