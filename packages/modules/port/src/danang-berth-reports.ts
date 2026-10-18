import {decodeHTML} from 'entities';
import {sha256} from './call-hash.ts';
import type {CallObservation} from './calls.ts';

export const DANANG_BERTH_URL='https://danangport.com/tra-cuu-tau-container/';
const plain=(s:string)=>decodeHTML(s.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
function timestamp(s:string){
 const m=s.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})$/);
 if(!m||+m[2]>23||+m[3]>59||!Number.isFinite(Date.parse(m[1]))||new Date(m[1]).toISOString().slice(0,10)!==m[1])return null;
 return `${m[1]}T${m[2]}:${m[3]}:00+07:00`;
}
export async function fetchDaNangBerthReports(fetcher:typeof fetch=fetch,months=1,now=new Date()){
 if(!Number.isInteger(months)||months<1||months>3)throw new Error('Collect at most three berth report months');
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(now);
 const reports=[];
 for(let offset=0;offset<months;offset++){
  const month=new Date(Date.UTC(+today.slice(0,4),+today.slice(5,7)-1-offset,1)).toISOString().slice(0,7);
  const response=await fetcher(DANANG_BERTH_URL,{method:'POST',body:new URLSearchParams({thang:month.slice(5),nam:month.slice(0,4)}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(25000)});
  if(!response.ok||!response.body)throw new Error('Da Nang berth report unavailable');
  const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1000000){await reader.cancel();throw new Error('Berth report exceeds size limit');}parts.push(value);}
  const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}
  reports.push({month,html:new TextDecoder('utf-8',{fatal:true}).decode(bytes)});
 }
 return JSON.stringify({format:'danang-berth-reports-v1',reports});
}
export async function parseDaNangBerthReports(raw:string,fetchedAt:string){
 const value=JSON.parse(raw) as {format:string;reports:{month:string;html:string}[]};
 if(value.format!=='danang-berth-reports-v1'||!Array.isArray(value.reports)||value.reports.length<1||value.reports.length>3)throw new Error('Invalid berth report archive');
 const rows:(CallObservation&{berth:null;time_basis:'berth_movement'})[]=[];const days=new Set<string>(),months=new Set<string>();
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(fetchedAt));
 for(const report of value.reports){
  if(!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(report.month)||months.has(report.month)||report.html.length>1000000)throw new Error('Invalid report month');months.add(report.month);
  const heading=new RegExp(`Danh sách tàu đã rời bến tháng ${report.month.slice(5)} năm ${report.month.slice(0,4)}`);
  if(!heading.test(plain(report.html)))throw new Error('Berth report month differs from request');
  // A full monthly result supersedes the previous result even on a day whose
  // last row was removed or corrected. It is not a claim of daily port reports.
  for(let day=1;day<=31;day++){
   const date=`${report.month}-${String(day).padStart(2,'0')}`;
   if(Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date&&date<=today)days.add(date);
  }
  const tables=[...report.html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  const completed=tables.filter(t=>[...t[1].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].some(m=>plain(m[1])==='ATD'));
  if(completed.length!==1)throw new Error('Completed berth table missing or ambiguous');
  const table=completed[0][1],headers=[...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>plain(m[1]));
  if(headers.join('|')!=='Stt|Tên tàu|ATB|ATD|Container|TEU|Năng suất|')throw new Error('Berth columns changed');
  let ordinal=0;
  for(const match of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
   const cells=[...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];if(!cells.length)continue;
   ordinal++;if(cells.length!==8||plain(cells[0][1])!==String(ordinal))throw new Error('Berth report rows incomplete');
   const vessel=plain(cells[1][1]),atb=plain(cells[2][1]),atd=plain(cells[3][1]);
   const href=cells[7][1].match(/href=["']([^"']+)["']/i)?.[1];
   if(!href||!vessel)throw new Error('Berth observation identity missing');
   const detail=new URL(decodeHTML(href),DANANG_BERTH_URL);
   if(detail.origin!==new URL(DANANG_BERTH_URL).origin||!/^\/tra-cuu-tau-container\/chi-tiet\/?$/.test(detail.pathname)||detail.username||detail.password||detail.port||!/^\d{4}$/.test(detail.searchParams.get('nam')??'')||!/^\d+$/.test(detail.searchParams.get('seq')??'')||!/^[-A-Z0-9]+$/i.test(detail.searchParams.get('vsl')??''))throw new Error('Unexpected berth detail identity');
   const departure=timestamp(atd),arrival=timestamp(atb);
   // The form selects the month of actual departure, not publication or fetch time.
   if(!departure||!atd.startsWith(report.month))throw new Error('Departure outside report month');
   if(arrival&&Date.parse(arrival)>Date.parse(departure))throw new Error('Berth departure precedes arrival');
   for(const [direction,text,time] of [['arrival',atb,arrival],['departure',atd,departure]] as const){
    const reportDay=atd.slice(0,10);days.add(reportDay);
    const key=await sha256(['danang-berth-reported',detail.searchParams.get('nam'),detail.searchParams.get('seq'),detail.searchParams.get('vsl'),direction,time??text].join('|'));
    rows.push({key,identity_key:`observation:${key}`,identity_confidence:'source_observation',vessel_name:vessel,direction,occurred_at:time,reported_day:reportDay,raw_time:text,dwt:null,gt:null,berth:null,time_basis:'berth_movement',row_number:ordinal,
     quarantine_reason:/[+]/.test(vessel)?'multiple_vessels':!time?'invalid_or_missing_time':Date.parse(time)>Date.parse(fetchedAt)?'future_event_in_report':null});
   }
  }
 }
 if(!rows.length||rows.length>2000)throw new Error('No completed berth events or report exceeds limit');
 return {rows,reported_days:[...days].sort(),parser_version:'danang-berth-reports/1.0.0'};
}
