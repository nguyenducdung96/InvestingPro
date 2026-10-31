import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
// Bounded retry for transient gateway/network failures only. Edition, matrix and
// provenance assertions are never retried here; a wrong edition still fails.
export const TRANSIENT_HTTP_STATUS=new Set([502,503,504]);
const TRANSIENT_NETWORK_CODES=new Set(['ECONNRESET','ECONNREFUSED','ETIMEDOUT','EAI_AGAIN','UND_ERR_SOCKET','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT']);
export function isTransientFetchError(error){
 if(error?.name==='TimeoutError')return true;
 const code=error?.cause?.code??error?.code;
 return TRANSIENT_NETWORK_CODES.has(code);
}
export async function fetchWithRetry(url,options={},{attempts=4,baseDelayMs=5000,timeoutMs=30000,fetchImpl=fetch,sleep=delay,retries=[]}={}){
 for(let attempt=1;;attempt++){
  let response=null,error=null;
  try{response=await fetchImpl(url,{...options,signal:AbortSignal.timeout(timeoutMs)});}catch(caught){error=caught;}
  const transient=error?isTransientFetchError(error):TRANSIENT_HTTP_STATUS.has(response.status);
  if(!transient||attempt>=attempts){if(error)throw error;return response;}
  const wait=baseDelayMs*2**(attempt-1);
  retries.push({url,attempt,status:response?.status??null,error:error?(error.cause?.code??error.name):null,retry_after_ms:wait,at:new Date().toISOString()});
  try{await response?.body?.cancel();}catch{}
  await sleep(wait);
 }
}
export const recordedRange=r=>({rows:r.observed_days?r.known_rows:null,dwt:r.observed_dwt});
export const sumAvailable=values=>values.some(v=>v!==null)?values.reduce((n,v)=>n+(v??0),0):null;
export function assertEdition(data,metadata){
 for(const key of ['checked_at','from','through','requested_days','parser_version'])assert.equal(data.metadata?.[key],metadata[key],`Live edition differs: ${key}`);
 if(metadata.scope_review_sha256)assert.equal(data.metadata?.scope_review_sha256,metadata.scope_review_sha256,'Live scope review edition differs');
 assert.equal(data.actual_verified,false,'Plans must not become verified actuals');
}
export function assertAssetMonths(data,ledger,asset,direction){
 assertEdition(data,ledger.metadata);
 assert.deepEqual(data.months.map(p=>p.period).sort(),Object.keys(ledger.monthly).sort(),'Live month matrix differs');
 for(const period of data.months){
  const expected=ledger.monthly[period.period][asset][direction],actual=recordedRange(period.current),label=`${asset}/${direction}/${period.period}`;
  assert.equal(actual.rows,expected.rows,label+' rows');
  if(expected.dwt===null)assert.equal(actual.dwt,null,label+' DWT');
  else assert.ok(actual.dwt!==null&&Math.abs(actual.dwt-expected.dwt)<1e-5,label+' DWT');
 }
}
export function scheduledEvidence(receipts,now=new Date()){
 const latest=new Map();
 for(const r of receipts.filter(r=>r.event_name==='schedule'&&r.verifier_version==='south-live/1')){
  const prior=latest.get(r.run_id);if(!prior||Number(r.run_attempt)>Number(prior.run_attempt))latest.set(r.run_id,r);
 }
 const cycles=[...latest.values()].sort((a,b)=>a.verified_at.localeCompare(b.verified_at)).slice(-2);
 const successful=r=>r.deployment_readback_verified&&r.source_refresh_success;
 const distinctDays=new Set(cycles.map(r=>r.verified_at.slice(0,10))).size===2;
 const recent=cycles.every(r=>Number.isFinite(Date.parse(r.verified_at))&&now.getTime()-Date.parse(r.verified_at)>=0&&now.getTime()-Date.parse(r.verified_at)<72*3600000);
 return {scheduled_refresh_verified:cycles.length===2&&distinctDays&&recent&&cycles.every(successful),scheduled_run_ids:cycles.map(r=>r.run_id)};
}
