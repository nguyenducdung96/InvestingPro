"""Read-only staging smoke check using an HTTP client with no authentication."""
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

BASE='https://investing-pro-web-staging.tuyenkinhmon88.workers.dev'
results=[]
for path in ['/industries/ports/companies?view=all','/companies/GMD']:
    with urlopen(Request(BASE+path,headers={'User-Agent':'InvestingPro-public-acceptance/1.0'}),timeout=30) as response:
        html=response.read().decode('utf-8')
        result=dict(path=path,status=response.status,cookies_sent=False,authorization_sent=False,api_prose_absent='có tiền thân là' not in html)
        if path.startswith('/industries'):
            result['company_links']=len(set(re.findall(r'href="(/companies/[A-Z0-9]+)"',html)))
            assert result['company_links']==41, 'Public directory scope differs'
        else:
            result['source_link_present']='Mở báo cáo gốc của doanh nghiệp' in html
            result['icd_separate']='ICD và cảng cạn' in html
            assert result['source_link_present'] and result['icd_separate'], 'Public dossier incomplete'
        assert result['status']==200 and result['api_prose_absent']
        results.append(result)
receipt=dict(checked_at=datetime.now(timezone.utc).isoformat(),results=results)
target=Path(__file__).resolve().parents[1]/'docs/catalog-review/public-catalog-http-check-20261017.json'
target.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt,ensure_ascii=False,indent=2))
