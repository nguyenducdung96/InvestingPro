"""Offline invariants for the PHP monthly research pipeline."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('php_newsletters', Path(__file__).resolve().parents[1] / 'scripts/php_newsletters.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class NewsletterTests(unittest.TestCase):
    def test_discovery_deduplicates_and_rejects_external_and_encoded_traversal(self):
        p = m.Links()
        p.feed('''<a href="/FileUpload/Documents/BAN%20TIN/2026/a.pdf">One</a>
          <a href="https://haiphongport.com.vn/FileUpload/Documents/BAN TIN/2026/a.pdf">Duplicate</a>
          <a href="https://evil.example/a.pdf">Other</a>
          <a href="/FileUpload/Documents/%2e%2e/a.pdf">Traversal</a>
          <a href="/en/port-of-hai-phong-monthly-newsletter-2027.html">New year</a>''')
        self.assertEqual(len(p.pdfs), 1)
        self.assertTrue(any('2027' in x for x in p.indexes))
        for url in ('http://haiphongport.com.vn/a.pdf', 'https://haiphongport.com.vn.evil.example/a.pdf',
                    'https://user@haiphongport.com.vn/a.pdf', 'https://haiphongport.com.vn:8443/a.pdf'):
            with self.assertRaises(ValueError):
                m.official_url(url)

    def test_gap_does_not_create_quarter_total_or_skip_january_for_ytd(self):
        rows = [dict(period=p, cargo_tonnes=100, container_teu=10) for p in
                ['2025-02', '2025-03', '2026-02', '2026-03']]
        result = m.build_series(rows)
        self.assertTrue(all(q['cargo_tonnes'] is None for q in result['quarters']))
        self.assertEqual(result['ytd'], [])
        self.assertAlmostEqual(result['months'][-1]['yoy_pct']['container_teu'], 0)

    def test_duplicate_language_is_not_added_and_conflict_is_withheld(self):
        a = dict(period='2025-08', cargo_tonnes=100, container_teu=10)
        self.assertEqual(len(m.build_series([a, a])['months']), 1)
        result = m.build_series([a, {**a, 'container_teu': 11}])
        self.assertEqual(result['months'], [])
        self.assertEqual(len(result['conflicts']), 1)

    def test_missing_metric_is_null_but_other_quarter_metric_can_be_computed(self):
        rows=[dict(period=p,cargo_tonnes=None if p.endswith('02') else 100,container_teu=10)
              for p in ['2026-01','2026-02','2026-03']]
        result=m.build_series(rows)
        self.assertIsNone(result['quarters'][0]['cargo_tonnes'])
        self.assertEqual(result['quarters'][0]['container_teu'],30)
        self.assertEqual(result['quarters'][0]['missing_metric_months']['cargo_tonnes'],['2026-02'])

    def test_zero_baseline_is_not_infinite_yoy_and_ytd_stops_at_gap(self):
        rows = [dict(period=p, cargo_tonnes=0 if p=='2025-01' else 100, container_teu=10)
                for p in ['2025-01','2025-02','2026-01','2026-02','2026-04']]
        result = m.build_series(rows)
        jan = next(x for x in result['months'] if x['period']=='2026-01')
        self.assertIsNone(jan['yoy_pct']['cargo_tonnes'])
        self.assertEqual(result['ytd'][0]['through_month'], 2)
        self.assertEqual(result['ytd'][0]['current']['container_teu'], 20)

    def test_pdf_login_response_never_changes_source_revision(self):
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)
            db=m.connect(out)
            url='https://haiphongport.com.vn/FileUpload/Documents/test.pdf'
            db.execute('INSERT INTO documents(url,latest_sha,seen_at) VALUES (?,?,?)',(url,'reviewed-hash',m.now()))
            db.commit()
            with self.assertRaises(ValueError):
                m.record_pdf(db,out,url,b'<html>Login required</html>',m.now())
            self.assertEqual(db.execute('SELECT latest_sha FROM documents').fetchone()[0],'reviewed-hash')
            db.close()

    def test_period_suggestion_uses_content_and_december_rollover_not_filename(self):
        def hit(text,y):return dict(text=text,confidence=.99,box=[[0,y],[100,y],[100,y+10],[0,y+10]])
        r=m.propose([hit('JANUARY 2026',30),hit('DECEMBER OPERATIONAL RESULTS',100)],1000,1500)
        self.assertEqual(r['period'],'2025-12')
        r=m.propose([hit('JANUARY 2026',30),hit('AUGUST OPERATIONAL RESULTS',100)],1000,1500)
        self.assertIsNone(r['period'])

    def test_review_requires_current_hash_and_is_immutable_and_replay_safe(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            db = m.connect(out)
            url = 'https://haiphongport.com.vn/FileUpload/Documents/test.pdf'
            raw = out/'test.pdf'
            raw.write_bytes(b'%PDF-test')
            digest = m.sha(raw.read_bytes())
            db.execute('INSERT INTO documents(url,latest_sha,seen_at) VALUES (?,?,?)',(url,digest,m.now()))
            db.execute('INSERT INTO revisions VALUES (?,?,?,?,?)',(url,digest,m.now(),str(raw),'review.png'))
            db.commit()
            data = dict(asset='tan_vu',status='visually_reviewed',reviewer='test',items=[
                dict(url=url,sha256=digest,period='2025-08',publication_month='2025-09',
                     cargo_tonnes=100,container_teu=10,pdf_page=1,note='Checked chart and scope')])
            m.apply_reviews(db,out,data)
            m.apply_reviews(db,out,data)
            self.assertEqual(len(m.export(db,out)['months']),1)
            changed=json.loads(json.dumps(data));changed['items'][0]['cargo_tonnes']=101
            with self.assertRaises(ValueError):
                m.apply_reviews(db,out,changed)
            changed['items'][0]['correction_reason']='Visual transcription correction'
            m.apply_reviews(db,out,changed)
            self.assertEqual(m.export(db,out)['months'][0]['cargo_tonnes'],101)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM review_corrections').fetchone()[0],1)
            db.execute('UPDATE documents SET latest_sha=? WHERE url=?',('new-hash',url));db.commit()
            self.assertEqual(m.export(db,out)['months'],[])
            with self.assertRaises(ValueError):
                m.apply_reviews(db,out,data)
            db.close()


if __name__ == '__main__':
    unittest.main()
