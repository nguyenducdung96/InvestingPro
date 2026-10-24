import { publicRepository } from '@/lib/server';
import { throughputSeries,isPhpThroughputScope } from '@invest/port';
export const dynamic = 'force-dynamic';
export async function GET(request:Request) {
 const asset=new URL(request.url).searchParams.get('asset')??'tan_vu';
 if(!isPhpThroughputScope(asset))return Response.json({error:'Phạm vi sản lượng không hợp lệ.'},{status:400,headers:{'Cache-Control':'no-store'}});
 try {
  const facts=await publicRepository().monthlyThroughput(asset);
  return Response.json({...throughputSeries(facts),asset},{headers:{'Cache-Control':'no-store'}});
 } catch {
  return Response.json({error:'Chưa truy cập được dữ liệu sản lượng. Vui lòng thử lại.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
