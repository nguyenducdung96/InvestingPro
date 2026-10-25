import {tanvuPlanSeries,validPlanDate,type PlanDirection,type TanVuPlanDay} from './tanvu-plans';

export interface DungquatEvent {
 key:string;asset:'gemadept_dung_quat';vessel:string;kind:PlanDirection;day:string;time:null;precision:'day';dwt:number|null;gt:number|null;
 source:{url:string;api_url:string;sha256:string;published_at:string;checked_at:string;field:string;note:string;parser_version:string};
}

export function dungquatEvents(input:readonly DungquatEvent[],now=new Date()){
 const cutoff=tanvuPlanSeries([],undefined,now).cutoff;
 const unique=new Map<string,DungquatEvent&{sources:DungquatEvent['source'][]}>();
 for(const event of input){
  if(event.asset!=='gemadept_dung_quat'||!['arrival','departure'].includes(event.kind)||!validPlanDate(event.day)||event.time!==null||event.precision!=='day'||!event.vessel.trim()||!/^https:\/\/dqp\.gemadept\.com\.vn\//.test(event.source.url)||!(/^[a-f0-9]{64}$/).test(event.source.sha256)||[event.dwt,event.gt].some(n=>n!==null&&(!Number.isFinite(n)||n<=0)))throw new Error('Invalid Dung Quat disclosure event');
  if(event.day>cutoff)continue;
  const identity=[event.asset,event.kind,event.day,event.vessel.normalize('NFC').trim().replace(/\s+/g,' ').toUpperCase()].join('|');
  const existing=unique.get(identity);
  if(existing){
   existing.sources.push(event.source);
   // Disagreeing disclosures cannot silently pick a weight.
   if(existing.dwt!==event.dwt)existing.dwt=null;
   if(existing.gt!==event.gt)existing.gt=null;
  }else unique.set(identity,{...event,sources:[event.source]});
 }
 return [...unique.values()].sort((a,b)=>a.day.localeCompare(b.day)||a.key.localeCompare(b.key));
}

export function dungquatActivitySeries(input:readonly DungquatEvent[],direction:PlanDirection='arrival',now=new Date()){
 const events=dungquatEvents(input,now),grouped=new Map<string,TanVuPlanDay>();
 for(const event of events){
  const day=grouped.get(event.day)??{report_day:event.day,version_id:null,source_sha256:null,source_url:null,parser_version:null,last_success:null,last_attempt:event.source.checked_at,source_error:null,arrival_rows:null,departure_rows:null,arrival_dwt:null,departure_dwt:null,arrival_dwt_missing:null,departure_dwt_missing:null,ambiguous_groups:null,source_empty_sections:[],observed_available:false};
  if(event.kind===direction){
   day.observed_available=true;
   day[`${direction}_known_rows`]=(day[`${direction}_known_rows`]??0)+1;
   day[`${direction}_dwt_missing`]=(day[`${direction}_dwt_missing`]??0)+Number(event.dwt===null);
   if(event.dwt!==null)day[`${direction}_known_dwt`]=(day[`${direction}_known_dwt`]??0)+event.dwt;
  }
  grouped.set(event.day,day);
 }
 const days=[...grouped.values()],base=tanvuPlanSeries(days,direction,now);
 const range=(r:typeof base.ytd.current)=>({...r,missing_dwt:days.filter(d=>d.report_day>=r.from&&d.report_day<=r.through).reduce((n,d)=>n+(d[`${direction}_dwt_missing`]??0),0)});
 const period=(p:typeof base.months[number])=>({...p,current:range(p.current),prior:range(p.prior)});
 return {...base,asset:'gemadept_dung_quat',ticker:'GMD',semantics:'operator_disclosed_terminal_activity',movement_scope:'terminal',actual_verified:false,history_complete:false,status:'reviewed_subset',months:base.months.map(period),quarters:base.quarters.map(period),ytd:{...base.ytd,current:range(base.ytd.current),prior:range(base.ytd.prior)},days:days.filter(d=>d.observed_available).map(d=>({day:d.report_day,rows:d[`${direction}_known_rows`]??null,dwt:d[`${direction}_known_dwt`]??null,missing_dwt:d[`${direction}_dwt_missing`]??0}))};
}
