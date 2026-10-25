import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
const root=new URL('../',import.meta.url),out=new URL('.local/pdn/',root),archive=new URL('receipts/',out);
const ledger=JSON.parse(await readFile(new URL('docs/catalog-review/pdn-history-ledger.json',root),'utf8'));
const base=process.env.PDN_VERIFY_BASE??'https://investing-pro-web-staging.tuyenkinhmon88.workers.dev';
const collect=JSON.parse(await readFile(new URL('collect-receipt.json',out),'utf8'));
const receipt={verified_at:new Date().toISOString(),base_url:base,checked_at:ledger.metadata.checked_at,through:ledger.metadata.through,event_name:process.env.GITHUB_EVENT_NAME??'local',run_id:process.env.GITHUB_RUN_ID??'local',source_refresh_success:collect.source_refresh_success===true,deployment_readback_verified:false,scheduled_refresh_verified:false,actual_verified:false,checks:[]};
await mkdir(archive,{recursive:true});
const assets=['pdn','pdn_long_binh_tan','pdn_go_dau','pdn_go_dau_a','pdn_go_dau_b'];
const includes=(scope,asset)=>scope==='pdn'||scope===asset||(scope==='pdn_go_dau'&&asset!=='pdn_long_binh_tan');
async function get(path){const r=await fetch(base+path,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{Accept:'application/json'}});assert.equal(r.status,200,path);return r.json();}
function expected(month,scope,direction){
 const values=Object.entries(ledger.monthly[month]??{}).filter(([asset])=>includes(scope,asset)).map(([,dirs])=>dirs[direction]).filter(Boolean);
 return {rows:values.reduce((n,v)=>n+v.rows,0),dwt:values.some(v=>v.dwt!==null)?values.reduce((n,v)=>n+(v.dwt??0),0):null,missing:values.reduce((n,v)=>n+v.missing_dwt,0)};
}
function near(a,b,label){if(b===null)assert.equal(a,null,label);else{assert.equal(typeof a,'number',label);assert.ok(Math.abs(a-b)<.001,label+': '+a+' != '+b);}}
try{
 assert.equal(receipt.source_refresh_success,true,'Source collection must succeed first');
 const until=Date.now()+10*60000;
 while(true){try{const current=await get('/api/v1/companies/PDN/plans');assert.equal(current.quality.checked_at,ledger.metadata.checked_at,'collected edition not deployed');break;}catch(e){if(Date.now()>until)throw e;console.log('Waiting for deployed PDN edition');await delay(15000);}}
 for(const direction of ['arrival','departure']){
  let combined;
  for(const asset of assets){
   const payload=await get('/api/v1/companies/PDN/plans?'+new URLSearchParams({asset,direction})),s=payload.data;
   assert.equal(payload.quality.checked_at,ledger.metadata.checked_at);assert.equal(s.actual_verified,false);assert.equal(s.full_scope_certified,false);assert.equal(s.semantics,'authority_published_berth_plan');
   for(const p of s.months){const e=expected(p.period,asset,direction);assert.equal(p.current.known_rows,e.rows,`${asset}/${direction}/${p.period} rows`);near(p.current.observed_dwt,e.dwt,`${asset}/${direction}/${p.period} DWT`);assert.equal(p.current.missing_dwt,e.missing);assert.equal(p.current.dwt,null);assert.equal(p.current.rows,null);}
   const day=await get('/api/v1/companies/PDN/plans?'+new URLSearchParams({asset,direction,day:ledger.metadata.through}));
   assert.ok(day.data.every(e=>e.kind===direction&&e.day===ledger.metadata.through&&includes(asset,e.asset)));
   if(asset==='pdn')combined=s;
   receipt.checks.push({asset,direction,months:s.months.length,journal_direction_matched:true});
  }
  const period=ledger.metadata.through.slice(0,7),overview=await get('/api/v1/industries/ports/south?'+new URLSearchParams({period,direction}));
  const row=overview.rows.find(r=>r.ticker==='PDN'),p=combined.months.find(p=>p.period===period);
  assert.equal(row.status,'integrated');assert.equal(row.metric.current.known_rows,p.current.known_rows);near(row.metric.current.observed_dwt,p.current.observed_dwt,'PDN overview');assert.equal(overview.regional_total,null);
 }
 for(const query of ['asset=gemalink','day=2026-02-30','direction=internal']){const r=await fetch(base+'/api/v1/companies/PDN/plans?'+query);assert.equal(r.status,400);}
 receipt.deployment_readback_verified=true;
}catch(e){receipt.error=e.message;process.exitCode=1;}
receipt.verified_at=new Date().toISOString();
const prior=[];for(const path of await readdir(archive))if(path.endsWith('.json'))try{prior.push(JSON.parse(await readFile(new URL(path,archive),'utf8')));}catch{/* Broken receipts never prove a scheduled success. */}
const scheduled=[...prior,receipt].filter(r=>r.event_name==='schedule'&&r.source_refresh_success&&r.deployment_readback_verified&&Date.now()-Date.parse(r.verified_at)<7*86400000);
receipt.scheduled_refresh_verified=new Set(scheduled.map(r=>r.run_id)).size>=2;
await writeFile(new URL(`${receipt.run_id}-${Date.now()}.json`,archive),JSON.stringify(receipt,null,2)+'\n');
await writeFile(new URL('live-receipt.json',out),JSON.stringify(receipt,null,2)+'\n');
if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,`## PDN deployed edition\n\n- Through: ${receipt.through}\n- Source refresh: ${receipt.source_refresh_success}\n- Deployed API reconciliation: ${receipt.deployment_readback_verified}\n- Two real scheduled runs: ${receipt.scheduled_refresh_verified}\n`,{flag:'a'});
console.log(JSON.stringify(receipt));

