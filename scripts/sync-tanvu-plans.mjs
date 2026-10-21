import {readFile,writeFile} from 'node:fs/promises';
import {supabaseKeyHeaders} from '../packages/db/src/api-key-headers.mjs';
const root='.local/php-slice2a/tanvu-month-pilot/';
const receipt=JSON.parse(await readFile(root+'receipt.json','utf8'));
const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key)throw new Error('Configure staging scheduler credentials.');
const url=new URL(base);
if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))throw new Error('Expected Supabase project URL');
if(receipt.asset!=='TAN VU'||receipt.semantics!=='authority_published_plan'||!Array.isArray(receipt.days)||!receipt.days.length)throw new Error('Invalid schedule receipt');
async function rpc(name,body){
 const r=await fetch(new URL('/rest/v1/rpc/'+name,url),{method:'POST',headers:{...supabaseKeyHeaders(key),'Content-Type':'application/json','Content-Profile':'port'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
 if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(`${name}: HTTP ${r.status}, code ${e.code??'unknown'}`);}
 return r.status===204?null:r.json();
}
const run={id:process.env.GITHUB_RUN_ID?`${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT??'1'}`:`manual-${Date.now()}`,
 checked_at:new Date().toISOString(),through_day:receipt.through,status:'running',requested_days:receipt.days.length,parsed_days:receipt.days.filter(d=>d.status==='parsed').length,error:null};
await rpc('record_tanvu_plan_run',{p_run:run});
let inserted=0,batches=0;
try{
 for(let offset=0;offset<receipt.days.length;offset+=31){
  const days=receipt.days.slice(offset,offset+31).map(d=>({date:d.date,status:d.status,source_url:d.url_at_fetch,
   fetched_at:d.fetched_at??receipt.checked_at,sha256:d.sha256,parser_version:receipt.parser_version,
   source_empty_sections:d.source_empty_sections??[],error:d.status==='failed'?'Official source fetch or schema validation failed':null,
   events:(d.events??[]).map(e=>({direction:e.direction,vessel_name:e.source_row['Tên tàu'],planned_time:e.source_row['Thời gian'],
    dwt:e.dwt===null?null:Number(e.dwt),from_berth:e.source_row['Từ'],to_berth:e.source_row['Đến']}))}));
  const result=await rpc('import_tanvu_plan_days',{p_days:days});
  inserted+=result.versions_inserted;batches++;
 }
 run.status=run.parsed_days===run.requested_days&&process.env.COLLECTOR_OUTCOME!=='failure'?'success':'failed';
 if(run.status==='failed')run.error='One or more source days failed; successful prior versions retained';
}catch(error){run.status='failed';run.error=error.message;}
run.checked_at=new Date().toISOString();
await rpc('record_tanvu_plan_run',{p_run:run});
// Read back the published day head and its public totals, not just RPC status.
const readback=await fetch(new URL('/rest/v1/tanvu_plan_days?select=report_day,departure_rows,departure_dwt,source_sha256,last_success,source_error&report_day=eq.'+receipt.through,url),{headers:{...supabaseKeyHeaders(key),'Accept-Profile':'port'},signal:AbortSignal.timeout(15000)});
if(!readback.ok)throw new Error('Schedule public readback failed: HTTP '+readback.status);
const latest=await readback.json();
if(run.status==='success'&&(!latest[0]?.source_sha256||latest[0].source_error))throw new Error('Latest schedule head not confirmed');
const result={...run,credential_kind:key.startsWith('sb_secret_')?'secret':'legacy',versions_inserted:inserted,batches,latest};
await writeFile(root+'last-sync.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
if(run.status!=='success')process.exitCode=1;
