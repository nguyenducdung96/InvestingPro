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
