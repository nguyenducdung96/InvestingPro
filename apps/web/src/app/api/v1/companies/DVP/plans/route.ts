import {publicRepository} from '@/lib/server';
import {dvpPlanSeries,validPlanDate} from '@invest/port';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const query=new URL(request.url).searchParams,day=query.get('day');
 const headers={'Cache-Control':'no-store'};
 if(query.has('asset')&&query.get('asset')!=='dinh_vu')return Response.json({error:'Bến không thuộc phạm vi DVP.'},{status:400,headers});
 if(day&&!validPlanDate(day))return Response.json({error:'Ngày không hợp lệ.'},{status:400,headers});
 try{
  const repo=publicRepository();
  if(day)return Response.json({data:await repo.phpPlanEvents('dinh_vu',day)},{headers});
  const {days,run}=await repo.phpPlans('dinh_vu');
  return Response.json(dvpPlanSeries(days,'dinh_vu',query.get('direction')==='arrival'?'arrival':'departure',new Date(),run),{headers});
 }catch{return Response.json({error:'Chưa truy cập được lịch điều động Đình Vũ.'},{status:503,headers});}
}
