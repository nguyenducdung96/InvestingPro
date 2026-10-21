import {publicRepository} from '@/lib/server';
import {tanvuPlanSeries,validPlanDate} from '@invest/port';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const query=new URL(request.url).searchParams,day=query.get('day');
 const headers={'Cache-Control':'no-store'};
 if(day&&!validPlanDate(day))return Response.json({error:'Ngày không hợp lệ.'},{status:400,headers});
 try{
  const repo=publicRepository();
  if(day)return Response.json({data:await repo.tanvuPlanEvents(day)},{headers});
  const {days,run}=await repo.tanvuPlans();
  return Response.json(tanvuPlanSeries(days,query.get('direction')==='arrival'?'arrival':'departure',new Date(),run),{headers});
 }catch{return Response.json({error:'Chưa truy cập được lịch điều động Tân Vũ.'},{status:503,headers});}
}
