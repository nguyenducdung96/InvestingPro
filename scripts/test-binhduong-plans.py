import copy,gzip,hashlib,importlib.util,json,shutil,sys,tempfile,unittest
from unittest.mock import patch
from pathlib import Path
spec=importlib.util.spec_from_file_location('bd',Path(__file__).with_name('export-binhduong-plans.py'));bd=importlib.util.module_from_spec(spec);spec.loader.exec_module(bd)
def envelope(code='BC198',label='Cảng Bình Dương',dwt=None):
 row=dict(timeOfDeparture='24/10/2026 10:00',vmaItineraryScheduleId=123,portHarbourCode=code,portWharfCode='55079',anchoringPortWharfName='SÔNG ĐỒNG NAI, '+label+', Bình Dương',initFrom='',nameOfShip='TEST',dwt=dwt,gt=999)
 response={'total':1,'data':[row]};raw=json.dumps(response,ensure_ascii=False,separators=(',',':'))
 return dict(day='2026-10-24',direction='departure',source_url=bd.dn.SOURCE,response=response,raw_response=raw,sha256=hashlib.sha256(raw.encode()).hexdigest(),checked_at='2026-10-25T00:00:00Z')
class Tests(unittest.TestCase):
 def test_journal_header_is_portable_across_windows_linux_and_python_versions(self):
  raw=b'[{"dwt":null}]';encoded=bd.encode_journal(raw);payload=bd.base64.b64decode(encoded)
  self.assertEqual(payload[3],0) # No optional filename or timestamp metadata.
  self.assertEqual(payload[4:8],b'\x00\x00\x00\x00')
  self.assertEqual(payload[9],255) # Portable OS header, including Python 3.12 Linux.
  self.assertEqual(gzip.decompress(payload),raw)
  self.assertEqual(encoded,bd.encode_journal(raw))

 def test_blank_response_cannot_erase_even_one_published_event(self):
  row={'day':'2026-10-24','direction':'arrival','time':'2026-10-24T10:00:00+07:00','vessel':'TEST','from':None,'to':'Binh Duong','dwt':None}
  with self.assertRaisesRegex(ValueError,'missing previously published'):bd.check_event_retention([row],[])
  bd.check_event_retention([row],[{**row,'dwt':100}])

 def test_cold_runner_preserves_history_and_replay_is_identical(self):
  # Use committed history plus synthetic empty recent boards. No network/cache required.
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);module=root/'packages/modules/port/src';module.mkdir(parents=True)
   ledgerpath=root/'docs/catalog-review/binhduong-history-ledger.json';ledgerpath.parent.mkdir(parents=True)
   shutil.copy(bd.ROOT/'docs/catalog-review/binhduong-history-ledger.json',ledgerpath)
   for name in ['binhduong-history-data.ts','binhduong-journal-loader.ts']:
    shutil.copy(bd.MODULE/name,module/name)
   shutil.copytree(bd.MODULE/'binhduong-journal-data',module/'binhduong-journal-data')
   journal=module/'binhduong-journal-data/2025-01.ts'
   encoded=json.loads(journal.read_text(encoding='utf8').split('export const southJournalGzip=',1)[1].rsplit(';',1)[0])
   payload=bytearray(bd.base64.b64decode(encoded));payload[9]=3 # Simulate another platform's reviewed gzip bytes.
   journal.write_text('export const southJournalGzip='+json.dumps(bd.base64.b64encode(payload).decode())+';\n',encoding='utf8')
   reviewed_bytes=journal.read_bytes()
   ledger=json.loads(ledgerpath.read_text(encoding='utf8'));end=bd.dt.date.fromisoformat(ledger['metadata']['through'])
   raw=root/'raw';raw.mkdir()
   for n in range(7):
    day=end-bd.dt.timedelta(days=n)
    for direction in ['arrival','departure']:
     response={'total':0,'data':[]};text=json.dumps(response)
     field='timeOfArrival' if direction=='arrival' else 'timeOfDeparture'
     e={'day':str(day),'direction':direction,'source_url':bd.dn.SOURCE,'parameters':{field:day.strftime('%d/%m/%Y'),'maritimeCode':11,'shipBoat':'SHIP'},'response':response,'raw_response':text,'sha256':hashlib.sha256(text.encode()).hexdigest(),'checked_at':'2026-10-30T00:00:00Z'}
     (raw/f'{day}-{direction}.json.gz').write_bytes(gzip.compress(json.dumps(e).encode()))
   args=['export','--through',str(end),'--raw-dir',str(raw),'--recent-only']
   with patch.object(bd,'ROOT',root),patch.object(bd,'MODULE',module),patch.object(sys,'argv',args):
    bd.main()
    files=lambda:{str(p.relative_to(root)):p.read_bytes() for p in root.rglob('*') if p.is_file() and raw not in p.parents}
    first=files();self.assertEqual(journal.read_bytes(),reviewed_bytes);bd.main();self.assertEqual(first,files())
    updated=json.loads(ledgerpath.read_text(encoding='utf8'))
    self.assertEqual(updated['metadata']['events'],ledger['metadata']['events'])
    self.assertEqual(updated['metadata']['last_observation_by_direction'],ledger['metadata']['last_observation_by_direction'])
    self.assertIsNone(updated['monthly'][str(end)[:7]]['gmd_binh_duong']['arrival']['rows'])
    # Missing raw or corrupted preserved journal must fail before any publication write.
    path=raw/f'{end}-arrival.json.gz';payload=path.read_bytes();path.unlink()
    with self.assertRaises(FileNotFoundError):bd.main()
    self.assertEqual(first,files());path.write_bytes(payload)
    journal=module/'binhduong-journal-data/2025-01.ts';original=journal.read_bytes();journal.write_text('broken',encoding='utf8')
    with self.assertRaises((IndexError,ValueError)):bd.main()
    journal.write_bytes(original);self.assertEqual(first,files())

 def test_raw_revisions_are_immutable_and_checksum_verified(self):
  spec=importlib.util.spec_from_file_location('refresh',Path(__file__).with_name('refresh-binhduong-plans.py'));refresh=importlib.util.module_from_spec(spec);spec.loader.exec_module(refresh)
  with tempfile.TemporaryDirectory() as folder,patch.object(refresh.collector,'OUT',Path(folder)):
   path=Path(folder)/'day.json.gz';e=envelope();original=gzip.compress(json.dumps(e).encode());path.write_bytes(original)
   refresh.archive(path);refresh.archive(path)
   archives=list((Path(folder)/'archive').rglob('*.gz'));self.assertEqual(len(archives),1);self.assertEqual(archives[0].read_bytes(),original)
   e['checked_at']='2026-10-26T00:00:00Z';path.write_bytes(gzip.compress(json.dumps(e).encode()));refresh.archive(path)
   self.assertEqual(len(list((Path(folder)/'archive').rglob('*.gz'))),2)
   e['response']['data'][0]['dwt']=1;path.write_bytes(gzip.compress(json.dumps(e).encode()))
   with self.assertRaisesRegex(ValueError,'checksum'):refresh.archive(path)

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
