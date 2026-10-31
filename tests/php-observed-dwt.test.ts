import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
import {expect,it} from 'vitest';

it('backfills recorded row weights for existing berths and retains them after source failure without changing evidence',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
   create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
   create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
   grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
  const migration='202610310001_php_observed_dwt.sql';
  for(const file of readdirSync('supabase/migrations').sort().filter(f=>f<migration))await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
  await db.exec(`set role service_role;select set_config('request.jwt.claims','{"role":"service_role"}',false);`);
  const input={date:'2025-01-19',status:'parsed',source_url:'https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx?d=-643',fetched_at:'2025-01-20T00:00:00Z',sha256:'a'.repeat(64),parser_version:'haiphong-plan-pilot/1.1.0',source_empty_sections:[],events:[{direction:'departure',vessel_name:'KNOWN',planned_time:'03:00',dwt:134713,from_berth:'NAM DINH VU',to_berth:'CHINA'},{direction:'departure',vessel_name:'UNKNOWN',planned_time:'04:00',dwt:null,from_berth:'NAM DINH VU',to_berth:'AN DONG'}]};
  await db.query("select port.import_php_plan_days('nam_dinh_vu',$1)",[JSON.stringify([input])]);
  const before=(await db.query<Record<string,unknown>>("select * from port.php_plan_days where asset_code='nam_dinh_vu'")).rows[0];expect(before.departure_known_dwt).toBeNull();expect(before.departure_dwt).toBeNull();
  await db.exec('reset role');await db.exec(readFileSync(`supabase/migrations/${migration}`,'utf8'));
  const after=(await db.query<Record<string,unknown>>("select * from port.php_plan_days where asset_code='nam_dinh_vu'")).rows[0];
  expect(Number(after.departure_known_dwt)).toBe(134713);expect(after.departure_dwt).toBeNull();
  expect({...after,arrival_known_dwt:before.arrival_known_dwt,departure_known_dwt:before.departure_known_dwt}).toEqual(before);
  const evidence=await db.query<{events:{dwt:number|null}[]}>("select events from port.php_plan_versions where id=$1",[after.version_id]);expect(evidence.rows[0].events.map(e=>e.dwt)).toEqual([134713,null]);
  await db.exec(`set role service_role;select set_config('request.jwt.claims','{"role":"service_role"}',false);`);
  await db.query("select port.import_php_plan_days('nam_dinh_vu',$1)",[JSON.stringify([{...input,status:'failed',fetched_at:'2025-01-21T00:00:00Z',error:'timeout'}])]);
  const failed=(await db.query<Record<string,unknown>>("select * from port.php_plan_days where asset_code='nam_dinh_vu'")).rows[0];expect(Number(failed.departure_known_dwt)).toBe(134713);expect(failed.version_id).toBe(after.version_id);expect(failed.source_error).toBe('timeout');
  const other={...input,sha256:'b'.repeat(64),events:input.events.map(e=>({...e,from_berth:'DINH VU'}))};
  await db.query("select port.import_php_plan_days('dinh_vu',$1)",[JSON.stringify([other])]);
  expect(Number((await db.query<{departure_known_dwt:string}>("select departure_known_dwt from port.php_plan_days where asset_code='dinh_vu'")).rows[0].departure_known_dwt)).toBe(134713);
  await db.exec('reset role;set role anon');await expect(db.query('select port.set_cdn_known_dwt()')).rejects.toThrow();
 }finally{await db.close();}
});
