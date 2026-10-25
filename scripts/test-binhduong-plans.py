import copy,hashlib,importlib.util,json,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('bd',Path(__file__).with_name('export-binhduong-plans.py'));bd=importlib.util.module_from_spec(spec);spec.loader.exec_module(bd)
def envelope(code='BC198',label='Cảng Bình Dương',dwt=None):
 row=dict(timeOfDeparture='24/10/2026 10:00',vmaItineraryScheduleId=123,portHarbourCode=code,portWharfCode='55079',anchoringPortWharfName='SÔNG ĐỒNG NAI, '+label+', Bình Dương',initFrom='',nameOfShip='TEST',dwt=dwt,gt=999)
 response={'total':1,'data':[row]};raw=json.dumps(response,ensure_ascii=False,separators=(',',':'))
 return dict(day='2026-10-24',direction='departure',source_url=bd.dn.SOURCE,response=response,raw_response=raw,sha256=hashlib.sha256(raw.encode()).hexdigest(),checked_at='2026-10-25T00:00:00Z')
class Tests(unittest.TestCase):
 def test_exact_code_and_label_required(self):
  for code,label in [('BC198','Cảng Bình Dương khác'),('BC185','Cảng Bình Dương')]:
   rows,bad=bd.dn.parse(envelope(code,label),bd.TERMINALS,require_route=False);self.assertFalse(rows);self.assertEqual(bad,int(code=='BC198'))
 def test_absent_route_and_dwt_preserved_without_gt_substitution(self):
  rows,bad=bd.dn.parse(envelope(),bd.TERMINALS,require_route=False);self.assertEqual(bad,0);self.assertIsNone(rows[0]['dwt']);self.assertEqual(rows[0]['to'],'');self.assertEqual(rows[0]['raw_time'],'24/10/2026 10:00')
 def test_shared_parser_keeps_pdn_strict_route_validation(self):
  e=envelope('BC185','Bến cảng Đồng Nai - Phân cảng Long Bình Tân')
  with self.assertRaises(ValueError):bd.dn.parse(e)
 def test_checksum_date_and_duplicate_id_fail_closed(self):
  e=envelope(dwt=100);broken=copy.deepcopy(e);broken['response']['data'][0]['dwt']=200
  with self.assertRaises(ValueError):bd.dn.parse(broken,bd.TERMINALS,require_route=False)
  e['day']='2026-10-23'
  with self.assertRaises(ValueError):bd.dn.parse(e,bd.TERMINALS,require_route=False)
if __name__=='__main__':unittest.main()
