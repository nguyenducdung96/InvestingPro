// Read-only acceptance. Uses the existing anon key; never writes or reads auth cookies.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {CALL_SOURCES,parseCallSource,sha256} from '../packages/modules/port/src/calls.ts';
process.loadEnvFile('apps/web/.env.local');
const site='https://investing-pro-web-staging.tuyenkinhmon88.workers.dev';
const from='2026-09-01',to='2026-10-17';
const response=await fetch(`${site}/api/v1/port-calls?from=${from}&to=${to}`);
assert.equal(response.status,200);const report=await response.json();
assert.equal(report.nationwideCoverage.targets.length,34);assert.equal(report.meta.truncated,false);
assert.ok(!JSON.stringify(report).includes('raw_text'));assert.ok(!JSON.stringify(report).includes('imported_by'));
const snapshots=report.snapshots,comparisons=[];
for(const id of ['dongnai-open-anchorage','hatinh-open-anchorage','binhthuan-open-anchorage','thaibinh-open-anchorage','kiengiang-open-anchorage','danang-open-anchorage']){
 const bundle=JSON.parse(await readFile(`.local/port-calls/${id}/staging-bundle.json`,'utf8'));
 assert.equal(await sha256(bundle.raw_text),bundle.raw_sha256);
 const parsed=await parseCallSource(bundle.raw_text,id,bundle.fetched_at);
 const valid=parsed.rows.filter(r=>!r.quarantine_reason);const actual=snapshots.filter(r=>r.source_area===id);
 assert.equal(actual.length,new Set(valid.map(r=>r.key)).size,`${id}: row count`);
 for(const row of actual){const original=valid.find(r=>r.key===row.event_key);assert.ok(original);assert.equal(row.raw_sha256,bundle.raw_sha256);assert.equal(row.dwt===null?null:Number(row.dwt),original.dwt);assert.equal(row.gt===null?null:Number(row.gt),original.gt??null);}
 comparisons.push({source_id:id,published_rows:actual.length,raw_sha256:bundle.raw_sha256,artifact_id:actual[0]?.artifact_id??null,parser_version:parsed.parser_version,dwt_gt_and_keys_match:true});
}
const headers={apikey:process.env.SUPABASE_ANON_KEY,'Accept-Profile':'port'};
const facts=await fetch(`${process.env.SUPABASE_URL}/rest/v1/published_port_calls?select=source_area,event_day,time_day,occurred_at,dwt,gt&limit=1000`,{headers});
assert.equal(facts.status,200);const allEvents=await facts.json();assert.ok(allEvents.length<1000);
const dayOnly=allEvents.filter(r=>r.source_area==='nghean-reported');
assert.equal(dayOnly.length,222);assert.ok(dayOnly.every(r=>r.occurred_at===null&&r.time_day&&r.event_day===r.time_day));
assert.ok(dayOnly.some(r=>Number(r.dwt)===16493.7&&Number(r.gt)===9936));
const raw=await fetch(`${site}/api/v1/admin/port-calls?artifact=${comparisons[0].artifact_id}`);assert.equal(raw.status,401);
const countBySource={};for(const r of report.data){const value=countBySource[r.source_area]??={events:0,with_dwt:0,day_precision:0};value.events++;if(r.dwt!==null)value.with_dwt++;if(r.occurred_at===null&&r.time_day)value.day_precision++;}
const importerSource=await readFile('supabase/functions/port-call-refresh/index.ts','utf8');
const receipt={checked_at:new Date().toISOString(),site,from,to,app_commit:process.env.PORT_CALL_APP_COMMIT??null,local_importer_pin:importerSource.match(/InvestingPro\/([a-f0-9]{40})\//)?.[1]??null,source_registry_count:CALL_SOURCES.length,
 source_areas_with_evidence:new Set(report.coverage.map(r=>r.source_area)).size,events_in_api_range:report.data.length,events_all_collected_dates:allEvents.length,snapshots:snapshots.length,
 nationwide_target_count:34,nationwide_complete:false,terminal_inventory_complete:false,scheduled_refresh_verified:false,truncated:false,
 api_counts_by_source:countBySource,snapshot_comparisons:comparisons,nghean_all_dates_day_only_events:dayOnly.length,raw_unauthenticated_status:raw.status,
 missing_event_or_snapshot_targets:report.nationwideCoverage.targets.filter(t=>t.status==='missing').map(t=>t.name),
 validation:{live_api_readback:true,snapshot_bundle_comparison:true,raw_unauthenticated_denied:true}};
await mkdir('.local/port-calls',{recursive:true});await writeFile('.local/port-calls/staging-acceptance.json',JSON.stringify(receipt,null,2));
console.log(JSON.stringify(receipt,null,2));
