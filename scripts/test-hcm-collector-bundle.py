import datetime as dt
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('bundle',Path(__file__).with_name('hcm-collector-bundle.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
spec=importlib.util.spec_from_file_location('fixtures',Path(__file__).with_name('test-south-plans.py'));f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)

class Tests(unittest.TestCase):
 def edition(self,root):
  day='2025-01-01';raw=f.board(weight='').replace(b'2026-10-24',day.encode()).replace(b'24/10/2026',b'01/01/2025')
  data=m.c.parse(raw,day);sha=hashlib.sha256(raw).hexdigest()
  for name in ['parsed','archive']:(root/name).mkdir()
  data.update(sha256=sha,source_error=None,parser_version=m.c.VERSION)
  (root/'parsed'/f'{day}.json').write_text(json.dumps(data),encoding='utf-8')
  (root/'archive'/f'{sha}.html.gz').write_bytes(gzip.compress(raw))
  run={'checked_at':'2025-01-02T01:15:00+00:00','status':'success','stage':'collection','error_days':0,'requested_days':1}
  (root/'last-run.json').write_text(json.dumps(run));(root/'receipt.json').write_text(json.dumps({'errors':[],'requested_days':1}))
  return dt.datetime(2025,1,2,2,tzinfo=dt.timezone.utc)
 def test_complete_archive_accepts_missing_weights_without_fabrication(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);now=self.edition(root)
   self.assertEqual(m.validate(root,now)[0]['requested_days'],1)
   self.assertIsNone(json.loads((root/'parsed/2025-01-01.json').read_text())['events'][0]['dwt'])
 def test_roundtrip_and_latest_failed_attempt_cannot_serve_old_success(self):
  spec=importlib.util.spec_from_file_location('serve',Path(__file__).with_name('serve-hcm-bundle.py'));server=importlib.util.module_from_spec(spec);spec.loader.exec_module(server)
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);now=self.edition(root);bundle=root/'export/latest.tar.gz';original=m.validate
   with patch.object(m,'validate',side_effect=lambda path:original(path,now)):
    m.pack(root,bundle);m.unpack(bundle,root/'restored')
   output=io.BytesIO();server.serve(root,output);self.assertEqual(output.getvalue(),bundle.read_bytes())
   (root/'last-run.json').write_text(json.dumps({'status':'failed'}))
   with self.assertRaisesRegex(ValueError,'failed'):server.serve(root,io.BytesIO())
 def test_tampered_raw_and_failed_or_stale_collection_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);now=self.edition(root)
   with self.assertRaisesRegex(ValueError,'Stale'):m.validate(root,now+dt.timedelta(days=2))
   raw=next((root/'archive').glob('*'));raw.write_bytes(gzip.compress(b'changed'))
   with self.assertRaisesRegex(ValueError,'hash'):m.validate(root,now)
 def test_modified_parser_output_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);now=self.edition(root);file=next((root/'parsed').glob('*'));d=json.loads(file.read_text());d['events'][0]['dwt']=42;file.write_text(json.dumps(d))
   with self.assertRaisesRegex(ValueError,'differs'):m.validate(root,now)
 def test_traversal_and_symlink_cannot_replace_good_input(self):
  for name,link in [('../receipt.json',False),('/receipt.json',False),('parsed/day.json',True)]:
   with self.subTest(name=name),tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp);bundle=root/'bad.tar.gz';dest=root/'input';dest.mkdir();(dest/'sentinel').write_text('keep')
    with tarfile.open(bundle,'w:gz') as tar:
     entry=tarfile.TarInfo(name)
     if link:entry.type=tarfile.SYMTYPE;entry.linkname='/etc/passwd';tar.addfile(entry)
     else:entry.size=2;tar.addfile(entry,io.BytesIO(b'{}'))
    with self.assertRaises(ValueError):m.unpack(bundle,dest)
    self.assertEqual((dest/'sentinel').read_text(),'keep')
 def test_failed_run_cannot_be_packed_over_last_good_bundle(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);self.edition(root);(root/'last-run.json').write_text(json.dumps({'status':'failed'}));dest=root/'last.tar.gz';dest.write_bytes(b'good')
   with self.assertRaises(ValueError):m.pack(root,dest)
   self.assertEqual(dest.read_bytes(),b'good')

if __name__=='__main__':unittest.main()
