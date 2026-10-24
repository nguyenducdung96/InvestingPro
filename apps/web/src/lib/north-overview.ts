import 'server-only';
import {northAssets,northSelection,northOverview,type TanVuPlanDay} from '@invest/port';
import {publicRepository} from './server';
export async function loadNorthOverview(query:Record<string,string|undefined>,now=new Date()){
 const repo=publicRepository(),s=northSelection(query,now);
 const results=await Promise.allSettled([[s.from,s.through],[s.priorFrom,s.priorThrough],[s.cutoff,s.cutoff]].map(([from,through])=>repo.planDaysWindow(northAssets,from,through)));
 const unique=new Map(results.flatMap(r=>r.status==='fulfilled'?r.value:[]).map(d=>[`${d.asset_code}/${d.report_day}`,d]));
 const groups:Record<string,TanVuPlanDay[]>={};for(const d of unique.values())(groups[d.asset_code]??=[]).push(d);
 return {...northOverview(groups,query,now),read_errors:results.flatMap((r,i)=>r.status==='rejected'?[['current','prior','latest'][i]]:[])};
}
