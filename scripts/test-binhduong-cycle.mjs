import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildCycle,recordCycle} from './record-binhduong-cycle.mjs';
const sha='a'.repeat(40),now=new Date('2026-11-02T04:00:00Z');
const env={GITHUB_ACTIONS:'true',GITHUB_RUN_ID:'2',GITHUB_RUN_ATTEMPT:'1',GITHUB_EVENT_NAME:'schedule',PUBLISHED_COMMIT:sha,CYCLE_JOB_STATUS:'success',CYCLE_COLLECT_OUTCOME:'success',CYCLE_READBACK_OUTCOME:'success'};
const source={source_refresh_success:true,export_success:true,through:'2026-11-01',checked_at:'2026-11-02T02:00:00Z'};
const live={verifier_version:'south-live/1',event_name:'schedule',run_id:'2',run_attempt:'1',published_commit:sha,source_refresh_success:true,deployment_readback_verified:true,through:source.through,checked_at:'2026-11-02T02:01:00Z'};
const build=extra=>buildCycle({env,source,live,now,...extra});
const first=()=>build({env:{...env,GITHUB_RUN_ID:'1'},live:{...live,run_id:'1'},now:new Date('2026-11-01T04:00:00Z')});
test('two distinct scheduled cloud jobs are required; a manual run cannot replace either',()=>{
 const a=first();assert.equal(a.scheduled_refresh_verified,false);
 assert.equal(build({previous:[a]}).scheduled_refresh_verified,true);
 const manual=build({env:{...env,GITHUB_EVENT_NAME:'workflow_dispatch'},live:{...live,event_name:'workflow_dispatch'},previous:[a]});
 assert.equal(manual.deployment_readback_verified,true);assert.equal(manual.scheduled_refresh_verified,false);
});
test('stale or mismatched source/readback evidence cannot certify the current job',()=>{
 for(const extra of [{source:null},{live:null},{live:{...live,run_id:'1'}},{live:{...live,run_attempt:'2'}},{live:{...live,through:'2026-10-30'}},{live:{...live,published_commit:'b'.repeat(40)}},{live:{...live,checked_at:'2026-11-01T02:00:00Z'}},{env:{...env,CYCLE_JOB_STATUS:'failure'}},{env:{...env,CYCLE_COLLECT_OUTCOME:'failure'}},{env:{...env,CYCLE_READBACK_OUTCOME:'failure'}}]){
  const receipt=build({...extra,previous:[first()]});assert.equal(receipt.deployment_readback_verified,false);assert.equal(receipt.scheduled_refresh_verified,false);
 }
});
test('failed rerun of the latest scheduled job revokes earlier acceptance',()=>{
 const a=first(),b=build({previous:[a]});assert.equal(b.scheduled_refresh_verified,true);
 const failed=build({env:{...env,GITHUB_RUN_ATTEMPT:'2',CYCLE_READBACK_OUTCOME:'failure'},live:null,previous:[a,b]});
 assert.equal(failed.scheduled_refresh_verified,false);assert.deepEqual(failed.scheduled_run_ids,['1','2']);
});
test('local fabrication and malformed cached evidence fail closed',()=>{
 assert.throws(()=>build({env:{...env,GITHUB_ACTIONS:'false'}}));
 assert.throws(()=>build({previous:[{...first(),verified_at:'invalid'}]}));
 assert.throws(()=>build({previous:[{...first(),cycle_recorder_version:'other'}]}));
 assert.throws(()=>build({previous:[{...first(),source_refresh_success:'true'}]}));
});
test('missing source/readback on a failed job still archives a failed cycle',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'binhduong-cycle-')),folder=pathToFileURL(dir+'/');
 try{
  const a=await recordCycle(folder,{...env,CYCLE_COLLECT_OUTCOME:'failure',CYCLE_READBACK_OUTCOME:'skipped',CYCLE_JOB_STATUS:'failure'},now);
  assert.equal(a.source_refresh_success,false);assert.equal(a.deployment_readback_verified,false);
  assert.deepEqual(JSON.parse(await readFile(new URL('receipts/2-1.json',folder),'utf8')),a);
  assert.equal(JSON.parse(await readFile(new URL('scheduled-acceptance.json',folder),'utf8')).scheduled_refresh_verified,false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('archive is restored across jobs and the current summary is persisted',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'binhduong-cycle-')),folder=pathToFileURL(dir+'/');
 try{
  await recordCycle(folder,{...env,GITHUB_RUN_ID:'1',CYCLE_JOB_STATUS:'failure'},new Date('2026-11-01T04:00:00Z'));
  await writeFile(new URL('receipts/1-1.json',folder),JSON.stringify(first()));
  await writeFile(new URL('collect-receipt.json',folder),JSON.stringify(source));await writeFile(new URL('live-readback.json',folder),JSON.stringify(live));
  const b=await recordCycle(folder,env,now);assert.equal(b.scheduled_refresh_verified,true);
  assert.equal(JSON.parse(await readFile(new URL('scheduled-acceptance.json',folder),'utf8')).scheduled_refresh_verified,true);
 }finally{await rm(dir,{recursive:true,force:true});}
});
