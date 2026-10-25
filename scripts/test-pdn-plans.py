import importlib.util,json,hashlib,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('pdn_export',Path(__file__).with_name('export-pdn-plans.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def envelope(direction='arrival',**extra):
 r=dict(vmaItineraryScheduleId=1,vmaScheduleShiftingId=2,nameOfShip='TEST',timeOfArrival='24/10/2026 08:00',timeOfDeparture='24/10/2026 08:00',shiftingDate='24/10/2026 08:00',portHarbourCode='BC185',portWharfCode='54948',anchoringPortWharfName='ĐỒNG NAI - KHU VỰC SÔNG LÒNG TÀU - NHÀ BÈ, SÔNG ĐỒNG NAI, Bến cảng Đồng Nai - Phân cảng Long Bình Tân, Cầu cảng số 2',initFrom='P/S',dwt=100,gt=80)
 r.update(extra);response=dict(total=1,data=[r]);raw=json.dumps(response,ensure_ascii=False,separators=(',',':'));return dict(day='2026-10-24',direction=direction,response=response,raw_response=raw,source_url=m.SOURCE,sha256=hashlib.sha256(raw.encode()).hexdigest(),checked_at='2026-10-25T00:00:00Z')
class Pdn(unittest.TestCase):
 def test_exact_code_and_label_required(self):
  self.assertEqual(m.parse(envelope())[0][0]['asset'],'pdn_long_binh_tan')
  for extra in [dict(portHarbourCode='K0005'),dict(anchoringPortWharfName='Cảng thủy nội địa Long Bình, Cầu cảng số 2'),dict(anchoringPortWharfName='Bến TNĐ Xăng dầu Long Bình Tân, Cầu số 1')]:self.assertFalse(m.parse(envelope(**extra))[0])
 def test_missing_dwt_does_not_use_gt(self):
  for v in [None,0,-1,'100',float('inf')]:self.assertIsNone(m.parse(envelope(dwt=v))[0][0]['dwt'])
  self.assertEqual(m.parse(envelope(dwt=4361.4))[0][0]['dwt'],4361.4)
 def test_shift_from_anchorage_and_internal_are_separate(self):
  a={'from':'KHU NEO VŨNG TÀU, KHU NEO VT','to':'Bến cảng Gò Dầu B, Cầu cảng số 1','anchoringPortHarbourCode':'K0001','shiftingPortHarbourCode':'BC187','anchoringPortWharfCode':'K0001','shiftingPortWharfCode':'55122'}
  self.assertEqual(m.parse(envelope('movement',**a))[0][0]['kind'],'arrival')
  a.update({'from':'Bến cảng Gò Dầu A, Cầu cảng số 3','anchoringPortHarbourCode':'BC186'})
  self.assertEqual(m.parse(envelope('movement',**a))[0][0]['kind'],'internal')
 def test_checksum_and_date_fail_closed(self):
  e=envelope();e['response']['data'][0]['dwt']=300
  with self.assertRaises(ValueError):m.parse(e)
  with self.assertRaises(ValueError):m.parse(envelope(timeOfArrival='23/10/2026 08:00'))
 def test_known_public_hour_formatter_preserves_original(self):
  r=m.parse(envelope(timeOfArrival='24/10/2026 010:30'))[0][0]
  self.assertEqual(r['time'],'2026-10-24T10:30:00+07:00');self.assertEqual(r['raw_time'],'24/10/2026 010:30');self.assertTrue(r['time_normalized'])
  r=m.parse(envelope(timeOfArrival='24/10/2026 13:010'))[0][0];self.assertEqual(r['time'],'2026-10-24T13:10:00+07:00')
 def test_compressed_reviewed_month_roundtrip(self):
  rows=m.parse(envelope())[0]
  with tempfile.TemporaryDirectory() as tmp:
   path=Path(tmp)/'2026-10.ts';m.write_month(path,rows);self.assertEqual(m.published_json(path,'export const pdnEvents:PdnEvent[]='),rows)
 def test_direction_and_weight_provenance(self):
  r=m.parse(envelope('departure',dwt=120.5))[0][0]
  self.assertEqual(r['kind'],'departure');self.assertEqual(r['to'],'P/S');self.assertEqual(r['raw_dwt'],120.5)
if __name__=='__main__':unittest.main()
