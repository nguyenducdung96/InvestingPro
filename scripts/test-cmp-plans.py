"""Source-contract regressions, independent of the generated TypeScript dataset."""
import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('cmp',Path(__file__).with_name('collect-cmp-plans.py'))
cmp=importlib.util.module_from_spec(spec);spec.loader.exec_module(cmp)

def document(rows):
    return '<span id="ctl22_LabelCurrentPage">1</span><ul id="accordion"><li>Kế hoạch điều động tàu ngày 24/10/2026</li><ul><li><table>'+rows+'</table></li></ul></ul>'

def row(cells):
    return '<tr>'+''.join('<td>'+c+'</td>' for c in cells)+'</tr>'

class SourceContract(unittest.TestCase):
    def test_vietnamese_weights(self):
        for raw,expected in [('23.255,47',23255.47),('24404,36',24404.36),('49.603',49603),('1006 HP',None),('0',None),('15+20',None),('/',None)]:
            self.assertEqual(cmp.weight(raw),expected)

    def test_missing_heading_does_not_reuse_previous_direction(self):
        heading=row(['KẾ HOẠCH TÀU ĐẾN CẢNG'])
        header=row(['Thời gian Time','Name of ship']+['']*8)
        data=row(['08h00','TEST','','','23.255,47','','Chân Mây','Vị trí neo','Cầu cảng số 2',''])
        docs,_=cmp.parse(document(heading+header+data+header+data),1,'a'*64)
        self.assertEqual(len(docs[0]['rows']),1)
        self.assertEqual(len(docs[0]['rejected_rows']),1)
        self.assertEqual(docs[0]['rows'][0]['dwt'],23255.47)

    def test_schema_and_page_drift_fail_closed(self):
        with self.assertRaises(ValueError):cmp.parse(document(''),2,'a'*64)
        with self.assertRaises(ValueError):cmp.parse(document(''),1,'a'*64)

    def test_column_mismatch_and_ambiguous_time_are_quarantined(self):
        docs,_=cmp.parse(document(row(['KẾ HOẠCH TÀU RỜI CẢNG'])+row(['bad']*9)+row(['25h00','TEST','','','100','','Chân Mây','Cầu cảng số 2','Huế',''])),1,'a'*64)
        self.assertEqual(docs[0]['rows'],[])
        self.assertEqual(len(docs[0]['rejected_rows']),2)

if __name__=='__main__':unittest.main()
