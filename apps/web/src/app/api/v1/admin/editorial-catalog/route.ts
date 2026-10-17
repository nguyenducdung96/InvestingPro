import {adminRepository,HttpError} from '@/lib/server';
import {sameOrigin} from '@/lib/origin';
import {editorialEntries} from '@/lib/editorial';
import {DatabaseError} from '@invest/db';
export async function POST(request:Request){
 try{
  if(!sameOrigin(request))throw new HttpError(403,'Cross-origin write forbidden');
  const repo=await adminRepository(request);const raw=await request.text();if(raw.length>300000)throw new HttpError(413,'Edition too large');
  const body=JSON.parse(raw);if(body.confirm!==true||typeof body.note!=='string'||body.note.trim().length<40||body.note.length>4000)throw new HttpError(400,'Editorial review required');
  const entries=editorialEntries(body.bundle);
  const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(entries))))).map(x=>x.toString(16).padStart(2,'0')).join('');
  return Response.json(await repo.publishEditorial(id,entries,body.note),{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return Response.json({error:'Chưa phát hành. Kiểm tra phiên, phạm vi dữ kiện và bằng chứng.'},{status:e instanceof HttpError||e instanceof DatabaseError?e.status:400});}
}
