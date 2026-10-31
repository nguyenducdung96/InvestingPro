import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('matrix',ROOT/'scripts/audit-hcm-national-matrix.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Tests(unittest.TestCase):
 def setUp(self):
  self.case={'case_id':'1','year':2026,'asset':'sg_tan_thuan','day':'2026-10-31','event':{'section':'arrival','vessel':'NEWSUN GREEN 03','call_sign':'3WAL','time':'01:00','dwt':4893,'to':'K12','from':None}}
  self.doc={'key':'doc','kind':'plan','vessel':'NEWSUN GREEN 03','call_sign':'3WAL','sha256':'sha','source_url':'https://hanghai.moc.gov.vn/doc',
   'parsed':{'rows':[{'vessel':'NEWSUN GREEN 03','planned_day':'2026-10-31','planned_time':'01:00','dwt':4893,'from':'DA NANG','to':'BEN CANG SAI GON/K12'}]}}
 def test_matching_fields_remain_candidates_not_automatic_calls_or_approved_mapping(self):
  result=m.compare(self.case,[self.doc]);self.assertEqual(result['status'],'exact_fields_candidate');self.assertFalse(result['asset_mapping_verified']);self.assertFalse(result['replacement_verified']);self.assertFalse(result['actual_verified'])
 def test_k12_does_not_match_k12b_and_departure_cannot_match_arrival_endpoint(self):
  doc=copy.deepcopy(self.doc);doc['parsed']['rows'][0]['to']='BEN CANG SAI GON/K12B'
  self.assertEqual(m.compare(self.case,[doc])['status'],'no_correspondence_in_bounded_query')
  case=copy.deepcopy(self.case);case['event'].update(section='departure',to=None,**{'from':'K12'})
  self.assertEqual(m.compare(case,[self.doc])['status'],'no_correspondence_in_bounded_query')
 def test_new_time_is_held_as_conflict_not_added_as_a_second_movement(self):
  other=copy.deepcopy(self.doc);other['key']='revision';other['parsed']['rows'][0]['planned_time']='05:00'
  result=m.compare(self.case,[self.doc,other]);self.assertEqual(result['status'],'exact_fields_with_conflicts');self.assertEqual(len(result['plan_candidates']),2);self.assertFalse(result['replacement_verified'])
 def test_pdf_day_and_dwt_must_match_without_borrowing_gt(self):
  doc=copy.deepcopy(self.doc);doc['parsed']['rows'][0]['planned_day']='2026-10-30'
  self.assertEqual(m.compare(self.case,[doc])['status'],'no_correspondence_in_bounded_query')
  doc['parsed']['rows'][0].update(planned_day='2026-10-31',dwt=None)
  self.assertEqual(m.compare(self.case,[doc])['status'],'different_plan_fields')
  doc.update(kind='clearance',parsed={'day':'2026-10-31','time':'01:00','dwt':None,'gt':140})
  self.assertEqual(m.compare(self.case,[doc])['status'],'no_correspondence_in_bounded_query')
  case=copy.deepcopy(self.case);case['event'].update(section='departure',to=None,**{'from':'K12'})
  result=m.compare(case,[doc]);self.assertEqual(result['status'],'clearance_time_only');self.assertFalse(result['missing_dwt_borrowed']);self.assertFalse(result['plan_candidates'])
 def test_wrong_ship_identity_cannot_match(self):
  doc=copy.deepcopy(self.doc);doc['call_sign']='OTHER';self.assertEqual(m.compare(self.case,[doc])['status'],'no_correspondence_in_bounded_query')
  case=copy.deepcopy(self.case);case['event']['call_sign']='';doc['call_sign']=''
  self.assertEqual(m.compare(case,[doc])['status'],'identity_insufficient')
 def test_no_network_in_offline_mode_and_corrupt_pdf_fails_closed(self):
  with tempfile.TemporaryDirectory() as folder,patch.object(m.n,'read'):
   audit=m.Audit(Path(folder),1,1,offline=True)
   with self.assertRaises(ValueError):audit.query('plan','21','SHIP','2026-10-30','2026-10-31')
   (Path(folder)/'documents/doc.json').write_text(json.dumps({'sha256':'bad'}))
   (Path(folder)/'pdf/bad.pdf').write_bytes(b'wrong')
   with self.assertRaises(ValueError):audit.document({'key':'doc'},'plan')
 def test_legacy_vung_tau_requires_explicit_research_allowance(self):
  path=ROOT/'tests/fixtures/gemalink-national/old-layout-20241231.pdf'
  with self.assertRaises(ValueError):m.review.sample_pdf(path)
  result=m.review.sample_pdf(path,allow_vung_tau=True);self.assertTrue(result['rows']);self.assertFalse(result['actual_verified'])
if __name__=='__main__':unittest.main()
