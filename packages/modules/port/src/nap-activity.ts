import {tanvuPlanSeries,validPlanDate,type TanVuPlanDay,type PlanDirection} from './tanvu-plans';
export const napScopes={nap:'Tổng quan NAP · Cửa Lò và Bến Thủy',nap_cua_lo:'Cửa Lò · Xí nghiệp xếp dỡ NAP',nap_ben_thuy:'Bến Thủy · Cảng Nghệ Tĩnh'} as const;
export type NapScope=keyof typeof napScopes;
export type NapAsset=Exclude<NapScope,'nap'>;
export const isNapScope=(s:string):s is NapScope=>Object.hasOwn(napScopes,s);
export interface NapDate {day:string;time:string|null;precision:'day'|'minute'}
export interface NapVisit {
 key:string;scope:NapAsset;vessel:string;dwt:number|null;gt:number|null;arrival:NapDate;departure:NapDate|null;
 source:{id:number;url:string;attachment_url:string;sha256:string;html_sha256:string;report_day:string;published_at:string;checked_at:string;parser_version:string;row:number;conflict_rows?:number[];dwt_conflict?:boolean;departure_conflict?:boolean};
 raw:Record<string,{value:string|number|null;format:string;type:string}>;departure_error:string|null;
 reported_departure?:NapDate|null;
 arrival_evidence?:NapEvidence;departure_evidence?:NapEvidence;
}
export interface NapEvidence {source:NapVisit['source'];raw:NapVisit['raw'];dwt:number|null;gt:number|null}
export interface NapDay {day:string;asset:NapAsset;arrival_rows:number|null;departure_rows:number|null;arrival_dwt:number|null;departure_dwt:number|null;arrival_missing:number;departure_missing:number}
export function napActivitySeries(input:NapDay[],direction:PlanDirection='departure',now=new Date(),asset:NapScope='nap'){
 const grouped=new Map<string,TanVuPlanDay>();
 const keys=new Set<string>();
 for(const row of input){
  if(!validPlanDate(row.day)||!['nap_cua_lo','nap_ben_thuy'].includes(row.asset))throw new Error('Invalid NAP daily scope/date');
  const key=row.day+'|'+row.asset;if(keys.has(key))throw new Error('Duplicate NAP daily subtotal');keys.add(key);
  for(const d of ['arrival','departure'] as const){
   const count=row[`${d}_rows`],weight=row[`${d}_dwt`],missing=row[`${d}_missing`];
   if((count!==null&&(!Number.isInteger(count)||count<1))||!Number.isInteger(missing)||missing<0||missing>(count??0)||(weight!==null&&(!Number.isFinite(weight)||weight<=0))||((weight===null)!==((count??0)===missing)))throw new Error('Invalid NAP daily subtotal');
  }
  if((asset!=='nap'&&row.asset!==asset)||row[`${direction}_rows`]===null)continue;
  const existing=grouped.get(row.day);
  const day=existing??{report_day:row.day,version_id:null,source_sha256:null,source_url:null,parser_version:'nap-authority-xlsx/1.0.0',last_success:null,last_attempt:row.day+'T00:00:00+07:00',source_error:null,arrival_rows:null,departure_rows:null,arrival_dwt:null,departure_dwt:null,arrival_dwt_missing:null,departure_dwt_missing:null,ambiguous_groups:null,source_empty_sections:[],observed_available:true};
  day[`${direction}_known_rows`]=(day[`${direction}_known_rows`]??0)+(row[`${direction}_rows`]??0);
  day[`${direction}_dwt_missing`]=(day[`${direction}_dwt_missing`]??0)+row[`${direction}_missing`];
  if(row[`${direction}_dwt`]!==null)day[`${direction}_known_dwt`]=(day[`${direction}_known_dwt`]??0)+row[`${direction}_dwt`]!;
  grouped.set(row.day,day);
 }
 const days=[...grouped.values()],base=tanvuPlanSeries(days,direction,now);
 const range=(r:typeof base.ytd.current)=>({...r,missing_dwt:days.filter(d=>d.report_day>=r.from&&d.report_day<=r.through).reduce((n,d)=>n+(d[`${direction}_dwt_missing`]??0),0)});
 const period=(p:typeof base.months[number])=>({...p,current:range(p.current),prior:range(p.prior)});
 return {...base,ticker:'NAP',asset,name:napScopes[asset],semantics:'authority_reported_terminal_activity',movement_scope:'terminal',actual_verified:false,history_complete:false,months:base.months.map(period),quarters:base.quarters.map(period),ytd:{...base.ytd,current:range(base.ytd.current),prior:range(base.ytd.prior)},days:days.map(d=>({day:d.report_day,rows:d[`${direction}_known_rows`]??null,dwt:d[`${direction}_known_dwt`]??null,missing_dwt:d[`${direction}_dwt_missing`]??0}))};
}
export function napVisitEvents(visits:NapVisit[],day:string,asset:NapScope='nap'){
 if(!validPlanDate(day))throw new Error('Invalid NAP detail day');
 return visits.filter(v=>asset==='nap'||v.scope===asset).flatMap(v=>(['arrival','departure'] as const).flatMap(direction=>{
  const date=v[direction],evidence=v[`${direction}_evidence`]??v;return date?.day===day?[{key:v.key+'|'+direction,kind:direction,day:date.day,time:date.time,precision:date.precision,scope:v.scope,vessel:v.vessel,dwt:evidence.dwt,gt:evidence.gt,source:evidence.source,raw:evidence.raw,arrival_day:v.arrival.day,departure_day:v.departure?.day??null}]:[];
 }));
}
