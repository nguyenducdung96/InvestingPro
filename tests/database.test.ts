import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const db = new PGlite();
const id = (n: number) =>
  `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
async function role(name: string, admin = false) {
  await db.exec(
    `reset role;select set_config('request.jwt.claims','{"sub":"${id(99)}","app_metadata":{"role":"${admin ? "admin" : "user"}"},"user_metadata":{"role":"admin"}}',false);set role ${name};`,
  );
}
beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
  create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
  grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
  for (const file of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.exec(`insert into core.sources(id,code,name,owner,source_class,base_url,rights_status,rights_notes) values('${id(1)}','test','Official test source','Test','official_government','https://example.gov.vn','approved','TEST ONLY');
  insert into core.source_records(id,source_id,source_url,canonical_url,external_id,fetched_at,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status) values('${id(2)}','${id(1)}','https://example.gov.vn/report','https://example.gov.vn/report','test',now(),'application/pdf',repeat('a',64),'test/report.pdf','manual','1','verified');
  insert into catalog.entities(id,kind,slug,name,source_record_id,quality_status) values
  ('${id(3)}','port_authority','authority','Test Authority','${id(2)}','verified'),('${id(4)}','port','port','Test Port','${id(2)}','verified'),('${id(5)}','terminal','terminal','Test Terminal','${id(2)}','verified'),('${id(6)}','berth','berth','Test Berth','${id(2)}','verified'),('${id(7)}','company','company','Test Company','${id(2)}','verified'),('${id(8)}','company','company-two','Test Company Two','${id(2)}','verified');
  insert into port.port_authorities(id) values('${id(3)}');insert into port.ports(id,authority_id) values('${id(4)}','${id(3)}');insert into port.terminals(id,port_id) values('${id(5)}','${id(4)}');insert into port.berths(id,terminal_id) values('${id(6)}','${id(5)}');insert into catalog.companies(id,legal_name) values('${id(7)}','Test Company'),('${id(8)}','Test Company Two');`);
});
afterAll(async () => {
  await db.close();
});
function insert(
  n: number,
  overrides: Partial<{
    company: number;
    pct: number;
    from: string;
    to: string;
    method: string;
    status: string;
    source: number;
    supersedes: number;
  }> = {},
) {
  const o = {
    company: 7,
    pct: 50,
    from: "2026-01-01",
    to: null,
    method: "document_evidence",
    status: "pending",
    source: 1,
    supersedes: null,
    ...overrides,
  };
  return `insert into port.company_asset_interests(id,company_id,asset_id,asset_kind,interest_type,ownership_pct,valid_from,valid_to,verification_source_id,source_record_id,evidence_excerpt,resolution_method,confidence,verification_status,review_note,supersedes_interest_id) values('${id(n)}','${id(o.company)}','${id(5)}','terminal','ownership',${o.pct},'${o.from}',${o.to ? `'${o.to}'` : "null"},'${id(o.source)}','${id(2)}','Test filing p.10','${o.method}',1,'${o.status}','Verified signed evidence',${o.supersedes ? `'${id(o.supersedes)}'` : "null"});`;
}
describe.sequential("actual PostgreSQL migrations, constraints and RLS", () => {
  it("keeps pending mapping private and denies ordinary user writes despite user_metadata admin spoof", async () => {
    await role("authenticated", true);
    await db.exec(insert(10));
    await role("anon");
    expect(
      (await db.query("select * from port.company_asset_interests")).rows,
    ).toHaveLength(0);
    await role("authenticated");
    expect(
      (await db.query("select * from port.company_asset_interests")).rows,
    ).toHaveLength(0);
    await expect(db.exec(insert(11))).rejects.toThrow();
  });
  it("lets admins review with immutable audit history", async () => {
    await role("authenticated", true);
    await db.exec(
      `update port.company_asset_interests set verification_status='verified',review_note='Checked signed filing' where id='${id(10)}'`,
    );
    expect(
      (
        await db.query("select * from core.audit_events where record_id=$1", [
          id(10),
        ])
      ).rows,
    ).toHaveLength(2);
    await expect(
      db.exec(
        `update port.company_asset_interests set ownership_pct=10 where id='${id(10)}'`,
      ),
    ).rejects.toThrow();
    await role("anon");
    expect(
      (await db.query("select * from port.current_asset_interests")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select * from core.audit_events")).rows,
    ).toHaveLength(0);
  });
  it("rejects fuzzy verification and invalid ownership or lineage", async () => {
    await role("authenticated", true);
    await expect(
      db.exec(insert(12, { method: "fuzzy_name", status: "verified" })),
    ).rejects.toThrow();
    await expect(db.exec(insert(13, { pct: 101 }))).rejects.toThrow();
    await expect(db.exec(insert(14, { source: 123 }))).rejects.toThrow();
    await expect(db.exec(insert(15, { to: "2025-01-01" }))).rejects.toThrow();
  });
  it("rejects overlapping verified claims while permitting multiple owners", async () => {
    await role("authenticated", true);
    await expect(db.exec(insert(16, { status: "verified" }))).rejects.toThrow();
    await db.exec(insert(17, { company: 8, status: "verified" }));
  });
  it("preserves a correction and hides the superseded interest", async () => {
    await role("authenticated", true);
    await db.exec(insert(18, { status: "verified", pct: 40, supersedes: 10 }));
    await role("anon");
    const result = await db.query<{ id: string }>(
      "select id from port.current_asset_interests",
    );
    expect(result.rows.map((r) => r.id)).not.toContain(id(10));
    expect(result.rows.map((r) => r.id)).toContain(id(18));
    expect(
      (await db.query("select * from port.company_asset_interests")).rows,
    ).toHaveLength(3);
  });
  it("enforces typed hierarchy and immutable raw evidence", async () => {
    await role("authenticated", true);
    await expect(
      db.exec(
        `insert into port.berths(id,terminal_id) values('${id(7)}','${id(5)}')`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(`update core.source_records set content_hash=repeat('b',64)`),
    ).rejects.toThrow();
  });
  it("rejects self-corrections and corrections to pending proposals", async () => {
    await role("authenticated", true);
    await db.exec(insert(20, { company: 8 }));
    await expect(
      db.exec(
        `update port.company_asset_interests set supersedes_interest_id=id,verification_status='verified',review_note='Test' where id='${id(20)}'`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(insert(21, { company: 8, status: "verified", supersedes: 20 })),
    ).rejects.toThrow();
  });
  it("enforces entity identity review and external identifier uniqueness", async () => {
    await role("authenticated", true);
    const sql = (n: number, entity: number, method: string) =>
      `insert into port.entity_mappings(id,entity_id,verification_source_id,source_record_id,external_id,external_name,valid_from,resolution_method,confidence,evidence_excerpt,verification_status,review_note) values('${id(n)}','${id(entity)}','${id(1)}','${id(2)}','official-terminal-1','Test terminal','2026-01-01','${method}',1,'Test official identifier','verified','Checked evidence')`;
    await expect(db.exec(sql(25, 5, "fuzzy_name"))).rejects.toThrow();
    await db.exec(sql(26, 5, "official_identifier"));
    await expect(db.exec(sql(27, 6, "official_identifier"))).rejects.toThrow();
    await role("anon");
    expect(
      (await db.query("select * from port.entity_mappings")).rows,
    ).toHaveLength(1);
  });
  it("publishes verified listings and prevents overlapping ticker reassignment", async () => {
    await role("authenticated", true);
    const sql = (n: number, company: number, from: string, to: string | null) =>
      `insert into catalog.company_listings(id,company_id,ticker,exchange,valid_from,valid_to,source_record_id,verification_status) values('${id(n)}','${id(company)}','TEST','HOSE','${from}',${to ? `'${to}'` : "null"},'${id(2)}','verified')`;
    await db.exec(sql(30, 7, "2025-01-01", "2026-01-01"));
    await db.exec(sql(31, 8, "2026-01-01", null));
    await expect(db.exec(sql(32, 7, "2026-06-01", null))).rejects.toThrow();
    await role("anon");
    expect(
      (await db.query("select * from catalog.company_listings")).rows,
    ).toHaveLength(2);
  });
  it("protects all catalog and source writes from normal users", async () => {
    await role("authenticated");
    const results = await db.query(
      "update catalog.entities set name=$1 returning id",
      ["Forged"],
    );
    expect(results.rows).toHaveLength(0);
    await expect(
      db.exec(
        `insert into core.sources(code,name,owner,source_class,base_url,rights_notes) values('forged','Forged','x','official_government','https://example.gov.vn','x')`,
      ),
    ).rejects.toThrow();
    await expect(db.exec("delete from core.audit_events")).rejects.toThrow();
  });
  it("withdraws public catalog and interests when source rights are blocked", async () => {
    await role("authenticated", true);
    await db.exec(
      `update core.sources set rights_status='blocked' where id='${id(1)}'`,
    );
    await role("anon");
    expect(
      (await db.query("select * from catalog.entities")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select * from port.current_asset_interests")).rows,
    ).toHaveLength(0);
    await role("authenticated", true);
    await db.exec(
      `update core.sources set rights_status='approved' where id='${id(1)}'`,
    );
  });
  it("requires explicit dev/test opt-in for the synthetic seed", async () => {
    await db.exec("reset role");
    const seed = readFileSync("supabase/seed/catalog.dev.sql", "utf8");
    await expect(db.exec(seed)).rejects.toThrow("dev/test");
    await db.exec("rollback; select set_config('app.environment','test',false)");
    await db.exec(seed);
  });
});
