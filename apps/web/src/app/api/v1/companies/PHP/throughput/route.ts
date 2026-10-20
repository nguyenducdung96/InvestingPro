import { publicRepository } from '@/lib/server';
import { throughputSeries } from '@invest/port';
export const dynamic = 'force-dynamic';
export async function GET() {
 try {
  const facts=await publicRepository().monthlyThroughput();
  return Response.json(throughputSeries(facts),{headers:{'Cache-Control':'no-store'}});
 } catch {
  return Response.json({error:'Chưa truy cập được dữ liệu sản lượng. Vui lòng thử lại.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
