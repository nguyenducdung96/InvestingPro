import {loadPhpPlans,loadPhpPlanEvents} from '@/lib/php-plans';
import {publicRepository} from '@/lib/server';
import {phpPlanSeries,isPhpPlanScope,validPlanDate} from '@invest/port';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const query=new URL(request.url).searchParams,day=query.get('day');
 const headers={'Cache-Control':'no-store'};
 const asset=query.get('asset')??'tan_vu';
 if(!isPhpPlanScope(asset))return Response.json({error:'Bến không thuộc phạm vi PHP.'},{status:400,headers});
 if(day&&!validPlanDate(day))return Response.json({error:'Ngày không hợp lệ.'},{status:400,headers});
 try{
  const repo=publicRepository();
  if(day)return Response.json({data:await loadPhpPlanEvents(repo,asset,day)},{headers});
  const {days,run}=await loadPhpPlans(repo,asset);
  return Response.json(phpPlanSeries(days,asset,query.get('direction')==='arrival'?'arrival':'departure',new Date(),run),{headers});
 }catch{return Response.json({error:'Chưa truy cập được lịch điều động bến PHP.'},{status:503,headers});}
}
