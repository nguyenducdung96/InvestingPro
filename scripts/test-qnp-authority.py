import importlib.util
import pathlib
import unittest

spec=importlib.util.spec_from_file_location('authority',pathlib.Path(__file__).with_name('collect-qnp-authority.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


class SourceContracts(unittest.TestCase):
    def test_source_weight_formats_and_unknowns(self):
        self.assertEqual(m.weight('28,378'),28378)
        self.assertEqual(m.weight('28.378'),28378)
        self.assertEqual(m.weight('3119,9'),3119.9)
        for s in ['', 'NA','0','1,200,001','28.37','3.119,9','999x']:
            self.assertIsNone(m.weight(s))

    def test_window_uses_two_image_dates_not_upload_or_publication_date(self):
        self.assertEqual(m.window('Tu 16h00 ngay 23/10/2026 den 16h00 ngay 24/10/2026','2026-10-24'),('2026-10-23T16:00:00+07:00','2026-10-24T16:00:00+07:00'))
        for s in ['23/10/2026','23/10/2025 24/10/2026','23/10/2026 25/10/2026']:
            with self.assertRaises(ValueError):m.window(s,'2026-10-24')

    def test_row_time_must_fall_inside_the_explicit_source_window(self):
        a,b=m.window('31/12/2025 01/01/2026','2026-01-01')
        self.assertEqual(m.event_time('18h00 –31/12',a,b),'2025-12-31T18:00:00+07:00')
        self.assertEqual(m.event_time('10:15 01/01',a,b),'2026-01-01T10:15:00+07:00')
        for s in ['24h01–31/12','10h00–01/02','15h00–31/12','18h00–01/01']:
            with self.assertRaises(ValueError):m.event_time(s,a,b)

    def test_only_explicit_ocr_typography_aliases_are_normalized(self):
        self.assertEqual(m.berth('P.0'),'P0');self.assertEqual(m.berth('PO'),'P0')
        self.assertEqual(m.berth('ICTL'),'1C TL')
        self.assertEqual(m.berth('TCQN'),'TCQN');self.assertEqual(m.berth('TC1'),'TC1')
        self.assertNotEqual(m.berth('TC TL'),'TC1');self.assertEqual(m.berth('P16'),'P16')

    def test_source_filenames_allow_real_editions_without_weakening_resource_scope(self):
        self.assertEqual(m.image_resource('images/uploads/images/source-0(1).jpg'),'images/uploads/images/source-0(1).jpg')
        self.assertIn('%20',m.image_resource('images/uploads/images/KHDD 01-02.jpg'))
        for s in ['https://example.org/x.jpg','images/uploads/images/../x.jpg','images/uploads/images/x%2fy.jpg','images/uploads/images/x.jpg?token=1','images/uploads/images/x%00.jpg']:
            with self.assertRaises(ValueError):m.image_resource(s)


if __name__=='__main__':unittest.main()
