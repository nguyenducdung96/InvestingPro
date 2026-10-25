"""Bounded DNS/TCP/TLS/HTTP diagnostics for reviewed public HCM sources only."""
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import socket
import ssl
import time
import urllib.error
import urllib.request

HOSTS=['cangvuhanghaitphcm.gov.vn','www.cangvuhanghaitphcm.gov.vn','kehoach.cangvuhanghaitphcm.gov.vn','phuongdinh.name.vn']
URLS=[
 'https://cangvuhanghaitphcm.gov.vn/index.aspx?page=shipschedule&cat=3146',
 'http://cangvuhanghaitphcm.gov.vn/index.aspx?page=shipschedule&cat=3146',
 'https://www.cangvuhanghaitphcm.gov.vn/index.aspx?page=shipschedule&cat=3146',
 'https://kehoach.cangvuhanghaitphcm.gov.vn/welcome',
 'https://phuongdinh.name.vn/api/cangvu/getDSTau4?ngay=24/10/2026',
]
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None

def network(host):
 result={'host':host,'addresses':[],'connections':[]}
 try:result['addresses']=sorted(set(a[4][0] for a in socket.getaddrinfo(host,443)))
 except OSError as exc:result['dns_error']=str(exc);return result
 for port in [80,443]:
  start=time.monotonic();item={'port':port}
  try:
   with socket.create_connection((host,port),timeout=6) as connection:
    item['tcp_connected']=True
    if port==443:
     with ssl.create_default_context().wrap_socket(connection,server_hostname=host) as tls:
      item.update(tls_version=tls.version(),certificate_expires=tls.getpeercert().get('notAfter'))
  except OSError as exc:item['error']=str(exc)
  item['seconds']=round(time.monotonic()-start,3);result['connections'].append(item)
 return result

def http(url):
 start=time.monotonic();result={'url':url}
 try:
  opener=urllib.request.build_opener(NoRedirect())
  with opener.open(urllib.request.Request(url,headers={'User-Agent':'InvestingPro public source research'}),timeout=8) as response:
   raw=response.read(4_000_001)
   result.update(status=response.status,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),content_type=response.headers.get('Content-Type'),schedule_tables=all(s.encode() in raw for s in ['ctl22_GridView_TauDen','ctl22_GridView_TauRoi','ctl22_GridView_TauDiChuyen']))
 except urllib.error.HTTPError as exc:result.update(status=exc.code,location=exc.headers.get('Location'))
 except OSError as exc:result['error']=str(exc)
 result['seconds']=round(time.monotonic()-start,3);return result

if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:connections=list(pool.map(network,HOSTS))
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:requests=list(pool.map(http,URLS))
 receipt={'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'event':os.environ.get('GITHUB_EVENT_NAME','local'),'run_id':os.environ.get('GITHUB_RUN_ID'),'dns_tcp_tls':connections,'http':requests,'tls_validation':True,'redirects_followed':False,'publication_performed':False}
 out=Path('.local/ops');out.mkdir(parents=True,exist_ok=True)
 (out/'hcm-network-diagnostic.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(receipt,ensure_ascii=False,indent=2))
