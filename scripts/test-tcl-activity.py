import datetime as dt, hashlib, importlib.util, json, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('tcl',Path(__file__).with_name('collect-tcl-activity.py'))
tcl=importlib.util.module_from_spec(spec);spec.loader.exec_module(tcl)
checked=dt.datetime.fromisoformat('2026-10-30T01:00:00+07:00')
def row(**extra):return {'SITE_ID':'TNT   ','VESSELNAME':'TAN CANG 19   ','IN_OUT_VOYAGE':'A-B','ACTUAL_BERTH_TIME':'08:00 29/10/2026','ACTUAL_DEPATURE_TIME':'EST:12:00 30/10/2026',**extra}
def parse(rows):
 raw=json.dumps({'type':'success','model':rows}).encode()
 return tcl.parse(raw,checked,hashlib.sha256(raw).hexdigest())
class Contract(unittest.TestCase):
 def test_source_returns_other_sites_and_estimates_under_actual_column_names(self):
  events,meta=parse([row(),row(SITE_ID='CTL')]);self.assertEqual(len(events),1);self.assertEqual(events[0]['direction'],'arrival');self.assertIsNone(events[0]['dwt']);self.assertEqual(meta['other_site_rows_excluded'],1);self.assertEqual(meta['estimated_fields'],{'departure':1});self.assertEqual(events[0]['raw_time'],'08:00 29/10/2026')
 def test_replay_and_disappearing_or_blank_rows_do_not_retract_history(self):
  old,_=parse([row(ACTUAL_DEPATURE_TIME='12:00 29/10/2026')]);new,_=parse([row(ACTUAL_DEPATURE_TIME='')]);self.assertEqual(tcl.merge(old,new),old);self.assertEqual(tcl.merge(old,[]),old);self.assertEqual(tcl.merge(old,old),old)
 def test_unknown_and_future_actuals_require_review(self):
  with self.assertRaises(ValueError):parse([row(ACTUAL_BERTH_TIME='unknown')])
  with self.assertRaises(ValueError):parse([row(ACTUAL_BERTH_TIME='08:00 31/10/2026')])
  self.assertEqual(tcl.reported_time('00:00 31/12/1900',checked),None)
 def test_duplicate_rows_collapse_and_conflicting_actual_times_fail(self):
  old,meta=parse([row(),row()]);self.assertEqual(len(old),1);self.assertEqual(meta['duplicate_events'],1)
  new,_=parse([row(ACTUAL_BERTH_TIME='09:00 29/10/2026')])
  with self.assertRaises(ValueError):tcl.merge(old,new)
  conflicting,_=parse([row(),row(ACTUAL_BERTH_TIME='09:00 29/10/2026')])
  with self.assertRaises(ValueError):tcl.merge([],conflicting)
 def test_reused_voyages_in_later_months_are_distinct(self):
  old,_=parse([row(ACTUAL_BERTH_TIME='08:00 01/09/2026')]);new,_=parse([row()]);self.assertEqual(len(tcl.merge(old,new)),2)
if __name__=='__main__':unittest.main()
