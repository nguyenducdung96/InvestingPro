// Select missing/new days from the DB checkpoint plus the recent revision window.
import {mkdir,writeFile} from 'node:fs/promises';
import {supabaseKeyHeaders} from '../packages/db/src/api-key-headers.mjs';
const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key)throw new Error('Configure staging scheduler credentials');
const url=new URL(base);if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))throw new Error('Expected Supabase project URL');
const known=new Map();
for(let offset=0;;offset+=1000){
 const r=await fetch(new URL(`/rest/v1/tanvu_plan_days?select=report_day,version_id,source_error&order=report_day.asc&limit=1000&offset=${offset}`,url),{headers:{...supabaseKeyHeaders(key),'Accept-Profile':'port'},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error(`Checkpoint read failed: HTTP ${r.status}`);
 const page=await r.json();for(const row of page)known.set(row.report_day,row);
 if(page.length<1000)break;
}
const day=86400000,today=Date.parse(new Date(Date.now()+7*3600000).toISOString().slice(0,10)),cutoff=today-day;
const requested=[];
for(let n=Date.parse('2025-01-01');n<=cutoff;n+=day){
 const date=new Date(n).toISOString().slice(0,10),row=known.get(date);
 if(!row?.version_id||row.source_error||n>=cutoff-3*day)requested.push(date);
}
const root='.local/php-slice2a/tanvu-month-pilot/';await mkdir(root,{recursive:true});
await writeFile(root+'requested-days.json',JSON.stringify(requested)+'\n');
console.log(JSON.stringify({db_checkpoint_days:known.size,requested_days:requested.length,through:new Date(cutoff).toISOString().slice(0,10)}));
