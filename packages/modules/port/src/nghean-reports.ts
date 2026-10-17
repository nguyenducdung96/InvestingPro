import {unzipSync,strFromU8} from 'fflate';
import {XMLParser} from 'fast-xml-parser';
import {decodeHTML} from 'entities';
import type {CallObservation} from './calls.ts';
import {sha256} from './call-hash.ts';

export const NGHEAN_REPORT_URL='https://cangvuhanghainghean.gov.vn/index.aspx?cat=2017&page=news';
const origin=new URL(NGHEAN_REPORT_URL).origin;
const list=<T>(value:T|T[]|undefined):T[]=>value===undefined?[]:Array.isArray(value)?value:[value];
type Rich={t?:string|Rich,r?:Rich|Rich[],'#text'?:string};
type Cell={'@_r':string;'@_t'?:string;'@_s'?:string;v?:string;is?:Rich;f?:unknown};
type Sheet={worksheet:{sheetData?:{row?:{'@_r':string;c?:Cell|Cell[]}[]};}};
function rich(value:Rich|string|undefined):string{
 if(typeof value==='string')return value;
 return value?.t!==undefined?rich(value.t):value?.r?list(value.r).map(rich).join(''):value?.['#text']??'';
}
function xml(bytes:Uint8Array|undefined){
 if(!bytes)throw new Error('Workbook part missing');
 const text=strFromU8(bytes);if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('Workbook entities unsupported');
 return new XMLParser({ignoreAttributes:false,parseTagValue:false,trimValues:false,processEntities:true}).parse(text);
}
function validDay(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
function cellDate(value:string,format:string,numeric:boolean){
 let day:string|null=null,time:string|null=null;
 if(numeric){
  const serial=Number(value);if(!Number.isFinite(serial)||serial<61||serial>100000||!/[dy]/i.test(format))return null;
  const date=new Date(Date.UTC(1899,11,30)+Math.round(serial*86400000));
  day=date.toISOString().slice(0,10);
  if(/[hs]/i.test(format.replace(/"[^"]*"|\\./g,'')))time=date.toISOString().slice(11,16);
 }else{
  const iso=value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):00(?:\.000)?$/);
  if(iso){
   if(!validDay(iso[1])||+iso[2]>23||+iso[3]>59)return null;
   const hasTime=/[hs]/i.test(format.replace(/"[^"]*"|\\./g,''))||iso[2]!=='00'||iso[3]!=='00';
   return {day:iso[1],occurred_at:hasTime?`${iso[1]}T${iso[2]}:${iso[3]}:00+07:00`:null};
  }
  const m=value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if(!m)return null;day=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  if(m[4]!==undefined){if(+m[4]>23||+m[5]>59)return null;time=`${m[4].padStart(2,'0')}:${m[5]}`;}
 }
 if(!validDay(day))return null;
 return {day,occurred_at:time?`${day}T${time}:00+07:00`:null};
}
function weight(value:string,numeric:boolean){
 const raw=value.trim();if(!raw)return null;
 const normalized=numeric?raw:/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)?raw.replaceAll('.','').replace(',','.'):raw.replace(',','.');
 const n=Number(normalized);return Number.isFinite(n)&&n>=0&&n<=600000?n:null;
}
export function readNgheAnWorkbook(bytes:Uint8Array){
 if(bytes.length>500000)throw new Error('Workbook exceeds size limit');
 let expanded=0;
 const zip=unzipSync(bytes,{filter(file){
  if(!/^xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|styles\.xml|sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/.test(file.name))return false;
  expanded+=file.originalSize;if(expanded>10000000)throw new Error('Workbook expanded size limit');return true;
 }});
 const workbook=xml(zip['xl/workbook.xml']).workbook;
 if(String(workbook.workbookPr?.['@_date1904'])==='1'||String(workbook.workbookPr?.['@_date1904'])==='true')throw new Error('Unsupported workbook date system');
 const sheet=list<{ '@_name':string;'@_r:id':string }>(workbook.sheets?.sheet).find(s=>s['@_name']==='Daily Report');
 if(!sheet)throw new Error('Daily report sheet missing');
 const rels=list<{ '@_Id':string;'@_Target':string;'@_TargetMode'?:string }>(xml(zip['xl/_rels/workbook.xml.rels']).Relationships.Relationship);
 const rel=rels.find(r=>r['@_Id']===sheet['@_r:id']);
 const target=rel?.['@_Target']?.replace(/^\/xl\//,'').replace(/^\.\//,'');
 if(!target||!/^worksheets\/sheet\d+\.xml$/.test(target)||rel?.['@_TargetMode']==='External')throw new Error('Unexpected workbook sheet target');
 const strings=zip['xl/sharedStrings.xml']?list<Rich>(xml(zip['xl/sharedStrings.xml']).sst.si).map(rich):[];
 const styles=xml(zip['xl/styles.xml']).styleSheet;
 const builtins:Record<string,string>={'14':'mm-dd-yy','15':'d-mmm-yy','16':'d-mmm','17':'mmm-yy','22':'m/d/yy h:mm'};
 for(const f of list<{ '@_numFmtId':string;'@_formatCode':string }>(styles.numFmts?.numFmt))builtins[f['@_numFmtId']]=f['@_formatCode'];
 const formats=list<{ '@_numFmtId':string }>(styles.cellXfs?.xf).map(s=>builtins[s['@_numFmtId']]??'');
 const grid=new Map<number,Map<string,{value:string;format:string;numeric:boolean}>>();
 for(const row of list((xml(zip[`xl/${target}`]) as Sheet).worksheet.sheetData?.row)){
  const cells=new Map<string,{value:string;format:string;numeric:boolean}>();
  for(const c of list(row.c)){
   // A2 is a source-saved report-date cache, corroborated with the article date below.
   // Never evaluate TODAY() or accept cached formulas in vessel data.
   if(c.f!==undefined&&!(c['@_r']==='A2'&&rich(c.f as Rich|string)==='TODAY()'))continue;
   const column=c['@_r'].replace(/\d/g,'');
   const value=c['@_t']==='s'?strings[Number(c.v)]??'':c['@_t']==='inlineStr'?rich(c.is):String(c.v??'');
   cells.set(column,{value:value.trim(),format:formats[Number(c['@_s']??0)]??'',numeric:!c['@_t']||c['@_t']==='n'});
  }
  grid.set(Number(row['@_r']),cells);
 }
 if(!grid.get(1)?.get('A')?.value.includes('BÁO CÁO HOẠT ĐỘNG TÀU THUYỀN'))throw new Error('Unexpected workbook title');
 const dateCell=grid.get(2)?.get('A');const report=dateCell&&cellDate(dateCell.value,dateCell.format,dateCell.numeric);
 if(!report)throw new Error('Report date missing inside workbook');
 return {grid,reportDay:report.day};
}

function trustedUrl(raw:string,base=NGHEAN_REPORT_URL){
 const u=new URL(decodeHTML(raw),base);
 if(u.origin!==origin||u.username||u.password||u.port)throw new Error('Unexpected report destination');
 return u;
}
function links(html:string){return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);}
function reportLinks(html:string){return [...new Set(links(html).filter(l=>/index\.aspx\?/i.test(l)).map(l=>new URL(decodeHTML(l),NGHEAN_REPORT_URL)).filter(u=>u.origin===origin&&u.searchParams.get('page')==='detail'&&/^\d+$/.test(u.searchParams.get('id')??'')).map(u=>u.href))];}
export async function fetchNgheAnReports(fetcher:typeof fetch=fetch,maxReports=15){
 if(!Number.isInteger(maxReports)||maxReports<1||maxReports>15)throw new Error('Report limit must be 1–15');
 const signal=AbortSignal.timeout(55000);
 async function read(url:string,limit:number){
  const response=await fetcher(trustedUrl(url).href,{signal,redirect:'error',cache:'no-store'});
  if(!response.ok||!response.body)throw new Error('Nghe An report unavailable');
  const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('Report exceeds size limit');}parts.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
 }
 const index_html=strFromU8(await read(NGHEAN_REPORT_URL,500000));
 const details=reportLinks(index_html).slice(0,maxReports);
 if(!details.length)throw new Error('No dated report links');
 const reports=[];
 for(const detail_url of details){
  const detail_html=strFromU8(await read(detail_url,500000));
  const attachments=links(detail_html).filter(l=>/\.xlsx(?:$|\?)/i.test(l));
  if(attachments.length!==1)throw new Error('Expected one XLSX report attachment');
  const attachment_url=trustedUrl(attachments[0],detail_url).href;
  const bytes=await read(attachment_url,500000);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  reports.push({detail_url,detail_html,attachment_url,base64:btoa(binary)});
 }
 return JSON.stringify({format:'nghean-reports-v1',index_html,reports});
}

export async function parseNgheAnReports(raw:string,fetchedAt:string){
 const envelope=JSON.parse(raw) as {format:string;index_html:string;reports:{detail_url:string;detail_html:string;attachment_url:string;base64:string}[]};
 if(envelope.format!=='nghean-reports-v1'||!Array.isArray(envelope.reports)||envelope.reports.length<1||envelope.reports.length>15)throw new Error('Invalid Nghe An report archive');
 const indexLinks=new Set(reportLinks(envelope.index_html));
 const rows:(CallObservation&{time_day:string|null;berth:string;gt:number|null})[]=[];const days=new Set<string>();
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(fetchedAt));
 for(const archive of envelope.reports){
  if(!indexLinks.has(trustedUrl(archive.detail_url).href))throw new Error('Report not linked by index');
  if(!links(archive.detail_html).filter(l=>/\.xlsx(?:$|\?)/i.test(l)).some(l=>trustedUrl(l,archive.detail_url).href===archive.attachment_url))throw new Error('Attachment not linked by report');
  trustedUrl(archive.attachment_url);if(archive.base64.length>700000)throw new Error('Workbook archive too large');
  const bytes=Uint8Array.from(atob(archive.base64),c=>c.charCodeAt(0));
  const {grid,reportDay}=readNgheAnWorkbook(bytes);
  const published=archive.detail_html.match(/class=["']dateNews["'][^>]*>[\s\S]*?(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if(!published||reportDay!==`${published[3]}-${published[2].padStart(2,'0')}-${published[1].padStart(2,'0')}`)throw new Error('Workbook report date differs from article date');
  if(reportDay>today)throw new Error('Future report');
  if(days.has(reportDay))throw new Error('Duplicate report day');days.add(reportDay);
  let berth='',header=false;
  for(const [rowNumber,cells] of grid){
   const value=(key:string)=>cells.get(key)?.value??'';
   if(/^(?:BẾN |CẢNG |KHU NEO|THI CÔNG)/.test(value('B'))){berth=value('B');header=false;continue;}
   if(/Tên tàu/.test(value('B'))){
    header=/D\.?W\.?T/.test(value('G'))&&/đến/i.test(value('H'))&&/đi/i.test(value('I'));
    if(!header)throw new Error('Report columns changed');continue;
   }
   if(!berth||!header||!/^\d+$/.test(value('A'))||!value('B'))continue;
   for(const [column,direction] of [['H','arrival'],['I','departure']] as const){
    const cell=cells.get(column);if(!cell?.value)continue;
    const time=cellDate(cell.value,cell.format,cell.numeric);
    // A daily activity report states dates, not a forecast; future cells remain quarantined.
    const reason=/[+]/.test(value('B'))?'multiple_vessels':!time?'invalid_or_missing_time':time.day>reportDay?'future_event_in_report':null;
    const key=await sha256(['nghean-reported',berth,direction,value('B'),time?.occurred_at??time?.day??`${reportDay}|${cell.value}`].join('|'));
    rows.push({key,identity_key:`observation:${key}`,identity_confidence:'source_observation',vessel_name:value('B'),direction,
     occurred_at:time?.occurred_at??null,time_day:time?.day??null,reported_day:reportDay,raw_time:cell.value,
     dwt:weight(value('G'),cells.get('G')?.numeric??false),gt:weight(value('F'),cells.get('F')?.numeric??false),
     berth,row_number:rowNumber,quarantine_reason:reason});
   }
  }
 }
 if(!rows.length)throw new Error('No vessel event rows in reports');
 return {rows,reported_days:[...days].sort(),parser_version:'nghean-reports/1.0.0'};
}
