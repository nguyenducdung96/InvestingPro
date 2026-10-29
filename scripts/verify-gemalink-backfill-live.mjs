import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url),base=process.env.SOUTH_VERIFY_BASE??'https://investing-pro-web-staging.tuyenkinhmon88.workers.dev';
const ledger=JSON.parse(await readFile(new URL('docs/catalog-review/gemalink-national-ledger.json',root),'utf8'));
const board=JSON.parse(await readFile(new URL('docs/catalog-review/south-history-ledger.json',root),'utf8'));
const receipt={verified_at:new Date().toISOString(),base_url:base,national_checked_at:ledger.metadata.checked_at,deployment_readback_verified:false,scheduled_refresh_verified:false,checks:[]};
const sum=values=>values.some(v=>v!=null)?values.reduce((n,v)=>n+(v??0),0):null;
async function get(path){const r=await fetch(base+path,{signal:AbortSignal.timeout(30000),redirect:'error'});assert.equal(r.status,200);return r.json();}
try{
 for(const direction of ['arrival','departure']){
  const result=await get(`/api/v1/companies/GMD/plans?asset=gemalink&direction=${direction}`);
  const national=result.sources.find(s=>s.source_url===ledger.metadata.source_url);assert.ok(national);assert.equal(national.checked_at,ledger.metadata.checked_at);assert.equal(national.events,ledger.metadata.events);
  assert.equal(result.actual_verified,false);assert.equal(result.full_scope_certified,false);
  for(const p of result.months){const a=board.monthly[p.period].gemalink[direction],b=ledger.monthly[p.period]?.[direction];assert.equal(p.current.known_rows,(a.rows??0)+(b?.rows??0));const weight=sum([a.dwt,b?.dwt]);if(weight===null)assert.equal(p.current.observed_dwt,null);else assert.ok(Math.abs(p.current.observed_dwt-weight)<0.001);assert.equal(p.current.dwt,null);}
  receipt.checks.push({direction,months_matched:result.months.length});
 }
 const sample=await get('/api/v1/companies/GMD/plans?asset=gemalink&direction=arrival&day=2025-06-29');
 assert.ok(sample.events.some(e=>e.national_document&&e.vessel==='CMA CGM VISBY'&&e.dwt===31285));
 receipt.deployment_readback_verified=true;
}catch(error){receipt.error=error.message;process.exitCode=1;}
const out=new URL('.local/gemalink-national/',root);await mkdir(out,{recursive:true});await writeFile(new URL('live-readback.json',out),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
