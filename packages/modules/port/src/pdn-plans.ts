import {tanvuPlanSeries,type TanVuPlanDay,type PlanDirection} from './tanvu-plans';
export const pdnSource='http://123.25.204.166/web/guest/public-kh#/tra-cuu/ke_hoach/0/0/KeHoachDieuDongTau2';
export const pdnCoverageNotes=[{asset:'pdn_long_binh_tan',from:'2026-07-01',reviewed_through:'2026-10-24',cause_verified:false,note:'Nguồn công bố ghi nhận ít dòng Long Bình Tân hơn từ tháng 7/2026. Chưa xác định nguyên nhân; biến động số ghi nhận không chứng minh biến động toàn bộ hoạt động thực tế.'}] as const;
export const pdnScopes={pdn:'PDN · Long Bình Tân + Gò Dầu',pdn_long_binh_tan:'Long Bình Tân',pdn_go_dau:'Gò Dầu A + B',pdn_go_dau_a:'Gò Dầu A',pdn_go_dau_b:'Gò Dầu B'} as const;
export type PdnScope=keyof typeof pdnScopes;
export type PdnTerminal='pdn_long_binh_tan'|'pdn_go_dau_a'|'pdn_go_dau_b';
export const isPdnScope=(s:string):s is PdnScope=>Object.hasOwn(pdnScopes,s);
export const pdnIncludes=(scope:PdnScope,asset:PdnTerminal)=>scope==='pdn'||scope===asset||(scope==='pdn_go_dau'&&asset!=='pdn_long_binh_tan');
export interface PdnEvent {id:string;day:string;time:string;vessel:string;imo:string|null;dwt:number|null;gt:number|null;from:string;to:string;asset:PdnTerminal;kind:PlanDirection|'internal';section:PlanDirection|'movement';source_id:string;sha256:string;checked_at:string;harbour_code:string;wharf_code:string;raw_dwt:number|null;conflicting_dwt:boolean;from_asset:PdnTerminal|null;to_asset:PdnTerminal|null;unit_dwt:string|null;raw_time:string;time_normalized:boolean}
export const pdnEventInScope=(scope:PdnScope,event:PdnEvent)=>pdnIncludes(scope,event.asset)||(event.kind==='internal'&&event.to_asset!==null&&pdnIncludes(scope,event.to_asset));
export interface PdnDay {day:string;sha256:string;checked_at:string;assets:Partial<Record<PdnTerminal,{arrival:[number,number|null,number];departure:[number,number|null,number]}>>;source_errors:string[]}
export function pdnPlanDays(daily:readonly PdnDay[],scope:PdnScope='pdn',direction:PlanDirection='departure'):TanVuPlanDay[]{
 return daily.map(d=>{
  const groups=Object.entries(d.assets).filter(([asset])=>pdnIncludes(scope,asset as PdnTerminal)).map(([,g])=>g![direction]);
  const rows=groups.reduce((n,g)=>n+g[0],0),dwt=groups.some(g=>g[1]!==null)?groups.reduce((n,g)=>n+(g[1]??0),0):null,missing=groups.reduce((n,g)=>n+g[2],0);
  return {report_day:d.day,version_id:null,source_sha256:d.sha256,source_url:pdnSource,parser_version:'pdn-public-plan/1.0.0',last_success:d.checked_at,last_attempt:d.checked_at,source_error:d.source_errors.join('; ')||null,observed_available:rows>0,
   arrival_rows:null,departure_rows:null,arrival_dwt:null,departure_dwt:null,arrival_dwt_missing:null,departure_dwt_missing:null,ambiguous_groups:null,source_empty_sections:[],[`${direction}_known_rows`]:rows||null,[`${direction}_known_dwt`]:dwt,[`${direction}_dwt_missing`]:rows?missing:null};
 });
}
export function pdnPlanSeries(daily:readonly PdnDay[],direction:PlanDirection='departure',now=new Date(),asset:PdnScope='pdn'){
 const days=pdnPlanDays(daily,asset,direction);
 const base=tanvuPlanSeries(days,direction,now),last=days.filter(d=>d.report_day<=base.cutoff).at(-1);
 return {...base,coverage:{...base.coverage,last_source_day:last?.report_day??null,stale:!last||last.report_day!==base.cutoff||now.getTime()-Date.parse(last.last_attempt)>36*3600000},ticker:'PDN',asset,name:pdnScopes[asset],days,semantics:'authority_published_berth_plan' as const,movement_scope:'berth' as const,actual_verified:false,history_complete:false,full_scope_certified:false};
}
