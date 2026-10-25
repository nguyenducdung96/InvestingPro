import {napActivitySeries,isNapScope,validPlanDate} from '@invest/port';
import {napDaily,napHistoryMetadata,napJournal} from '@/lib/nap-data';
export async function GET(request:Request){
 const query=new URL(request.url).searchParams,direction=query.get('direction')??'departure',day=query.get('day');
 const requested=query.get('asset')??'nap',asset=requested==='cua_lo_nap'?'nap_cua_lo':requested==='ben_thuy_nap'?'nap_ben_thuy':requested;
 if(!isNapScope(asset)||!['arrival','departure'].includes(direction)||(day&&(!validPlanDate(day)||day<'2025-01-01')))return Response.json({error:'Invalid NAP query'},{status:400});
 const series=napActivitySeries(napDaily,direction as 'arrival'|'departure',new Date(),asset);
 if(day)return Response.json({data:day>series.cutoff?[]:await napJournal(day,asset),semantics:series.semantics,movement_scope:series.movement_scope,actual_verified:false,history_complete:false,quality:napHistoryMetadata});
 return Response.json({data:series,quality:napHistoryMetadata});
}
