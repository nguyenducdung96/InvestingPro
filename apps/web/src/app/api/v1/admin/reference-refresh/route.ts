import { adminRepository,HttpError } from "@/lib/server";
import { sameOrigin } from "@/lib/origin";
import { DatabaseError } from "@invest/db";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
 try {
  if(!sameOrigin(request))throw new HttpError(403,"Cross-origin write forbidden");
  const repo=await adminRepository(request);
  const raw=await request.text();if(raw.length>2000000)throw new HttpError(413,"Bundle too large");
  const input=JSON.parse(raw);
  if(input.action==="review") {
   if(!/^[a-f0-9-]{36}$/.test(input.id)||!["accepted","rejected"].includes(input.decision)||typeof input.note!=="string"||input.note.trim().length<20||input.note.length>4000)throw new HttpError(400,"Invalid review");
   return Response.json(await repo.reviewReference(input.id,input.decision,input.note));
  }
  if(input.schema!=="slice1-reference-refresh-v1"||!Array.isArray(input.entries)||input.entries.length<1||input.entries.length>41)throw new HttpError(400,"Invalid bundle");
  for(const entry of input.entries) {
   if(entry.provider!=="vnstock-vci"||typeof entry.raw_text!=="string"||entry.raw_text.length>262144)throw new HttpError(400,"Invalid entry");
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(entry.raw_text)))).map(n=>n.toString(16).padStart(2,"0")).join("");
   if(hash!==entry.raw_sha256)throw new HttpError(400,"Evidence checksum mismatch");
   if(entry.relationships) {
    if(typeof entry.relationships.raw_text!=="string"||entry.relationships.raw_text.length>262144)throw new HttpError(400,"Invalid relationship evidence");
    const relatedHash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(entry.relationships.raw_text)))).map(n=>n.toString(16).padStart(2,"0")).join("");
    if(relatedHash!==entry.relationships.raw_sha256)throw new HttpError(400,"Relationship checksum mismatch");
   }
  }
  const id=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw)))).map(n=>n.toString(16).padStart(2,"0")).join("");
  return Response.json(await repo.importReferences(id,input.entries),{headers:{"Cache-Control":"private, no-store"}});
 } catch(error) {
  const status=error instanceof HttpError?error.status:error instanceof DatabaseError?error.status:400;
  return Response.json({error:"Không xử lý được. Kiểm tra phiên quản trị, định dạng và phạm vi hồ sơ."},{status});
 }
}
