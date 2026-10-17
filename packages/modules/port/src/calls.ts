import {decodeHTML} from 'entities';
export const CALL_SOURCE = 'https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2073&page=NEWS';
export const CALL_PARSER = 'quangtri-notices/1.0.1';
export const CALL_SOURCES = [
  {id:'quangtri-cua-viet',label:'Cửa Việt',url:CALL_SOURCE,kind:'reported' as const,marker:'KHU VỰC CỬA VIỆT'},
  {id:'quangtri-len-bang',label:'Lèn Bảng',url:'https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2076&page=NEWS',kind:'reported' as const,marker:'KHU VỰC LÈN BẢNG'},
  {id:'cantho-ct',label:'Cần Thơ',url:'https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=ct&page=vtttc',kind:'in_port' as const,marker:'VỊ TRÍ TÀU TẠI CẢNG'},
  {id:'cantho-hg',label:'Hậu Giang',url:'https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=hg&page=vtttc',kind:'in_port' as const,marker:'VỊ TRÍ TÀU TẠI CẢNG'},
  {id:'cantho-st',label:'Mỹ Thới',url:'https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=st&page=vtttc',kind:'in_port' as const,marker:'VỊ TRÍ TÀU TẠI CẢNG'},
] as const;
export function callSource(id:string){return CALL_SOURCES.find(s=>s.id===id);}
export function callSourceLabel(id:string){return callSource(id)?.label??id;}
export interface CallObservation {
  key: string; vessel_name: string; identity_key: string; identity_confidence: 'source_observation';
  direction: 'arrival'|'departure'; occurred_at: string|null; reported_day: string;
  dwt: number|null; raw_time: string; row_number: number; quarantine_reason: string|null;
}
const plain=(s:string)=>decodeHTML(s.replace(/<[^>]*>/g,' ')).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export async function sha256(s:string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
}
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
 if(source.kind==='reported')return parseCallNotices(html,sourceId);
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



