"""Regression contracts for attributed activity, date precision and visit revisions."""
import datetime as dt
import importlib.util
import io
from pathlib import Path
import unittest
from openpyxl import Workbook

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
collector=module('collector','collect-nap-reports.py');exporter=module('exporter','export-nap-history.py')

def workbook(name='Daily Report',publication='2026-10-24'):
    w=Workbook();s=w.active;s.title=name
    s['A1']='BÁO CÁO HOẠT ĐỘNG TÀU THUYỀN TẠI KHU VỰC CẢNG BIỂN NGHỆ AN';s['A2']=dt.datetime.fromisoformat(publication)
    s['B5']='BẾN CẢNG XÍ NGHIỆP XẾP DỠ CẢNG CỬA LÒ (CÔNG TY CỔ PHẦN CẢNG NGHỆ TĨNH)'
    for col,value in [('B','Tên tàu'),('G','D.W.T'),('H','Ngày đến'),('I','Ngày đi')]:s[col+'6']=value
    for col,value in [('A',1),('B','TEST VESSEL'),('F',999),('G',123.45),('H',dt.datetime(2026,10,20)),('I',dt.datetime(2026,10,24))]:s[col+'8']=value
    s['H8'].number_format=s['I8'].number_format='dd/mm/yyyy'
    return w,s

def parse(w,day='2026-10-24'):
    stream=io.BytesIO();w.save(stream);return collector.parse_workbook(stream.getvalue(),day)

class Contracts(unittest.TestCase):
    def test_case_alias_and_day_precision_preserve_gt_separately(self):
        for name in ['Daily Report','Daily report']:
            w,s=workbook(name);r=parse(w)['rows'][0]
            self.assertEqual(r['arrival'],{'day':'2026-10-20','time':None,'precision':'day'})
            self.assertEqual((r['dwt'],r['gt']),(123.45,999))

    def test_explicit_operator_only_and_schema_drift(self):
        w,s=workbook();s['B5']='BẾN CẢNG SỐ 5 CỬA LÒ (CÔNG TY TNHH CẢNG CỬA LÒ)'
        with self.assertRaisesRegex(ValueError,'explicit NAP'):parse(w)
        w,s=workbook();s['G6']='G.T'
        with self.assertRaisesRegex(ValueError,'schema'):parse(w)

    def test_late_publication_is_distinct_from_report_date(self):
        w,s=workbook(publication='2026-10-23');self.assertEqual(parse(w)['report_day'],'2026-10-23')
        with self.assertRaisesRegex(ValueError,'publication window'):parse(w,'2027-02-05')
        with self.assertRaisesRegex(ValueError,'publication window'):parse(w,'2026-10-22')
        s['A2']='NGÀY 23/10/2026';self.assertEqual(parse(w)['report_day'],'2026-10-23')

    def test_future_departure_and_formula_weights_never_become_actual_events(self):
        w,s=workbook();s['I8']=dt.datetime(2026,10,25);r=parse(w)['rows'][0]
        self.assertIsNone(r['departure']);self.assertEqual(r['departure_error'],'future_or_reversed_departure')
        w,s=workbook();s['G8']='=F8*2';r=parse(w)
        self.assertEqual(r['rows'],[]);self.assertEqual(r['rejected'][0]['reason'],'formula_in_vessel_cells')

    def test_bad_departure_header_keeps_the_independently_valid_arrival(self):
        w,s=workbook();s['I6']=dt.datetime(2025,2,10);r=parse(w)
        self.assertEqual(len(r['rows']),1);self.assertIsNone(r['rows'][0]['departure'])
        self.assertEqual(r['rows'][0]['departure_error'],'unverified_departure_header');self.assertEqual(len(r['schema_errors']),1)

    def test_missing_weight_remains_null_and_combined_vessel_is_quarantined(self):
        w,s=workbook();s['G8']=None;self.assertIsNone(parse(w)['rows'][0]['dwt'])
        s['B8']='TUG + BARGE';self.assertEqual(parse(w)['rejected'][0]['reason'],'multiple_vessels')

    def test_latest_visit_replaces_previous_including_removed_departure(self):
        w,s=workbook();row=parse(w)['rows'][0]
        report={'status':'parsed','id':1,'day':'2026-10-24','published_at':'2026-10-24T16:00:00+07:00','url':'https://cangvuhanghainghean.gov.vn/index.aspx?page=detail&id=1','attachment_url':'https://cangvuhanghainghean.gov.vn/a.xlsx','sha256':'a'*64,'html_sha256':'b'*64,'report_day':'2026-10-24','checked_at':'2026-10-25T00:00:00Z','parser_version':collector.VERSION,'rows':[row]}
        later={**report,'id':2,'day':'2026-10-25','published_at':'2026-10-25T16:00:00+07:00','rows':[{**row,'dwt':None,'departure':None}]}
        visits,repeated,_=exporter.compile_reports([report,later]);self.assertEqual(len(visits),1);self.assertEqual(repeated,1)
        self.assertIsNone(visits[0]['dwt']);self.assertIsNone(visits[0]['departure'])
        _,monthly=exporter.subtotals(visits,'2026-10-24');self.assertEqual(monthly['2026-10/nap/arrival'],{'rows':1,'dwt':None,'missing_dwt':1});self.assertNotIn('2026-10/nap/departure',monthly)

    def test_conflicting_rows_in_one_report_do_not_pick_a_weight_arbitrarily(self):
        w,s=workbook();row=parse(w)['rows'][0]
        report={'status':'parsed','id':1,'day':'2026-10-24','published_at':'2026-10-24T16:00:00+07:00','url':'https://cangvuhanghainghean.gov.vn/index.aspx?page=detail&id=1','attachment_url':'https://cangvuhanghainghean.gov.vn/a.xlsx','sha256':'a'*64,'html_sha256':'b'*64,'report_day':'2026-10-24','checked_at':'2026-10-25T00:00:00Z','parser_version':collector.VERSION,'rows':[row,{**row,'row':9,'dwt':999}]}
        visits,_,_=exporter.compile_reports([report]);self.assertEqual(len(visits),1);self.assertIsNone(visits[0]['dwt']);self.assertTrue(visits[0]['source']['dwt_conflict'])

    def test_late_publication_does_not_supersede_a_newer_activity_report(self):
        w,s=workbook();row=parse(w)['rows'][0]
        report={'status':'parsed','id':1,'day':'2026-10-24','published_at':'2026-10-24T16:00:00+07:00','url':'https://cangvuhanghainghean.gov.vn/index.aspx?page=detail&id=1','attachment_url':'https://cangvuhanghainghean.gov.vn/a.xlsx','sha256':'a'*64,'html_sha256':'b'*64,'report_day':'2026-10-24','checked_at':'2026-10-25T00:00:00Z','parser_version':collector.VERSION,'rows':[row]}
        late={**report,'id':2,'day':'2026-10-25','published_at':'2026-10-25T16:00:00+07:00','report_day':'2026-10-23','rows':[{**row,'departure':None}]}
        visits,_,_=exporter.compile_reports([report,late]);self.assertIsNotNone(visits[0]['departure']);self.assertEqual(visits[0]['source']['id'],1)

if __name__=='__main__':unittest.main()
