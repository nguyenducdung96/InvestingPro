"""Forced SSH command: fixed data export only, no client-supplied paths/commands."""
import json
from pathlib import Path
import shutil
import sys
import tarfile

def serve(root,output):
    latest=json.loads((root/'last-run.json').read_text(encoding='utf-8'))
    if latest.get('status')!='success' or latest.get('stage')!='collection':raise ValueError('Latest collector attempt failed')
    with (root/'export/latest.tar.gz').open('rb') as file:
        with tarfile.open(fileobj=file,mode='r:gz') as tar:
            bundled=json.load(tar.extractfile('last-run.json'))
        if bundled!=latest:raise ValueError('Export does not match the latest collection')
        file.seek(0);shutil.copyfileobj(file,output)

if __name__=='__main__':serve(Path('/var/lib/investingpro-hcm'),sys.stdout.buffer)
