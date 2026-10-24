import {tanvuPlanSeries,validPlanDate,type TanVuPlanDay,type PlanDirection} from './tanvu-plans';

export interface QnpPlanRow {time:string;vessel:string;dwt:number|null;from:string;to:string}
export interface QnpBulletin {
 id:number;url:string;image:string;sha256:string;issued_on:string;published_at:string;
 from:string;through:string;reviewed_on:string;rows:QnpPlanRow[];
}
// Only numbered operator berths are mapped. TCQN, roadsteads and unverified TC labels stay separate.
export const isQnpBerth=(label:string)=>/^(?:C[1-6][TN]?|1[ABC])(?: (?:TL|HL))?$/.test(label);
export function qnpKind(row:QnpPlanRow){
 if(row.from==='P0'&&isQnpBerth(row.to))return 'arrival';
 if(isQnpBerth(row.from)&&row.to==='P0')return 'departure';
 if(isQnpBerth(row.from)&&isQnpBerth(row.to))return 'internal';
 return 'unmapped';
}
export function qnpReviewedEvents(bulletins:QnpBulletin[]){
 const sorted=[...bulletins].sort((a,b)=>a.issued_on.localeCompare(b.issued_on)||a.published_at.localeCompare(b.published_at)||a.id-b.id);
 const events: (QnpPlanRow&{source:Omit<QnpBulletin,'rows'>;kind:ReturnType<typeof qnpKind>})[]=[];
 for(const source of sorted){
  if(!validPlanDate(source.issued_on)||!validPlanDate(source.reviewed_on)||!/^https:\/\/quynhonport\.vn\/[a-z0-9-]+\/$/.test(source.url)||!/^https:\/\/quynhonport\.vn\/wp-content\/uploads\/\d{4}\/\d{2}\/[a-zA-Z0-9._-]+\.png$/.test(source.image)||!/^[a-f0-9]{64}$/.test(source.sha256)||source.from>=source.through)throw new Error('Invalid QNP evidence');
  // Reviewed multi-day editions replace the entire overlapping scheduled window, including deletions.
  for(let i=events.length-1;i>=0;i--)if(events[i].time>=source.from&&events[i].time<source.through)events.splice(i,1);
  const keys=new Set<string>();
  const {rows:sourceRows,...evidence}=source;
  for(const row of sourceRows){
   if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+07:00$/.test(row.time)||!Number.isFinite(Date.parse(row.time))||!validPlanDate(row.time.slice(0,10))||row.time<source.from||row.time>=source.through||!row.vessel.trim()||!row.from||!row.to||(row.dwt!==null&&(!Number.isFinite(row.dwt)||row.dwt<=0||row.dwt>1_000_000)))throw new Error('Invalid QNP reviewed row');
   const key=JSON.stringify([row.time,row.vessel,row.from,row.to]);if(keys.has(key))throw new Error('Duplicate QNP reviewed row');keys.add(key);
   events.push({...row,source:evidence,kind:qnpKind(row)});
  }
 }
 return events.sort((a,b)=>a.time.localeCompare(b.time));
}
export function qnpPlanDays(bulletins:QnpBulletin[]):TanVuPlanDay[]{
 const events=qnpReviewedEvents(bulletins),dates=[...new Set(events.filter(e=>e.kind==='arrival'||e.kind==='departure').map(e=>e.time.slice(0,10)))];
 return dates.map(report_day=>{
  const rows=events.filter(e=>e.time.startsWith(report_day)),source=rows.at(-1)!.source;
  const metric=(direction:PlanDirection)=>{const items=rows.filter(e=>e.kind===direction);return {count:items.length,missing:items.filter(e=>e.dwt===null).length,weight:items.some(e=>e.dwt!==null)?items.reduce((n,e)=>n+(e.dwt??0),0):null};};
  const a=metric('arrival'),d=metric('departure');
  return {report_day,version_id:null,source_sha256:source.sha256,source_url:source.url,parser_version:'qnp-reviewed-bulletin/1',last_success:null,last_attempt:source.reviewed_on+'T00:00:00+07:00',source_error:null,
   observed_available:true,arrival_rows:null,departure_rows:null,arrival_dwt:null,departure_dwt:null,arrival_dwt_missing:a.missing,departure_dwt_missing:d.missing,ambiguous_groups:0,source_empty_sections:[],
   arrival_known_rows:a.count||null,departure_known_rows:d.count||null,arrival_known_dwt:a.weight,departure_known_dwt:d.weight};
 });
}
export function qnpPlanSeries(bulletins:QnpBulletin[],direction:PlanDirection='departure',now=new Date()){
 const base=tanvuPlanSeries(qnpPlanDays(bulletins),direction,now);
 // A source day with only the other direction cannot certify an observed zero.
 const events=qnpReviewedEvents(bulletins);
 const fix=(range:typeof base.ytd.current)=>{const items=events.filter(e=>e.kind===direction&&e.time.slice(0,10)>=range.from&&e.time.slice(0,10)<=range.through);return {...range,known_rows:items.length,missing_dwt:items.filter(e=>e.dwt===null).length,observed_days:new Set(items.map(e=>e.time.slice(0,10))).size,observed_dwt:items.some(e=>e.dwt!==null)?items.reduce((s,e)=>s+(e.dwt??0),0):null};};
 const period=(p:typeof base.months[number])=>({...p,current:fix(p.current),prior:fix(p.prior)});
 return {...base,asset:'quy_nhon',ticker:'QNP',semantics:'operator_published_berth_plan',movement_scope:'berth',actual_verified:false,months:base.months.map(period),quarters:base.quarters.map(period),ytd:{...base.ytd,current:fix(base.ytd.current),prior:fix(base.ytd.prior)},reviewed_bulletins:bulletins.length,history_complete:false};
}
