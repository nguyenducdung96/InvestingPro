import copy
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('archive',Path(__file__).with_name('archive-hcm-raw.py'));a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
spec=importlib.util.spec_from_file_location('fixtures',Path(__file__).with_name('test-hcm-collector-bundle.py'));f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)
class MemoryStore:
 def __init__(self):self.data={}
 def ensure(self,key,data):
  new=key not in self.data
  if not new and self.data[key]!=data:raise ValueError('Readback mismatch')
  self.data[key]=data;return new
 def get(self,key,limit):return self.data.get(key)
class S3Error(Exception):
 def __init__(self,code):self.response={'Error':{'Code':code}}
class FakeS3:
 def __init__(self,corrupt=False):self.data={};self.puts=0;self.corrupt=corrupt
 def get_object(self,**kw):
  if kw['Key'] not in self.data:raise S3Error('NoSuchKey')
  raw=self.data[kw['Key']]
  return {'Body':io.BytesIO(raw+b'changed' if self.corrupt else raw)}
 def put_object(self,**kw):
  assert kw['IfNoneMatch']=='*';self.puts+=1;self.data[kw['Key']]=kw['Body']
class Tests(unittest.TestCase):
 def edition(self,root):return f.Tests().edition(root)
 def test_full_restore_without_original_disk_and_rerun_does_not_overwrite(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t)/'input';root.mkdir();self.edition(root);s=MemoryStore()
   key,m,stats=a.backup(root,s);self.assertEqual(stats['new_objects'],4)
   other=Path(t)/'cold';r=a.restore(key,other,s)
   self.assertTrue(r['cold_restore_verified']);self.assertEqual((other/'parsed/2025-01-01.json').read_bytes(),(root/'parsed/2025-01-01.json').read_bytes())
   self.assertEqual(a.backup(root,s)[2]['new_objects'],0)
 def test_stored_object_tampering_fails_restore(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t)/'input';root.mkdir();self.edition(root);s=MemoryStore();key,m,_=a.backup(root,s)
   s.data[m['files'][0]['object_key']]=b'corrupt'
   with self.assertRaisesRegex(ValueError,'SHA-256'):a.restore(key,Path(t)/'cold',s)
 def test_manifest_tampering_and_path_traversal_rejected(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t)/'input';root.mkdir();self.edition(root);s=MemoryStore();key,m,_=a.backup(root,s)
   bad=copy.deepcopy(m);bad['files'][0]['path']='../outside.json';raw=a.compact(bad);badkey=a.PREFIX+'manifests/sha256/'+a.digest(raw)+'.json';s.data[badkey]=raw
   with self.assertRaisesRegex(ValueError,'path'):a.restore(badkey,Path(t)/'cold',s)
   s.data[key]=b'{}'
   with self.assertRaisesRegex(ValueError,'Manifest SHA'):a.restore(key,Path(t)/'other',s)
 def test_existing_bad_object_never_overwritten(self):
  s3=FakeS3();s3.data['key']=b'evil';s=a.Store(s3)
  with self.assertRaisesRegex(ValueError,'mismatch'):s.ensure('key',b'good')
  self.assertEqual(s3.puts,0)
 def test_read_after_write_is_verified(self):
  s3=FakeS3(corrupt=True)
  with self.assertRaises(ValueError):a.Store(s3).ensure('key',b'good')
  self.assertEqual(s3.puts,1)
 def test_nonempty_restore_destination_rejected(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t)/'input';root.mkdir();self.edition(root);s=MemoryStore();key,_,_=a.backup(root,s)
   with self.assertRaisesRegex(ValueError,'empty'):a.restore(key,root,s)

if __name__=='__main__':unittest.main()
