// Anonymous, read-only resource exposed by the official site's public Vue app.
// Session URLs stay in memory and are never archived or exposed in errors.
export const PUBLIC_ANCHORAGE_SOURCES=[
 {id:'binhthuan-open-anchorage',base:'http://123.25.223.242/web/guest/public-kh',label:'Bình Thuận / Cà Ná · vị trí neo',region:/^(BÌNH THUẬN|NINH THUẬN)/i},
 {id:'thaibinh-open-anchorage',base:'http://123.30.27.14/web/guest/public-kh',label:'Thái Bình / Nam Định · vị trí neo',region:/^KHU VỰC HH (THÁI BÌNH|NAM ĐỊNH)$/i},
 {id:'kiengiang-open-anchorage',base:'http://203.210.235.67/web/guest/public-kh',label:'Kiên Giang / Cà Mau · vị trí neo',region:/^(KIÊN GIANG - |Năm Căn$|Dầu khí ngoài khơi mỏ Sông Đốc$|Vùng biển Cà Mau$)/i},
 {id:'dongnai-open-anchorage',base:'http://123.25.204.166/web/guest/public-kh',label:'Đồng Nai · vị trí neo',region:/^ĐỒNG NAI - /i,allowUnknownRegion:true},
 {id:'hatinh-open-anchorage',base:'http://116.98.104.198/web/guest/public-kh',label:'Hà Tĩnh / Quảng Bình · vị trí neo',region:/^KHU VỰC (?:HH VŨNG ÁNG-SƠN DƯƠNG|(?:HÀNG HẢI )?(?:HÒN LA|CỬA GIANH))$/i,allowUnknownRegion:true},
 {id:'danang-open-anchorage',base:'http://tttb.cangvuhanghaidanang.gov.vn/public-kh',label:'Đà Nẵng / Kỳ Hà–Cù Lao Chàm · vị trí neo',region:/^KHU VỰC (?:HH {2}ĐÀ NẴNG|HÀNG HẢI KỲ HÀ - CÙ LAO CHÀM)$/i},
] as const;
export function publicAnchorageData(raw:string){
 const envelope=JSON.parse(raw);
 if(envelope.format!=='public-anchorage-pages-v1')return envelope;
 if(!Array.isArray(envelope.pages)||envelope.pages.length<2||envelope.pages.length>10||!envelope.pages.every((p:unknown)=>typeof p==='string'))throw new Error('Invalid public API pagination archive');
 const pages=envelope.pages.map((p:string)=>JSON.parse(p));const total=pages[0].total;
 if(!Number.isInteger(total)||total<=500||total>5000||pages.length!==Math.ceil(total/500))throw new Error('Incomplete public API pagination');
 const data=[];const ids=new Set<string>();
 for(let i=0;i<pages.length;i++){
  const p=pages[i];if(p.total!==total||!Array.isArray(p.data)||p.data.length!==Math.min(500,total-i*500))throw new Error('Public API pagination changed');
  for(const row of p.data){const id=String(row.vmaScheduleAnchorageId??'');if(!/^\d+$/.test(id)||ids.has(id))throw new Error('Duplicate public API page row');ids.add(id);data.push(row);}
 }
 return {total,data};
}
export async function fetchPublicAnchorage(sourceId:string,fetcher:typeof fetch=fetch):Promise<string>{
 const config=PUBLIC_ANCHORAGE_SOURCES.find(s=>s.id===sourceId);if(!config)throw new Error('Unknown public anchorage source');
 const base=config.base;
 const signal=AbortSignal.timeout(55000);
 async function read(url:string,limit:number){
  const response=await fetcher(url,{redirect:'error',cache:'no-store',signal});
  if(!response.ok||!response.body)throw new Error('Public anchorage source unavailable');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('Public anchorage response exceeds limit');}chunks.push(value);}
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  return new TextDecoder('utf-8',{fatal:true}).decode(data);
 }
 const init=new URL(base);init.search=new URLSearchParams({p_p_id:'vma_WAR_TichHopGiaoThongportlet',p_p_lifecycle:'2',p_p_state:'normal',p_p_mode:'view',p_p_cacheability:'cacheLevelPage',p_p_col_id:'column-1',p_p_col_count:'1',p_p_resource_id:'getURLInit'}).toString();
 const metadata=JSON.parse(await read(init.href,1000000));
 if(String(metadata.user?.maritimeCode)!=='12'||typeof metadata.getVmaScheduleAnchorage_Port_URL!=='string')throw new Error('Public anchorage configuration changed');
 const target=new URL(metadata.getVmaScheduleAnchorage_Port_URL);
 // Liferay returns either its friendly public path or /web/guest alias for the same resource.
 if(target.origin!==new URL(base).origin||!/^\/(?:web\/guest\/)?public-kh(?:;jsessionid=[A-Za-z0-9._-]+)?$/.test(target.pathname)||target.searchParams.get('p_p_resource_id')!=='vma_schedule_anchorage_port'||target.searchParams.get('p_p_id')!=='vma_WAR_TichHopGiaoThongportlet')throw new Error('Unexpected public resource destination');
 for(const [key,value] of Object.entries({flag:'true',start:'0',end:'500',shipPosition:'2',maritimeCode:'12',nameOfShip:''}))target.searchParams.set(key,value);
 const first=await read(target.href,5000000);const value=JSON.parse(first);
 if(!Number.isInteger(value.total)||value.total<0||value.total>5000||!Array.isArray(value.data)||value.data.length!==Math.min(500,value.total))throw new Error('Incomplete public API page');
 if(value.total<=500)return first;
 const pages=[first];let size=first.length;
 for(let start=500;start<value.total;start+=500){
  target.searchParams.set('start',String(start));target.searchParams.set('end',String(Math.min(start+500,value.total)));
  const page=await read(target.href,5000000);size+=page.length;if(size>4500000)throw new Error('Public API archive exceeds limit');pages.push(page);
 }
 const archive=JSON.stringify({format:'public-anchorage-pages-v1',pages});publicAnchorageData(archive);return archive;
}
export function fetchBinhThuanPositions(fetcher:typeof fetch=fetch){return fetchPublicAnchorage('binhthuan-open-anchorage',fetcher);}
