"""Private, content-addressed R2 backup with full readback and cold restore verification."""
import argparse
import concurrent.futures
import datetime as dt
import gzip
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import tarfile
import tempfile
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
BUCKET='investing-pro-evidence-staging'
ACCOUNT='5e84958e47290692c6ec2817fa1d9af6'
PREFIX='port-raw/hcm/'
spec=importlib.util.spec_from_file_location('bundle',ROOT/'scripts/hcm-collector-bundle.py')
bundle=importlib.util.module_from_spec(spec);spec.loader.exec_module(bundle)
def digest(data):return hashlib.sha256(data).hexdigest()
def compact(value):return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
def gunzip(data,limit=4_000_000):
    with gzip.GzipFile(fileobj=io.BytesIO(data)) as f:raw=f.read(limit+1)
    if len(raw)>limit:raise ValueError('Decoded object too large')
    return raw
def reference_time(run):
    stamp=dt.datetime.fromisoformat(run['checked_at'])
    if stamp>dt.datetime.now(dt.timezone.utc):raise ValueError('Future collection timestamp')
    return stamp
def client():
    import boto3
    from botocore.config import Config
    token=os.environ['CLOUDFLARE_API_TOKEN']
    request=urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/tokens/verify',headers={'Authorization':'Bearer '+token})
    with urllib.request.urlopen(request,timeout=30) as r:verified=json.load(r)
    token_id=verified.get('result',{}).get('id','')
    if not verified.get('success') or verified['result'].get('status')!='active' or not re.fullmatch('[a-f0-9]{32}',token_id):raise ValueError('Existing R2 token is not active')
    return boto3.client('s3',endpoint_url=f'https://{ACCOUNT}.r2.cloudflarestorage.com',aws_access_key_id=token_id,aws_secret_access_key=digest(token.encode()),region_name='auto',config=Config(signature_version='s3v4',s3={'addressing_style':'path'},connect_timeout=15,read_timeout=60,retries={'max_attempts':3},max_pool_connections=8))
class Store:
    def __init__(self,s3):self.s3=s3
    def get(self,key,limit):
        try:r=self.s3.get_object(Bucket=BUCKET,Key=key)
        except Exception as exc:
            if getattr(exc,'response',{}).get('Error',{}).get('Code') in ['404','NoSuchKey','NotFound']:return None
            raise RuntimeError('Private R2 read failed') from None
        try:raw=r['Body'].read(limit+1)
        finally:r['Body'].close()
        if len(raw)>limit:raise ValueError('Stored object too large')
        return raw
    def ensure(self,key,data):
        old=self.get(key,len(data))
        created=old is None
        if created:
            try:self.s3.put_object(Bucket=BUCKET,Key=key,Body=data,ContentType='application/gzip' if key.endswith('.gz') else 'application/json',Metadata={'sha256':digest(data)},IfNoneMatch='*')
            except Exception as exc:
                if getattr(exc,'response',{}).get('Error',{}).get('Code') not in ['PreconditionFailed','412']:raise RuntimeError('Private R2 write failed') from None
            old=self.get(key,len(data))
        if old is None or digest(old)!=digest(data):raise ValueError('R2 SHA-256 readback mismatch; existing object was not overwritten')
        return created

def backup(folder,store):
    run=json.loads((folder/'last-run.json').read_text(encoding='utf-8'))
    _,days,hashes=bundle.validate(folder,reference_time(run))
    files=[folder/'last-run.json',folder/'receipt.json',*days,*[folder/'archive'/(h+'.html.gz') for h in sorted(hashes)]]
    def upload(path):
        raw=path.read_bytes();encoded=gzip.compress(raw,mtime=0) if path.suffix=='.json' else raw
        suffix='.json.gz' if path.suffix=='.json' else '.html.gz'
        key=PREFIX+'objects/sha256/'+digest(encoded)+suffix
        created=store.ensure(key,encoded)
        return {'path':path.relative_to(folder).as_posix(),'object_key':key,'stored_sha256':digest(encoded),'file_sha256':digest(raw),'stored_bytes':len(encoded),'encoding':'gzip' if path.suffix=='.json' else 'identity'},created
    entries=[];created=0
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for index,(entry,new) in enumerate(pool.map(upload,files),1):
            entries.append(entry);created+=new
            if index%100==0:print(json.dumps({'readback_verified_objects':index,'total':len(files)}),flush=True)
    manifest={'version':'hcm-r2/1','source_url':bundle.c.URL,'parser_version':bundle.c.VERSION,'source_run':run,'from':'2025-01-01','through':days[-1].stem,'days':len(days),'files':sorted(entries,key=lambda e:e['path'])}
    raw=compact(manifest);key=PREFIX+'manifests/sha256/'+digest(raw)+'.json';store.ensure(key,raw)
    return key,manifest,{'objects':len(entries),'new_objects':created,'stored_bytes':sum(e['stored_bytes'] for e in entries),'manifest_sha256':digest(raw)}

def restore(manifest_key,dest,store):
    if not re.fullmatch(re.escape(PREFIX)+r'manifests/sha256/[a-f0-9]{64}\.json',manifest_key):raise ValueError('Invalid manifest key')
    raw=store.get(manifest_key,4_000_000)
    if raw is None or digest(raw)!=manifest_key.rsplit('/',1)[1][:-5]:raise ValueError('Manifest SHA-256 mismatch')
    m=json.loads(raw)
    if m.get('version')!='hcm-r2/1' or m.get('source_url')!=bundle.c.URL or m.get('parser_version')!=bundle.c.VERSION:raise ValueError('Wrong source or parser')
    if dest.exists() and any(dest.iterdir()):raise ValueError('Restore destination must be empty')
    dest.mkdir(parents=True,exist_ok=True);seen=set();total=0
    for row in m['files']:
        name=row['path'];total+=row['stored_bytes']
        if not re.fullmatch(r'(?:receipt\.json|last-run\.json|parsed/\d{4}-\d{2}-\d{2}\.json|archive/[a-f0-9]{64}\.html\.gz)',name) or name in seen:raise ValueError('Invalid restore path')
        if not 0<row['stored_bytes']<=4_000_000 or total>500_000_000:raise ValueError('Invalid restore size')
        if not re.fullmatch(re.escape(PREFIX)+r'objects/sha256/'+re.escape(row['stored_sha256'])+r'\.(?:json|html)\.gz',row['object_key']):raise ValueError('Invalid object reference')
        seen.add(name)
    def download(row):
        data=store.get(row['object_key'],row['stored_bytes'])
        if data is None or len(data)!=row['stored_bytes'] or digest(data)!=row['stored_sha256']:raise ValueError('Restore SHA-256 mismatch')
        if row['encoding']=='gzip':data=gunzip(data)
        elif row['encoding']!='identity':raise ValueError('Invalid object encoding')
        if digest(data)!=row['file_sha256']:raise ValueError('Restored file SHA-256 mismatch')
        path=dest/row['path'];path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(download,m['files']))
    run,days,_=bundle.validate(dest,reference_time(m['source_run']))
    if run!=m['source_run'] or len(days)!=m['days'] or days[-1].stem!=m['through']:raise ValueError('Restored edition differs')
    return {'cold_restore_verified':True,'days':len(days),'through':days[-1].stem,'files_restored':len(m['files']),'manifest_key':manifest_key,'manifest_sha256':digest(raw)}

def main():
    p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path);p.add_argument('--restore-manifest');p.add_argument('--restore-dir',type=Path);p.add_argument('--receipt',type=Path,default=ROOT/'.local/ops/hcm-r2-backup.json');args=p.parse_args()
    store=Store(client())
    if args.restore_manifest:
        if not args.restore_dir:raise ValueError('Restore directory required')
        result=restore(args.restore_manifest,args.restore_dir,store)
    else:
        if not args.bundle:raise ValueError('Verified collector bundle required')
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp)/'input'
            with tarfile.open(args.bundle,'r:gz') as tar:run=json.load(tar.extractfile('last-run.json'))
            bundle.unpack(args.bundle,folder,now=reference_time(run))
            key,manifest,stats=backup(folder,store)
            # New empty directory: no local/VPS fallback is available during restoration.
            result={**stats,**restore(key,Path(temp)/'cold-restore',store),'source_checked_at':manifest['source_run']['checked_at']}
    result.update(verified_at=dt.datetime.now(dt.timezone.utc).isoformat(),bucket=BUCKET,private_bucket_access_changed=False,source_metrics_changed=False,production_accepted=False)
    args.receipt.parent.mkdir(parents=True,exist_ok=True);args.receipt.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result),flush=True)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:f.write(f"\n## HCM private raw backup\n\n- Through: {result['through']}\n- Days: {result['days']}\n- SHA-256 readback + cold restore: {result['cold_restore_verified']}\n- Manifest: `{result['manifest_key']}`\n")
if __name__=='__main__':main()
