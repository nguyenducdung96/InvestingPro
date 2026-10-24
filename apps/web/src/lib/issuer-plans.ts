import 'server-only';
import {aggregateBerthPlanDays,issuerPlanAssets,type VscTicker} from '@invest/port';
import type {publicRepository} from './server';
type Repository=ReturnType<typeof publicRepository>;
export async function loadIssuerPlans(repo:Repository,ticker:VscTicker,asset:string){
 const assets=issuerPlanAssets(ticker,asset),results=await Promise.all(assets.map(a=>repo.phpPlans(a)));
 const runs=results.flatMap(r=>r.run?[r.run]:[]);
 return {days:assets.length===1?results[0].days:aggregateBerthPlanDays(Object.fromEntries(assets.map((a,i)=>[a,results[i].days])),assets,ticker),run:runs.find(r=>r.status==='failed')??runs.find(r=>r.status==='running')??runs.sort((a,b)=>a.checked_at.localeCompare(b.checked_at))[0]??null};
}
export async function loadIssuerPlanEvents(repo:Repository,ticker:VscTicker,asset:string,day:string){
 const assets=issuerPlanAssets(ticker,asset),details=await Promise.all(assets.map(a=>repo.phpPlanEvents(a,day)));
 if(details.some(d=>!d)||new Set(details.map(d=>d?.source_sha256)).size!==1)return null;
 return {...details[0]!,asset_code:asset,events:details.flatMap(d=>d!.events)};
}
