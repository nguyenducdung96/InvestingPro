import {publicRepository} from '@/lib/server';
import {loadIssuerPlans,loadIssuerPlanEvents} from '@/lib/issuer-plans';
import {issuerPlanScopes,issuerPlanSeries,validPlanDate} from '@invest/port';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const ticker='VSC',query=new URL(request.url).searchParams,day=query.get('day'),asset=query.get('asset')??ticker.toLowerCase();
 const headers={'Cache-Control':'no-store'};
 if(!Object.hasOwn(issuerPlanScopes[ticker],asset))return Response.json({error:'Cảng không thuộc phạm vi mã.'},{status:400,headers});
 if(day&&!validPlanDate(day))return Response.json({error:'Ngày không hợp lệ.'},{status:400,headers});
 try{
  const repo=publicRepository();
  if(day)return Response.json({data:await loadIssuerPlanEvents(repo,ticker,asset,day)},{headers});
  const {days,run}=await loadIssuerPlans(repo,ticker,asset);
  return Response.json(issuerPlanSeries(days,ticker,asset,query.get('direction')==='arrival'?'arrival':'departure',new Date(),run),{headers});
 }catch{return Response.json({error:'Chưa truy cập được lịch điều động.'},{status:503,headers});}
}
