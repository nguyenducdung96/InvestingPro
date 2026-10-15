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
  } finally {
    await db.close();
  }
});
