import {southScopes,southSeries,southSource,validPlanDate,type SouthIssuer} from '@invest/port';
import {loadSouthIssuer,loadSouthJournal,southHistoryMetadata} from './south-plans';
import {publicRepository} from './server';
export async function southPlansResponse(request:Request,ticker:SouthIssuer){
 const query=new URL(request.url).searchParams,asset=query.get('asset')??Object.keys(southScopes[ticker])[0],day=query.get('day'),headers={'Cache-Control':'no-store'};
 if(!Object.hasOwn(southScopes[ticker],asset))return Response.json({error:'Cảng không thuộc phạm vi mã.'},{status:400,headers});
 if(day&&!validPlanDate(day))return Response.json({error:'Ngày không hợp lệ.'},{status:400,headers});
 if(query.has('direction')&&!['arrival','departure'].includes(query.get('direction')!))return Response.json({error:'Chiều tàu không hợp lệ.'},{status:400,headers});
 const loaded=await loadSouthIssuer(ticker,asset),direction=query.get('direction')==='arrival'?'arrival':'departure',series=southSeries(loaded.groups,loaded.scope.assets,direction);
 const metadata=loaded.sources.length===1?loaded.sources[0]:southHistoryMetadata;
 if(day&&day>series.cutoff)return Response.json({error:'Ngày sau ngày chốt.'},{status:400,headers});
 if(day){
  const events=(await loadSouthJournal(day.slice(0,7))).filter(e=>e.day===day&&loaded.scope.assets.includes(e.asset)&&e.direction===direction).map(e=>({...e,source_url:e.source_url??southSource}));
  let north=null;let northError=false;
  if(loaded.scope.assets.includes('nam_dinh_vu'))try{north=await publicRepository().phpPlanEvents('nam_dinh_vu',day);}catch{northError=true;}
  return Response.json({asset,day,semantics:series.semantics,actual_verified:false,events,north,read_errors:northError?['nam_dinh_vu']:[],metadata,sources:loaded.sources},{headers});
 }
 return Response.json({...series,asset,ticker,scope:loaded.scope,read_errors:loaded.northError?['nam_dinh_vu']:[],metadata,sources:loaded.sources},{headers});
}
