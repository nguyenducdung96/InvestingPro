"""Geometric extraction of official movement-plan PDFs (never GT or list dates)."""
import datetime as dt,re,unicodedata
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
VERSION='gemalink-national-plan/1.0.4'
def compact(text):
 value=unicodedata.normalize('NFD',text or '').upper().replace('Đ','D')
 return re.sub('[^A-Z0-9]','', ''.join(c for c in value if not unicodedata.combining(c)))
def is_gemalink(text):return 'CAIMEPGEMADEPTTERMINALLINK' in compact(text)
def source_number(text):
 value=re.sub(r'\s*(?:tấn|tons?|MT)\s*$','',(text or '').strip(),flags=re.I).strip()
 value=re.sub(r'\s+','',value)
 if not value:return None
 if not re.fullmatch(r'\d+(?:\.\d+)?',value):return None
 number=float(value)
 return number if 0<number<1_000_000 else None
def internal_location(text):
 value=compact(text)
 return bool(re.fullmatch(r'(?:A|B|G|K|VT|BP|P|NEO)\d+[A-Z0-9]*',value) or value in {'VUNGTAU','VUNGTAUTHIVAI','GOGIA','CMIT','TCIT','TCCT','TCTT','SSIT','SPPSA','SITV'} or any(t in value for t in ['KHUNEO','NEODAU','BENPHAO','GOGIA','CAIMEP','THIVAI','CANGDAUKHI']))
def signature_time(reader):
 values=[]
 for page in reader.pages:
  for ref in page.get('/Annots',[]):
   obj=ref.get_object();v=obj.get('/V')
   if v:
    m=str(v.get_object().get('/M',''))
    match=re.fullmatch(r"D:(\d{14})([+-])(\d{2})'?(\d{2})'?",m)
    if match:
     zone=dt.timezone(dt.timedelta(minutes=(int(match[3])*60+int(match[4]))*(1 if match[2]=='+' else -1)))
     values.append(dt.datetime.strptime(match[1],'%Y%m%d%H%M%S').replace(tzinfo=zone).isoformat())
 return max(values,key=dt.datetime.fromisoformat,default=None)
def repeated_continuation(text,events):
 stamps=re.findall(r'(\d{2}/\d{2}/\d{4})[\s-]+(\d{2}):?(\d{2})(?:\s*LT)?',text)
 if len(stamps)!=1:return False
 stamp=dt.datetime.strptime(stamps[0][0]+' '+stamps[0][1]+':'+stamps[0][2],'%d/%m/%Y %H:%M')
 whole=compact(text)
 return any(e['day']==str(stamp.date()) and e['time']==stamp.strftime('%H:%M') and compact(e['vessel']) in whole and compact(e['raw'][4]) in whole and is_gemalink(text) for e in events)
def parse_pdf(path):
 reader=PdfReader(path);signed=signature_time(reader);events=[];issues=[];matched_text=False
 with pdfplumber.open(path) as pdf:
  for page_no,page in enumerate(pdf.pages,1):
   text=page.extract_text() or ''
   if not text.strip():
    if not any([page.chars,page.images,page.lines,page.rects,page.curves]):continue
    issues.append({'page':page_no,'reason':'unreadable_pdf'});continue
   whole=compact(text);matched_text=matched_text or is_gemalink(text) or all(t in whole for t in ['GEMADEPT','TERMINAL','LINK'])
   if 'KEHOACHDIEUDONGTAUTHUYEN' not in whole:
    if page_no>1 and (repeated_continuation(reader.pages[page_no-1].extract_text() or '',events) or not any(x in whole for x in ['DWT','GEMADEPT','GEMALINK','NAMEOFSHIP'])):continue
    issues.append({'page':page_no,'reason':'wrong_document_kind'});continue
   if not any(a in whole for a in ['CANGVUHANGHAIVUNGTAU','CANGVUHANGHAITPHOCHIMINH','CANGVUHANGHAITHANHPHOHOCHIMINH']):issues.append({'page':page_no,'reason':'unreviewed_authority'});continue
   found=False
   for table in page.find_tables():
    header=table.extract()[0]
    marks=['TIME','NAMEOFSHIP','DRAFT','LOA','DWT','TUGBOAT','CHANNEL','FROM','TO','AGENT'];indices=[]
    for mark in marks:
     matches=[i for i,h in enumerate(header) if compact(h).endswith(mark)]
     if len(matches)!=1:break
     indices.append(matches[0])
    if len(indices)!=10 or len(set(indices))!=10 or any(c is None for c in table.rows[0].cells):continue
    found=True;columns=table.rows[0].cells
    for row_no,row in enumerate(table.rows[1:],1):
     cells=[c for c in row.cells if c]
     if not cells:continue
     top=min(c[1] for c in cells);bottom=max(c[3] for c in cells)
     # Some official PDFs omit a cell border and spill long terminal names.
     # Column geometry recovers its text without borrowing adjacent fields.
     original=[page.crop((c[0]+.2,top+.2,c[2]-.2,bottom-.2)).extract_text() or '' for c in columns]
     values=[original[i] for i in indices]
     before,after=values[7],values[8];frm,to=is_gemalink(before),is_gemalink(after)
     matched_text=matched_text or frm or to
     if not frm and not to and 'GEMADEPT' in compact(before+' '+after):
      matched_text=True;issues.append({'page':page_no,'row':row_no,'reason':'unresolved_gemadept_terminal','raw':values});continue
     if not frm and not to:continue
     if frm and to:issues.append({'page':page_no,'row':row_no,'reason':'internal_gemalink','raw':values});continue
     opposite=after if frm else before
     if not opposite.strip():issues.append({'page':page_no,'row':row_no,'reason':'missing_route','raw':values});continue
     if internal_location(opposite):issues.append({'page':page_no,'row':row_no,'reason':'internal_movement','raw':values});continue
     match=re.fullmatch(r'\s*(\d{2}/\d{2}/\d{4})[\s-]+(\d{2}):?(\d{2})(?:\s*LT)?\s*',values[0])
     if not match:issues.append({'page':page_no,'row':row_no,'reason':'invalid_plan_time','raw':values});continue
     timestamp=dt.datetime.strptime(match[1]+' '+match[2]+':'+match[3],'%d/%m/%Y %H:%M');vessel=' '.join(values[1].split())
     if not vessel:issues.append({'page':page_no,'row':row_no,'reason':'missing_vessel','raw':values});continue
     event={'day':timestamp.date().isoformat(),'time':timestamp.strftime('%H:%M'),'vessel':vessel,'direction':'departure' if frm else 'arrival','dwt':source_number(values[4]),'from':' '.join(before.split()),'to':' '.join(after.split()),'raw':values,'signed_at':signed,'page':page_no,'row':row_no}
     if len(original)!=10:event['source_columns']=original
     events.append(event)
   if not found:issues.append({'page':page_no,'reason':'unrecognized_table'})
 return {'parser_version':VERSION,'events':events,'issues':issues,'contains_gemalink':matched_text,'signed_at':signed}
