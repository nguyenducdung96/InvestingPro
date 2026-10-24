import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
import {expect,it} from 'vitest';
import {tanvuPlanSeries,phpPlanSeries,aggregatePhpPlanDays,type TanVuPlanDay} from '@invest/port';
function day(date:string,amount:number|null=10):TanVuPlanDay{return {report_day:date,version_id:'id',source_sha256:'a'.repeat(64),source_url:'https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx?d=-1',parser_version:'haiphong-plan-pilot/1.1.0',last_success:'2026-10-22T00:00:00Z',last_attempt:'2026-10-22T00:00:00Z',source_error:null,arrival_rows:1,departure_rows:1,arrival_dwt:amount,departure_dwt:amount,arrival_dwt_missing:amount===null?1:0,departure_dwt_missing:amount===null?1:0,ambiguous_groups:0,source_empty_sections:[]};}
const range=(year:number,month:number,n:number,value:number|null=10)=>Array.from({length:n},(_,i)=>day(`${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,value));
it('compares partial months and quarters to the same days, never full prior months',()=>{
 const s=tanvuPlanSeries([...range(2025,10,31,10),...range(2026,10,21,20)],'departure',new Date('2026-10-21T18:00:00Z'));
 expect(s.cutoff).toBe('2026-10-21');expect(s.months.at(-1)?.current.dwt).toBe(420);
 expect(s.months.at(-1)?.prior.dwt).toBe(210);expect(s.months.at(-1)?.yoy.dwt).toBe(100);
 expect(s.quarters.at(-1)?.status).toBe('partial');expect(s.quarters.at(-1)?.prior.through).toBe('2025-10-21');
});
it('adds new calendar months without a rebuild; withholds missing/DWT/ambiguous periods',()=>{
 const s=tanvuPlanSeries(range(2026,10,31),'departure',new Date('2026-11-02T01:00:00Z'));
 expect(s.months.at(-1)?.period).toBe('2026-11');expect(s.months.at(-1)?.current.missing_days).toEqual(['2026-11-01']);
 expect(s.months.at(-1)?.current.rows).toBeNull();
 expect(tanvuPlanSeries(range(2026,10,21,null),'departure',new Date('2026-10-22T01:00:00Z')).months.at(-1)?.current.dwt).toBeNull();
 const bad=range(2026,10,21);bad[0].ambiguous_groups=1;
 expect(tanvuPlanSeries(bad,'departure',new Date('2026-10-22T01:00:00Z')).months.at(-1)?.current.rows).toBeNull();
});
it('uses full leap February for closed months and preserves zero vs missing',()=>{
 const s=tanvuPlanSeries([...range(2024,2,29,0),...range(2025,2,28,10)],'departure',new Date('2025-03-01T01:00:00Z'));
 expect(s.months.at(-1)?.prior.expected_days).toBe(29);expect(s.months.at(-1)?.prior.dwt).toBe(0);
 expect(s.months.at(-1)?.yoy.dwt).toBeNull();
});
it('keeps the HTIT startup base out of comparable periods',()=>{
 const s=phpPlanSeries([...range(2025,1,31,0),...range(2025,5,31),...range(2026,1,31)],'htit','departure',new Date('2026-02-01T01:00:00Z'));
 expect(s.asset).toBe('htit');expect(s.months[0].period).toBe('2025-05');
 expect(s.months.at(-1)?.prior.dwt).toBeNull();expect(s.ytd.yoy.dwt).toBeNull();
});
it('imports idempotently, versions corrections, protects RLS and preserves success on source failure',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
   create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
   create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
   grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
  for(const file of readdirSync('supabase/migrations').sort())await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
  const source='https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx?d=-1';
  const input={date:'2025-09-01',status:'parsed',source_url:source,fetched_at:'2025-09-02T00:00:00Z',sha256:'a'.repeat(64),parser_version:'haiphong-plan-pilot/1.1.0',source_empty_sections:[],events:[{direction:'departure',vessel_name:'TEST ONLY',planned_time:'08:30',dwt:100,from_berth:'TAN VU',to_berth:'CHINA'}]};
  await db.exec('set role anon');
  await expect(db.query('select port.import_tanvu_plan_days($1)',[JSON.stringify([input])])).rejects.toThrow();
  await expect(db.query('select * from port.tanvu_plan_versions')).rejects.toThrow();
  await expect(db.query("insert into port.tanvu_plan_days(report_day,last_attempt) values('2025-09-01',now())")).rejects.toThrow();
  await db.exec(`reset role;set role service_role;select set_config('request.jwt.claims','{"role":"service_role"}',false);`);
  await db.query('select port.import_tanvu_plan_days($1)',[JSON.stringify([input])]);
  expect((await db.query('select * from port.tanvu_plan_days')).rows).toHaveLength(1); // CI readback, not only definer RPC
  const replay=await db.query<{result:{versions_inserted:number}}>('select port.import_tanvu_plan_days($1) as result',[JSON.stringify([input])]);
  expect(replay.rows[0].result.versions_inserted).toBe(0);
  await db.query('select port.import_tanvu_plan_days($1)',[JSON.stringify([{...input,sha256:'b'.repeat(64),fetched_at:'2025-09-03T00:00:00Z',events:[{...input.events[0],dwt:120}]}])]);
  await db.query('select port.import_tanvu_plan_days($1)',[JSON.stringify([input])]); // old cache cannot roll back head
  await expect(db.query('select port.import_tanvu_plan_days($1)',[JSON.stringify([{...input,source_url:'https://evil.example/plan'}])])).rejects.toThrow();
  await db.query('select port.import_tanvu_plan_days($1)',[JSON.stringify([{date:input.date,status:'failed',source_url:source,fetched_at:'2025-09-04T00:00:00Z',error:'Source unavailable'}])]);
  await db.exec(`reset role;select set_config('request.jwt.claims','{}',false);set role anon`);
  const head=(await db.query<{departure_dwt:number;source_error:string}>('select * from port.tanvu_plan_days')).rows[0];
  expect(Number(head.departure_dwt)).toBe(120);expect(head.source_error).toBe('Source unavailable');
  const details=await db.query<{result:{events:{dwt:number}[]}}>("select port.tanvu_plan_events('2025-09-01') as result");
  expect(details.rows[0].result.events[0].dwt).toBe(120);
  await db.exec('reset role');
  expect((await db.query('select * from port.tanvu_plan_versions')).rows).toHaveLength(2);
  await expect(db.exec('update port.tanvu_plan_versions set events=\'[]\'')).rejects.toThrow('immutable');
  await db.exec(`set role service_role;select set_config('request.jwt.claims','{"role":"service_role"}',false);`);
  for(const [asset,alias] of Object.entries({tan_vu:'TAN VU',chua_ve:'CHUA VE',hoang_dieu:'HOANG DIEU',htit:'HTIT',dinh_vu:'DINH VU',green_port:'GREEN PORT',vip_green_port:'VIP GREEN PORT',nam_hai_dinh_vu:'NAM HAI DINH VU',vimc_dinh_vu:'VIMC',nam_dinh_vu:'NAM DINH VU',hai_an:'HAI AN',doan_xa:'DOAN XA',ptsc_dinh_vu:'PTSC DINH VU'})){
   const data={...input,events:[{...input.events[0],from_berth:alias}]};
   await db.query('select port.import_php_plan_days($1,$2)',[asset,JSON.stringify([data])]);
   const replay=await db.query<{result:{versions_inserted:number}}>('select port.import_php_plan_days($1,$2) as result',[asset,JSON.stringify([data])]);
   expect(replay.rows[0].result.versions_inserted).toBe(0);
  }
  await expect(db.query('select port.import_php_plan_days($1,$2)',['chua_ve',JSON.stringify([input])])).rejects.toThrow('Invalid PHP berth');
  await expect(db.query('select port.import_php_plan_days($1,$2)',['hict',JSON.stringify([input])])).rejects.toThrow('Unknown schedule berth');
  expect((await db.query('select * from port.php_plan_days')).rows).toHaveLength(13);
  const cqn={...input,source_url:'https://kht1.cangvuhanghaiquangninh.gov.vn/',parser_version:'quangninh-berth-plan/1.0.0',events:[{...input.events[0],from_berth:'Cầu 1 - Cái Lân',to_berth:'HG7-1',plan_kind:'internal'}]};
  const importCqn=(data:unknown)=>db.query<{result:{versions_inserted:number}}>("select port.import_php_plan_days('cqn_cai_lan',$1) as result",[JSON.stringify([data])]);
  await importCqn({...cqn,date:'2025-09-02',events:[{...cqn.events[0],to_berth:'P/S'}]}); // source movement section, not inferred port departure
  await importCqn(cqn);expect((await importCqn(cqn)).rows[0].result.versions_inserted).toBe(0);
  for(const data of [{...cqn,source_url:source},{...cqn,parser_version:input.parser_version},{...cqn,events:[{...cqn.events[0],from_berth:'Cầu 2 - Cái Lân'}]},{...cqn,events:[{...cqn.events[0],plan_kind:null}]},{...cqn,events:[{...cqn.events[0],plan_kind:'departure'}]}])await expect(importCqn(data)).rejects.toThrow();
  await expect(db.query('select port.import_php_plan_days($1,$2)',['tan_vu',JSON.stringify([{...input,events:[{...input.events[0],plan_kind:'internal'}]}])])).rejects.toThrow();
  await db.exec('reset role;set role anon');
  const cqnDetail=(await db.query<{result:{semantics:string;movement_scope:string;events:{plan_kind:string}[]}}>("select port.php_plan_events('cqn_cai_lan','2025-09-01') as result")).rows[0].result;
  expect(cqnDetail.semantics).toBe('authority_published_berth_plan');expect(cqnDetail.movement_scope).toBe('berth');expect(cqnDetail.events[0].plan_kind).toBe('internal');
  await db.exec(`reset role;set role service_role;select set_config('request.jwt.claims','{"role":"service_role"}',false);`);
  await importCqn({...cqn,sha256:'c'.repeat(64),fetched_at:'2025-09-03T00:00:00Z',events:[{...cqn.events[0],dwt:null}]});
  await importCqn({...cqn,status:'failed',fetched_at:'2025-09-04T00:00:00Z',error:'Source failed'});
  await importCqn(cqn);
  const cqnHead=(await db.query<{source_error:string;departure_dwt:number|null}>("select * from port.php_plan_days where asset_code='cqn_cai_lan'")).rows[0];
  expect(cqnHead.departure_dwt).toBeNull();expect(cqnHead.source_error).toBe('Source failed');

  for(const alias of ['NAM DINH VU','NAM HAI DINH VU','PTSC DINH VU','EURO DINH VU','TAN VU']){
   await expect(db.query('select port.import_php_plan_days($1,$2)',['dinh_vu',JSON.stringify([{...input,events:[{...input.events[0],from_berth:alias}]}])])).rejects.toThrow();
  }
  await db.exec(`reset role;select set_config('request.jwt.claims','{}',false);set role anon`);
  const dvp=await db.query<{result:{events:{from_berth:string}[]}}>("select port.php_plan_events('dinh_vu','2025-09-01') as result");
  expect(dvp.rows[0].result.events[0].from_berth).toBe('DINH VU');
  await expect(db.query('select port.import_php_plan_days($1,$2)',['dinh_vu',JSON.stringify([input])])).rejects.toThrow();
  const chua=await db.query<{result:{events:{from_berth:string}[]}}>("select port.php_plan_events('chua_ve','2025-09-01') as result");
  expect(chua.rows[0].result.events[0].from_berth).toBe('CHUA VE');
  await expect(db.query('select * from port.php_plan_versions')).rejects.toThrow();
  await expect(db.query('select port.import_php_plan_days($1,$2)',['chua_ve',JSON.stringify([input])])).rejects.toThrow();
 }finally{await db.close();}
});


it('aggregates four independent berth endpoints, rejects missing or mixed revisions and preserves null DWT',()=>{
 const groups={tan_vu:[day('2026-10-01',10)],chua_ve:[day('2026-10-01',20)],hoang_dieu:[day('2026-10-01',30)],htit:[day('2026-10-01',40)]};
 const combined=aggregatePhpPlanDays(groups)[0];
 expect(combined.departure_rows).toBe(4);expect(combined.departure_dwt).toBe(100);expect(combined.arrival_dwt).toBe(100);
 expect(aggregatePhpPlanDays({...groups,htit:[]})[0].version_id).toBeNull();
 expect(aggregatePhpPlanDays({...groups,htit:[{...day('2026-10-01',40),source_sha256:'b'.repeat(64)}]})[0].version_id).toBeNull();
 const missing=aggregatePhpPlanDays({...groups,htit:[day('2026-10-01',null)]})[0];
 expect(missing.departure_rows).toBe(4);expect(missing.departure_dwt).toBeNull();expect(missing.departure_dwt_missing).toBe(1);
 expect(aggregatePhpPlanDays({...groups,htit:[day('2026-10-01',0)]})[0].departure_dwt).toBe(60);
 expect(()=>aggregatePhpPlanDays({...groups,htit:[day('2026-10-01'),day('2026-10-01')]})).toThrow('Duplicate PHP berth/day');
 const series=phpPlanSeries(aggregatePhpPlanDays(groups),'php','departure',new Date('2026-10-02T01:00:00Z'));
 expect(series.months.at(-1)?.current.dwt).toBe(100);expect(series.months.at(-1)?.prior.dwt).toBeNull();
});
