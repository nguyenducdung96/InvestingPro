import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
import {expect,it} from 'vitest';
import {throughputSeries,type ThroughputFact} from '@invest/port';
const fact=(period:string,n:number|null=100,extra:Partial<ThroughputFact>={}):ThroughputFact=>({id:period,asset_code:'tan_vu',period:`${period}-01`,publication_month:'2026-10-01',cargo_tonnes:n,container_teu:10,source_url:'https://haiphongport.com.vn/test.pdf',source_sha256:'a'.repeat(64),pdf_page:1,fetched_at:'2026-10-21T00:00:00Z',source_checked_at:'2026-10-21T00:00:00Z',source_error:null,...extra});
it('withholds conflicts and missing periods without inventing YTD or zero baselines',()=>{
 const s=throughputSeries([fact('2025-05'),fact('2026-05',120),fact('2026-06',null),fact('2026-07',100),fact('2026-07',101)]);
 expect(s.months.at(-2)?.yoy_pct.cargo_tonnes).toBeCloseTo(20);
 expect(s.quarters.find(q=>q.period==='2026-Q2')?.cargo_tonnes).toBeNull();
 expect(s.ytd.cargo_tonnes).toBeNull();expect(s.conflicts).toEqual(['2026-07']);
 expect(throughputSeries([fact('2025-01',0),fact('2026-01',20)]).months[1].yoy_pct.cargo_tonnes).toBeNull();
});
it('deduplicates identical reports and aggregates only complete metrics',()=>{
 const s=throughputSeries([fact('2025-01'),fact('2025-02'),fact('2025-03'),fact('2026-01',200),fact('2026-01',200,{id:'duplicate'}),fact('2026-02',200),fact('2026-03',200)]);
 expect(s.months).toHaveLength(6);expect(s.quarters[1].cargo_tonnes).toBe(600);
 expect(s.ytd.cargo_tonnes).toEqual({through_month:3,current:600,prior:300,yoy_pct:100});
});
it('enforces pending/rights/RLS, hides revised PDFs and serves changed DB data without a rebuild',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
   create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
   create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
   grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
  for(const file of readdirSync('supabase/migrations').sort())await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
  const sqlPath='supabase/imports/php_monthly_throughput.pending.sql';
  // Integration uses actual collector output when available, never a serving fallback.
  const sql=readFileSync(sqlPath,'utf8');await db.exec(sql);await db.exec(sql);
  await expect(db.query("select port.import_newsletter_intake('[]','[]','[]')")).rejects.toThrow('Authorized newsletter importer');
  await db.exec(`select set_config('request.jwt.claims','{"role":"authenticated","user_metadata":{"role":"admin"}}',false);set role authenticated;`);
  await expect(db.query("select port.import_newsletter_intake('[]','[]','[]')")).rejects.toThrow('Authorized newsletter importer');
  await db.exec(`reset role;select set_config('request.jwt.claims','{"role":"service_role"}',false);begin;set role service_role;`);
  const original=(await db.query<{id:string;source_record_id:string}>("select id,source_record_id from port.monthly_throughput limit 1")).rows[0];
  const candidate={id:'00000000-0000-0000-0000-000000000981',period:'2024-01-01',publication_month:'2024-02-01',cargo_tonnes:99,container_teu:null,source_record_id:original.source_record_id,extraction_note:'TEST ONLY unapproved intake extraction',verification_status:'verified'};
  const args=['[]','[]',JSON.stringify([candidate])];
  await db.query('select port.import_newsletter_intake($1,$2,$3)',args);
  await db.query('select port.import_newsletter_intake($1,$2,$3)',args);
  expect((await db.query<{verification_status:string}>('select verification_status from port.monthly_throughput where id=$1',[candidate.id])).rows).toEqual([{verification_status:'pending'}]);
  await expect(db.query('select port.import_newsletter_intake($1,$2,$3)',[JSON.stringify([{source_url:'https://evil.example/document.pdf',latest_sha:'a'.repeat(64)}]),'[]','[]'])).rejects.toThrow('Invalid source scope');
  await db.exec("rollback;reset role;select set_config('request.jwt.claims','{}',false)");
  expect((await db.query('select * from port.monthly_throughput')).rows.length).toBeGreaterThanOrEqual(16);
  await db.exec('set role anon');expect((await db.query('select * from port.published_monthly_throughput')).rows).toHaveLength(0);await db.exec('reset role');
  await expect(db.exec("update port.monthly_throughput set verification_status='verified',review_note='TEST ONLY verified monthly extraction'")).rejects.toThrow('Admin review required');
  await db.exec(`select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000099","app_metadata":{"role":"admin"}}',false);set role authenticated;`);
  await expect(db.exec("update port.monthly_throughput set verification_status='verified',review_note='TEST ONLY verified monthly extraction'")).rejects.toThrow('Verified evidence');
  await db.exec('reset role');
  // TEST ONLY simulate independent source/evidence approval; production handoff remains pending.
  await db.exec(`update core.sources set rights_status='approved' where code='php-monthly-newsletters';
   insert into core.source_records select (jsonb_populate_record(null::core.source_records,to_jsonb(r)||jsonb_build_object('id',gen_random_uuid(),'external_id',r.external_id||':test-approved','quality_status','verified'))).* from core.source_records r where r.parser_name='php-newsletters';
   set role authenticated;
   select port.review_monthly_throughput(id,'verified','TEST ONLY verified monthly extraction') from port.monthly_throughput where verification_status='pending';reset role;set role anon;`);
  const published=(await db.query<ThroughputFact>("select *,to_char(period,'YYYY-MM-DD') as period from port.published_monthly_throughput")).rows;
  expect(throughputSeries(published).months).toHaveLength(16);
  const target=published[0];
  await db.exec('reset role');
  await expect(db.query('update port.monthly_throughput set cargo_tonnes=0 where id=$1',[target.id])).rejects.toThrow('immutable');
  const correction=(await db.query<{id:string}>(`insert into port.monthly_throughput(asset_code,period,publication_month,cargo_tonnes,container_teu,source_record_id,pdf_page,extraction_note,supersedes_id)
   select asset_code,period,publication_month,cargo_tonnes+1,container_teu,source_record_id,pdf_page,'TEST ONLY append corrected monthly extraction',id from port.monthly_throughput where id=$1 returning id`,[target.id])).rows[0];
  await db.exec('set role authenticated');
  await db.query("select port.review_monthly_throughput($1,'verified','TEST ONLY corrected value checked against evidence')",[correction.id]);
  await db.exec('reset role;set role anon');
  const changed=(await db.query<ThroughputFact>("select *,to_char(period,'YYYY-MM-DD') as period from port.published_monthly_throughput")).rows;
  expect(changed).toHaveLength(16);expect(changed.find(r=>r.id===correction.id)?.cargo_tonnes).toBe(Number(target.cargo_tonnes)+1);
  await db.exec('reset role');
  await db.query("update port.newsletter_documents set latest_sha=$1 where source_url=$2",['b'.repeat(64),target.source_url]);
  await db.exec('set role anon');expect((await db.query('select * from port.published_monthly_throughput')).rows).toHaveLength(15);await db.exec('reset role');
  await db.exec("update core.sources set rights_status='blocked' where code='php-monthly-newsletters';set role anon");
  expect((await db.query('select * from port.published_monthly_throughput')).rows).toHaveLength(0);
 }finally{await db.close();}
});
it('publishes canonical numeric facts under explicit policy without approving PDF rights',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
   create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
   create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
   grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
  for(const file of readdirSync('supabase/migrations').sort())await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
  // TEST archive address only; original evidence and rights deliberately stay unapproved.
  const fixture=readFileSync('supabase/imports/php_monthly_throughput.pending.sql','utf8').replace(/local:[^']+/g,m=>'catalog-evidence/sha256/'+m.match(/[a-f0-9]{64}/)![0]);
  await db.exec(fixture);
  const ids=(await db.query<{id:string}>('select id from port.monthly_throughput')).rows.map(r=>r.id);
  const note='TEST ONLY publisher decision to release independently composed numeric facts with official source citations.';
  await db.exec(`select set_config('request.jwt.claims','{"role":"authenticated","user_metadata":{"role":"admin"}}',false);set role authenticated`);
  await expect(db.query('select port.publish_throughput_facts($1,$2)',[ids,note])).rejects.toThrow('Authorized factual publisher');
  await db.exec(`reset role;select set_config('request.jwt.claims','{"role":"service_role"}',false);set role service_role`);
  expect((await db.query<{v:{enabled:boolean}}>('select port.publish_throughput_facts($1,$2) v',[ids,note])).rows[0].v.enabled).toBe(false);
  await db.exec(`reset role;insert into port.throughput_publication_policy(asset_code,enabled,basis,decision_note,updated_at) values('tan_vu',true,'structured-facts-only-v1','TEST ONLY explicit publisher decision for canonical reviewed numeric facts',now());set role service_role`);
  expect((await db.query<{v:{published:number}}>('select port.publish_throughput_facts($1,$2) v',[ids,note])).rows[0].v.published).toBe(16);
  expect((await db.query<{v:{published:number}}>('select port.publish_throughput_facts($1,$2) v',[ids,note])).rows[0].v.published).toBe(0);
  expect((await db.query("select rights_status from core.sources where code='php-monthly-newsletters'")).rows).toEqual([{rights_status:'to_verify'}]);
  expect((await db.query("select distinct verification_status from port.monthly_throughput")).rows).toEqual([{verification_status:'pending'}]);
  await db.exec('reset role;set role anon');
  const rows=(await db.query<ThroughputFact>('select * from port.published_monthly_throughput')).rows;
  expect(rows).toHaveLength(16);
  await expect(db.query('select port.publish_throughput_facts($1,$2)',[ids,note])).rejects.toThrow();
  await db.exec('reset role');
  await expect(db.exec("update port.throughput_publications set cargo_tonnes=0")).rejects.toThrow('immutable');
  await db.query('update port.newsletter_documents set latest_sha=$1 where source_url=$2',['b'.repeat(64),rows[0].source_url]);
  await db.exec('set role anon');expect((await db.query('select * from port.published_monthly_throughput')).rows).toHaveLength(15);
  await db.exec("reset role;update core.sources set rights_status='blocked' where code='php-monthly-newsletters';set role anon");
  expect((await db.query('select * from port.published_monthly_throughput')).rows).toHaveLength(0);
 }finally{await db.close();}
});
