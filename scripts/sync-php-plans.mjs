import {readFile,writeFile} from 'node:fs/promises';
import {supabaseKeyHeaders} from '../packages/db/src/api-key-headers.mjs';
const company=process.argv.includes('--haiphong')?'HAIPHONG':process.argv.includes('--vsc')?'VSC':process.argv.includes('--dvp')?'DVP':'PHP';
const root=company==='HAIPHONG'?'.local/haiphong-plans/':company==='VSC'?'.local/vsc-plans/':company==='DVP'?'.local/dvp-plans/':'.local/php-plans/';
const receipt=JSON.parse(await readFile(root+'receipt.json','utf8'));
const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key)throw new Error('Configure staging scheduler credentials.');
const url=new URL(base);
if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))throw new Error('Expected Supabase project URL');
const assets=company==='HAIPHONG'?['nam_dinh_vu','hai_an','doan_xa','ptsc_dinh_vu']:company==='VSC'?['green_port','vip_green_port','nam_hai_dinh_vu','vimc_dinh_vu']:company==='DVP'?['dinh_vu']:['tan_vu','chua_ve','hoang_dieu','htit'];
if(receipt.semantics!=='authority_published_plan'||assets.some(a=>!Array.isArray(receipt.assets?.[a])||!receipt.assets[a].length))throw new Error('Invalid schedule receipt');
async function rpc(name,body){
 const r=await fetch(new URL('/rest/v1/rpc/'+name,url),{method:'POST',headers:{...supabaseKeyHeaders(key),'Content-Type':'application/json','Content-Profile':'port'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
 if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(`${name}: HTTP ${r.status}, code ${e.code??'unknown'}`);}
 return r.status===204?null:r.json();
}
const results=[];
for(const asset of assets){
receipt.days=receipt.assets[asset];
const run={id:process.env.GITHUB_RUN_ID?`${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT??'1'}`:`manual-${Date.now()}`,
 checked_at:new Date().toISOString(),through_day:receipt.through,status:'running',requested_days:receipt.days.length,parsed_days:receipt.days.filter(d=>d.status==='parsed').length,error:null};
await rpc('record_php_plan_run',{p_asset:asset,p_run:run});
let inserted=0,batches=0;
try{
 for(let offset=0;offset<receipt.days.length;offset+=31){
  const days=receipt.days.slice(offset,offset+31).map(d=>({date:d.date,status:d.status,source_url:d.url_at_fetch,
   fetched_at:d.fetched_at??receipt.checked_at,sha256:d.sha256,parser_version:receipt.parser_version,
   source_empty_sections:d.source_empty_sections??[],error:d.status==='failed'?'Official source fetch or schema validation failed':null,
   events:(d.events??[]).map(e=>({direction:e.direction,vessel_name:e.source_row['Tên tàu'],planned_time:e.source_row['Thời gian'],
    dwt:e.dwt===null?null:Number(e.dwt),from_berth:e.source_row['Từ'],to_berth:e.source_row['Đến']}))}));
  const result=await rpc('import_php_plan_days',{p_asset:asset,p_days:days});
  inserted+=result.versions_inserted;batches++;
 }
 run.status=run.parsed_days===run.requested_days&&process.env.COLLECTOR_OUTCOME!=='failure'?'success':'failed';
 if(run.status==='failed')run.error='One or more source days failed; successful prior versions retained';
}catch(error){run.status='failed';run.error=error.message;}
// Read back the published day head and its public totals, not just RPC status.
let latest=[];
try{
 const readback=await fetch(new URL('/rest/v1/php_plan_days?asset_code=eq.'+asset+'&select=report_day,departure_rows,departure_dwt,source_sha256,last_success,source_error&report_day=eq.'+receipt.through,url),{headers:{...supabaseKeyHeaders(key),'Accept-Profile':'port'},signal:AbortSignal.timeout(15000)});
 if(!readback.ok)throw new Error('Schedule public readback failed: HTTP '+readback.status);
 latest=await readback.json();
 if(run.status==='success'&&(!latest[0]?.source_sha256||latest[0].source_error))throw new Error('Latest schedule head not confirmed');
}catch(error){run.status='failed';run.error=error.message;}
run.checked_at=new Date().toISOString();
await rpc('record_php_plan_run',{p_asset:asset,p_run:run});
const result={asset,...run,credential_kind:key.startsWith('sb_secret_')?'secret':'legacy',versions_inserted:inserted,batches,latest};
results.push(result);
console.log(JSON.stringify(result));
if(run.status!=='success')process.exitCode=1;
}
await writeFile(root+'last-sync.json',JSON.stringify({checked_at:new Date().toISOString(),results},null,2)+'\n');
