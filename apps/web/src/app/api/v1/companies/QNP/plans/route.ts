import {qnpAuthorityBulletins,qnpHistoryMetadata,qnpPlanSeries,qnpReviewedEvents,qnpBerthScope,isQnpScope,validPlanDate} from '@invest/port';
export async function GET(request:Request){
 const query=new URL(request.url).searchParams,direction=query.get('direction')??'departure',day=query.get('day'),requested=query.get('asset')??'qnp',asset=requested==='quy_nhon'?'qnp':requested;
 if(!isQnpScope(asset)||!['arrival','departure'].includes(direction)||(day&&(!validPlanDate(day)||day<'2025-01-01')))return Response.json({error:'Invalid QNP query'},{status:400});
 const series=qnpPlanSeries(qnpAuthorityBulletins,direction as 'arrival'|'departure',new Date(),asset);
 if(day)return Response.json({data:day>series.cutoff?[]:qnpReviewedEvents(qnpAuthorityBulletins).filter(e=>e.time.startsWith(day)&&(asset==='qnp'||qnpBerthScope(e.kind==='departure'?e.from:e.to)===asset)),semantics:series.semantics,actual_verified:false,history_complete:false,quality:qnpHistoryMetadata});
 return Response.json({data:series,quality:qnpHistoryMetadata,sources:qnpAuthorityBulletins.map(source=>({id:source.id,url:source.url,image:source.image,sha256:source.sha256,issued_on:source.issued_on,published_at:source.published_at,parsed_at:source.parsed_at,parser_version:source.parser_version,quality:source.quality}))});
}
