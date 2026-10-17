import {adminRepository,HttpError} from '@/lib/server';
import {sameOrigin} from '@/lib/origin';
import {CALL_SOURCE,CALL_PARSER,parseCallNotices,sha256,UUID} from '@invest/port';
import {DatabaseError} from '@invest/db';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 let phase='session';
 try{
  if(!sameOrigin(request))throw new HttpError(403,'Cross-origin write forbidden');
  const repo=await adminRepository(request);
  if(Number(request.headers.get('content-length'))>7000000)throw new HttpError(413,'Bundle too large');
  const text=await request.text();if(text.length>7000000)throw new HttpError(413,'Bundle too large');
  let b=JSON.parse(text);
  if(b.action==='refresh'){
   phase='source';
   const response=await fetch(CALL_SOURCE,{cache:'no-store',signal:AbortSignal.timeout(25000),redirect:'error'});
   if(!response.ok||!response.body)throw new HttpError(502,'Nguồn chưa phản hồi. Có thể dùng lệnh refresh trên máy và nhập bundle.');
   const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
   for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>5000000){await reader.cancel();throw new HttpError(413,'Nguồn vượt giới hạn 5 MB.');}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   const raw_text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
   b={source_url:CALL_SOURCE,raw_text,raw_sha256:await sha256(raw_text),fetched_at:new Date().toISOString()};
  }
  phase='parse';
  if(b.source_url!==CALL_SOURCE||typeof b.raw_text!=='string'||b.raw_text.length>5000000||!Number.isFinite(Date.parse(b.fetched_at))||Date.parse(b.fetched_at)>Date.now()+300000||await sha256(b.raw_text)!==b.raw_sha256)throw new HttpError(400,'Invalid source or checksum');
  const parsed=await parseCallNotices(b.raw_text);
  phase='database';
  return Response.json(await repo.importCalls(b,parsed.rows,parsed.reported_days,CALL_PARSER),{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){const message=e instanceof HttpError?e.message:phase==='source'?'Máy chủ chưa tải được nguồn Cảng vụ. Dùng “Nhập bundle từ máy”; dữ liệu trước được giữ nguyên.':e instanceof DatabaseError?`Chưa lưu được vào database (HTTP ${e.status}, ${e.code??'unknown'}). Bản nhập đã được hủy toàn bộ.`:phase==='parse'?'Nguồn không khớp định dạng thông báo đã kiểm thử; cần đối chiếu connector.':'Không xử lý được yêu cầu quản trị.';return Response.json({error:message,phase},{status:e instanceof HttpError?e.status:e instanceof DatabaseError?502:phase==='source'?502:400});}
}
export async function GET(request:Request){
 try{
  const repo=await adminRepository(request);const id=new URL(request.url).searchParams.get('artifact');
  if(!id||!UUID.test(id))throw new HttpError(400,'Invalid artifact');
  const artifact=await repo.callArtifact(id);if(!artifact)throw new HttpError(404,'Artifact not found');
  // JSON attachment cannot execute archived scripts or WebForms markup.
  return Response.json(artifact,{headers:{'Cache-Control':'private, no-store','Content-Disposition':`attachment; filename="port-call-${id}.json"`,'X-Content-Type-Options':'nosniff'}});
 }catch(e){return Response.json({error:'Không đọc được bản gốc.'},{status:e instanceof HttpError?e.status:400});}
}
