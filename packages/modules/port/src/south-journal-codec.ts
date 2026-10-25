import type {SouthEvent} from './south-plans';
// Month modules stay compressed in the Worker, with bounded web-standard decoding.
export async function decodeSouthJournal(encoded:string):Promise<SouthEvent[]>{
 if(encoded.length>3_000_000)throw new Error('Southern month exceeds compressed limit');
 const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
 const chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8_000_000){await reader.cancel();throw new Error('Southern month exceeds decoded limit');}chunks.push(value);}
 const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}
 const rows=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
 if(!Array.isArray(rows)||rows.length>15000)throw new Error('Invalid southern month');
 return rows as SouthEvent[];
}
