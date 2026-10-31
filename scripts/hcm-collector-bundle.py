"""Create/validate a complete original-source archive; no code comes from the VPS."""
import argparse
import datetime as dt
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import tarfile
import tempfile

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('collector',ROOT/'scripts/collect-south-plans.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)

def validate(folder,now=None):
    run=json.loads((folder/'last-run.json').read_text(encoding='utf-8'))
    if run.get('status')!='success' or run.get('stage')!='collection' or run.get('error_days')!=0:
        raise ValueError('Collector did not complete successfully')
    now=now or dt.datetime.now(dt.timezone.utc)
    stamp=dt.datetime.fromisoformat(run['checked_at'])
    if not 0 <= (now-stamp).total_seconds() <= 30*3600:raise ValueError('Stale collector run')
    receipt=json.loads((folder/'receipt.json').read_text(encoding='utf-8'))
    if receipt.get('errors'):raise ValueError('Source errors in edition')
    days=sorted((folder/'parsed').glob('*.json'))
    end=now.astimezone(dt.timezone(dt.timedelta(hours=7))).date()-dt.timedelta(days=1)
    expected=(end-dt.date(2025,1,1)).days+1
    if len(days)!=expected or run.get('requested_days')!=expected or receipt.get('requested_days')!=expected:
        raise ValueError('Incomplete history window')
    hashes=set()
    for index,path in enumerate(days):
        day=(dt.date(2025,1,1)+dt.timedelta(days=index)).isoformat()
        d=json.loads(path.read_text(encoding='utf-8'))
        if path.stem!=day or d['day']!=day or d.get('source_error') or d.get('parser_version')!=c.VERSION:
            raise ValueError('Invalid source day')
        sha=d['sha256']
        if len(sha)!=64 or any(x not in '0123456789abcdef' for x in sha):raise ValueError('Invalid hash')
        raw=gzip.decompress((folder/'archive'/(sha+'.html.gz')).read_bytes())
        if len(raw)>4_000_000 or hashlib.sha256(raw).hexdigest()!=sha:raise ValueError('Raw hash mismatch')
        fresh=c.parse(raw,day)
        for key in ['events','section_rows','rejected','labels']:
            if fresh[key]!=d[key]:raise ValueError('Parsed content differs from raw')
        hashes.add(sha)
    return run,days,hashes

def pack(folder,dest):
    run,days,hashes=validate(folder)
    dest.parent.mkdir(parents=True,exist_ok=True)
    tmp=dest.with_suffix('.pending')
    with tarfile.open(tmp,'w:gz') as tar:
        for name in ['last-run.json','receipt.json']:tar.add(folder/name,arcname=name,recursive=False)
        for path in days:tar.add(path,arcname='parsed/'+path.name,recursive=False)
        for sha in sorted(hashes):tar.add(folder/'archive'/(sha+'.html.gz'),arcname='archive/'+sha+'.html.gz',recursive=False)
    tmp.chmod(0o640);tmp.replace(dest)
    return run

def unpack(bundle,folder):
    # Extract into a fresh directory, reject traversal/links/duplicates before any writes.
    folder.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(dir=folder.parent) as temp:
        stage=Path(temp);seen=set();size=0
        with tarfile.open(bundle,'r:gz') as tar:
            for item in tar:
                name=item.name
                allowed=name in ['receipt.json','last-run.json'] or (name.startswith('parsed/') and name.endswith('.json')) or (name.startswith('archive/') and name.endswith('.html.gz'))
                if not item.isfile() or not allowed or name in seen or '\\' in name or any(p in ['..',''] for p in name.split('/')) or len(name.split('/'))>2:
                    raise ValueError('Unsafe bundle entry')
                seen.add(name);size+=item.size
                if len(seen)>10000 or item.size>4_000_000 or size>500_000_000:raise ValueError('Bundle too large')
                target=stage/name;target.parent.mkdir(parents=True,exist_ok=True)
                with tar.extractfile(item) as source,target.open('wb') as dest:shutil.copyfileobj(source,dest)
        run,_,_=validate(stage)
        # Validation is complete before replacing working input. Receipts remain outside.
        for name in ['parsed','archive']:
            dest=folder/name
            if dest.exists():shutil.rmtree(dest)
            shutil.copytree(stage/name,dest)
        for name in ['receipt.json','last-run.json']:shutil.copyfile(stage/name,folder/name)
    return run

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['pack','unpack']);parser.add_argument('bundle',type=Path);parser.add_argument('--folder',type=Path,default=ROOT/'.local/south-plans');args=parser.parse_args()
    result=pack(args.folder,args.bundle) if args.mode=='pack' else unpack(args.bundle,args.folder)
    print(json.dumps({'validated':True,'checked_at':result['checked_at'],'days':result['requested_days']}))
