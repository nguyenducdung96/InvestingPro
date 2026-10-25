import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {assertEdition,assertAssetMonths,recordedRange,sumAvailable,scheduledEvidence} from './lib/south-live.mjs';
const base='https://investing-pro-web-staging.tuyenkinhmon88.workers.dev';
const root=new URL('../',import.meta.url),out=new URL('.local/south-plans/',root),archive=new URL('receipts/',out);
const ledger=JSON.parse(await readFile(new URL('docs/catalog-review/south-history-ledger.json',root),'utf8'));
const receipt={verifier_version:'south-live/1',verified_at:new Date().toISOString(),base_url:base,expected_checked_at:ledger.metadata.checked_at,through:ledger.metadata.through,event_name:process.env.GITHUB_EVENT_NAME??'local',run_id:process.env.GITHUB_RUN_ID??'local',run_attempt:process.env.GITHUB_RUN_ATTEMPT??'1',published_commit:process.env.PUBLISHED_COMMIT??null,source_refresh_success:process.env.COLLECTOR_OUTCOME==='success',deployment_readback_verified:false,scheduled_refresh_verified:false,actual_verified:false,full_scope_certified:false,checks:[]};
await mkdir(archive,{recursive:true});
async function get(path){const r=await fetch(base+path,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{Accept:'application/json'}});if(!r.ok)throw Error(`Live API HTTP ${r.status}: ${path}`);return r.json();}
try{
 if(process.argv.includes('--source-unavailable'))throw Error('Initial authority connection failed; keep the last published edition.');
 // A new collection timestamp proves this refresh is deployed, even when all counts are unchanged.
 const until=Date.now()+10*60000;let lastError;
 while(true){try{assertEdition(await get('/api/v1/companies/GMD/plans?asset=gemalink'),ledger.metadata);break;}catch(error){lastError=error;if(Date.now()>=until)throw lastError;console.log('Waiting for the collected edition to deploy: '+error.message.split('\n')[0]);await delay(15000);}}
 for(const direction of ['arrival','departure']){
  const series={};
  for(const [asset,ticker] of [['gemalink','GMD'],['sg_hiep_phuoc','SGP'],['cmit','SGP'],['sp_psa','SGP'],['ssit','SGP']]){
   const data=await get(`/api/v1/companies/${ticker}/plans?asset=${asset}&direction=${direction}`);assertAssetMonths(data,ledger,asset,direction);series[asset]=data;receipt.checks.push({asset,direction,months_matched:data.months.length});
  }
  const combined=await get(`/api/v1/companies/SGP/plans?asset=sgp&direction=${direction}`);assertEdition(combined,ledger.metadata);
  for(const p of combined.months)for(const key of ['rows','dwt'])assert.equal(recordedRange(p.current)[key],sumAvailable(['sg_hiep_phuoc','cmit','sp_psa','ssit'].map(a=>ledger.monthly[p.period][a][direction][key])),`SGP aggregate ${p.period}/${direction}/${key}`);
  const period=ledger.metadata.through.slice(0,7),region=await get(`/api/v1/industries/ports/south?period=${period}&direction=${direction}`);
  assert.equal(region.regional_total,null);assert.equal(region.nationwide_complete,false);
  for(const [ticker,data] of [['GMD',series.gemalink],['SGP',combined]])assert.deepEqual(recordedRange(region.rows.find(r=>r.ticker===ticker).metric.current),recordedRange(data.months.find(p=>p.period===period).current));
  receipt.checks.push({direction,sgp_aggregate_matched:true,south_overview_matched:true});
 }
 receipt.deployment_readback_verified=true;
}catch(error){receipt.error=error.message;process.exitCode=1;}
receipt.verified_at=new Date().toISOString();
const previous=[];for(const file of await readdir(archive)){if(file.endsWith('.json'))try{previous.push(JSON.parse(await readFile(new URL(file,archive),'utf8')));}catch{/* Invalid evidence never counts as a successful cycle. */}}
Object.assign(receipt,scheduledEvidence([...previous,receipt]));
await writeFile(new URL(`${receipt.run_id}-${receipt.run_attempt}.json`,archive),JSON.stringify(receipt,null,2)+'\n');
await writeFile(new URL('live-readback.json',out),JSON.stringify(receipt,null,2)+'\n');
if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,`## Southern refresh readback\n\n- Event: ${receipt.event_name}\n- Collected edition: ${receipt.expected_checked_at}\n- Live readback: ${receipt.deployment_readback_verified}\n- Two recent real scheduled cycles verified: ${receipt.scheduled_refresh_verified}\n${receipt.error?'\nError: '+receipt.error+'\n':''}`,{flag:'a'});
console.log(JSON.stringify(receipt));
