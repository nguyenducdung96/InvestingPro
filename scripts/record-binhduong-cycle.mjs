import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {scheduledEvidence} from './lib/south-live.mjs';

const version='binhduong-cycle/1';
const readOptional=async path=>{try{return JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}};
export function buildCycle({env,source,live,previous=[],now=new Date()}){
 assert.equal(env.GITHUB_ACTIONS,'true','Only an actual GitHub job can record a cycle');
 assert.match(env.GITHUB_RUN_ID??'',/^\d+$/);assert.match(env.GITHUB_RUN_ATTEMPT??'',/^[1-9]\d*$/);
 const sourceOK=env.CYCLE_COLLECT_OUTCOME==='success'&&source?.source_refresh_success===true&&source?.export_success===true;
 const liveOK=env.CYCLE_JOB_STATUS==='success'&&env.CYCLE_READBACK_OUTCOME==='success'&&sourceOK
  &&live?.deployment_readback_verified===true&&live?.source_refresh_success===true
  &&live?.run_id===env.GITHUB_RUN_ID&&live?.run_attempt===env.GITHUB_RUN_ATTEMPT
  &&live?.event_name===env.GITHUB_EVENT_NAME&&live?.verifier_version==='south-live/1'
  &&live?.through===source.through&&Date.parse(live?.checked_at)>=Date.parse(source.checked_at)
  &&live?.published_commit===env.PUBLISHED_COMMIT&&/^[a-f0-9]{40}$/.test(live?.published_commit??'');
 const receipt={cycle_recorder_version:version,verifier_version:'south-live/1',event_name:env.GITHUB_EVENT_NAME,
  run_id:env.GITHUB_RUN_ID,run_attempt:env.GITHUB_RUN_ATTEMPT,verified_at:now.toISOString(),
  published_commit:env.PUBLISHED_COMMIT??null,through:source?.through??null,checked_at:live?.checked_at??null,
  source_refresh_success:sourceOK,deployment_readback_verified:Boolean(liveOK),
  job_status:env.CYCLE_JOB_STATUS,collector_outcome:env.CYCLE_COLLECT_OUTCOME,readback_outcome:env.CYCLE_READBACK_OUTCOME,
  actual_verified:false,full_scope_certified:false,production_accepted:false};
 if(!liveOK)receipt.error='Current source, publication and readback must all succeed in this job.';
 for(const prior of previous){
  assert.equal(prior.cycle_recorder_version,version,'Unexpected cached receipt protocol');
  assert.equal(prior.verifier_version,'south-live/1');
  assert.equal(typeof prior.source_refresh_success,'boolean');assert.equal(typeof prior.deployment_readback_verified,'boolean');
  assert.match(prior.run_id??'',/^\d+$/);assert.match(prior.run_attempt??'',/^[1-9]\d*$/);
  assert.ok(Number.isFinite(Date.parse(prior.verified_at)),'Invalid cached receipt date');
 }
 const history=previous.filter(prior=>prior.run_id!==receipt.run_id||prior.run_attempt!==receipt.run_attempt);
 return {...receipt,...scheduledEvidence([...history,receipt],now)};
}
export async function recordCycle(folder,env=process.env,now=new Date()){
 const archive=new URL('receipts/',folder);await mkdir(archive,{recursive:true});
 const previous=[];
 for(const name of await readdir(archive))if(name.endsWith('.json'))previous.push(await readOptional(new URL(name,archive)));
 const receipt=buildCycle({env,now,previous,source:await readOptional(new URL('collect-receipt.json',folder)),live:await readOptional(new URL('live-readback.json',folder))});
 const text=JSON.stringify(receipt,null,2)+'\n';
 await writeFile(new URL(`${receipt.run_id}-${receipt.run_attempt}.json`,archive),text);
 await writeFile(new URL('scheduled-acceptance.json',folder),text);
 if(env.GITHUB_STEP_SUMMARY)await writeFile(env.GITHUB_STEP_SUMMARY,`## Binh Duong scheduled evidence\n\n- Current event: ${receipt.event_name}\n- Current source success: ${receipt.source_refresh_success}\n- Current deployed edition verified: ${receipt.deployment_readback_verified}\n- Two recent real scheduled cycles verified: ${receipt.scheduled_refresh_verified}\n- Candidate scheduled runs: ${receipt.scheduled_run_ids.join(', ')||'none'}\n`,{flag:'a'});
 return receipt;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 console.log(JSON.stringify(await recordCycle(new URL('../.local/binhduong/',import.meta.url))));
}
