"""Download only a fixed data bundle using a restricted SSH key, never run code on the VPS."""
import os
from pathlib import Path
import subprocess
import tempfile

with tempfile.TemporaryDirectory() as directory:
    tmp=Path(directory)
    key=tmp/'key';key.write_text(os.environ['HCM_COLLECTOR_SSH_KEY']+'\n');key.chmod(0o600)
    hosts=tmp/'known_hosts';hosts.write_text(os.environ['HCM_COLLECTOR_KNOWN_HOSTS']+'\n')
    host=os.environ['HCM_COLLECTOR_HOST']
    if not host or any(x not in '0123456789.abcdefABCDEF:' for x in host):raise ValueError('Expected collector IP')
    dest=Path('.local/ops/hcm-collector.tar.gz');dest.parent.mkdir(parents=True,exist_ok=True)
    with dest.open('wb') as output:
        subprocess.run(['ssh','-i',str(key),'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+str(hosts),'-o','ConnectTimeout=20','-o','ServerAliveInterval=15','-o','ServerAliveCountMax=3','invest-hcm-export@'+host,'export-hcm'],stdout=output,check=True,timeout=300)
subprocess.run(['python','scripts/hcm-collector-bundle.py','unpack',str(dest)],check=True)
