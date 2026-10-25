import 'server-only';
import {southAssets,southPlanDays,southScopes,southSeries,southTargets,northSelection,type TanVuPlanDay,type SouthAsset} from '@invest/port';
import {southDaily,southHistoryMetadata} from '../../../../packages/modules/port/src/south-history-data';
import {loadSouthJournal} from '../../../../packages/modules/port/src/south-journal-loader';
import {pdnPlanSeries,pdnSource,southSource} from '@invest/port';
import {pdnDaily,pdnHistoryMetadata} from './pdn-data';
import {publicRepository} from './server';
export {southHistoryMetadata,loadSouthJournal};
export const southGroups=Object.fromEntries(Object.keys(southAssets).map(a=>[a,southPlanDays(southDaily,a as SouthAsset)]));
export async function loadSouthIssuer(ticker:'GMD'|'SGP',requested:string){
 const scopes:Record<string,{name:string;assets:string[];note:string}>=southScopes[ticker];
 const asset=Object.hasOwn(scopes,requested)?requested:ticker==='GMD'?'gmd_all':'sgp';
 const groups:Record<string,TanVuPlanDay[]|undefined>={...southGroups};let northError=false;
 if(scopes[asset].assets.includes('nam_dinh_vu'))try{groups.nam_dinh_vu=(await publicRepository().phpPlans('nam_dinh_vu')).days;}catch{northError=true;}
 return {scopes,asset,scope:scopes[asset],groups,northError};
}
export function loadSouthOverview(query:Record<string,string|undefined>,now=new Date()){
 const selection=northSelection(query,now);
 const rows=southTargets.map(target=>{
  const series=target.ticker==='PDN'?pdnPlanSeries(pdnDaily,selection.direction,now):target.assets.length?southSeries(southGroups,[...target.assets],selection.direction,now):null;
  return {...target,source:target.ticker==='PDN'?pdnSource:southSource,semantics:target.ticker==='PDN'?'authority_published_berth_plan':'authority_published_plan',updated_at:target.ticker==='PDN'?pdnHistoryMetadata.checked_at:southHistoryMetadata.checked_at,metric:(selection.frequency==='quarter'?series?.quarters:series?.months)?.find(p=>p.period===selection.period)??null,
   href:`/companies/${target.ticker}?${new URLSearchParams({plan_asset:target.asset,plan_direction:selection.direction,plan_year:selection.period.slice(0,4),plan_period:selection.frequency})}#vessel-plans`};
 });
 return {selection,rows,semantics:'authority_published_plan',actual_verified:false,nationwide_complete:false,regional_total:null,metadata:southHistoryMetadata,pdn_metadata:pdnHistoryMetadata};
}
