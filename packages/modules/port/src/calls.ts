import {decodeHTML} from 'entities';
import {sha256} from './call-hash.ts';
import {PUBLIC_ANCHORAGE_SOURCES,publicAnchorageData} from './public-anchorage.ts';
export {sha256} from './call-hash.ts';
export const CALL_SOURCE = 'https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2073&page=NEWS';
export const CALL_PARSER = 'quangtri-notices/1.0.1';
export const CALL_SOURCES = [
  {id:'danang-berth-reported',label:'Cảng Đà Nẵng · cập/rời cầu container',url:'https://danangport.com/tra-cuu-tau-container/',kind:'reported' as const,marker:'danang-berth-reports-v1'},
  {id:'nghean-reported',label:'Nghệ An · báo cáo hoạt động',url:'https://cangvuhanghainghean.gov.vn/index.aspx?cat=2017&page=news',kind:'reported' as const,marker:'nghean-reports-v1'},
  {id:'quangtri-hon-la',label:'Hòn La',url:'https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2074&page=news',kind:'reported' as const,marker:'KHU VỰC HÒN LA'},
  {id:'quangtri-cua-gianh',label:'Cửa Gianh',url:'https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2075&page=NEWS',kind:'reported' as const,marker:'KHU VỰC CỬA GIANH'},
  {id:'quangtri-con-co',label:'Cồn Cỏ',url:'https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2077&page=NEWS',kind:'reported' as const,marker:'KHU VỰC CỒN CỎ'},
  {id:'quangtri-my-thuy',label:'Mỹ Thủy',url:'https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2092&page=news',kind:'reported' as const,marker:'KHU VỰC MỸ THỦY'},
  {id:'quangtri-cua-viet',label:'Cửa Việt',url:CALL_SOURCE,kind:'reported' as const,marker:'KHU VỰC CỬA VIỆT'},
  {id:'quangtri-len-bang',label:'Lèn Bảng',url:'https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2076&page=NEWS',kind:'reported' as const,marker:'KHU VỰC LÈN BẢNG'},
  {id:'cantho-ct',label:'Cần Thơ',url:'https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=ct&page=vtttc',kind:'in_port' as const,marker:'VỊ TRÍ TÀU TẠI CẢNG'},
  {id:'cantho-hg',label:'Hậu Giang',url:'https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=hg&page=vtttc',kind:'in_port' as const,marker:'VỊ TRÍ TÀU TẠI CẢNG'},
  {id:'cantho-st',label:'Mỹ Thới',url:'https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=st&page=vtttc',kind:'in_port' as const,marker:'VỊ TRÍ TÀU TẠI CẢNG'},
  {id:'cantho-tv',label:'Trà Vinh',url:'https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=tv&page=vtttc',kind:'in_port' as const,marker:'VỊ TRÍ TÀU TẠI CẢNG'},
  {id:'hcm-in-port',label:'TP.HCM / Cái Mép–Thị Vải',url:'https://cangvuhanghaitphcm.gov.vn/index.aspx?page=shipinport&cat=3106',kind:'in_port' as const,marker:'Cảng vụ Hàng hải Thành phố Hồ Chí Minh'},
  {id:'quangninh-in-port',label:'Quảng Ninh',url:'https://kht1.cangvuhanghaiquangninh.gov.vn/vitritau.aspx',kind:'in_port' as const,marker:'CẢNG VỤ HÀNG HẢI QUẢNG NINH'},
  {id:'hue-chanmay-in-port',label:'Chân Mây',url:'https://cangvuhanghaithuathienhue.gov.vn/index.aspx?cat=3130&page=news',kind:'in_port' as const,marker:'Khu vực hàng hải Chân Mây ngày'},
  {id:'hue-thuanan-in-port',label:'Thuận An',url:'https://cangvuhanghaithuathienhue.gov.vn/index.aspx?page=news&cat=3131',kind:'in_port' as const,marker:'Vị trí tàu tại cảng ngày'},
  ...PUBLIC_ANCHORAGE_SOURCES.map(s=>({id:s.id,label:s.label,url:`${s.base}#/tra-cuu/ke_hoach/0/0/ViTriTauTaiCang`,kind:'in_port' as const,marker:'public-anchorage-api'})),
  {id:'haiphong-in-port',label:'Hải Phòng',url:'https://csdltau.cangvuhaiphong.gov.vn/pages/position.aspx',kind:'in_port' as const,marker:'VỊ TRÍ TÀU TẠI CẢNG'},
] as const;
export function callSource(id:string){return CALL_SOURCES.find(s=>s.id===id);}
export function callSourceLabel(id:string){return callSource(id)?.label??id;}
export interface CallObservation {
  key: string; vessel_name: string; identity_key: string; identity_confidence: 'source_observation';
  direction: 'arrival'|'departure'; occurred_at: string|null; reported_day: string;
  dwt: number|null; gt?:number|null; raw_time: string; row_number: number; quarantine_reason: string|null;
}
const plain=(s:string)=>decodeHTML(s.replace(/<[^>]*>/g,' ')).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
function day(d:string,m:string,y:string) {
  const s=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  return Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s?s:null;
}
export function noticeTime(raw:string,reportDay:string):string|null {
  const time=raw.match(/(?:^|\s)(\d{1,2}):(\d{2})(?:\s|[-,]|$)/);
  const date=raw.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if(date&&raw.slice((date.index??0)+date[0].length).match(/^[/\d]/))return null;
  if(!time||!date||Number(time[1])>23||Number(time[2])>59)return null;
  const resolved=day(date[1],date[2],date[3]??reportDay.slice(0,4));
  // The dated notice supplies the year, never the clock on the collecting machine.
  if(!resolved||resolved>reportDay||Date.parse(reportDay)-Date.parse(resolved)>31*86400000)return null;
  return `${resolved}T${time[1].padStart(2,'0')}:${time[2]}:00+07:00`;
}
function dwt(raw:string):number|null {
  const value=raw.replace(/\s/g,'');
  if(!/^[\d.,]+$/.test(value))return null;
  // Vietnamese thousands grouping is unambiguous only in groups of three.
  const normalized=/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(value)?value.replaceAll('.','').replace(',','.'):value.replace(',','.');
  const n=Number(normalized);return Number.isFinite(n)&&n>=0&&n<=600000?n:null;
}
export async function parseCallNotices(html:string,sourceId='quangtri-cua-viet') {
  const source=callSource(sourceId);
  if(!source||source.kind!=='reported'||!html.includes(source.marker))throw new Error('Unexpected source area');
  const sections=html.split(sourceId==='quangtri-cua-viet'?/Thông báo tàu đến và rời cảng ngày\s*/i:/Tàu đến và rời(?: cảng)?(?: ngày)?\s*/i).slice(1);
  const rows:CallObservation[]=[];const days=new Set<string>();
  for(const section of sections){
    const heading=section.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*<\/li>/i);
    if(!heading)continue;const reportDay=day(heading[1],heading[2],heading[3]);if(!reportDay)continue;
    const tables=[...section.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];if(!tables.length)continue;
    let direction:'arrival'|'departure'|null=null;let rowNumber=0;
    for(const tr of tables.map(t=>t[1]).join('').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
      const cells=[...tr[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>plain(m[1]));
      if(cells.join(' ').includes('THÔNG BÁO TÀU ĐẾN CẢNG')){direction='arrival';continue;}
      if(cells.join(' ').includes('THÔNG BÁO TÀU RỜI CẢNG')){direction='departure';continue;}
      if(!direction||!cells[0]||/Tên tàu/i.test(cells[0]))continue;
      rowNumber++;const rawTime=cells[direction==='arrival'?7:4]??'';
      const occurred=noticeTime(rawTime,reportDay);
      const reason=cells[0].includes('+')?'multiple_vessels':!occurred?'invalid_or_missing_time':cells.length!==(direction==='arrival'?11:8)?'unexpected_columns':null;
      // No IMO/registry identifier is provided: identity belongs to this observation only.
      const key=await sha256([sourceId,direction,cells[0],occurred??`${reportDay}|${rawTime}`].join('|'));
      rows.push({key,vessel_name:cells[0],identity_key:`observation:${key}`,identity_confidence:'source_observation',direction,occurred_at:occurred,reported_day:reportDay,dwt:dwt(cells[3]??''),raw_time:rawTime,row_number:rowNumber,quarantine_reason:reason});
    }
    if(direction)days.add(reportDay);
  }
  if(!days.size)throw new Error('No dated notice tables; source format changed');
  return {rows,reported_days:[...days].sort(),parser_version:sourceId==='quangtri-cua-viet'?CALL_PARSER:'lenbang-notices/1.0.0'};
}

// Snapshots retain the source arrival time; fetch time is only observation time.
// Neither disappearing rows nor a second berth-arrival column establish departure.
export async function parseCallSource(html:string,sourceId:string,fetchedAt:string){
 const source=callSource(sourceId);if(!source)throw new Error('Unknown source');
 if(sourceId==='nghean-reported')return (await import('./nghean-reports.ts')).parseNgheAnReports(html,fetchedAt);
 if(sourceId==='danang-berth-reported')return (await import('./danang-berth-reports.ts')).parseDaNangBerthReports(html,fetchedAt);
 if(['quangtri-hon-la','quangtri-cua-gianh','quangtri-con-co','quangtri-my-thuy'].includes(sourceId))return parseRegionalNotices(html,sourceId,fetchedAt);
 if(source.kind==='reported')return parseCallNotices(html,sourceId);
 if(PUBLIC_ANCHORAGE_SOURCES.some(s=>s.id===sourceId))return parsePublicAnchoragePositions(html,fetchedAt,sourceId);
 if(sourceId==='hcm-in-port'||sourceId==='quangninh-in-port'||sourceId==='haiphong-in-port'||sourceId.startsWith('hue-'))return parseRegionalSnapshot(html,sourceId,fetchedAt);
 if(!html.includes(source.marker)||!html.includes('CẢNG VỤ HÀNG HẢI CẦN THƠ'))throw new Error('Unexpected source area');
 const action=html.match(/<form\b[^>]*action="([^"]+)"/i)?.[1];
 if(!action||new URL(decodeHTML(action),source.url).searchParams.get('kv')!==new URL(source.url).searchParams.get('kv'))throw new Error('Unexpected source area');
 const table=html.match(/<table\b[^>]*id="ctl01_rgViTriTauTaiCang_ctl00"[^>]*>([\s\S]*?)<\/table>/i)?.[1];
 if(!table)throw new Error('Snapshot table missing');
 const header=[...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>plain(m[1]));
 if(header.length!==9||header[0]!=='Tên tàu'||header[3]!=='Trọng tải(DWT)'||header[6]!=='Ngày đến'||header[8]!=='Ngày đến Cầu/Phao/Neo')throw new Error('Snapshot columns changed');
 const reportDay=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(fetchedAt));
 const rows:(CallObservation&{berth:string|null})[]=[];let rowNumber=0;
 for(const tr of table.matchAll(/<tr\b[^>]*class="rg(?:Alt)?Row"[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>plain(m[1]));rowNumber++;
  const raw=cells[6]??'';const date=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2})$/);
  const resolved=date?day(date[1],date[2],date[3]):null;
  const occurred=resolved&&date&&+date[4]<24&&+date[5]<60?`${resolved}T${date[4].padStart(2,'0')}:${date[5]}:00+07:00`:null;
  const compound=/[+/]/.test(cells[0]??'');
  const reason=cells.length!==9?'unexpected_columns':!cells[0]?'missing_vessel':compound?'multiple_vessels':!occurred||Date.parse(occurred)>Date.parse(fetchedAt)?'invalid_or_missing_time':null;
  const key=await sha256([sourceId,'in_port',cells[0],occurred??raw].join('|'));
  rows.push({key,vessel_name:cells[0]||'(thiếu tên)',identity_key:`observation:${key}`,identity_confidence:'source_observation',direction:'arrival',occurred_at:occurred,reported_day:reportDay,dwt:dwt(cells[3]??''),raw_time:raw,row_number:rowNumber,quarantine_reason:reason,berth:cells[7]||null});
 }
 if(!rows.length&&!/rgNoRecords/.test(table))throw new Error('No rows or explicit empty snapshot');
 return {rows,reported_days:[reportDay],parser_version:'cantho-positions/1.0.0'};
}

async function parseRegionalNotices(html:string,sourceId:string,fetchedAt:string){
 const source=callSource(sourceId);
 if(!source||!plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]??'').includes(source.marker))throw new Error('Unexpected notice area');
 const headings=[...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].filter(m=>!/<table\b/i.test(m[1])&&plain(m[1]).length<200&&/\d{1,2}\/\d{1,2}\/\d{4}/.test(plain(m[1])));
 const rows:(CallObservation&{time_day:string|null;gt:number|null})[]=[];const days=new Set<string>();
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(fetchedAt));
 for(let i=0;i<headings.length;i++){
  const heading=plain(headings[i][1]);
  if(!/^(?:\d+\.\s*)?Thông báo tàu đến và (?:tàu )?rời(?: cảng)? ngày/i.test(heading))continue;
  const date=heading.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)!;const reportDay=day(date[1],date[2],date[3]);if(!reportDay)continue;
  const section=html.slice(headings[i].index!+headings[i][0].length,headings[i+1]?.index??html.length);
  const tables=[...section.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  let direction:'arrival'|'departure'|null=null,timeColumn=-1,columns=0,rowNumber=0;const directions=new Set<string>();
  for(const tr of tables.map(t=>t[1]).join('').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
   const cells=[...tr[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>plain(c[1]));
   if(cells.join(' ').includes('THÔNG BÁO TÀU ĐẾN CẢNG')){direction='arrival';directions.add(direction);timeColumn=-1;continue;}
   if(cells.join(' ').includes('THÔNG BÁO TÀU RỜI CẢNG')){direction='departure';directions.add(direction);timeColumn=-1;continue;}
   if(/Tên tàu/i.test(cells[0]??'')){
    timeColumn=cells.findIndex(c=>/(?:Ngày|Thời gian) (?:đến|rời)/i.test(c));columns=cells.length;
    if(cells[3]!=='DWT'||cells[2]!=='GT'||timeColumn<0||![8,11].includes(columns))throw new Error('Notice columns changed');continue;
   }
   if(!direction||timeColumn<0||!cells[0]||/^[/—-]+$/.test(cells[0]))continue;
   rowNumber++;const rawTime=cells[timeColumn]??'';const occurred=noticeTime(rawTime,reportDay);
   const dateOnly=rawTime.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
   const timeDay=dateOnly?day(dateOnly[1],dateOnly[2],dateOnly[3]):null;
   const reason=reportDay>today?'future_report':cells.length!==columns?'unexpected_columns':cells[0].includes('+')?'multiple_vessels':!occurred&&(!timeDay||timeDay>reportDay)?'invalid_or_missing_time':null;
   const key=await sha256([sourceId,direction,cells[0],occurred??timeDay??`${reportDay}|${rawTime}`].join('|'));
   rows.push({key,identity_key:`observation:${key}`,identity_confidence:'source_observation',vessel_name:cells[0],direction,occurred_at:occurred,time_day:timeDay,
    reported_day:reportDay,dwt:dwt(cells[3]??''),gt:dwt(cells[2]??''),raw_time:rawTime,row_number:rowNumber,quarantine_reason:reason});
  }
  if(directions.size===2&&reportDay<=today)days.add(reportDay);
 }
 // Future headings are retained only as quarantined rows; they do not certify historical coverage.
 const historicalRows=rows.filter(r=>days.has(r.reported_day));
 if(!days.size)throw new Error('No dated arrival/departure notices');
 return {rows:historicalRows,reported_days:[...days].sort(),parser_version:'quangtri-regional-notices/1.0.0'};
}

type SnapshotObservation=CallObservation&{berth:string|null;time_day:string|null;time_precision:'minute'|'day'|'unknown';time_basis?:'port_arrival'|'anchorage_start'};
async function snapshotRow(area:string,name:string,rawTime:string,berth:string,weight:string,reportedDay:string,rowNumber:number,fetchedAt:string):Promise<SnapshotObservation>{
 const date=rawTime.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
 const arrivalDay=date?day(date[1],date[2],date[3]):null;
 const occurred=arrivalDay&&date?.[4]&&+date[4]<24&&+date[5]<60?`${arrivalDay}T${date[4].padStart(2,'0')}:${date[5]}:00+07:00`:null;
 const precision=occurred?'minute':arrivalDay&&!date?.[4]?'day':'unknown';
 // Missing years remain unknown. No clock-derived year or midnight is invented.
 const malformed=!!date&&(!arrivalDay||!!date[4]&&!occurred);
 const future=arrivalDay&&(arrivalDay>reportedDay||!!occurred&&Date.parse(occurred)>Date.parse(fetchedAt));
 const reason=/[+/]/.test(name)?'multiple_vessels':malformed||future?'invalid_or_missing_time':null;
 const key=await sha256([area,'in_port',name,rawTime,berth].join('|'));
 return {key,vessel_name:name,identity_key:`observation:${key}`,identity_confidence:'source_observation',direction:'arrival',occurred_at:occurred,time_day:arrivalDay,time_precision:precision,reported_day:reportedDay,raw_time:rawTime,dwt:dwt(weight),row_number:rowNumber,quarantine_reason:reason,berth:berth||null};
}
async function parseRegionalSnapshot(html:string,sourceId:string,fetchedAt:string){
 const source=callSource(sourceId)!;
 if(!html.includes(source.marker))throw new Error('Unexpected source area');
 let reportedDay=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(fetchedAt));
 const rows:SnapshotObservation[]=[];
 const cells=(tr:string)=>[...tr.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>plain(m[1]));
 let version='';
 if(sourceId==='haiphong-in-port'){
  if(!html.includes('DataList_VTTauTaiCang'))throw new Error('Snapshot layout changed');
  const sections=html.split('class="cssSpanCaption">').slice(1);
  for(const section of sections){
   const berth=plain(section.slice(0,section.indexOf('</span>')));
   for(const ship of section.matchAll(/<td onmouseover="fixedtooltip\('([\s\S]*?)', this, event, '220px'\)"[^>]*>([\s\S]*?)<\/td>/gi)){
    const name=plain(ship[1].match(/<b>([\s\S]*?)<\/b>/i)?.[1]??'');
    const weight=plain(ship[1].match(/DWT:&nbsp;<b>([\s\S]*?)<\/b>/i)?.[1]??'');
    if(!name||plain(ship[2]).replace(/^:\s*/,'')!==name)throw new Error('Snapshot vessel label changed');
    rows.push(await snapshotRow(sourceId,name,'',berth,weight,reportedDay,rows.length+1,fetchedAt));
   }
  }version='haiphong-positions/1.0.0';
 }else if(sourceId==='hcm-in-port'){
  const table=html.match(/<table\b[^>]*id="ctl22_rgViTriTauTaiCang_ctl00"[^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if(!table||!plain(table).includes('Ngày/Giờ vào cầu'))throw new Error('Snapshot columns changed');
  const header=cells(table.match(/<thead>([\s\S]*?)<\/thead>/i)?.[1]??'');
  if(header.length!==7||header[1]!=='Tên tàu'||header[5]!=='Ngày đến')throw new Error('Snapshot columns changed');
  for(const tr of table.matchAll(/<tr\b[^>]*class="rg(?:Alt)?Row"[^>]*>([\s\S]*?)<\/tr>/gi)){
   const c=cells(tr[1]);if(c.length!==7||!c[1])throw new Error('Snapshot row columns changed');
   rows.push(await snapshotRow(sourceId,c[1],c[5],[c[3],c[4]].filter(Boolean).join(' · '),'',reportedDay,rows.length+1,fetchedAt));
  }
  version='hcm-positions/1.0.0';
 }else if(sourceId==='quangninh-in-port'){
  const tables=[...html.matchAll(/<table\b[^>]*id="GridView_(CamPha|HonGai|QuangYen|VanGia)"[^>]*>([\s\S]*?)<\/table>/gi)];
  if(tables.length!==4)throw new Error('Snapshot tables changed');
  for(const table of tables){let berth='';const content=table[2];
   if(!plain(content).includes('Thời gian neo'))throw new Error('Snapshot columns changed');
   for(const tr of content.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const c=cells(tr[1]);if(c.length===1){berth=c[0];continue;}if(!tr[1].includes('class="item-gridview"'))continue;
    if(c.length!==8||!c[0])throw new Error('Snapshot row columns changed');
    rows.push(await snapshotRow(sourceId,c[0],c[6],[berth,c[5]].filter(Boolean).join(' · '),c[2],reportedDay,rows.length+1,fetchedAt));
   }
  }version='quangninh-positions/1.0.0';
 }else{
  const heading=sourceId==='hue-chanmay-in-port'?/Khu vực hàng hải Chân Mây ngày\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*<\/li>/gi:/Vị trí tàu tại cảng ngày\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*<\/li>/gi;
  const sections=[...html.matchAll(heading)].map(m=>({index:m.index!+m[0].length,day:day(m[1],m[2],m[3])})).filter(m=>m.day&&m.day<=reportedDay).sort((a,b)=>b.day!.localeCompare(a.day!));
  if(!sections.length)throw new Error('No dated snapshot');
  const newest=sections[0];reportedDay=newest.day!;
  const end=Math.min(html.length,...sections.filter(s=>s.index>newest.index).map(s=>s.index));
  const table=[...html.slice(newest.index,end).matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[1]).join('');
  if(!table||!plain(table).includes('Name of Ship')||!plain(table).includes('Date of Arival'))throw new Error('Snapshot columns changed');
  let berth='';
  for(const tr of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
   const c=cells(tr[1]);if(c.length===1){berth=c[0];continue;}if(!/^\d+$/.test(c[0]??''))continue;
   if(c.length!==10||!c[1])throw new Error('Snapshot row columns changed');
   rows.push(await snapshotRow(sourceId,c[1],c[6],berth,c[4],reportedDay,rows.length+1,fetchedAt));
  }version='hue-positions/1.0.0';
 }
 if(!rows.length)throw new Error('No snapshot rows; review source before accepting empty state');
 return {rows,reported_days:[reportedDay],parser_version:version};
}
function parsePublicAnchoragePositions(raw:string,fetchedAt:string,sourceId:string){
 return (async()=>{
  const config=PUBLIC_ANCHORAGE_SOURCES.find(s=>s.id===sourceId);if(!config)throw new Error('Unknown public source');
  const value=publicAnchorageData(raw);
  if(!Array.isArray(value.data)||!Number.isInteger(value.total)||value.total!==value.data.length||value.total>5000)throw new Error('Incomplete public API page');
  const reportedDay=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(fetchedAt));
  const rows:SnapshotObservation[]=[];
  for(let i=0;i<value.data.length;i++){
   const r=value.data[i];
   const unknownRegion=('allowUnknownRegion'in config&&config.allowUnknownRegion)&&(!r.portRegionName||r.portRegionName==='null');
   if(typeof r.nameOfShip!=='string'||(!unknownRegion&&(typeof r.portRegionName!=='string'||!config.region.test(r.portRegionName)))||!('anchoringDateFrom'in r)||!('anchoringDateTo'in r))throw new Error('Public API schema or area changed');
   // Ended/dated anchorage stays are not current open positions or port departures.
   if(r.anchoringDateTo)continue;
   const row=await snapshotRow(sourceId,r.nameOfShip,String(r.anchoringDateFrom??''),[r.portHarbourName,r.portWharfName].filter(Boolean).join(' · '),r.dwt==null?'':String(r.dwt),reportedDay,i+1,fetchedAt);
   const gt=typeof r.gt==='number'&&Number.isFinite(r.gt)&&r.gt>=0&&r.gt<=600000?r.gt:null;
   rows.push({...row,gt,time_basis:'anchorage_start',quarantine_reason:row.quarantine_reason??(unknownRegion?'unresolved_source_area':null)});
  }
  if(!rows.length&&value.total!==0)throw new Error('No open anchorage records; review before accepting empty snapshot');
  const version=['binhthuan-open-anchorage','thaibinh-open-anchorage','kiengiang-open-anchorage'].includes(sourceId)?'1.1.0':'1.0.0';
  return {rows,reported_days:[reportedDay],parser_version:`${sourceId}/${version}`};
 })();
}



