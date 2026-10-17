import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {CALL_SOURCES,callSource,parseCallSource,sha256} from '../packages/modules/port/src/calls.ts';
import {fetchPublicAnchorage,PUBLIC_ANCHORAGE_SOURCES} from '../packages/modules/port/src/public-anchorage.ts';
import {fetchNgheAnReports} from '../packages/modules/port/src/nghean-reports.ts';
const args=process.argv.slice(2).filter(a=>a!=='--');
const all=args.includes('--all');
const sourceIndex=args.indexOf('--source');
if(all&&sourceIndex>=0)throw new Error('Choose --all or --source');
if(sourceIndex>=0&&!args[sourceIndex+1])throw new Error('--source requires an ID');
const source=callSource(sourceIndex>=0?args[sourceIndex+1]:'quangtri-cua-viet');
if(!source)throw new Error('Unknown source');
const dir='.local/port-calls';await mkdir(dir,{recursive:true});
const results=[];
for(const current of all?CALL_SOURCES:[source]){
 const sourceDir=`${dir}/${current.id}`;await mkdir(sourceDir,{recursive:true});
 try{
  let raw_text;
  if(PUBLIC_ANCHORAGE_SOURCES.some(s=>s.id===current.id))raw_text=await fetchPublicAnchorage(current.id);
  else if(current.id==='nghean-reported')raw_text=await fetchNgheAnReports();
  else{
   // OS trust store on Windows; TLS verification stays enabled.
   execFileSync(process.platform==='win32'?'curl.exe':'curl',['--fail','--location','--max-time','60','--max-filesize','5000000',current.url,'-o',`${sourceDir}/latest.html`],{stdio:'inherit'});
   raw_text=await readFile(`${sourceDir}/latest.html`,'utf8');
  }
  const fetched_at=new Date().toISOString();const raw_sha256=await sha256(raw_text);
  // Archive each retrieval before parsing so changed formats can be investigated.
  const archive=`${sourceDir}/${fetched_at.replaceAll(':','-')}-${raw_sha256}`;
  const bundle={source_url:current.url,fetched_at,raw_sha256,raw_text};
  await writeFile(`${archive}.bundle.json`,JSON.stringify(bundle),{flag:'wx'});
  const parsed=await parseCallSource(raw_text,current.id,fetched_at);
  await writeFile(`${sourceDir}/staging-bundle.json`,JSON.stringify(bundle));
  await writeFile(`${sourceDir}/preview.json`,JSON.stringify(parsed,null,2));
  if(!all){
   await writeFile(`${dir}/staging-bundle.json`,JSON.stringify(bundle));
   await writeFile(`${dir}/preview.json`,JSON.stringify(parsed,null,2));
  }
  const result={source_id:current.id,status:'success',fetched_at,raw_sha256,rows:parsed.rows.length,quarantined:parsed.rows.filter(r=>r.quarantine_reason).length,days:parsed.reported_days,output:`${sourceDir}/staging-bundle.json`};
  results.push(result);console.log(JSON.stringify(result));
 }catch(error){
  const result={source_id:current.id,status:'failed',checked_at:new Date().toISOString(),error:error instanceof Error?error.message:String(error)};
  results.push(result);console.error(JSON.stringify(result));process.exitCode=1;
 }
 await writeFile(`${sourceDir}/last-run.json`,JSON.stringify(results.at(-1),null,2));
}
await writeFile(`${dir}/last-run.json`,JSON.stringify({completed_at:new Date().toISOString(),scope:all?'all_registered_sources':source.id,results},null,2));
