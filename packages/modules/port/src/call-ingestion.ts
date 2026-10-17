import {CALL_SOURCES,callSource,parseCallSource,sha256} from './calls.ts';
import {PUBLIC_ANCHORAGE_SOURCES,fetchPublicAnchorage} from './public-anchorage.ts';
import {fetchNgheAnReports} from './nghean-reports.ts';

class ImportError extends Error{constructor(public status:number,message:string){super(message);}}
async function limitedText(response:Response,limit:number){
 if(!response.body)throw new ImportError(502,'Nguồn không có nội dung.');
 const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new ImportError(413,'Nguồn vượt giới hạn dung lượng.');}parts.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
export function createCallIngestionHandler(config:{url:string;anonKey:string;fetcher?:typeof fetch}){
 const request=config.fetcher??fetch;const url=new URL(config.url).origin;
 return async function handle(input:Request){
  try{
   if(input.method!=='POST')throw new ImportError(405,'Chỉ hỗ trợ POST.');
   const authorization=input.headers.get('authorization');
   if(!authorization?.startsWith('Bearer ')||authorization.length<10)throw new ImportError(401,'Đăng nhập quản trị để nhập dữ liệu.');
   // Verify with Auth; never trust a decoded JWT or user_metadata role.
   const auth=await request(`${url}/auth/v1/user`,{headers:{apikey:config.anonKey,Authorization:authorization},signal:AbortSignal.timeout(10000)});
   if(!auth.ok)throw new ImportError(401,'Phiên đăng nhập hết hạn.');
   const user=await auth.json();if(!user.id||user.app_metadata?.role!=='admin')throw new ImportError(403,'Yêu cầu quyền quản trị.');
   if(Number(input.headers.get('content-length'))>7000000)throw new ImportError(413,'Bundle tối đa 7 MB.');
   let bundle=JSON.parse(await limitedText(new Response(input.body),7000000));
   if(bundle.action==='refresh'){
    const source=callSource(bundle.source_id??'quangtri-cua-viet');if(!source)throw new ImportError(400,'Nguồn chưa được hỗ trợ.');
    let raw_text:string;
    if(source.id==='nghean-reported')raw_text=await fetchNgheAnReports(request,1);
    else if(PUBLIC_ANCHORAGE_SOURCES.some(s=>s.id===source.id))raw_text=await fetchPublicAnchorage(source.id,request);
    else{
     let next=source.url;let response:Response|undefined;const signal=AbortSignal.timeout(25000);
     for(let n=0;n<4;n++){
      response=await request(next,{redirect:'manual',cache:'no-store',signal});
      if(![301,302,303,307,308].includes(response.status))break;
      const location=response.headers.get('location');if(!location)break;
      const target=new URL(location,next);
      if(target.protocol!=='https:'||target.hostname!==new URL(source.url).hostname||target.port||target.username||target.password)throw new ImportError(502,'Nguồn chuyển ngoài phạm vi connector.');next=target.href;
     }
     if(!response?.ok)throw new ImportError(502,'Nguồn chưa phản hồi. Dùng bundle tải từ máy.');
     raw_text=await limitedText(response,5000000);
    }
    bundle={source_url:source.url,fetched_at:new Date().toISOString(),raw_text,raw_sha256:await sha256(raw_text)};
   }
   const source=CALL_SOURCES.find(s=>s.url===bundle.source_url);
   if(!source||typeof bundle.raw_text!=='string'||new TextEncoder().encode(bundle.raw_text).length>5000000||!Number.isFinite(Date.parse(bundle.fetched_at))||Date.parse(bundle.fetched_at)>Date.now()+300000||await sha256(bundle.raw_text)!==bundle.raw_sha256)throw new ImportError(400,'Nguồn hoặc checksum không hợp lệ.');
   const parsed=await parseCallSource(bundle.raw_text,source.id,bundle.fetched_at);
   const response=await request(`${url}/rest/v1/rpc/import_port_calls`,{method:'POST',headers:{apikey:config.anonKey,Authorization:authorization,'Content-Type':'application/json','Content-Profile':'port'},
    body:JSON.stringify({p_bundle:bundle,p_rows:parsed.rows,p_days:parsed.reported_days,p_parser:parsed.parser_version}),signal:AbortSignal.timeout(45000)});
   if(!response.ok)throw new ImportError(502,'Database chưa lưu được dữ liệu; lần nhập bị hủy.');
   return Response.json(await response.json(),{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return Response.json({error:error instanceof ImportError?error.message:'Chưa đọc được nguồn hoặc định dạng đã thay đổi; bản nhập trước được giữ nguyên.'},{status:error instanceof ImportError?error.status:400,headers:{'Cache-Control':'private, no-store'}});}
 };
}
