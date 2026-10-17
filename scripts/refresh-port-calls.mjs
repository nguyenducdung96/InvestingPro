import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {CALL_SOURCE,parseCallNotices,sha256} from '../packages/modules/port/src/calls.ts';
const dir='.local/port-calls';await mkdir(dir,{recursive:true});
// curl uses the OS trust store on Windows; TLS verification stays enabled.
execFileSync('curl.exe',['--fail','--location','--max-time','60','--max-filesize','5000000',CALL_SOURCE,'-o',`${dir}/latest.html`],{stdio:'inherit'});
const raw_text=await readFile(`${dir}/latest.html`,'utf8');const parsed=await parseCallNotices(raw_text);
const bundle={source_url:CALL_SOURCE,fetched_at:new Date().toISOString(),raw_sha256:await sha256(raw_text),raw_text};
await writeFile(`${dir}/staging-bundle.json`,JSON.stringify(bundle));
await writeFile(`${dir}/preview.json`,JSON.stringify(parsed,null,2));
console.log(JSON.stringify({rows:parsed.rows.length,quarantined:parsed.rows.filter(r=>r.quarantine_reason).length,days:parsed.reported_days,output:`${dir}/staging-bundle.json`},null,2));
