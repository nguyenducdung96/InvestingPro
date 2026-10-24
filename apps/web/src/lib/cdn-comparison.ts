import type {phpPlanSeries} from '@invest/port';

type Period=ReturnType<typeof phpPlanSeries>['months'][number];
export const observedGrowth=(current:number|null,prior:number|null)=>current!==null&&prior!==null&&prior>0?(current/prior-1)*100:null;

export function cdnPeriodDisplay(period:Period|null){
 return {rows:period&&period.current.observed_days>0?period.current.known_rows:null,dwt:period?.current.observed_dwt??null,priorDwt:period?.prior.observed_dwt??null,yoyRows:period?observedGrowth(period.current.observed_days>0?period.current.known_rows:null,period.prior.observed_days>0?period.prior.known_rows:null):null,yoyDwt:period?observedGrowth(period.current.observed_dwt,period.prior.observed_dwt):null};
}

/** Compare the recorded values in the same finished months, without imputing gaps. */
export function cdnCompletedComparison(months:Period[],year:string){
 const paired=months.filter(m=>m.period.startsWith(`${year}-`)&&m.status!=='partial'&&m.current.observed_dwt!==null&&m.prior.observed_dwt!==null);
 const sum=(side:'current'|'prior',key:'observed_dwt'|'known_rows')=>paired.length?paired.reduce((n,m)=>n+(m[side][key]??0),0):null;
 const current=sum('current','observed_dwt'),prior=sum('prior','observed_dwt');
 return {current,prior,rows:sum('current','known_rows'),priorRows:sum('prior','known_rows'),growth:observedGrowth(current,prior),months:paired.map(m=>Number(m.period.slice(5))),from:paired.at(0)?.current.from,through:paired.at(-1)?.current.through,priorFrom:paired.at(0)?.prior.from,priorThrough:paired.at(-1)?.prior.through};
}
