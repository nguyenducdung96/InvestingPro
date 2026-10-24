"""Source-contract tests; synthetic public report rows, no pilot/agent data."""
import datetime as dt
import importlib.util
import pathlib
import unittest
import urllib.parse
spec=importlib.util.spec_from_file_location('collector',pathlib.Path(__file__).with_name('collect-cqn-plans.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
DAY=dt.date(2026,10,23)

def report(origin='HG7-1',destination='Cầu 1 - Cái Lân',kind='internal',dwt='5.098,6',duplicate=False):
 time='08:30 23/10/2026'
 regional=[time,'TEST ONLY','','',dwt,'9.999','','','Luồng Hòn Gai',origin,destination,'','']
 movement=['1','TEST ONLY','VN','','9.999',dwt,'',time]+([origin,destination] if kind=='internal' else [origin if kind=='arrival' else destination])+['','','','']
 def table(name,header,rows):
  return '<table id="'+name+'"><tr>'+''.join('<th>'+v+'</th>' for v in header)+'</tr>'+''.join('<tr>'+''.join('<td>'+v+'</td>' for v in r)+'</tr>' for r in rows)+'</table>'
 name={'arrival':'grvTauDen','departure':'grvTauDoi','internal':'grvTauDC'}[kind]
 text='<input name="rdptime" value="2026-10-23"><input name="rdptime$dateInput" value="23-10-2026">KẾ HOẠCH ĐIỀU ĐỘNG TÀU THUYỀN QNH - KHU VỰC HÒN GAI '
 text+=table('GridView_HonGai',c.REGIONAL,[regional]*(2 if duplicate else 1))
 for n,h in c.HEADERS.items():text+=c.TITLES[n]+table(n,h,[movement] if n==name else [])
 return text.encode('utf8')

class Contract(unittest.TestCase):
 def test_internal_classification_and_decimal(self):
  e=c.parse_day(report(),DAY)['events'];self.assertEqual(len(e),1);self.assertEqual(e[0]['direction'],'arrival');self.assertEqual(e[0]['plan_kind'],'internal');self.assertEqual(e[0]['dwt'],'5098.6')
 def test_external_arrival_and_departure(self):
  for origin,destination,kind in [('P/S','Cầu 5 - Cái Lân','arrival'),('Cầu 6 - Cái Lân','P/S','departure')]:
   e=c.parse_day(report(origin,destination,kind),DAY)['events'][0];self.assertEqual(e['direction'],kind);self.assertEqual(e['plan_kind'],kind)
 def test_never_includes_cict_or_infers_temp(self):
  for name in ['Cầu 2 - Cái Lân','Cầu 3 - Cái Lân','Cầu 4 - Cái Lân','Bến tạm - Cái Lân']:
   self.assertEqual(c.parse_day(report(destination=name),DAY)['events'],[])
 def test_pilot_station_movement_keeps_source_section_kind(self):
  e=c.parse_day(report(origin='Cầu 6 - Cái Lân',destination='P/S',kind='internal'),DAY)['events'][0]
  self.assertEqual(e['plan_kind'],'internal');self.assertEqual(e['direction'],'departure')
 def test_missing_dwt_is_not_gt(self):self.assertIsNone(c.parse_day(report(dwt=''),DAY)['events'][0]['dwt'])
 def test_duplicate_views_and_duplicate_rows_not_added(self):
  r=c.parse_day(report(duplicate=True),DAY);self.assertEqual(len(r['events']),1);self.assertEqual(r['exact_duplicates_removed'],1)
 def test_reconciliation_ignores_display_row_numbers(self):
  raw=report().decode();start=raw.index('<table id="grvTauDC"');part=raw[start:];begin=part.index('<tr><td>1</td>');end=part.index('</tr>',begin)+5;row=part[begin:end];part=part.replace(row,row+row.replace('<td>1</td>','<td>2</td>',1));raw=raw[:start]+part
  self.assertEqual(len(c.parse_day(raw.encode(),DAY)['events']),1)
 def test_intra_cqn_transfer_has_two_separate_direction_markers(self):
  e=c.parse_day(report(origin='Cầu 5 - Cái Lân',destination='Cầu 6 - Cái Lân'),DAY)['events'];self.assertEqual({v['direction'] for v in e},{'arrival','departure'});self.assertTrue(all(v['plan_kind']=='internal' for v in e))
 def test_wrong_day_fails(self):
  with self.assertRaises(ValueError):c.parse_day(report(),dt.date(2025,10,23))
 def test_schema_drift_fails(self):
  with self.assertRaises(ValueError):c.parse_day(report().replace(b'Trong t',b'Unexpected t'),DAY)
 def test_conflicting_dwt_fails(self):
  raw=report().decode('utf8');raw=raw.replace('5.098,6','5.099,6',1)
  with self.assertRaisesRegex(ValueError,'DWT conflict'):c.parse_day(raw.encode('utf8'),DAY)
 def test_missing_movement_section_fails(self):
  with self.assertRaises(ValueError):c.parse_day(report().replace(c.TITLES['grvTauDC'].encode(),b'MISSING'),DAY)
 def test_empty_source_is_not_certified_zero(self):
  raw=report().decode();start=raw.index('<table id="grvTauDC"');raw=raw[:start]+raw[raw.index('</table>',start)+8:]
  with self.assertRaisesRegex(ValueError,'No source plans'):c.parse_day(raw.encode(),DAY)
 def test_form_contract(self):
  f=urllib.parse.parse_qs(c.form_body({'__VIEWSTATE':'test'},DAY).decode());self.assertEqual(f['__EVENTTARGET'],['rdptime']);self.assertEqual(f['rdptime'],['2026-10-23']);self.assertEqual(f['rdptime$dateInput'],['23-10-2026'])

if __name__=='__main__':unittest.main()
