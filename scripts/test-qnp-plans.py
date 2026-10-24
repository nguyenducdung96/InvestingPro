import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('collector', pathlib.Path(__file__).with_name('collect-qnp-plans.py'))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class QnpDiscovery(unittest.TestCase):
    def post(self, content):
        return {'id': 1, 'link': 'https://quynhonport.vn/example/',
                'title': {'rendered': 'Thông báo kế hoạch bố trí cầu bến'},
                'date': '2026-10-11T16:00:00', 'modified': '2026-10-12T16:00:00',
                'content': {'rendered': content}}

    def test_absent_image_is_unavailable_not_zero(self):
        self.assertEqual(collector.candidates(self.post(''))['status'], 'source_no_images')

    def test_images_are_candidates_never_approved(self):
        post = self.post('<img src="https://quynhonport.vn/wp-content/uploads/2026/05/23-10-2025.png">')
        item = collector.candidates(post)
        self.assertEqual(item['status'], 'pending_image_review')
        self.assertEqual(item['published_at'], post['date'])

    def test_unrelated_post_is_ignored(self):
        post = self.post(''); post['title']['rendered'] = 'Kế hoạch kinh doanh'
        self.assertIsNone(collector.candidates(post))

    def test_source_drift_and_external_hosts_are_rejected(self):
        self.assertFalse(collector.allowed('https://quynhonport.vn.example.org/'))
        self.assertFalse(collector.allowed('http://quynhonport.vn/'))
        with self.assertRaises(ValueError):
            collector.candidates(self.post('<img src="https://example.org/x.png">'))


if __name__ == '__main__':
    unittest.main()
