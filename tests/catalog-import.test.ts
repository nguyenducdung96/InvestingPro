import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const sql = readFileSync("supabase/imports/505_commercial_catalog.reviewed.sql", "utf8");
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on all functions in schema auth to anon,authenticated,service_role;`);
  for (const file of readdirSync("supabase/migrations").sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
  // Test-only acquisition times; cloud imports copy the actual archived timestamp.
  for (const file of ["haiphong_catalog.reviewed.sql", "tan_vu_interest.reviewed.sql", "evidence_date_precision.correction.sql"]) {
    await db.exec(readFileSync(`supabase/imports/${file}`, "utf8")
      .replaceAll("__AUTHORITY_FETCHED_AT__", "2026-10-14T00:00:00Z")
      .replaceAll("__CATALOG_FETCHED_AT__", "2026-10-14T00:00:00Z")
      .replaceAll("__FETCHED_AT__", "2026-10-14T00:00:00Z"));
  }
});
afterAll(() => db.close());

it("replays the reviewed catalog without duplicate entities, orphan hierarchy or fabricated company interests", async () => {
  await db.exec(sql);
  const counts = await db.query<{kind:string; count:number}>("select kind,count(*)::int as count from catalog.entities group by kind");
  expect(Object.fromEntries(counts.rows.map(x => [x.kind, x.count]))).toEqual({port_authority:1, port:17, terminal:59, berth:167, company:1});
  const audit = await db.query("select count(*) from core.audit_events");
  await db.exec(sql);
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(audit.rows);
  expect((await db.query("select id from port.ports where authority_id is null")).rows).toHaveLength(16);
  expect((await db.query("select * from port.company_asset_interests where verification_status='verified'")).rows).toHaveLength(0);
  expect((await db.query("select * from catalog.company_listings")).rows).toHaveLength(0);
  expect((await db.query("select * from port.terminals t left join port.ports p on p.id=t.port_id where p.id is null")).rows).toHaveLength(0);
});

it("preserves nonsequential berth identifiers and keeps pending identity decisions private", async () => {
  const names = await db.query<{name:string}>(`select b.name from catalog.entities b join port.berths x on x.id=b.id join catalog.entities t on t.id=x.terminal_id where t.slug='ben-cang-ben-thuy' order by b.name`);
  expect(names.rows.map(x => x.name)).toEqual(["Cầu cảng số 1 – Bến Thủy", "Cầu cảng số 3 – Bến Thủy", "Cầu cảng số 6 – Bến Thủy"]);
  const phuocAn = await db.query<{name:string}>(`select b.name from catalog.entities b join port.berths x on x.id=b.id join catalog.entities t on t.id=x.terminal_id where t.slug='ben-cang-phuoc-an' order by b.name`);
  expect(phuocAn.rows.map(x => x.name)).toEqual(["Cầu cảng số 5 – Phước An", "Cầu cảng số 6 – Phước An", "Cầu cảng số 7 – Phước An"]);
  await db.exec("set role anon");
  expect((await db.query("select * from port.entity_mappings")).rows).toHaveLength(0);
  expect((await db.query("select * from port.terminals")).rows).toHaveLength(59);
  await db.exec("reset role");
});

it("withdraws only the explicitly synthetic source while retaining real catalog and audit history", async () => {
  await db.exec("select set_config('app.environment','test',false)");
  await db.exec(readFileSync("supabase/seed/catalog.dev.sql", "utf8"));
  const withdrawal = readFileSync("supabase/imports/withdraw_synthetic_staging.sql", "utf8");
  await db.exec(withdrawal);
  const count = await db.query("select count(*) from core.audit_events");
  await db.exec(withdrawal);
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(count.rows);
  expect((await db.query("select id from catalog.entities where slug='synthetic-terminal'")).rows).toHaveLength(1);
  await db.exec("set role anon");
  expect((await db.query("select * from catalog.entities where slug like 'synthetic-%'")).rows).toHaveLength(0);
  expect((await db.query("select * from port.terminals")).rows).toHaveLength(59);
  await db.exec("reset role");
});
