import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {callSource,parseCallSource,sha256} from '../packages/modules/port/src/calls.ts';
import {fetchBinhThuanPositions} from '../packages/modules/port/src/public-anchorage.ts';
const args=process.argv.slice(2).filter(a=>a!=='--');const source=callSource(args[args.indexOf('--source')+1]??'quangtri-cua-viet');if(!source)throw new Error('Unknown source');
const dir='.local/port-calls';await mkdir(dir,{recursive:true});
// curl uses the OS trust store on Windows; TLS verification stays enabled.
let raw_text;
if(source.id==='binhthuan-open-anchorage')raw_text=await fetchBinhThuanPositions();
else{execFileSync(process.platform==='win32'?'curl.exe':'curl',['--fail','--location','--max-time','60','--max-filesize','5000000',source.url,'-o',`${dir}/latest.html`],{stdio:'inherit'});raw_text=await readFile(`${dir}/latest.html`,'utf8');}
const fetched_at=new Date().toISOString();const parsed=await parseCallSource(raw_text,source.id,fetched_at);
const bundle={source_url:source.url,fetched_at,raw_sha256:await sha256(raw_text),raw_text};
await writeFile(`${dir}/staging-bundle.json`,JSON.stringify(bundle));
await writeFile(`${dir}/preview.json`,JSON.stringify(parsed,null,2));
console.log(JSON.stringify({rows:parsed.rows.length,quarantined:parsed.rows.filter(r=>r.quarantine_reason).length,days:parsed.reported_days,output:`${dir}/staging-bundle.json`},null,2));
