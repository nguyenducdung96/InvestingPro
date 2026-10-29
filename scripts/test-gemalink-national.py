import copy,hashlib,importlib.util,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def module(name,file):
 spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file);value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
p=module('parser','gemalink-national-parser.py');e=module('exporter','export-gemalink-national.py');c=module('collector','collect-gemalink-national.py')
class Tests(unittest.TestCase):
 def test_signed_official_pdf_uses_plan_clock_dwt_and_recovers_missing_cell_border(self):
  path=ROOT/'tests/fixtures/gemalink-national/cma-visby-20250628.pdf'
  self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),'83474f32084181daf8dc1b3d3fa559a9069f710db66e58270146d8596e8e020a')
  result=p.parse_pdf(path);self.assertFalse(result['issues']);self.assertEqual(len(result['events']),1);row=result['events'][0]
  self.assertEqual((row['day'],row['time'],row['direction'],row['dwt']),('2025-06-29','08:30','arrival',31285))
  self.assertTrue(p.is_gemalink(row['to']));self.assertEqual(row['signed_at'],'2025-06-28T16:53:26+07:00')
 def test_aliases_and_internal_routes_do_not_match_agent_or_arbitrary_gemadept_port(self):
  self.assertFalse(p.is_gemalink('ISS-GEMADEPT'));self.assertFalse(p.is_gemalink('Cảng Bình Dương'))
  self.assertTrue(p.internal_location('G12'));self.assertTrue(p.internal_location('Khu neo Gò Gia'));self.assertFalse(p.internal_location('SINGAPORE'))
  self.assertIsNone(p.source_number(''));self.assertIsNone(p.source_number('GT 31285'));self.assertIsNone(p.source_number('0'))
 def test_old_official_layout_keeps_local_clock_and_dwt_unit_precision(self):
  row=p.parse_pdf(ROOT/'tests/fixtures/gemalink-national/old-layout-20241231.pdf')['events'][0]
  self.assertEqual((row['day'],row['time'],row['dwt']),('2024-12-31','08:30',148992));self.assertTrue(p.is_gemalink(row['to']))
 def test_repeated_continuation_page_is_one_movement(self):
  result=p.parse_pdf(ROOT/'tests/fixtures/gemalink-national/repeated-continuation.pdf')
  self.assertFalse(result['issues']);self.assertEqual(len(result['events']),1)
 def test_extra_grt_column_and_wrapped_digits_never_replace_dwt(self):
  result=p.parse_pdf(ROOT/'tests/fixtures/gemalink-national/one-trust-12-columns.pdf')
  self.assertFalse(result['issues']);row=result['events'][0];self.assertEqual(row['dwt'],197059);self.assertEqual(row['source_columns'][5].replace('\n',''),'212221')
 def test_truly_empty_trailing_pdf_page_is_not_a_missing_data_page(self):
  self.assertFalse(p.parse_pdf(ROOT/'tests/fixtures/gemalink-national/trailing-blank-page.pdf')['issues'])
 def sample(self):return dict(day='2025-06-29',time='08:30',vessel='CMA CGM VISBY',direction='arrival',dwt=31285,document_year='2025',document_name='25085570',signed_at='2025-06-28T16:53:26+07:00',**{'from':'SINGAPORE','to':'CAI MEP GEMADEPT-TERMINAL LINK'})
 def test_duplicate_urls_do_not_create_two_events_and_revisions_require_a_later_signature(self):
  a=self.sample();b=copy.deepcopy(a);b['source_url']='second-url'
  selected,old,ambiguous=e.resolve_versions([a,b]);self.assertEqual(len(selected),1);self.assertFalse(ambiguous)
  b['time']='09:00';b['signed_at']='2025-06-28T17:00:00+07:00';selected,old,ambiguous=e.resolve_versions([a,b]);self.assertEqual(selected[0]['time'],'09:00');self.assertEqual(len(old),1)
  b['signed_at']=None;selected,old,ambiguous=e.resolve_versions([a,b]);self.assertFalse(selected);self.assertEqual(len(ambiguous),2)
 def test_conflicting_weight_with_equal_signature_is_quarantined(self):
  a=self.sample();b=copy.deepcopy(a);b['document_name']='other-number';b['dwt']=40000
  selected,old,ambiguous=e.resolve_versions([a,b]);self.assertFalse(selected);self.assertEqual(len(ambiguous),2)
 def test_source_urls_drop_session_secrets_and_fail_closed_on_other_origins(self):
  url=c.safe_url('https://hanghai.moc.gov.vn/tra-cuu-giay-phep;jsessionid=example?p_auth=secret&p_p_lifecycle=0&cur=2')
  self.assertNotIn('secret',url);self.assertNotIn('jsessionid',url)
  with self.assertRaises(ValueError):c.safe_url('https://example.org/private')
 def test_pagination_counts_and_document_kind_are_not_inferred_from_html_size(self):
  page=c.parse(b'<p>Showing 1 - 20 of 1.065 results</p>');self.assertEqual(c.total_rows(page),1065)
  with self.assertRaises(ValueError):c.total_rows(c.parse(b'<p>Access unavailable</p>'))
if __name__=='__main__':unittest.main()
