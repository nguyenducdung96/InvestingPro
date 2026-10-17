// Local acceptance against the actual downloaded bundles. Never connects to cloud.
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {CALL_SOURCES,parseCallSource,sha256} from '../packages/modules/port/src/calls.ts';
const db=new PGlite();const results=[];
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000099","app_metadata":{"role":"admin"}}',false);set role authenticated`);
 for(const source of CALL_SOURCES){
  const bundle=JSON.parse(await readFile(`.local/port-calls/${source.id}/staging-bundle.json`,'utf8'));
  assert.equal(bundle.source_url,source.url);assert.equal(await sha256(bundle.raw_text),bundle.raw_sha256);
  const parsed=await parseCallSource(bundle.raw_text,source.id,bundle.fetched_at);
  const put=()=>db.query('select port.import_port_calls($1,$2,$3,$4) result',[JSON.stringify(bundle),JSON.stringify(parsed.rows),JSON.stringify(parsed.reported_days),parsed.parser_version]);
  const imported=(await put()).rows[0].result;assert.equal(imported.replayed,false);
  assert.equal((await put()).rows[0].result.replayed,true);
  const expected=new Map();for(const row of parsed.rows)if(!expected.has(row.key))expected.set(row.key,row);
  const valid=[...expected.values()].filter(r=>!r.quarantine_reason);
  const actual=(await db.query(`select * from port.${source.kind==='reported'?'published_port_calls':'published_in_port_snapshots'} where source_area=$1`,[source.id])).rows;
  assert.equal(actual.length,valid.length,`${source.id}: published row count`);
  for(const row of actual){
   const original=expected.get(row.event_key);assert.ok(original);
   assert.equal(row.dwt===null?null:Number(row.dwt),original.dwt,`${source.id}: DWT`);
   assert.equal(row.gt===null?null:Number(row.gt),original.gt??null,`${source.id}: GT`);
   assert.equal(row.time_day?.toISOString?.().slice(0,10)??row.time_day??null,original.time_day??null,`${source.id}: date precision`);
  }
  results.push({source_id:source.id,kind:source.kind,raw_sha256:bundle.raw_sha256,fetched_at:bundle.fetched_at,parser_version:parsed.parser_version,parsed_rows:parsed.rows.length,distinct_published_rows:actual.length,quarantined_rows:parsed.rows.filter(r=>r.quarantine_reason).length,reported_days:parsed.reported_days,replay_verified:true,dwt_gt_precision_verified:true});
 }
 await db.exec('reset role;set role anon');
 const eventCount=(await db.query('select count(*)::int n from port.published_port_calls')).rows[0].n;
 const snapshotCount=(await db.query('select count(*)::int n from port.published_in_port_snapshots')).rows[0].n;
 await assert.rejects(db.query('select raw_text from port.call_artifacts'),/permission denied/);
 const receipt={checked_at:new Date().toISOString(),environment:'local_pglite',cloud_imported:false,nationwide_complete:false,event_count:eventCount,snapshot_count:snapshotCount,raw_access_denied_to_anon:true,results};
 await mkdir('.local/port-calls',{recursive:true});
 await writeFile('.local/port-calls/import-verification.json',JSON.stringify(receipt,null,2));
 console.log(JSON.stringify({sources:results.length,eventCount,snapshotCount,replay:'verified',rawRls:'verified',receipt:'.local/port-calls/import-verification.json'}));
}finally{await db.close();}
