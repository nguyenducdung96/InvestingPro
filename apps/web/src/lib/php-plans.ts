import 'server-only';
import {aggregatePhpPlanDays,phpBerths,type PhpBerth,type PhpPlanScope} from '@invest/port';
import type {publicRepository} from './server';
type Repository=ReturnType<typeof publicRepository>;
const assets=Object.keys(phpBerths) as PhpBerth[];
export async function loadPhpPlans(repo:Repository,asset:PhpPlanScope){
 if(asset!=='php')return repo.phpPlans(asset);
 const results=await Promise.all(assets.map(a=>repo.phpPlans(a)));
 const days=aggregatePhpPlanDays(Object.fromEntries(assets.map((a,i)=>[a,results[i].days])));
 // Daily coverage is authoritative; expose a failed run if any berth failed.
 const runs=results.flatMap(r=>r.run?[r.run]:[]);
 const run=runs.find(r=>r.status==='failed')??runs.find(r=>r.status==='running')??null;
 return {days,run};
}
export async function loadPhpPlanEvents(repo:Repository,asset:PhpPlanScope,day:string){
 if(asset!=='php')return repo.phpPlanEvents(asset,day);
 const details=await Promise.all(assets.map(a=>repo.phpPlanEvents(a,day)));
 if(details.some(d=>!d)||new Set(details.map(d=>d?.source_sha256)).size!==1)return null;
 const first=details[0]!;
 return {...first,asset_code:'php',events:details.flatMap(d=>d!.events)};
}
