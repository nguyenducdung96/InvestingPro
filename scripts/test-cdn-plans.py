"""CDN public read-only source contracts; no live network in tests."""
import importlib.util,pathlib,json,datetime as dt,unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('collector',pathlib.Path(__file__).with_name('collect-cdn-plans.py'));c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
DAY=dt.date(2026,10,23)
def row(**changes):
 return {'vmaItineraryScheduleId':1,'nameOfShip':'TEST ONLY','portHarbourCode':'BC78','anchoringPortWharfName':'KHU VỰC HH ĐÀ NẴNG, Bến cảng Tiên Sa, Cầu số 3','timeOfArrival':'23/10/2026 08:30','timeOfDeparture':'','dwt':1234.5,'gt':99999,'noticeShipType':1,'shortInitFrom':'P/S',**changes}
def report(arrival=None,departure=None):
 a=[row()] if arrival is None else arrival;d=[] if departure is None else departure
 return json.dumps({'format':'danang-public-plan-v1','date':str(DAY),'arrival':{'total':len(a),'data':a},'departure':{'total':len(d),'data':d}}).encode()
class Contract(unittest.TestCase):
 def test_transient_invalid_public_page_retries_without_losing_rows(self):
  endpoints={'arrival':c.BASE,'departure':c.BASE}
  with patch.object(c,'request',side_effect=[{'errorCode':'TEMPORARY'},{'total':1,'data':[row()]},{'total':0,'data':[]}]) as request,patch.object(c.time,'sleep'):
   result=c.parse_day(c.fetch_day(endpoints,DAY),DAY)
   self.assertEqual(len(result['events']),1);self.assertEqual(result['events'][0]['dwt'],'1234.5');self.assertEqual(request.call_count,3)
 def test_persistent_invalid_page_still_fails_instead_of_certifying_zero(self):
  with patch.object(c,'request',return_value={'errorCode':'PERSISTENT'}) as request,patch.object(c.time,'sleep'):
   with self.assertRaisesRegex(ValueError,'Invalid public schedule page'):c.fetch_day({'arrival':c.BASE,'departure':c.BASE},DAY)
   self.assertEqual(request.call_count,2)
 def test_exact_harbour_mapping(self):
  result=c.parse_day(report([row(),row(vmaItineraryScheduleId=2,portHarbourCode='BC88',anchoringPortWharfName='Chu Lai')]),DAY)
  self.assertEqual(len(result['events']),1);self.assertEqual(result['events'][0]['source_row']['Đến'],'TIEN SA')
 def test_zero_dwt_is_missing_not_gt(self):self.assertIsNone(c.parse_day(report([row(dwt=0)]),DAY)['events'][0]['dwt'])
 def test_out_of_range_dwt_keeps_count_but_no_inferred_decimal(self):
  result=c.parse_day(report([row(dwt=2440521)]),DAY);self.assertEqual(len(result['events']),1);self.assertIsNone(result['events'][0]['dwt']);self.assertEqual(result['invalid_source_dwt_kept_null'],1)
 def test_decimal_dwt(self):self.assertEqual(c.parse_day(report(),DAY)['events'][0]['dwt'],'1234.5')
 def test_code_label_conflict(self):
  with self.assertRaises(ValueError):c.parse_day(report([row(anchoringPortWharfName='Unknown')]),DAY)
 def test_wrong_day(self):
  with self.assertRaises(ValueError):c.parse_day(report([row(timeOfArrival='22/10/2026 08:30')]),DAY)
 def test_schema_drift(self):
  r=row();del r['noticeShipType']
  with self.assertRaises(ValueError):c.parse_day(report([r]),DAY)
 def test_empty_authority_not_certified_zero(self):
  with self.assertRaises(c.UnavailableReport):c.parse_day(report([],[]),DAY)
 def test_other_port_only_is_zero_for_tien_sa(self):self.assertEqual(c.parse_day(report([row(portHarbourCode='BC88')]),DAY)['events'],[])
 def test_duplicate_source_identity_fails(self):
  with self.assertRaises(ValueError):c.parse_day(report([row(),row()]),DAY)
 def test_same_normalized_event_only_once(self):
  result=c.parse_day(report([row(),row(vmaItineraryScheduleId=2)]),DAY);self.assertEqual(len(result['events']),1);self.assertEqual(result['exact_duplicates_removed'],1)
 def test_conflicting_arrival_preserves_departure_and_explicit_direction_quality(self):
  departure=row(vmaItineraryScheduleId=3,noticeShipType=2,timeOfDeparture='23/10/2026 13:00',dwt=200)
  result=c.parse_day(report([row(),row(vmaItineraryScheduleId=2,dwt=123)],[departure]),DAY)
  self.assertEqual(result['unresolved_schedule_keys'],{'arrival':1,'departure':0});self.assertEqual(len(result['events']),2)
  self.assertIsNone(result['events'][0]['dwt']);self.assertEqual(result['events'][1]['dwt'],'200')
 def test_departure_endpoint(self):
  d=row(noticeShipType=2,timeOfDeparture='23/10/2026 13:00')
  self.assertEqual(c.parse_day(report([], [d]),DAY)['events'][0]['source_row']['Từ'],'TIEN SA')
 def test_scoped_public_url_and_observed_plus_session(self):
  url=c.url_params(c.BASE+';jsessionid=TEST+PUBLIC?p_p_resource_id=vma_itinerary_schedule_come',{'start':0});self.assertIn('start=0',url)
  for bad in ['https://evil.example/public-kh',c.BASE.replace('.gov.vn/','.gov.vn:8080/'),c.BASE+'/private']:
   with self.assertRaises(ValueError):c.url_params(bad,{})
if __name__=='__main__':unittest.main()
