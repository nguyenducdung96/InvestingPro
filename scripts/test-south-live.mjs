import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordedRange,sumAvailable,assertAssetMonths,scheduledEvidence,fetchWithRetry,isTransientFetchError} from './lib/south-live.mjs';
test('no observations stay unavailable; partial recorded weights survive',()=>{
 assert.deepEqual(recordedRange({observed_days:0,known_rows:0,observed_dwt:null}),{rows:null,dwt:null});
 assert.deepEqual(recordedRange({observed_days:1,known_rows:2,observed_dwt:10}),{rows:2,dwt:10});
 assert.equal(sumAvailable([null,null]),null);assert.equal(sumAvailable([null,10]),10);
});
test('same numeric values from an older deployment do not pass',()=>{
 const metadata={checked_at:'new'},monthly={'2026-10':{gemalink:{departure:{rows:2,dwt:10}}}},period={period:'2026-10',current:{observed_days:1,known_rows:2,observed_dwt:10}};
 const data={metadata,actual_verified:false,months:[period]};assert.doesNotThrow(()=>assertAssetMonths(data,{metadata,monthly},'gemalink','departure'));
 assert.throws(()=>assertAssetMonths({...data,metadata:{checked_at:'old'}},{metadata,monthly},'gemalink','departure'),/edition differs/);
 assert.throws(()=>assertAssetMonths({...data,months:[]},{metadata,monthly},'gemalink','departure'),/matrix differs/);
});
const now=new Date('2026-10-27T03:00:00Z');
const cycle=(id,date,extra={})=>({verifier_version:'south-live/1',event_name:'schedule',run_id:id,run_attempt:'1',verified_at:date,deployment_readback_verified:true,source_refresh_success:true,...extra});
test('manual runs and replayed attempts cannot certify two scheduled cycles',()=>{
 const a=cycle('1','2026-10-26T02:00:00Z');
 assert.equal(scheduledEvidence([a,{...a,run_attempt:'2'}],now).scheduled_refresh_verified,false);
 assert.equal(scheduledEvidence([a,cycle('2','2026-10-27T02:00:00Z',{event_name:'workflow_dispatch'})],now).scheduled_refresh_verified,false);
 assert.equal(scheduledEvidence([a,cycle('2','2026-10-26T03:00:00Z')],now).scheduled_refresh_verified,false);
});
test('two real dates require source success and live readback; latest failure revokes acceptance',()=>{
 const a=cycle('1','2026-10-26T02:00:00Z'),b=cycle('2','2026-10-27T02:00:00Z');
 assert.equal(scheduledEvidence([a,b],now).scheduled_refresh_verified,true);
 assert.equal(scheduledEvidence([a,{...b,source_refresh_success:false}],now).scheduled_refresh_verified,false);
 assert.equal(scheduledEvidence([a,b,{...b,run_attempt:'2',deployment_readback_verified:false}],now).scheduled_refresh_verified,false);
 assert.equal(scheduledEvidence([a,b],new Date('2026-11-01')).scheduled_refresh_verified,false);
});
const fakeFetch=statuses=>{let n=0;const calls=[];const impl=async(url,options)=>{calls.push(options);const s=statuses[Math.min(n++,statuses.length-1)];if(s instanceof Error)throw s;return new Response(String(s),{status:s});};return {impl,calls,count:()=>n};};
const noSleep=async()=>{};
test('transient 503 is retried a bounded number of times and recorded',async()=>{
 const f=fakeFetch([503,503,200]),retries=[];
 const r=await fetchWithRetry('https://x/api',{},{fetchImpl:f.impl,sleep:noSleep,retries});
 assert.equal(r.status,200);assert.equal(f.count(),3);
 assert.deepEqual(retries.map(x=>[x.attempt,x.status]),[[1,503],[2,503]]);
 assert.ok(f.calls.every(o=>o.signal instanceof AbortSignal));
});
test('persistent 503 still fails after the attempt limit',async()=>{
 const f=fakeFetch([503]),retries=[];
 const r=await fetchWithRetry('https://x/api',{},{fetchImpl:f.impl,sleep:noSleep,retries,attempts:4});
 assert.equal(r.status,503);assert.equal(f.count(),4);assert.equal(retries.length,3);
});
test('non-transient statuses and redirects are not retried',async()=>{
 for(const status of [404,500,429]){const f=fakeFetch([status,200]);const r=await fetchWithRetry('https://x',{},{fetchImpl:f.impl,sleep:noSleep});assert.equal(r.status,status);assert.equal(f.count(),1);}
 const redirect=new TypeError('fetch failed',{cause:new Error('unexpected redirect')});
 assert.equal(isTransientFetchError(redirect),false);
 const f=fakeFetch([redirect,200]);await assert.rejects(fetchWithRetry('https://x',{},{fetchImpl:f.impl,sleep:noSleep}),/fetch failed/);assert.equal(f.count(),1);
});
test('timeouts and connection resets are transient; backoff is exponential',async()=>{
 const reset=new TypeError('fetch failed',{cause:Object.assign(new Error('reset'),{code:'ECONNRESET'})});
 const timeout=Object.assign(new Error('timed out'),{name:'TimeoutError'});
 assert.ok(isTransientFetchError(reset));assert.ok(isTransientFetchError(timeout));
 const waits=[],f=fakeFetch([timeout,reset,200]);
 const r=await fetchWithRetry('https://x',{},{fetchImpl:f.impl,sleep:async ms=>{waits.push(ms);},baseDelayMs:5000});
 assert.equal(r.status,200);assert.deepEqual(waits,[5000,10000]);
});
