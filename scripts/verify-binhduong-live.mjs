import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const ledger=JSON.parse(await readFile(new URL('docs/catalog-review/binhduong-history-ledger.json',root),'utf8'));
const base=process.env.SOUTH_VERIFY_BASE??'https://investing-pro-web-staging.tuyenkinhmon88.workers.dev';
const receipt={verified_at:new Date().toISOString(),base_url:base,through:ledger.metadata.through,checked_at:ledger.metadata.checked_at,deployment_readback_verified:false,scheduled_refresh_verified:false,checks:[]};
async function get(path){const r=await fetch(base+path,{redirect:'error',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);return r.json();}
try{
 for(const direction of ['arrival','departure']){
  const result=await get(`/api/v1/companies/GMD/plans?asset=gmd_binh_duong&direction=${direction}`);
  assert.equal(result.metadata.checked_at,ledger.metadata.checked_at,'Published edition differs');
  assert.equal(result.metadata.through,ledger.metadata.through);
  assert.deepEqual(result.metadata.last_observation_by_direction,ledger.metadata.last_observation_by_direction);
  assert.equal(result.metadata.coverage_status,'partial');assert.equal(result.metadata.absence_means_zero,false);
  assert.equal(result.actual_verified,false);assert.equal(result.full_scope_certified,false);
  for(const period of result.months){
   const expected=ledger.monthly[period.period]?.gmd_binh_duong?.[direction];
   assert.equal(period.current.known_rows,expected?.rows??0,`${period.period}/${direction} rows`);
   if(expected?.dwt==null)assert.equal(period.current.observed_dwt,null);
   else assert.ok(Math.abs(period.current.observed_dwt-expected.dwt)<0.001,`${period.period}/${direction} DWT`);
   assert.equal(period.current.dwt,null);
  }
  const day=ledger.metadata.last_observation_by_direction[direction];
  const detail=await get(`/api/v1/companies/GMD/plans?asset=gmd_binh_duong&direction=${direction}&day=${day}`);
  assert.ok(detail.events.length>0);
  for(const event of detail.events){assert.equal(event.direction,direction);assert.equal(event.harbour_code,'BC198');assert.match(event.sha256,/^[a-f0-9]{64}$/);}
  receipt.checks.push({direction,months_matched:result.months.length,last_observation:day,journal_rows:detail.events.length});
 }
 const page=await fetch(base+'/companies/GMD?plan_asset=gmd_binh_duong',{signal:AbortSignal.timeout(30000)});
 assert.equal(page.status,200);assert.ok((await page.text()).includes('Bối cảnh nguồn Bình Dương từ tháng 7/2026'));
 receipt.deployment_readback_verified=true;
}catch(error){receipt.error=error.message;process.exitCode=1;}
const out=new URL('.local/binhduong-research/',root);await mkdir(out,{recursive:true});
await writeFile(new URL('live-readback.json',out),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
