"""Offline acceptance checks must fail closed on stale or incomplete evidence."""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('readiness', ROOT / 'scripts/check-slice1-readiness.py')
readiness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(readiness)


class Slice1ReadinessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for folder in ['docs/catalog-review', 'supabase/imports']:
            (self.root / folder).mkdir(parents=True)
        for name in ['company-catalog-handoff-manifest.json', 'issuer-universe-manifest.json', 'company-portfolios-manifest.json', 'evidence-artifacts.json', 'r2-additional-readback-20261016.json']:
            shutil.copyfile(ROOT / 'docs/catalog-review' / name, self.root / 'docs/catalog-review' / name)
        manifest = json.loads((ROOT / 'docs/catalog-review/company-catalog-handoff-manifest.json').read_text(encoding='utf-8'))
        for name in ['slice1_company_catalog.handoff.sql', *[a['file'] for a in manifest['input_sql']]]:
            shutil.copyfile(ROOT / 'supabase/imports' / name, self.root / 'supabase/imports' / name)

    def tearDown(self):
        self.temp.cleanup()

    def test_intact_bundle_is_ready_for_review_but_not_completed(self):
        result = readiness.assess(self.root)
        self.assertTrue(result['integrity_ok'])
        self.assertFalse(result['complete'])
        self.assertEqual(result['summary']['company_count'], 41)
        self.assertEqual(result['summary']['listing_history_count'], 41)
        self.assertEqual(result['summary']['pending_interest_proposals'], 14)
        self.assertEqual(result['summary']['observations_without_exact_effective_date'], 57)
        self.assertTrue(result['acceptance_gaps'])

    def test_changed_sql_cannot_pass_on_an_old_manifest(self):
        with (self.root / 'supabase/imports/cqn_license.proposals.sql').open('a', encoding='utf-8') as stream:
            stream.write('\n-- stale handoff\n')
        result = readiness.assess(self.root)
        self.assertFalse(result['integrity_ok'])
        self.assertIn('cqn_license.proposals.sql', ' '.join(result['integrity_errors']))

    def test_archive_counts_cannot_hide_missing_referenced_raw(self):
        path = self.root / 'docs/catalog-review/r2-additional-readback-20261016.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        data['items'] = [a for a in data['items'] if a['artifact_label'] != 'cqn-port-license.pdf']
        path.write_text(json.dumps(data), encoding='utf-8')
        result = readiness.assess(self.root)
        self.assertFalse(result['integrity_ok'])
        self.assertIn('lack a private readback receipt', ' '.join(result['integrity_errors']))

    def test_omitted_proposals_cannot_pass_with_an_unchanged_input_manifest(self):
        path = self.root / 'supabase/imports/slice1_company_catalog.handoff.sql'
        sql = path.read_text(encoding='utf-8').replace("'2020-06-24'", "'2020-06-25'")
        path.write_text(sql, encoding='utf-8')
        result = readiness.assess(self.root)
        self.assertFalse(result['integrity_ok'])
        self.assertIn('omits or changes input: cqn_license.proposals.sql', ' '.join(result['integrity_errors']))

    def test_even_claimed_cloud_import_is_not_a_publication_receipt(self):
        path = self.root / 'docs/catalog-review/company-catalog-handoff-manifest.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        data['cloud_applied'] = True
        path.write_text(json.dumps(data), encoding='utf-8')
        result = readiness.assess(self.root)
        self.assertFalse(result['complete'])
        self.assertFalse(result['summary']['cloud_applied'])
        self.assertIn('staging acceptance receipt', ' '.join(result['acceptance_gaps']))

    def test_matching_execution_receipt_proves_import_but_not_approval(self):
        name = 'docs/catalog-review/company-catalog-cloud-import-receipt-20261016.json'
        shutil.copyfile(ROOT / name, self.root / name)
        result = readiness.assess(self.root)
        self.assertTrue(result['summary']['cloud_applied'])
        self.assertFalse(result['complete'])
        self.assertTrue(any('unapproved' in gap for gap in result['acceptance_gaps']))
        path = self.root / name
        data = json.loads(path.read_text(encoding='utf-8'))
        data['bundle_sha256'] = '0' * 64
        path.write_text(json.dumps(data), encoding='utf-8')
        self.assertFalse(readiness.assess(self.root)['summary']['cloud_applied'])


if __name__ == '__main__':
    unittest.main()
