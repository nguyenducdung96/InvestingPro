import {isTclScope,tclActivity,tclBerthSeries,validPlanDate} from '@invest/port';
import {tclBerthData} from '@/lib/tcl-data';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const query=new URL(request.url).searchParams,asset=query.get('asset')??'tcl_nhon_trach',direction=query.get('direction')??'departure',day=query.get('day');
 const headers={'Cache-Control':'no-store'};
 if(!isTclScope(asset))return Response.json({error:'Phạm vi không thuộc TCL.'},{status:400,headers});
 if(!['arrival','departure'].includes(direction)||day&&!validPlanDate(day))return Response.json({error:'Chiều hoặc ngày không hợp lệ.'},{status:400,headers});
 const series=tclBerthSeries(tclBerthData.events,direction as 'arrival'|'departure');
 if(day&&day>series.cutoff)return Response.json({error:'Ngày sau ngày chốt.'},{status:400,headers});
 const included=asset==='tcl'||asset==='tcl_nhon_trach';
 return Response.json({...tclActivity(asset),coverage_status:included?'partial':'unavailable',berth_activity:included?series:null,metadata:tclBerthData.metadata,
  ...(day?{events:included?tclBerthData.events.filter(e=>e.day===day&&e.direction===direction):[]}:{}),
 },{headers});
}
