import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
import {expect,it} from 'vitest';
it('keeps separate berth and combined reporting scopes distinct through intake and publication',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
   create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
   create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
   grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
  for(const file of readdirSync('supabase/migrations').sort())await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
  await db.exec(readFileSync('supabase/imports/php_monthly_throughput.pending.sql','utf8'));
  const source=(await db.query<{source_record_id:string}>('select source_record_id from port.monthly_throughput limit 1')).rows[0].source_record_id;
  await db.exec(`insert into port.throughput_publication_policy(asset_code,enabled,basis,decision_note) values('tan_vu',true,'structured-facts-only-v1','TEST ONLY owner-authorized structured numeric publication.');set role service_role;select set_config('request.jwt.claims','{"role":"service_role"}',false);`);
  const facts=['chua_ve','hoang_dieu','hoang_dieu_chua_ve'].map((asset_code,i)=>({id:`00000000-0000-0000-0000-00000000098${i}`,asset_code,period:'2025-05-01',publication_month:'2025-06-01',cargo_tonnes:100+i,container_teu:asset_code==='hoang_dieu'?null:10+i,source_record_id:source,extraction_note:'TEST ONLY explicit source reporting scope, never allocated group totals'}));
  await db.query('select port.import_newsletter_intake($1,$2,$3)',['[]','[]',JSON.stringify(facts)]);
  await db.query('select port.publish_throughput_facts($1,$2)',[facts.map(f=>f.id),'TEST ONLY independently checked numeric facts with cited separate reporting scopes.']);
  await db.exec(`reset role;select set_config('request.jwt.claims','{}',false);set role anon`);
  const rows=(await db.query<{asset_code:string;container_teu:number|null}>('select asset_code,container_teu from port.published_monthly_throughput order by asset_code')).rows;
  expect(rows.map(r=>r.asset_code)).toEqual(['chua_ve','hoang_dieu','hoang_dieu_chua_ve']);expect(rows[1].container_teu).toBeNull();
  await expect(db.query('select port.import_newsletter_intake($1,$2,$3)',['[]','[]',JSON.stringify(facts)])).rejects.toThrow();
 }finally{await db.close();}
});
