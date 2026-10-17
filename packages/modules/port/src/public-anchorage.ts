// Anonymous, read-only resource exposed by the official site's public Vue app.
// Session URLs stay in memory and are never archived or exposed in errors.
export async function fetchBinhThuanPositions(fetcher:typeof fetch=fetch):Promise<string>{
 const base='http://123.25.223.242/web/guest/public-kh';
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
 if(target.origin!==new URL(base).origin||!/^\/web\/guest\/public-kh(?:;jsessionid=[A-Za-z0-9._-]+)?$/.test(target.pathname)||target.searchParams.get('p_p_resource_id')!=='vma_schedule_anchorage_port'||target.searchParams.get('p_p_id')!=='vma_WAR_TichHopGiaoThongportlet')throw new Error('Unexpected public resource destination');
 for(const [key,value] of Object.entries({flag:'true',start:'0',end:'500',shipPosition:'2',maritimeCode:'12',nameOfShip:''}))target.searchParams.set(key,value);
 return read(target.href,5000000);
}
