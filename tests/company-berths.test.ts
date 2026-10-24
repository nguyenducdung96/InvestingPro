import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {expect,it} from 'vitest';
import {matchCompanyBerth,type CompanyBerthFact} from '@invest/port';
const scope=JSON.parse(readFileSync('docs/catalog-review/php-berth-scope-20261021.json','utf8'));
it('matches exact reviewed PHP labels without merging sibling terminals or berth codes',()=>{
 const rows=scope.entries as CompanyBerthFact[];
 expect(matchCompanyBerth(' Tân  Vũ ',rows)).toBe('tan_vu');
 expect(matchCompanyBerth('HTIT',rows)).toBe('htit');
 for(const label of ['HICT','HHIT','LACH HUYEN','TV1','TAN VU 2','HOANG DIEU CHUA VE'])expect(matchCompanyBerth(label,rows)).toBeNull();
});
it('publishes cited immutable berth scope without promoting effective dates or accepting fake admin',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
  create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
  grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
  for(const file of readdirSync('supabase/migrations').sort())await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
  const intake=readFileSync('supabase/imports/php_company_berths.reviewed.sql','utf8');
  await db.exec(intake);await db.exec(intake);
  expect((await db.query('select * from port.company_berth_editions')).rows).toHaveLength(1);
  await db.exec(`select set_config('request.jwt.claims','{"role":"authenticated","user_metadata":{"role":"admin"}}',false);set role authenticated`);
  await expect(db.query("insert into port.company_berth_editions(ticker,observed_on,entries,review_note) values('PHP','2026-10-21',$1,'TEST ONLY publisher note checked against official sources')",[JSON.stringify(scope.entries)])).rejects.toThrow();
  await db.exec('reset role');
  const bad=structuredClone(scope.entries);bad[0].effective_from='2025-01-01';
  await expect(db.query("insert into port.company_berth_editions(ticker,observed_on,entries,review_note) values('PHP','2026-10-21',$1,'TEST ONLY publisher note checked against official sources')",[JSON.stringify(bad)])).rejects.toThrow('Invalid PHP berth');
  await expect(db.exec("update port.company_berth_editions set observed_on='2025-01-01'")).rejects.toThrow('immutable');
  const newIntake=readFileSync('supabase/imports/vsc_vgr_company_berths.reviewed.sql','utf8');
  await db.exec(newIntake);await db.exec(newIntake);
  expect((await db.query('select * from port.company_berth_editions')).rows).toHaveLength(3);
  const hpIntake=readFileSync('supabase/imports/haiphong_company_berths.reviewed.sql','utf8');
  await db.exec(hpIntake);await db.exec(hpIntake);
  expect((await db.query('select * from port.company_berth_editions')).rows).toHaveLength(7);
  const hp=JSON.parse(readFileSync('docs/catalog-review/haiphong-berth-scope-20261024.json','utf8'));
  await expect(db.query("insert into port.company_berth_editions(ticker,observed_on,entries,review_note) values('GMD','2026-10-24',$1,'TEST ONLY reject cross-issuer tracked port and citation mapping')",[JSON.stringify(hp.entries.HAH)])).rejects.toThrow('Invalid Hai Phong');
  const cqnIntake=readFileSync('supabase/imports/cqn_company_berths.reviewed.sql','utf8');
  await db.exec(cqnIntake);await db.exec(cqnIntake);
  expect((await db.query('select * from port.company_berth_editions')).rows).toHaveLength(8);
  const cqn=JSON.parse(readFileSync('docs/catalog-review/cqn-berth-scope-20261024.json','utf8'));
  await expect(db.query("insert into port.company_berth_editions(ticker,observed_on,entries,review_note) values('CQN','2026-10-24',$1,'TEST ONLY reject unsupported date or cross-terminal assignment')",[JSON.stringify([{...cqn.entries[0],effective_from:'2020-06-24'}])])).rejects.toThrow('Invalid CQN');
  await db.exec('set role anon');
  const result=(await db.query<{entries:CompanyBerthFact[]}>("select entries from port.company_berth_editions where ticker='PHP'")).rows[0];
  expect(result.entries).toHaveLength(4);expect(result.entries.every(e=>e.effective_from===null&&e.effective_to===null)).toBe(true);
 }finally{await db.close();}
});
