import importlib.util
import unittest
from unittest.mock import patch
import tempfile
import json
from pathlib import Path
from html import escape
spec=importlib.util.spec_from_file_location('collector',Path(__file__).with_name('collect-south-plans.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def board(day='2026-10-24',clock='11:00',weight='156694'):
 html='<input name="ctl22$txtDate" value="'+day+'"><h2>Kế hoạch điều động tàu ngày 24/10/2026</h2>'
 for table,kind in m.TABLES.items():
  html+='<table id="'+table+'"><tr>'+''.join('<th>'+escape(h)+'</th>' for h in m.HEADERS[kind])+'</tr>'
  if kind!='internal':
   row=['1','* COSCO DENMARK','HK','CALL',weight,'300','12','CONT','CAI MEP GEMADEPT-TERMINAL LINK',clock]+['']*(len(m.HEADERS[kind])-10)
   html+='<tr>'+''.join('<td>'+escape(c)+'</td>' for c in row)+'</tr>'
  html+='</table>'
 return html.encode()
class Tests(unittest.TestCase):
 def test_connectivity_probe_cannot_export_or_publish(self):
  with tempfile.TemporaryDirectory() as folder,patch.object(m,'OUT',Path(folder)),patch.object(m,'initial_request',return_value=board()),patch('sys.argv',['collector','--probe']),patch.dict(m.os.environ,{},clear=True),patch('builtins.print'):
   m.main();run=json.loads((Path(folder)/'last-run.json').read_text());self.assertFalse(run['exportable']);self.assertEqual(run['stage'],'connectivity_probe');self.assertFalse((Path(folder)/'receipt.json').exists())
 def test_initial_connection_retries_and_fails_without_false_success(self):
  with patch.object(m,'request',side_effect=[OSError('timeout'),OSError('timeout'),b'valid']),patch.object(m.time,'sleep'):
   self.assertEqual(m.initial_request(),b'valid')
  with patch.object(m,'request',side_effect=OSError('timeout')),patch.object(m.time,'sleep'):
   with self.assertRaises(OSError):m.initial_request()
 def test_initial_failure_receipt_does_not_replace_prior_source_receipt(self):
  with tempfile.TemporaryDirectory() as folder,patch.dict(m.os.environ,{},clear=True):
   p=Path(folder);(p/'receipt.json').write_text('last-good')
   m.write_run(p,{'exportable':False,'stage':'bootstrap','error':'timeout'})
   self.assertEqual((p/'receipt.json').read_text(),'last-good');self.assertFalse(json.loads((p/'last-run.json').read_text())['exportable'])
 def test_sparse_cold_cache_cannot_replace_published_history(self):
  spec=importlib.util.spec_from_file_location('exporter',Path(__file__).with_name('export-south-plans.py'));exporter=importlib.util.module_from_spec(spec);spec.loader.exec_module(exporter)
  prior={'metadata':{'assets':{'gemalink':{'rows':100}}}}
  with self.assertRaises(ValueError):exporter.check_retention({'gemalink':{'rows':2}},prior)
  exporter.check_retention({'gemalink':{'rows':99}},prior)
 def test_selected_and_heading_dates_must_match_requested_day(self):
  with self.assertRaises(ValueError):m.parse(board(),'2025-01-01')
  with self.assertRaises(ValueError):m.parse(board('2025-01-01'),'2025-01-01')
 def test_schema_drift_fails_closed(self):
  with self.assertRaises(ValueError):m.parse(board().replace(b'DWT',b'GT'),'2026-10-24')
 def test_marker_and_raw_weight_preserved(self):
  d=m.parse(board(),'2026-10-24');self.assertEqual(d['events'][0]['vessel'],'COSCO DENMARK');self.assertEqual(d['events'][0]['raw'][1],'* COSCO DENMARK');self.assertEqual(d['events'][0]['dwt'],156694)
 def test_no_midnight_or_gt_substitution(self):
  d=m.parse(board(clock='chưa rõ'),'2026-10-24');self.assertFalse(d['events']);self.assertEqual(len(d['rejected']),2)
  for value in ['0','','GT 1000','9'*400]:
   self.assertIsNone(m.parse(board(weight=value),'2026-10-24')['events'][0]['dwt'])
 def test_post_matches_public_date_widget_state(self):
  from urllib.parse import parse_qs
  import json
  fields=parse_qs(m.post_fields(board(),'2025-01-01').decode());self.assertEqual(fields['ctl22$txtDate'],['2025-01-01']);self.assertEqual(json.loads(fields['ctl22_txtDate_dateInput_ClientState'][0])['lastSetTextBoxValue'],'01/01/2025')
if __name__=='__main__':unittest.main()
