"""Read-only official national published-plan archive; no session URLs on disk."""
import argparse,concurrent.futures as cf,datetime as dt,gzip,hashlib,html,http.cookiejar,http.client,json,re,time,socket
from html.parser import HTMLParser
from pathlib import Path
import urllib.parse as qp
import urllib.request as rq
BASE='https://hanghai.moc.gov.vn/tra-cuu-giay-phep'
NS='_thongtintauaction_WAR_TichHopGiaoThongportlet_'
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.local/gemalink-national'
def ipv4_connection(address,timeout=35,source_address=None,**kwargs):
 # The official host's AAAA route times out locally. Resolve its A records
 # normally; HTTPS still validates the original hostname and certificate.
 host,port=address;error=None
 for af,kind,proto,_,target in socket.getaddrinfo(host,port,socket.AF_INET,socket.SOCK_STREAM):
  connection=socket.socket(af,kind,proto);connection.settimeout(timeout)
  try:
   if source_address:connection.bind(source_address)
   connection.connect(target);return connection
  except OSError as exc:error=exc;connection.close()
 raise error or OSError('No IPv4 address for official host')
class IPv4HTTPSConnection(http.client.HTTPSConnection):
 def __init__(self,*args,**kwargs):super().__init__(*args,**kwargs);self._create_connection=ipv4_connection
class IPv4HTTPSHandler(rq.HTTPSHandler):
 def https_open(self,req):return self.do_open(IPv4HTTPSConnection,req,context=self._context)
class OfficialRedirectHandler(rq.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  target=qp.urlsplit(newurl)
  if target.scheme!='https' or target.hostname!='hanghai.moc.gov.vn':raise ValueError('Unexpected official-source redirect')
  return super().redirect_request(req,fp,code,msg,headers,newurl)
def make_opener(*handlers):return rq.build_opener(IPv4HTTPSHandler(),OfficialRedirectHandler(),*handlers)
class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.forms=[];self.form=None;self.rows=[];self.row=None;self.cell=False;self.select=None;self.selected={};self.text=[];self.skip=0;self.links=[];self.inputs={}
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in ['script','style']:self.skip+=1
  if tag=='form':self.form={'action':html.unescape(a.get('action','')),'fields':{}};self.forms.append(self.form)
  if tag=='input':
   if self.form is not None:self.form['fields'][a.get('name','')]=a.get('value','')
   if a.get('type')!='hidden':self.inputs[a.get('name','')]=a.get('value','')
  if tag=='select':self.select=a.get('name')
  if tag=='option' and self.select and 'selected' in a:self.selected[self.select]=a.get('value')
  if tag=='tr':self.row={'cells':[],'links':[]}
  if tag in ['td','th'] and self.row is not None:self.row['cells'].append('');self.cell=True
  if tag=='a' and a.get('href'):
   self.links.append(a)
   if self.row is not None:self.row['links'].append(a)
 def handle_endtag(self,tag):
  if tag in ['script','style']:self.skip=max(0,self.skip-1)
  if tag=='form':self.form=None
  if tag=='select':self.select=None
  if tag in ['td','th']:self.cell=False
  if tag=='tr' and self.row is not None:self.rows.append(self.row);self.row=None
 def handle_data(self,text):
  if self.cell and self.row and self.row['cells']:self.row['cells'][-1]+=' '+text.strip()
  if not self.skip and text.strip():self.text.append(text.strip())
def parse(raw):
 page=Page();page.feed(raw.decode('utf8'));return page
def safe_url(url):
 u=qp.urlsplit(html.unescape(url));q=qp.parse_qsl(u.query,keep_blank_values=True)
 if u.scheme!='https' or u.hostname!='hanghai.moc.gov.vn':raise ValueError('Unexpected national origin')
 return qp.urlunsplit((u.scheme,u.netloc,u.path.split(';')[0],qp.urlencode([(k,v) for k,v in q if k not in ['p_auth','p_p_auth']]),''))
def read(url,fields=None,opener=None):
 if qp.urlsplit(url).hostname!='hanghai.moc.gov.vn':raise ValueError('Unexpected source host')
 for attempt in range(3):
  try:
   req=rq.Request(url,data=qp.urlencode(fields).encode() if fields is not None else None,headers={'User-Agent':'InvestingPro public official-source research','Referer':BASE})
   with (opener or make_opener()).open(req,timeout=35) as response:
    if qp.urlsplit(response.geturl()).hostname!='hanghai.moc.gov.vn':raise ValueError('Unexpected source redirect')
    data=response.read(8_000_001)
    if len(data)>8_000_000:raise ValueError('Source exceeds archive limit')
    return data
  except (OSError,ValueError):
   if attempt==2:raise
   time.sleep(1+attempt)
def bootstrap():
 op=make_opener(rq.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 raw=read(BASE,opener=op)
 match=re.search(r"getData\('/ke-hoach-dieu-dong-tau','([^']+)'",raw.decode('utf8'))
 if not match:raise ValueError('Published-plan menu missing')
 raw=read(html.unescape(match[1]),{'SESSION_MENU_SELECTED':'/ke-hoach-dieu-dong-tau'},op)
 page=parse(raw)
 form=next(f for f in page.forms if f['fields'].get('flagMenu')=='2')
 return op,raw,page,form
def total_rows(page):
 text=' '.join(page.text)
 m=re.search(r'Showing\s+(?:[\d.,]+\s*-\s*[\d.,]+\s+of\s+)?([\d.,]+)\s+results?\b',text)
 if m:return int(re.sub(r'\D','',m[1]))
 if re.search(r'No results|No (?:data|records)|Không có (?:dữ liệu|kết quả)',text,re.I):return 0
 raise ValueError('Unknown pagination count')
def listing_rows(page):
 result=[]
 for r in page.rows:
  cells=[' '.join(c.split()) for c in r['cells']]
  if len(cells)!=9 or not cells[0].isdigit():continue
  links=[a['href'] for a in r['links'] if 'viewKetQuaHoSoEnglish(' in a.get('href','')]
  if len(links)!=1:raise ValueError('Ambiguous source document')
  m=re.search(r"viewKetQuaHoSoEnglish\('([^']+)'",links[0]);url=safe_url(m[1]);q=qp.parse_qs(qp.urlsplit(url).query)
  native={k.removeprefix(NS):v[0] for k,v in q.items() if k.startswith(NS)}
  if qp.urlsplit(url).path!='/tra-cuu-giay-phep' or q.get('p_p_lifecycle')!=['0'] or native.get('jspPage')!='/html/report_export.jsp' or native.get('MESSAGE_TYPE')!='70' or not native.get('REQUEST_CODE'):raise ValueError('Not a public published movement-plan view')
  result.append({'cells':cells,'view_url':url,'native':native,'key':hashlib.sha256(url.encode()).hexdigest()})
 return result
def collect_listing(start,end,port='',state=None):
 if state and state.get('session'):op,form=state['session']
 else:
  op,raw,page,form=bootstrap()
 fields={**form['fields'],'maritimeCode':'12','portCode':port,'shipName':'','certificateNumber':'','callSign':'','shipDateFrom':start.strftime('%d/%m/%Y 00:00'),'shipDateTo':end.strftime('%d/%m/%Y 23:59')}
 raw=read(form['action'],fields,op);page=parse(raw);total=total_rows(page);allrows=[];pages=[];seen=set()
 if total>20:
  link=next((a['href'] for a in page.links if qp.parse_qs(qp.urlsplit(html.unescape(a.get('href',''))).query).get('cur')==['2']),None)
  if not link:raise ValueError('Pagination link missing')
  parts=qp.urlsplit(html.unescape(link));q=dict(qp.parse_qsl(parts.query));q[NS+'delta']='75';q['cur']='1'
  raw=read(qp.urlunsplit((parts.scheme,parts.netloc,parts.path,qp.urlencode(q),'')),opener=op);page=parse(raw)
 while True:
  if page.inputs.get('shipDateFrom')!=fields['shipDateFrom'] or page.inputs.get('shipDateTo')!=fields['shipDateTo'] or page.selected.get('maritimeCode')!='12':raise ValueError('Source filters lost')
  if port and page.selected.get('portCode')!=port:raise ValueError('Port filter lost')
  if total_rows(page)!=total:raise ValueError('Unstable pagination')
  rows=listing_rows(page)
  expected_start=len(allrows)+1
  if rows and int(rows[0]['cells'][0])!=expected_start:raise ValueError('Pagination skipped or repeated a row')
  pages.append({'sha256':hashlib.sha256(raw).hexdigest(),'first_row':expected_start,'rows':len(rows)})
  allrows.extend(rows)
  if len(allrows)==total:break
  if not rows or len(allrows)>total:raise ValueError('Incomplete page')
  nextlinks=[a['href'] for a in page.links if a.get('href') and qp.parse_qs(qp.urlsplit(html.unescape(a['href'])).query).get('cur')==[str(len(pages)+1)]]
  if not nextlinks:raise ValueError('Next page link missing')
  url=html.unescape(nextlinks[0]);canonical=safe_url(url)
  if canonical in seen:raise ValueError('Pagination loop')
  seen.add(canonical);raw=read(url,opener=op);page=parse(raw)
  if len(pages)%10==0:print(json.dumps({'listing':str(start),'pages':len(pages),'rows':len(allrows),'total':total}),flush=True)
 if state is not None:state['session']=(op,next(f for f in page.forms if f['fields'].get('flagMenu')=='2'))
 return {'from':str(start),'through':str(end),'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'source_url':BASE,'maritime_code':'12','port_filter':port,'complete_listing':True,'total':total,'pages':pages,'rows':allrows}
def fetch_document(row):
 key=row['key'];record=OUT/'documents'/(key+'.json')
 if record.exists():
  try:
   value=json.loads(record.read_text(encoding='utf8'));pdf=OUT/'pdf'/(value['sha256']+'.pdf')
   if pdf.exists() and hashlib.sha256(pdf.read_bytes()).hexdigest()==value['sha256']:return 'cached'
  except (OSError,ValueError):pass
 try:
  detail=read(row['view_url']);text=detail.decode('utf8');m=re.search(r'<object[^>]+data=["\']([^"\']+)',text,re.I)
  if not m:raise ValueError('PDF attachment missing')
  url=safe_url(qp.urljoin(BASE,html.unescape(m[1])))
  if not qp.urlsplit(url).path.startswith(('/documents/','/TichHopGiaoThong-portlet/export/')):raise ValueError('Unexpected document path')
  pdf=read(url)
  if not pdf.startswith(b'%PDF'):raise ValueError('Attachment is not PDF')
  sha=hashlib.sha256(pdf).hexdigest();(OUT/'pdf'/(sha+'.pdf')).write_bytes(pdf)
  value={'key':key,'native':row['native'],'listing_cells':row['cells'],'source_url':url,'sha256':sha,'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'bytes':len(pdf)}
  tmp=record.with_suffix('.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf8');tmp.replace(record);return 'ok'
 except Exception as error:
  failure={'key':key,'native':row['native'],'listing_cells':row['cells'],'view_url':row['view_url'],'error':type(error).__name__+': '+str(error),'checked_at':dt.datetime.now(dt.timezone.utc).isoformat()}
  folder=OUT/'errors';folder.mkdir(exist_ok=True);(folder/(key+'.json')).write_text(json.dumps(failure,ensure_ascii=False,indent=2),encoding='utf8')
  return 'failed:'+type(error).__name__
def main():
 a=argparse.ArgumentParser();a.add_argument('--from',dest='start',default='2024-12-01');a.add_argument('--through',default='2025-08-31');a.add_argument('--port',default='');a.add_argument('--listing-only',action='store_true');a.add_argument('--probe-ports',action='store_true');a.add_argument('--workers',type=int,default=3);args=a.parse_args()
 for folder in ['listings','documents','pdf']:(OUT/folder).mkdir(parents=True,exist_ok=True)
 if args.probe_ports:
  op,raw,page,form=bootstrap();m=re.search(r'var url="([^"]+)";\$\(document\)',raw.decode('utf8'))
  data=read(html.unescape(m[1]),{'maritimeCode':'12'},op);(OUT/'ports12.json').write_bytes(data);print(data.decode('utf8').encode('ascii','backslashreplace').decode(),flush=True);return
 start=dt.date.fromisoformat(args.start);end=dt.date.fromisoformat(args.through);cursor=start;rows={};state={}
 while cursor<=end:
  nextmonth=(cursor.replace(day=28)+dt.timedelta(days=4)).replace(day=1);last=min(end,nextmonth-dt.timedelta(days=1));path=OUT/'listings'/f'{cursor}_{last}_{args.port or "all"}.json'
  if path.exists():listing=json.loads(path.read_text(encoding='utf8'))
  else:
   listing=collect_listing(cursor,last,args.port,state);path.write_text(json.dumps(listing,ensure_ascii=False,indent=2),encoding='utf8')
  if not listing['complete_listing'] or len(listing['rows'])!=listing['total']:raise ValueError('Incomplete cached listing')
  for row in listing['rows']:rows[row['key']]=row
  print(json.dumps({'from':str(cursor),'through':str(last),'listing_rows':listing['total'],'unique_documents_so_far':len(rows)}),flush=True);cursor=last+dt.timedelta(days=1)
 if args.listing_only:return
 counts={}
 with cf.ThreadPoolExecutor(max_workers=min(6,max(1,args.workers))) as pool:
  for n,result in enumerate(pool.map(fetch_document,rows.values()),1):
   counts[result]=counts.get(result,0)+1
   if n%25==0:print(json.dumps({'documents':n,'total':len(rows),'counts':counts}),flush=True)
 receipt={'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'from':str(start),'through':str(end),'documents':len(rows),'counts':counts,'complete_download':not any(k.startswith('failed') for k in counts)}
 (OUT/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt),flush=True)
 if not receipt['complete_download']:raise SystemExit(1)
if __name__=='__main__':main()
