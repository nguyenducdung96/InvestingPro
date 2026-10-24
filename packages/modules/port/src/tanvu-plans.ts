export interface TanVuPlanDay {
 report_day:string;version_id:string|null;source_sha256:string|null;source_url:string|null;parser_version:string|null;
 last_success:string|null;last_attempt:string;source_error:string|null;
 arrival_rows:number|null;departure_rows:number|null;arrival_dwt:number|null;departure_dwt:number|null;
 arrival_dwt_missing:number|null;departure_dwt_missing:number|null;ambiguous_groups:number|null;source_empty_sections:string[];
 arrival_known_dwt?:number|null;departure_known_dwt?:number|null;
}
export interface TanVuPlanRun {id:string;checked_at:string;through_day:string;status:'running'|'success'|'failed';requested_days:number;parsed_days:number;error:string|null}
export interface TanVuPlanEvents {report_day:string;source_url:string;source_sha256:string;fetched_at:string;parser_version:string;semantics:'authority_published_plan'|'authority_published_berth_plan';movement_scope?:'berth'|'port';events:{plan_kind?:'arrival'|'departure'|'internal';direction:'arrival'|'departure';vessel_name:string;planned_time:string;dwt:number|null;from_berth:string;to_berth:string}[]}
export type PlanDirection='arrival'|'departure';
const dayMs=86400000;
const iso=(time:number)=>new Date(time).toISOString().slice(0,10);
export const validPlanDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&iso(Date.parse(s))===s;
const lastDay=(y:number,m:number)=>iso(Date.UTC(y,m,0));
const priorDate=(s:string)=>{const [y,m,d]=s.split('-').map(Number);return `${y-1}-${String(m).padStart(2,'0')}-${String(Math.min(d,Number(lastDay(y-1,m).slice(8)))).padStart(2,'0')}`;};
const yoy=(a:number|null,b:number|null)=>a!==null&&b!==null&&b>0?(a/b-1)*100:null;
export function tanvuPlanSeries(input:TanVuPlanDay[],direction:PlanDirection='departure',now=new Date(),run:TanVuPlanRun|null=null) {
 const cutoff=iso(Date.parse(iso(now.getTime()+7*3600000))-dayMs);
 const days=input.filter(d=>validPlanDate(d.report_day)&&d.report_day<=cutoff).sort((a,b)=>a.report_day.localeCompare(b.report_day));
 const map=new Map(days.map(d=>[d.report_day,d]));
 function range(from:string,through:string){
  const expected:string[]=[];for(let n=Date.parse(from);n<=Date.parse(through);n+=dayMs)expected.push(iso(n));
  const present=expected.flatMap(key=>{const d=map.get(key);return d?.version_id?[d]:[];});
  const missing_days=expected.filter(key=>!map.get(key)?.version_id);
  const missing_dwt=present.reduce((s,d)=>s+(d[`${direction}_dwt_missing`]??0),0);
  const ambiguous_groups=present.reduce((s,d)=>s+(d.ambiguous_groups??0),0);
  const known_rows=present.reduce((s,d)=>s+Number(d[`${direction}_rows`]??0),0);
  const known_dwt=present.reduce((s,d)=>s+Number(d[`${direction}_known_dwt`]??d[`${direction}_dwt`]??0),0);
  const observed_dwt=present.length>0&&present.every(d=>d[`${direction}_known_dwt`]!=null||d[`${direction}_dwt`]!=null)&&(known_rows===0||known_rows>missing_dwt)?known_dwt:null;
  const complete=expected.length>0&&!missing_days.length&&!ambiguous_groups;
  return {from,through,expected_days:expected.length,reported_days:present.length,missing_days,missing_dwt,ambiguous_groups,
   error_days:expected.filter(key=>map.get(key)?.source_error),
   rows:complete?known_rows:null,dwt:complete&&!missing_dwt&&present.every(d=>d[`${direction}_dwt`]!==null)?known_dwt:null,known_rows,known_dwt,observed_dwt,complete};
 }
 function period(key:string,from:string,end:string){
  const through=end<cutoff?end:cutoff;
  const previousEnd=end<=cutoff?priorDate(end):priorDate(through);
  // Full February compares the entire previous February, including leap days.
  const priorThrough=end<=cutoff&&end.slice(5,7)==='02'?lastDay(Number(end.slice(0,4))-1,2):previousEnd;
  const current=range(from,through),prior=range(priorDate(from),priorThrough);
  return {period:key,status:end>cutoff?'partial' as const:'closed' as const,current,prior,yoy:{rows:yoy(current.rows,prior.rows),dwt:yoy(current.dwt,prior.dwt)}};
 }
 const months=[];const quarters=[];
 if(days.length){
  const [sy,sm]=days[0].report_day.split('-').map(Number),[ey,em]=cutoff.split('-').map(Number);
  for(let n=sy*12+sm-1;n<=ey*12+em-1;n++){
   const y=Math.floor(n/12),m=n%12+1,key=`${y}-${String(m).padStart(2,'0')}`;
   months.push(period(key,`${key}-01`,lastDay(y,m)));
  }
  for(const key of [...new Set(months.map(m=>`${m.period.slice(0,4)}-Q${Math.ceil(Number(m.period.slice(5))/3)}`))]){
   const y=Number(key.slice(0,4)),q=Number(key.at(-1)),startMonth=(q-1)*3+1;
   quarters.push(period(key,`${y}-${String(startMonth).padStart(2,'0')}-01`,lastDay(y,q*3)));
  }
 }
 const year=cutoff.slice(0,4),ytdCurrent=range(`${year}-01-01`,cutoff),ytdPrior=range(`${Number(year)-1}-01-01`,priorDate(cutoff));
 const lastAttempt=days.map(d=>d.last_attempt).sort().at(-1)??null;
 return {asset:'tan_vu',semantics:'authority_published_plan',actual_verified:false,direction,cutoff,months,quarters,
  ytd:{current:ytdCurrent,prior:ytdPrior,yoy:{rows:yoy(ytdCurrent.rows,ytdPrior.rows),dwt:yoy(ytdCurrent.dwt,ytdPrior.dwt)}},
  coverage:{first_day:days[0]?.report_day??null,last_source_day:days.filter(d=>d.version_id).at(-1)?.report_day??null,
   last_attempt:lastAttempt,stale:!lastAttempt||now.getTime()-Date.parse(lastAttempt)>36*3600000||!map.get(cutoff)?.version_id,
   errors:days.filter(d=>d.source_error).length},run};
}
