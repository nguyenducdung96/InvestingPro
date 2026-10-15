import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const sql = readFileSync("supabase/imports/hnx_registry.proposals.sql", "utf8");
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on all functions in schema auth to anon,authenticated,service_role;`);
  for (const file of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  // Fixture acquisition times only; the new proposals preserve actual DOM capture times.
  for (const file of ["haiphong_catalog.reviewed.sql", "tan_vu_interest.reviewed.sql"])
    await db.exec(readFileSync(`supabase/imports/${file}`, "utf8")
      .replaceAll("__AUTHORITY_FETCHED_AT__", "2026-10-14T00:00:00Z")
      .replaceAll("__CATALOG_FETCHED_AT__", "2026-10-14T00:00:00Z")
      .replaceAll("__FETCHED_AT__", "2026-10-14T00:00:00Z"));
  await db.exec(readFileSync("supabase/imports/evidence_date_precision.correction.sql", "utf8"));
  await db.exec(readFileSync("supabase/imports/505_commercial_catalog.reviewed.sql", "utf8"));
});
afterAll(() => db.close());

it("imports eleven pending listings without duplicating PHP or changing reviewed company evidence", async () => {
  const php = await db.query("select * from catalog.entities where id='10000000-0000-0000-0000-000000000017'");
  await db.exec(sql);
  expect((await db.query("select * from catalog.entities where id='10000000-0000-0000-0000-000000000017'")).rows).toEqual(php.rows);
  expect((await db.query("select * from catalog.companies")).rows).toHaveLength(11);
  expect((await db.query("select * from catalog.company_listings where verification_status='pending'")).rows).toHaveLength(11);
  const count = await db.query("select count(*) from core.audit_events");
  await db.exec(sql);
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(count.rows);
  expect((await db.query("select * from catalog.company_listings where verified_by is not null or verified_at is not null")).rows).toHaveLength(0);
});

it("uses observed first-trade dates and retains the archived capture time and unknown publication timestamp", async () => {
  expect((await db.query("select valid_from::text from catalog.company_listings where ticker='PHP'")).rows).toEqual([{valid_from:"2022-09-14"}]);
  expect((await db.query("select valid_from::text from catalog.company_listings where ticker='CDN'")).rows).toEqual([{valid_from:"2016-11-30"}]);
  const lineage = await db.query<{fetched_at:Date; published_at:null; rights_status:string}>(`select r.fetched_at,r.published_at,s.rights_status from catalog.company_listings l join core.source_records r on r.id=l.source_record_id join core.sources s on s.id=r.source_id where l.ticker='CDN'`);
  expect(lineage.rows[0].fetched_at.toISOString()).toBe("2026-10-15T02:44:17.563Z");
  expect(lineage.rows[0].published_at).toBeNull();
  expect(lineage.rows[0].rights_status).toBe("to_verify");
});

it("keeps proposals private and refuses publication even by an admin until evidence and source rights are approved", async () => {
  await db.exec("set role anon");
  expect((await db.query("select * from catalog.company_listings")).rows).toHaveLength(0);
  expect((await db.query("select * from catalog.companies")).rows).toHaveLength(1);
  await db.exec(`reset role;select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000099","app_metadata":{"role":"admin"}}',false);set role authenticated;`);
  expect((await db.query("select * from catalog.company_listings where verification_status='pending'")).rows).toHaveLength(11);
  await expect(db.exec("update catalog.company_listings set verification_status='verified',review_note='Test review' where ticker='CDN'")).rejects.toThrow("Verified listing evidence required");
  await db.exec("reset role");
});

it("adds four HOSE dossiers with current legal identities, exact first-trade dates and private evidence", async () => {
  const proposal = readFileSync("supabase/imports/hose_registry.proposals.sql", "utf8");
  const php = await db.query("select * from catalog.entities where id='10000000-0000-0000-0000-000000000017'");
  await db.exec(proposal);
  expect((await db.query("select * from catalog.companies")).rows).toHaveLength(15);
  expect((await db.query(`select ticker,valid_from::text,verification_status from catalog.company_listings where exchange='HOSE' order by ticker`)).rows).toEqual([
    {ticker:"DVP",valid_from:"2009-12-01",verification_status:"pending"},
    {ticker:"GMD",valid_from:"2002-04-22",verification_status:"pending"},
    {ticker:"PDN",valid_from:"2011-10-26",verification_status:"pending"},
    {ticker:"QNP",valid_from:"2024-01-18",verification_status:"pending"},
  ]);
  expect((await db.query(`select c.legal_name,c.enterprise_id from catalog.companies c join catalog.company_listings l on l.company_id=c.id where l.ticker='GMD'`)).rows).toEqual([{legal_name:"Công ty Cổ phần Tập đoàn Gemadept",enterprise_id:"0301116791"}]);
  expect((await db.query("select * from core.sources where code like 'issuer_registry_%' and rights_status='to_verify'")).rows).toHaveLength(4);
  const count = await db.query("select count(*) from core.audit_events");
  await db.exec(proposal);
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(count.rows);
  expect((await db.query("select * from catalog.entities where id='10000000-0000-0000-0000-000000000017'")).rows).toEqual(php.rows);
  await db.exec("set role anon");
  expect((await db.query("select * from catalog.company_listings")).rows).toHaveLength(0);
  expect((await db.query("select * from catalog.companies")).rows).toHaveLength(1);
  await db.exec("reset role");
});

it("adds a pending operator proposal for VIP Greenport without inventing ownership or modifying Greenport", async () => {
  const proposal = readFileSync("supabase/imports/vgr_operator.proposal.sql", "utf8");
  await db.exec(proposal);
  const count = await db.query("select count(*) from core.audit_events");
  await db.exec(proposal);
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(count.rows);
  const result = await db.query(`select e.name,i.interest_type,i.ownership_pct,i.verification_status,i.valid_from::text from port.company_asset_interests i join catalog.entities e on e.id=i.asset_id where i.id='41a892c9-3a96-5303-975c-708a861c9714'`);
  expect(result.rows).toEqual([{name:"Bến cảng Container Vip Greenport",interest_type:"operator",ownership_pct:null,verification_status:"pending",valid_from:"2015-11-27"}]);
  expect((await db.query("select enterprise_id,official_website from catalog.companies where id='7b1b3668-9997-5148-a498-185c92e9ff55'")).rows).toEqual([{enterprise_id:"0201579242",official_website:"https://www.vipgreenport.com.vn"}]);
  await db.exec("set role anon");
  expect((await db.query("select * from port.company_asset_interests where id='41a892c9-3a96-5303-975c-708a861c9714'")).rows).toHaveLength(0);
  await db.exec("reset role");
});

it("proposes only DVP's canonical terminal and two berths, preserving legal date basis and reviewed evidence", async () => {
  const proposal = readFileSync("supabase/imports/dvp_assets.proposals.sql", "utf8");
  const entities = await db.query("select * from catalog.entities order by id");
  const records = await db.query("select id,quality_status,content_hash,fetched_at from core.source_records order by id");
  await db.exec(proposal);
  const interests = await db.query(`select e.name,i.asset_kind,i.valid_from::text,i.ownership_pct,i.verification_status from port.company_asset_interests i join catalog.entities e on e.id=i.asset_id where i.company_id='fafba875-a5cd-55f2-ac4f-0acf54a64164' order by i.asset_kind desc,i.valid_from`);
  expect(interests.rows).toEqual([
    {name:"Bến cảng Đình Vũ",asset_kind:"terminal",valid_from:"2005-02-25",ownership_pct:null,verification_status:"pending"},
    {name:"Cầu cảng số 1 – Đình Vũ",asset_kind:"berth",valid_from:"2005-02-25",ownership_pct:null,verification_status:"pending"},
    {name:"Cầu cảng số 2 – Đình Vũ",asset_kind:"berth",valid_from:"2008-06-13",ownership_pct:null,verification_status:"pending"},
  ]);
  expect((await db.query("select * from catalog.entities order by id")).rows).toEqual(entities.rows);
  expect((await db.query("select id,quality_status,content_hash,fetched_at from core.source_records where external_id <> 'DVP-2025:asset-review-p1-p2' order by id")).rows).toEqual(records.rows);
  const lineage = await db.query(`select r.quality_status,s.rights_status,r.published_at,r.content_hash from core.source_records r join core.sources s on s.id=r.source_id where r.external_id='DVP-2025:asset-review-p1-p2'`);
  expect(lineage.rows).toEqual([{quality_status:"incomplete",rights_status:"to_verify",published_at:null,content_hash:"b31fcc7482c2d0c76588373e15a0a159a350e89498d86f2de32d425548c9314a"}]);
  const count = await db.query("select count(*) from core.audit_events");
  await db.exec(proposal);
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(count.rows);
  await db.exec("set role anon");
  expect((await db.query("select * from port.company_asset_interests where company_id='fafba875-a5cd-55f2-ac4f-0acf54a64164'")).rows).toHaveLength(0);
  await db.exec("reset role");
});
