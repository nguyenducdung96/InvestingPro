import {mkdir,writeFile} from 'node:fs/promises';
import {supabaseKeyHeaders} from '../packages/db/src/api-key-headers.mjs';
const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key)throw new Error('Configure staging scheduler credentials');
const url=new URL(base);if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))throw new Error('Expected Supabase project URL');
const assets=process.argv.includes('--cdn')?['tien_sa']:process.argv.includes('--cqn')?['cqn_cai_lan']:process.argv.includes('--haiphong')?['nam_dinh_vu','hai_an','doan_xa','ptsc_dinh_vu']:process.argv.includes('--vsc')?['green_port','vip_green_port','nam_hai_dinh_vu','vimc_dinh_vu']:process.argv.includes('--dvp')?['dinh_vu']:['tan_vu','chua_ve','hoang_dieu','htit'],known=new Map();
const root=process.argv.includes('--cdn')?'.local/cdn-plans':process.argv.includes('--cqn')?'.local/cqn-plans':process.argv.includes('--haiphong')?'.local/haiphong-plans':process.argv.includes('--vsc')?'.local/vsc-plans':process.argv.includes('--dvp')?'.local/dvp-plans':'.local/php-plans';
for(let offset=0;;offset+=1000){
 const r=await fetch(new URL(`/rest/v1/php_plan_days?select=asset_code,report_day,version_id,source_error&order=asset_code.asc,report_day.asc&limit=1000&offset=${offset}`,url),{headers:{...supabaseKeyHeaders(key),'Accept-Profile':'port'},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error(`Checkpoint read failed: HTTP ${r.status}`);
 const page=await r.json();for(const row of page)known.set(`${row.asset_code}/${row.report_day}`,row);
 if(page.length<1000)break;
}
const day=86400000,today=Date.parse(new Date(Date.now()+7*3600000).toISOString().slice(0,10)),cutoff=today-day,requested=[];
for(let n=Date.parse('2025-01-01');n<=cutoff;n+=day){
 const date=new Date(n).toISOString().slice(0,10);
 if(n>=cutoff-3*day||assets.some(asset=>{const row=known.get(`${asset}/${date}`);return !row?.version_id||row.source_error;}))requested.push(date);
}
await mkdir(root,{recursive:true});
await writeFile(root+'/requested-days.json',JSON.stringify(requested)+'\n');
console.log(JSON.stringify({db_checkpoint_berth_days:known.size,requested_report_days:requested.length,assets,through:new Date(cutoff).toISOString().slice(0,10)}));
