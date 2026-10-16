import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('reported_acceptance',ROOT/'scripts/check-reported-catalog.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReportedAcceptanceTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        module.ROOT=Path(self.temp.name)
        module.DOC=module.ROOT/'docs/catalog-review'
        module.DOC.mkdir(parents=True)
        (module.ROOT/'supabase/imports').mkdir(parents=True)
        for name in ['reported-catalog-manifest.json','company-portfolios-manifest.json','r2-additional-readback-20261016.json']:
            shutil.copyfile(ROOT/'docs/catalog-review'/name,module.DOC/name)
        shutil.copyfile(ROOT/'supabase/imports/reported_catalog_2025.pending.sql',module.ROOT/'supabase/imports/reported_catalog_2025.pending.sql')

    def tearDown(self):
        self.temp.cleanup()

    def test_unknown_historical_dates_do_not_block_a_complete_snapshot(self):
        result=module.assess()
        self.assertEqual(result['integrity_errors'],[])
        self.assertEqual(result['summary']['unknown_relationship_start_dates'],62)
        self.assertFalse(result['historical_dates_required_for_snapshot_acceptance'])
        self.assertEqual(result['snapshot_scope_status'],'ready_for_staging_verification')

    def test_changed_sql_or_missing_evidence_prevents_acceptance(self):
        path=module.ROOT/'supabase/imports/reported_catalog_2025.pending.sql'
        path.write_text(path.read_text(encoding='utf-8')+'\n-- changed',encoding='utf-8')
        self.assertEqual(module.assess()['snapshot_scope_status'],'failed')
        archive=module.DOC/'r2-additional-readback-20261016.json'
        data=json.loads(archive.read_text(encoding='utf-8'));data['items']=[]
        archive.write_text(json.dumps(data),encoding='utf-8')
        self.assertTrue(any('archived primary evidence' in s for s in module.assess()['integrity_errors']))

    def test_deployed_snapshot_acceptance_is_not_a_publication_license(self):
        manifest=json.loads((module.DOC/'reported-catalog-manifest.json').read_text(encoding='utf-8'))
        receipt=dict(sql_sha256=manifest['sql_sha256'],project_id='loapslojajawgzekozfv',counts=dict(dossiers=41,observations=63),authenticated_ui_verified=True,pending_publication_hidden=True,rls_enabled=True)
        path=module.DOC/'reported-catalog-staging-receipt-20261016.json'
        path.write_text(json.dumps(receipt),encoding='utf-8')
        result=module.assess()
        self.assertEqual(result['snapshot_scope_status'],'accepted_on_staging')
        self.assertEqual(result['public_publication_status'],'pending_source_and_fact_review')
        receipt['sql_sha256']='0'*64
        path.write_text(json.dumps(receipt),encoding='utf-8')
        self.assertFalse(module.assess()['cloud_snapshot_applied'])


if __name__=='__main__':unittest.main()
