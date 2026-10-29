import type {TanVuPlanDay} from './tanvu-plans';
export const gemalinkNationalSource='https://hanghai.moc.gov.vn/tra-cuu-giay-phep';
/** Inputs must already be deduplicated against each other by source exporters. */
export function mergeGemalinkPlanDays(board:TanVuPlanDay[],national:TanVuPlanDay[]):TanVuPlanDay[]{
 const left=new Map(board.map(d=>[d.report_day,d])),right=new Map(national.map(d=>[d.report_day,d]));
 if(left.size!==board.length||right.size!==national.length)throw new Error('Duplicate Gemalink source day');
 return [...new Set([...left.keys(),...right.keys()])].sort().map(day=>{
  const a=left.get(day),b=right.get(day);
  if(!b?.observed_available)return a??b!;
  if(!a)return b;
  const members=[a,b],sum=(values:(number|null|undefined)[])=>values.some(v=>v!=null)?values.reduce<number>((n,v)=>n+(v??0),0):null;
  return {...a,version_id:null,source_sha256:null,source_url:null,parser_version:'gemalink-multiple-plan-sources/1',observed_available:true,
   arrival_known_rows:sum(members.map(d=>d.arrival_known_rows)),departure_known_rows:sum(members.map(d=>d.departure_known_rows)),
   arrival_known_dwt:sum(members.map(d=>d.arrival_known_dwt)),departure_known_dwt:sum(members.map(d=>d.departure_known_dwt)),
   arrival_dwt_missing:sum(members.map(d=>d.arrival_dwt_missing)),departure_dwt_missing:sum(members.map(d=>d.departure_dwt_missing)),
   arrival_rows:null,departure_rows:null,arrival_dwt:null,departure_dwt:null,
   last_attempt:members.map(d=>d.last_attempt).sort().at(-1)!,source_error:a.source_error??b.source_error};
 });
}
