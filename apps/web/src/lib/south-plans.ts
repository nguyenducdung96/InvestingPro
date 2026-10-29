import 'server-only';
import {southAssets,southPlanDays,southScopes,southSeries,southTargets,northSelection,southAssetSource,mergeGemalinkPlanDays,gemalinkNationalSource,type TanVuPlanDay,type SouthAsset,type SouthIssuer} from '@invest/port';
import {southDaily,southHistoryMetadata} from '../../../../packages/modules/port/src/south-history-data';
import {loadSouthJournal as loadHcmJournal} from '../../../../packages/modules/port/src/south-journal-loader';
import {binhduongDaily,binhduongMetadata} from '../../../../packages/modules/port/src/binhduong-history-data';
import {loadBinhduongJournal} from '../../../../packages/modules/port/src/binhduong-journal-loader';
import {gemalinkNationalDaily,gemalinkNationalMetadata} from '../../../../packages/modules/port/src/gemalink-national-data';
import {loadGemalinkNationalJournal} from '../../../../packages/modules/port/src/gemalink-national-loader';
import {pdnPlanSeries,pdnSource,southSource} from '@invest/port';
import {pdnDaily,pdnHistoryMetadata} from './pdn-data';
import {publicRepository} from './server';
export {southHistoryMetadata,binhduongMetadata,gemalinkNationalMetadata};
export async function loadSouthJournal(month:string){const [hcm,dn,national]=await Promise.all([loadHcmJournal(month),loadBinhduongJournal(month),loadGemalinkNationalJournal(month)]);return [...hcm,...dn,...national];}
export const southGroups=Object.fromEntries(Object.keys(southAssets).map(a=>[a,southPlanDays(a==='gmd_binh_duong'?binhduongDaily:southDaily,a as SouthAsset)]));
southGroups.gemalink=mergeGemalinkPlanDays(southGroups.gemalink,southPlanDays(gemalinkNationalDaily,'gemalink'));
export async function loadSouthIssuer(ticker:SouthIssuer,requested:string){
 const scopes:Record<string,{name:string;assets:string[];note:string}>=southScopes[ticker];
 const asset=Object.hasOwn(scopes,requested)?requested:Object.keys(scopes)[0];
 const groups:Record<string,TanVuPlanDay[]|undefined>={...southGroups};let northError=false;
 if(scopes[asset].assets.includes('nam_dinh_vu'))try{groups.nam_dinh_vu=(await publicRepository().phpPlans('nam_dinh_vu')).days;}catch{northError=true;}
 const sources=[...(scopes[asset].assets.some(a=>a!=='nam_dinh_vu'&&a!=='gmd_binh_duong')?[southHistoryMetadata]:[]),...(scopes[asset].assets.includes('gmd_binh_duong')?[binhduongMetadata]:[]),...(scopes[asset].assets.includes('gemalink')?[gemalinkNationalMetadata]:[])];
 return {scopes,asset,scope:scopes[asset],groups,northError,sources};
}
export function loadSouthOverview(query:Record<string,string|undefined>,now=new Date()){
 const selection=northSelection(query,now);
 const rows=southTargets.map(target=>{
  const series=target.ticker==='PDN'?pdnPlanSeries(pdnDaily,selection.direction,now):target.assets.length?southSeries(southGroups,[...target.assets],selection.direction,now):null;
  return {...target,source:target.ticker==='PDN'?pdnSource:target.assets[0]?southAssetSource(target.assets[0]):southSource,sources:target.ticker==='PDN'?[pdnSource]:[...new Set([...target.assets.map(southAssetSource),...(target.assets.includes('gemalink' as never)?[gemalinkNationalSource]:[])])],semantics:target.ticker==='PDN'?'authority_published_berth_plan':'authority_published_plan',updated_at:target.ticker==='PDN'?pdnHistoryMetadata.checked_at:target.asset==='gmd_binh_duong'?binhduongMetadata.checked_at:target.asset==='gemalink'?[southHistoryMetadata.checked_at,gemalinkNationalMetadata.checked_at].sort().at(-1):southHistoryMetadata.checked_at,metric:(selection.frequency==='quarter'?series?.quarters:series?.months)?.find(p=>p.period===selection.period)??null,
   href:`/companies/${target.ticker}?${new URLSearchParams({plan_asset:target.asset,plan_direction:selection.direction,plan_year:selection.period.slice(0,4),plan_period:selection.frequency})}#vessel-plans`};
 });
 return {selection,rows,semantics:'source_specific_activity',actual_verified:false,nationwide_complete:false,regional_total:null,metadata:southHistoryMetadata,pdn_metadata:pdnHistoryMetadata,binhduong_metadata:binhduongMetadata};
}
