import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";

it("imports the complete handoff atomically, preserves reviewed PHP and replays without extra audit", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
      grant usage on schema auth to anon,authenticated,service_role;
      grant execute on all functions in schema auth to anon,authenticated,service_role;`);
    for (const file of readdirSync("supabase/migrations").sort())
      await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    for (const file of ["haiphong_catalog.reviewed.sql", "tan_vu_interest.reviewed.sql"])
      await db.exec(readFileSync(`supabase/imports/${file}`, "utf8")
      .replaceAll("__AUTHORITY_FETCHED_AT__", "2026-10-14T00:00:00Z")
      .replaceAll("__CATALOG_FETCHED_AT__", "2026-10-14T00:00:00Z")
      .replaceAll("__FETCHED_AT__", "2026-10-14T00:00:00Z"));
    const php = await db.query("select * from catalog.entities where id='10000000-0000-0000-0000-000000000017'");
    const interests = await db.query("select * from port.company_asset_interests order by id");
    const bundle = readFileSync("supabase/imports/issuer_registry_all.handoff.sql", "utf8");
    // A failure in the last input must roll back the five preceding inputs too.
    const conflict = bundle.replace("'TMS','HOSE'", "'TMS','INVALID'");
    expect(conflict).not.toBe(bundle);
    await expect(db.exec(conflict)).rejects.toThrow();
    await db.exec("rollback");
    expect((await db.query("select * from catalog.company_listings")).rows).toHaveLength(0);
    await db.exec(bundle);
    expect((await db.query("select * from catalog.companies")).rows).toHaveLength(41);
    expect((await db.query("select * from catalog.company_listings")).rows).toHaveLength(40);
    expect((await db.query("select * from catalog.entities where id='10000000-0000-0000-0000-000000000017'")).rows).toEqual(php.rows);
    expect((await db.query("select * from port.company_asset_interests order by id")).rows).toEqual(interests.rows);
    const audit = await db.query("select count(*) from core.audit_events");
    await db.exec(bundle);
    expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(audit.rows);
    await db.exec("set role anon");
    expect((await db.query("select * from catalog.company_listings")).rows).toHaveLength(0);
    await db.exec("reset role");
    await db.exec(readFileSync("supabase/imports/evidence_date_precision.correction.sql", "utf8"));
    await db.exec(readFileSync("supabase/imports/505_commercial_catalog.reviewed.sql", "utf8"));
    const correctedPhp = await db.query("select * from catalog.entities where id='10000000-0000-0000-0000-000000000017'");
    const existingPending = (await db.query("select * from port.company_asset_interests where verification_status='pending'")).rows.length;
    const all = readFileSync("supabase/imports/slice1_company_catalog.handoff.sql", "utf8");
    // Failure in the final ICD must roll back VGR/DVP/PAP and the first ICD.
    const invalidDate = all.replace("'2024-12-16'", "'not-a-date'");
    expect(invalidDate).not.toBe(all);
    const beforeAll = await db.query("select count(*) from core.audit_events");
    await expect(db.exec(invalidDate)).rejects.toThrow();
    await db.exec("rollback");
    expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(beforeAll.rows);
    expect((await db.query("select * from port.icds")).rows).toHaveLength(0);
    await db.exec(all);
    expect((await db.query("select * from port.icds")).rows).toHaveLength(2);
    expect((await db.query("select * from catalog.companies where enterprise_id is not null")).rows).toHaveLength(40);
    expect((await db.query("select enterprise_id from catalog.companies where id='10000000-0000-0000-0000-000000000017'")).rows).toEqual([{enterprise_id:null}]);
    const cdn=JSON.parse(readFileSync("docs/catalog-review/registry-proposals-manifest.json","utf8")).find((r:{ticker:string})=>r.ticker==='CDN');
    expect((await db.query("select enterprise_id from catalog.companies where id=$1",[cdn.company_id])).rows).toEqual([{enterprise_id:"0400101972"}]);
    expect((await db.query("select * from port.company_asset_interests where verification_status='pending'")).rows).toHaveLength(existingPending + 9);
    expect((await db.query(`select l.ticker,i.valid_from::text,i.ownership_pct from port.company_asset_interests i join catalog.company_listings l on l.company_id=i.company_id where i.asset_kind='icd' order by l.ticker`)).rows).toEqual([
      {ticker:"ILB",valid_from:"2023-01-06",ownership_pct:null},
      {ticker:"VLG",valid_from:"2024-12-16",ownership_pct:null},
    ]);
    expect((await db.query("select legal_name from catalog.companies where enterprise_id='0201768923'")).rows).toEqual([{legal_name:"Công ty Cổ phần VSC Green Logistics"}]);
    const originalGic=JSON.parse(readFileSync("docs/catalog-review/market-issuer-registry-manifest.json","utf8")).items.find((r:{ticker:string})=>r.ticker==='GIC');
    expect((await db.query("select quality_status from core.source_records where id=$1",[originalGic.source_record_id])).rows).toEqual([{quality_status:"incomplete"}]);
    const allAudit = await db.query("select count(*) from core.audit_events");
    await db.exec(all);
    expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(allAudit.rows);
    expect((await db.query("select * from catalog.entities where id='10000000-0000-0000-0000-000000000017'")).rows).toEqual(correctedPhp.rows);
    await db.exec("set role anon");
    expect((await db.query("select * from port.icds")).rows).toHaveLength(0);
    expect((await db.query("select * from port.company_asset_interests where verification_status='pending'")).rows).toHaveLength(0);
  } finally {
    await db.close();
  }
});
