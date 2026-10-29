import {tanvuPlanSeries,type TanVuPlanDay} from './tanvu-plans';
export interface TclBerthEvent {
 key:string;site_id:'TNT';vessel:string;voyage:string;direction:'arrival'|'departure';time:string;day:string;dwt:null;
 source_url:string;sha256:string;checked_at:string;source_row:number;raw_field:string;raw_time:string;
 raw:Record<string,string>;
}
export function tclBerthSeries(events:TclBerthEvent[],direction:'arrival'|'departure'='departure',now=new Date()){
 const groups=new Map<string,TclBerthEvent[]>();
 for(const event of events){if(event.direction!==direction)continue;const rows=groups.get(event.day)??[];if(!rows.some(r=>r.key===event.key))rows.push(event);groups.set(event.day,rows);}
 const days:TanVuPlanDay[]=[...groups].map(([day,rows])=>({
  report_day:day,version_id:null,source_sha256:rows[0].sha256,source_url:rows[0].source_url,parser_version:'tcis-tnt-berth/1.0.0',
  last_success:rows.map(r=>r.checked_at).sort().at(-1)!,last_attempt:rows.map(r=>r.checked_at).sort().at(-1)!,source_error:null,observed_available:true,
  arrival_rows:null,departure_rows:null,arrival_dwt:null,departure_dwt:null,arrival_known_rows:direction==='arrival'?rows.length:null,departure_known_rows:direction==='departure'?rows.length:null,
  arrival_dwt_missing:direction==='arrival'?rows.length:null,departure_dwt_missing:direction==='departure'?rows.length:null,ambiguous_groups:null,source_empty_sections:[],
 }));
 return {...tanvuPlanSeries(days,direction,now),asset:'tcl_nhon_trach',semantics:'operator_reported_berth_activity',movement_scope:'berth',actual_verified:false,full_scope_certified:false,history_complete:false,dwt_available:false};
}
