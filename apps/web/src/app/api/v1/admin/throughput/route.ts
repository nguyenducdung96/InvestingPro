import {adminRepository,HttpError} from '@/lib/server';
import {sameOrigin} from '@/lib/origin';
import {UUID} from '@invest/port';
export const dynamic='force-dynamic';
export async function PATCH(request:Request) {
 try {
  if(!sameOrigin(request))throw new HttpError(403,'Cross-origin write forbidden');
  const repo=await adminRepository(request);
  const text=await request.text();if(text.length>8000)throw new HttpError(413,'Request too large');
  const b=JSON.parse(text);
  if(typeof b.id!=='string'||!UUID.test(b.id)||!['verified','rejected'].includes(b.decision)||typeof b.note!=='string'||b.note.trim().length<20||b.note.length>4000)throw new HttpError(400,'Invalid review');
  return Response.json(await repo.reviewThroughput(b.id,b.decision,b.note),{headers:{'Cache-Control':'private, no-store'}});
 } catch(e) {return Response.json({error:e instanceof HttpError?e.message:'Chưa duyệt được. Cần bằng chứng hiện hành đã xác minh và quyền nguồn được duyệt.'},{status:e instanceof HttpError?e.status:400});}
}
