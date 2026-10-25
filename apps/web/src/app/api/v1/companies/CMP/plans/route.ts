import {cmpPlanSeries,cmpEvents,cmpBerthScope,isCmpScope,validPlanDate} from '@invest/port';
import {cmpBulletins,cmpHistoryMetadata} from '@/lib/cmp-data';
export async function GET(request:Request){
 const query=new URL(request.url).searchParams,direction=query.get('direction')??'departure',day=query.get('day'),requested=query.get('asset')??'cmp',asset=requested==='chan_may_cmp'?'cmp':requested;
 if(!isCmpScope(asset)||!['arrival','departure'].includes(direction)||(day&&(!validPlanDate(day)||day<'2025-01-01')))return Response.json({error:'Invalid CMP query'},{status:400});
 const series=cmpPlanSeries(cmpBulletins,direction as 'arrival'|'departure',new Date(),asset);
 if(day)return Response.json({data:day>series.cutoff?[]:cmpEvents(cmpBulletins).filter(e=>e.time.startsWith(day)&&(asset==='cmp'||cmpBerthScope(e.kind==='departure'?e.from:e.to)===asset)),semantics:series.semantics,actual_verified:false,history_complete:false,quality:cmpHistoryMetadata});
 return Response.json({data:series,quality:cmpHistoryMetadata,sources:cmpBulletins.map(({rows:_,rejected_rows:__,...source})=>{void _;void __;return source;})});
}
