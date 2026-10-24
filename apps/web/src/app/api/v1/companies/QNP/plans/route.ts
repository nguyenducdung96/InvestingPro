import {qnpBulletins,qnpPlanSeries,qnpReviewedEvents,validPlanDate} from '@invest/port';
export async function GET(request:Request){
 const query=new URL(request.url).searchParams,direction=query.get('direction')??'departure',day=query.get('day'),asset=query.get('asset')??'qnp';
 if(!['qnp','quy_nhon'].includes(asset)||!['arrival','departure'].includes(direction)||(day&&!validPlanDate(day)))return Response.json({error:'Invalid QNP query'},{status:400});
 const series=qnpPlanSeries(qnpBulletins,direction as 'arrival'|'departure');
 if(day)return Response.json({data:day>series.cutoff?[]:qnpReviewedEvents(qnpBulletins).filter(e=>e.time.startsWith(day)),semantics:series.semantics,actual_verified:false,history_complete:false});
 return Response.json({data:series,sources:qnpBulletins.map(source=>({id:source.id,url:source.url,image:source.image,sha256:source.sha256,issued_on:source.issued_on,published_at:source.published_at,reviewed_on:source.reviewed_on}))});
}
