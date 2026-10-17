import {decodeHTML} from 'entities';
export const CALL_SOURCE = 'https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2073&page=NEWS';
export const CALL_PARSER = 'quangtri-notices/1.0.0';
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
export async function parseCallNotices(html:string) {
  if(!html.includes('KHU VỰC CỬA VIỆT'))throw new Error('Unexpected source area');
  const sections=html.split(/Thông báo tàu đến và rời cảng ngày\s*/i).slice(1);
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
      const key=await sha256(['quangtri-cua-viet',direction,cells[0],occurred??`${reportDay}|${rawTime}`].join('|'));
      rows.push({key,vessel_name:cells[0],identity_key:`observation:${key}`,identity_confidence:'source_observation',direction,occurred_at:occurred,reported_day:reportDay,dwt:dwt(cells[3]??''),raw_time:rawTime,row_number:rowNumber,quarantine_reason:reason});
    }
    if(direction)days.add(reportDay);
  }
  if(!days.size)throw new Error('No dated notice tables; source format changed');
  return {rows,reported_days:[...days].sort(),parser_version:CALL_PARSER};
}



