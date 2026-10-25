import type {PdnEvent} from './pdn-plans';
// Compressed immutable month modules keep the Worker below its script-size limit.
// The decoder uses the same web-standard gzip stream in Node and Cloudflare.
export async function decodePdnJournal(encoded:string):Promise<PdnEvent[]>{
 if(encoded.length>3_000_000)throw new Error('PDN month exceeds compressed limit');
 const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 const reader=stream.getReader(),chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4_000_000){await reader.cancel();throw new Error('PDN month exceeds decoded limit');}chunks.push(value);}
 const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}
 const rows=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
 if(!Array.isArray(rows)||rows.length>10000)throw new Error('Invalid PDN month');
 return rows as PdnEvent[];
}
