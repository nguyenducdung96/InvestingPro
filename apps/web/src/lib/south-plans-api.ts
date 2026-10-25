import {southScopes,southSeries,southSource,validPlanDate} from '@invest/port';
import {loadSouthIssuer,loadSouthJournal,southHistoryMetadata} from './south-plans';
import {publicRepository} from './server';
export async function southPlansResponse(request:Request,ticker:'GMD'|'SGP'){
 const query=new URL(request.url).searchParams,asset=query.get('asset')??(ticker==='GMD'?'gmd_all':'sgp'),day=query.get('day'),headers={'Cache-Control':'no-store'};
 if(!Object.hasOwn(southScopes[ticker],asset))return Response.json({error:'Cảng không thuộc phạm vi mã.'},{status:400,headers});
 if(day&&!validPlanDate(day))return Response.json({error:'Ngày không hợp lệ.'},{status:400,headers});
 const loaded=await loadSouthIssuer(ticker,asset),direction=query.get('direction')==='arrival'?'arrival':'departure',series=southSeries(loaded.groups,loaded.scope.assets,direction);
 if(day&&day>series.cutoff)return Response.json({error:'Ngày sau ngày chốt.'},{status:400,headers});
 if(day){
  const events=(await loadSouthJournal(day.slice(0,7))).filter(e=>e.day===day&&loaded.scope.assets.includes(e.asset)).map(e=>({...e,source_url:southSource}));
  let north=null;let northError=false;
  if(loaded.scope.assets.includes('nam_dinh_vu'))try{north=await publicRepository().phpPlanEvents('nam_dinh_vu',day);}catch{northError=true;}
  return Response.json({asset,day,semantics:series.semantics,actual_verified:false,events,north,read_errors:northError?['nam_dinh_vu']:[],metadata:southHistoryMetadata},{headers});
 }
 return Response.json({...series,asset,ticker,scope:loaded.scope,read_errors:loaded.northError?['nam_dinh_vu']:[],metadata:southHistoryMetadata},{headers});
}
