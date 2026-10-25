import {pdnPlanSeries,pdnCoverageNotes,pdnEventInScope,isPdnScope,validPlanDate} from '@invest/port';
import {pdnDaily,pdnHistoryMetadata,loadPdnJournal} from '@/lib/pdn-data';
export async function GET(request:Request){
 const query=new URL(request.url).searchParams,direction=query.get('direction')??'departure',day=query.get('day'),asset=query.get('asset')??'pdn';
 if(!isPdnScope(asset)||!['arrival','departure'].includes(direction)||(day&&(!validPlanDate(day)||day<'2025-01-01')))return Response.json({error:'Invalid PDN query'},{status:400});
 const series=pdnPlanSeries(pdnDaily,direction as 'arrival'|'departure',new Date(),asset);
 if(day){
  const events=day>series.cutoff?[]:(await loadPdnJournal(day.slice(0,7))).filter(e=>e.day===day&&pdnEventInScope(asset,e));
  return Response.json({data:events.filter(e=>e.kind===direction),internal:events.filter(e=>e.kind==='internal'),semantics:series.semantics,movement_scope:series.movement_scope,actual_verified:false,full_scope_certified:false,quality:{...pdnHistoryMetadata,coverage_notes:pdnCoverageNotes},source_url:pdnHistoryMetadata.source_url});
 }
 return Response.json({data:series,quality:{...pdnHistoryMetadata,coverage_notes:pdnCoverageNotes},source_url:pdnHistoryMetadata.source_url});
}
