import type {tanvuPlanSeries} from '@invest/port';
import {observedGrowth} from './cdn-comparison';
type Series=ReturnType<typeof tanvuPlanSeries>;
type Range=Series['ytd']['current'];

/** Display comparison only; the source series and full-coverage API stay intact. */
export function pairedYtd<T extends Pick<Series,'months'|'ytd'>>(series:T,year:string,metric:'rows'|'dwt'|'observed_dwt'='observed_dwt',finishedOnly=false):T['ytd'] {
 const available=(r:Range)=>metric==='rows'?r.observed_days>0:r[metric]!==null;
 const paired=series.months.filter(m=>m.period.startsWith(`${year}-`)&&(!finishedOnly||m.status==='closed')&&available(m.current)&&available(m.prior));
 const aggregate=(side:'current'|'prior'):Range=>{
  const ranges=paired.map(m=>m[side]);
  const base=series.ytd[side];
  const sum=(key:'known_rows'|'known_dwt'|'observed_days'|'reported_days'|'expected_days'|'missing_dwt'|'ambiguous_groups')=>ranges.reduce((n,r)=>n+r[key],0);
  const nullable=(key:'rows'|'dwt'|'observed_dwt')=>ranges.length&&ranges.every(r=>r[key]!==null)?ranges.reduce((n,r)=>n+r[key]!,0):null;
  return {...base,from:ranges[0]?.from??base.from,through:ranges.at(-1)?.through??base.through,
   known_rows:sum('known_rows'),known_dwt:sum('known_dwt'),observed_days:sum('observed_days'),reported_days:sum('reported_days'),expected_days:sum('expected_days'),missing_dwt:sum('missing_dwt'),ambiguous_groups:sum('ambiguous_groups'),
   rows:nullable('rows'),dwt:nullable('dwt'),observed_dwt:ranges.some(r=>r.observed_dwt!==null)?ranges.reduce((n,r)=>n+(r.observed_dwt??0),0):null,
   missing_days:ranges.flatMap(r=>r.missing_days),error_days:ranges.flatMap(r=>r.error_days),complete:ranges.length>0&&ranges.every(r=>r.complete)};
 };
 const current=aggregate('current'),prior=aggregate('prior');
 return {current,prior,yoy:{rows:observedGrowth(current.observed_days?current.known_rows:null,prior.observed_days?prior.known_rows:null),dwt:observedGrowth(current[metric==='dwt'?'dwt':'observed_dwt'],prior[metric==='dwt'?'dwt':'observed_dwt'])}} as T['ytd'];
}
export function pairedMonthLabel(series:Pick<Series,'months'>,year:string,metric:'rows'|'dwt'|'observed_dwt'='observed_dwt',finishedOnly=false){
 const available=(r:Range)=>metric==='rows'?r.observed_days>0:r[metric]!==null;
 const months=series.months.filter(m=>m.period.startsWith(`${year}-`)&&(!finishedOnly||m.status==='closed')&&available(m.current)&&available(m.prior)).map(m=>`T${Number(m.period.slice(5))}`);
 return months.length?months.join(', '):'chưa có tháng chung';
}
