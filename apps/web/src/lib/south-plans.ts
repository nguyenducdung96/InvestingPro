import 'server-only';
import {southAssets,southPlanDays,southScopes,southSeries,southTargets,northSelection,southAssetSource,type TanVuPlanDay,type SouthAsset,type SouthIssuer} from '@invest/port';
import {southDaily,southHistoryMetadata} from '../../../../packages/modules/port/src/south-history-data';
import {loadSouthJournal as loadHcmJournal} from '../../../../packages/modules/port/src/south-journal-loader';
import {binhduongDaily,binhduongMetadata} from '../../../../packages/modules/port/src/binhduong-history-data';
import {loadBinhduongJournal} from '../../../../packages/modules/port/src/binhduong-journal-loader';
import {pdnPlanSeries,pdnSource,southSource} from '@invest/port';
import {pdnDaily,pdnHistoryMetadata} from './pdn-data';
import {publicRepository} from './server';
export {southHistoryMetadata,binhduongMetadata};
export async function loadSouthJournal(month:string){const [hcm,dn]=await Promise.all([loadHcmJournal(month),loadBinhduongJournal(month)]);return [...hcm,...dn];}
export const southGroups=Object.fromEntries(Object.keys(southAssets).map(a=>[a,southPlanDays(a==='gmd_binh_duong'?binhduongDaily:southDaily,a as SouthAsset)]));
export async function loadSouthIssuer(ticker:SouthIssuer,requested:string){
 const scopes:Record<string,{name:string;assets:string[];note:string}>=southScopes[ticker];
 const asset=Object.hasOwn(scopes,requested)?requested:Object.keys(scopes)[0];
 const groups:Record<string,TanVuPlanDay[]|undefined>={...southGroups};let northError=false;
 if(scopes[asset].assets.includes('nam_dinh_vu'))try{groups.nam_dinh_vu=(await publicRepository().phpPlans('nam_dinh_vu')).days;}catch{northError=true;}
 const sources=[...(scopes[asset].assets.some(a=>a!=='nam_dinh_vu'&&a!=='gmd_binh_duong')?[southHistoryMetadata]:[]),...(scopes[asset].assets.includes('gmd_binh_duong')?[binhduongMetadata]:[])];
 return {scopes,asset,scope:scopes[asset],groups,northError,sources};
}
export function loadSouthOverview(query:Record<string,string|undefined>,now=new Date()){
 const selection=northSelection(query,now);
 const rows=southTargets.map(target=>{
  const series=target.ticker==='PDN'?pdnPlanSeries(pdnDaily,selection.direction,now):target.assets.length?southSeries(southGroups,[...target.assets],selection.direction,now):null;
  return {...target,source:target.ticker==='PDN'?pdnSource:southSource,sources:target.ticker==='PDN'?[pdnSource]:[...new Set(target.assets.map(southAssetSource))],semantics:target.ticker==='PDN'?'authority_published_berth_plan':'authority_published_plan',updated_at:target.ticker==='PDN'?pdnHistoryMetadata.checked_at:southHistoryMetadata.checked_at,metric:(selection.frequency==='quarter'?series?.quarters:series?.months)?.find(p=>p.period===selection.period)??null,
   href:`/companies/${target.ticker}?${new URLSearchParams({plan_asset:target.asset,plan_direction:selection.direction,plan_year:selection.period.slice(0,4),plan_period:selection.frequency})}#vessel-plans`};
 });
 return {selection,rows,semantics:'authority_published_plan',actual_verified:false,nationwide_complete:false,regional_total:null,metadata:southHistoryMetadata,pdn_metadata:pdnHistoryMetadata,binhduong_metadata:binhduongMetadata};
}
