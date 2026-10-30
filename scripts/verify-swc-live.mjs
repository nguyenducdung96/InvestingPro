import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {assertAssetMonths,assertEdition,recordedRange,sumAvailable} from './lib/south-live.mjs';
import {setTimeout as delay} from 'node:timers/promises';
const ledger=JSON.parse(await readFile(new URL('../docs/catalog-review/swc-longbinh-history-ledger.json',import.meta.url),'utf8'));
const base=process.env.SWC_VERIFY_BASE??'https://investing-pro-web-staging.tuyenkinhmon88.workers.dev';
const receipt={verified_at:new Date().toISOString(),base_url:base,published_commit:process.env.PUBLISHED_COMMIT??null,expected_metadata:ledger.metadata,checks:[],deployment_readback_verified:false,scheduled_refresh_verified:false};
async function get(path){const r=await fetch(base+path,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);return r.json();}
try{
 if(process.argv.includes('--wait')){
  const until=Date.now()+10*60000;
  while(true){try{assertEdition(await get('/api/v1/companies/SWC/plans?asset=swc_long_binh'),ledger.metadata);break;}catch(e){if(Date.now()>until)throw e;console.log('Waiting for the SWC edition to deploy');await delay(15000);}}
 }
 for(const direction of ['arrival','departure']){
  const data=await get(`/api/v1/companies/SWC/plans?asset=swc_long_binh&direction=${direction}`);
  assertAssetMonths(data,ledger,'swc_long_binh',direction);assert.equal(data.full_scope_certified,false);
  assert.ok(data.months.every(p=>p.current.dwt===null));
  const buoys=await get(`/api/v1/companies/SWC/plans?asset=swc_buoys&direction=${direction}`),combined=await get(`/api/v1/companies/SWC/plans?asset=swc_all&direction=${direction}`);
  for(const month of combined.months){
   const parts=[data,buoys].map(s=>s.months.find(p=>p.period===month.period));
   for(const key of ['rows','dwt']){
    const expected=sumAvailable(parts.map(p=>p?recordedRange(p.current)[key]:null)),actual=recordedRange(month.current)[key];
    if(expected===null)assert.equal(actual,null);else assert.ok(actual!==null&&Math.abs(actual-expected)<1e-5);
   }
  }
  const day=ledger.metadata.last_observation_by_direction[direction],journal=await get(`/api/v1/companies/SWC/plans?asset=swc_long_binh&direction=${direction}&day=${day}`);
  assert.ok(journal.events.length);assert.ok(journal.events.every(e=>e.harbour_code==='K0005'&&e.direction===direction&&e.source_url===ledger.metadata.source_url));
  const region=await get(`/api/v1/industries/ports/south?period=2026-06&direction=${direction}`);
  assert.equal(region.regional_total,null);assert.equal(region.rows.filter(r=>r.ticker==='SWC').length,2);
  assert.deepEqual(recordedRange(region.rows.find(r=>r.asset==='swc_long_binh').metric.current),recordedRange(data.months.find(p=>p.period==='2026-06').current));
  receipt.checks.push({direction,months_matched:data.months.length,journal_day:day,aggregate_matched:true,regional_matched:true});
 }
 assert.equal((await get('/api/v1/companies/SWC/plans')).asset,'swc_long_binh');
 receipt.deployment_readback_verified=true;
}catch(e){receipt.error=e.message;process.exitCode=1;}
await mkdir('.local/swc',{recursive:true});await writeFile('.local/swc/live-readback.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
