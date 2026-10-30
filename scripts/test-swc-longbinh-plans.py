import copy,gzip,hashlib,importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('swc',Path(__file__).with_name('export-swc-longbinh-plans.py'));swc=importlib.util.module_from_spec(spec);spec.loader.exec_module(swc)

def envelope(direction='arrival',code='K0005',label='Cảng thủy nội địa Long Bình',wharf='K0013',name='Cầu cảng số 1',weight=None):
 field='timeOfArrival' if direction=='arrival' else 'timeOfDeparture'
 row={field:'24/10/2026 010:00','vmaItineraryScheduleId':123,'portHarbourCode':code,'portWharfCode':wharf,'anchoringPortWharfName':f'SÔNG ĐỒNG NAI, {label}, {name}','initFrom':'','nameOfShip':'TEST','dwt':weight,'gt':999}
 response={'total':1,'data':[row]};raw=json.dumps(response,ensure_ascii=False,separators=(',',':'))
 return dict(day='2026-10-24',direction=direction,parameters={field:'24/10/2026','maritimeCode':11,'shipBoat':'SHIP'},source_url=swc.dn.SOURCE,response=response,raw_response=raw,sha256=hashlib.sha256(raw.encode()).hexdigest(),checked_at='2026-10-25T00:00:00Z')

class Tests(unittest.TestCase):
 def test_empty_refresh_cannot_erase_a_published_movement(self):
  row={'day':'2026-10-24','direction':'arrival','time':'2026-10-24T10:00:00+07:00','vessel':'TEST','from':None,'to':'Long Binh','dwt':None}
  with self.assertRaisesRegex(ValueError,'missing previously published'):swc.check_event_retention([row],[])
  swc.check_event_retention([row],[{**row,'dwt':100}])
 def test_no_pdn_oil_terminal_or_unrelated_berth(self):
  for code,label in [('BC185','Cảng thủy nội địa Long Bình'),('K0008','Cảng thủy nội địa Long Bình'),('K0005','Long Bình')]:
   rows,bad=swc.dn.parse(envelope(code=code,label=label),swc.TERMINALS,require_route=False)
   self.assertEqual(rows,[]);self.assertEqual(bad,int(code=='K0005'))
  rows,_=swc.dn.parse(envelope(wharf='K0002',name='Khu neo trên sông Đồng Nai'),swc.TERMINALS,require_route=False)
  kept,rejected=swc.review_berths(rows);self.assertEqual(kept,[]);self.assertEqual(len(rejected),1)
 def test_missing_weight_route_and_original_time_are_preserved(self):
  rows,_=swc.dn.parse(envelope(),swc.TERMINALS,require_route=False)
  self.assertIsNone(rows[0]['dwt']);self.assertEqual(rows[0]['from'],'');self.assertEqual(rows[0]['raw_time'],'24/10/2026 010:00');self.assertIn('T10:00:00+07:00',rows[0]['time'])
 def test_compile_validates_filters_and_hash_before_publication(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder)
   for direction in ['arrival','departure']:
    (root/f'2026-10-24-{direction}.json.gz').write_bytes(gzip.compress(json.dumps(envelope(direction)).encode()))
   day,rows,proof,rejected=swc.compile_day('2026-10-24',root)
   self.assertEqual(len(rows),2);self.assertEqual(day['assets']['swc_long_binh']['arrival'],[1,None,1]);self.assertEqual(len(proof),2);self.assertFalse(rejected)
   broken=copy.deepcopy(envelope());broken['response']['data'][0]['dwt']=200
   path=root/'2026-10-24-arrival.json.gz';path.write_bytes(gzip.compress(json.dumps(broken).encode()))
   with self.assertRaisesRegex(ValueError,'checksum'):swc.compile_day('2026-10-24',root)
   broken=envelope();broken['parameters']['shipBoat']='BOAT';path.write_bytes(gzip.compress(json.dumps(broken).encode()))
   with self.assertRaisesRegex(ValueError,'filter'):swc.compile_day('2026-10-24',root)

if __name__=='__main__':unittest.main()
