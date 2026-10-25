import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordedRange,sumAvailable,assertAssetMonths,scheduledEvidence} from './lib/south-live.mjs';
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
