import { createServer } from "node:http";
// Synthetic HTTP contract fixture. Actual constraints and RLS run in database.test.ts.
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const stamp = "2026-10-14T00:00:00.000Z";
const source = {
  id: id(1),
  name: "Official fixture source",
  rights_status: "approved",
};
const record = {
  id: id(2),
  source_id: id(1),
  source_url: "https://example.gov.vn/report",
  canonical_url: "https://example.gov.vn/report",
  external_id: "fixture",
  published_at: stamp,
  updated_at: null,
  fetched_at: stamp,
  reporting_period_start: null,
  reporting_period_end: null,
  content_type: "application/pdf",
  content_hash: "a".repeat(64),
  raw_storage_key: "test/report.pdf",
  parser_name: "fixture",
  parser_version: "1",
  quality_status: "verified",
};
const entities = [
  ["port_authority", "authority", "Fixture Authority"],
  ["port", "port", "Fixture Port"],
  ["terminal", "terminal", "Fixture Terminal"],
  ["berth", "berth", "Fixture Berth"],
  ["company", "company", "Fixture Company"],
  ["icd", "icd", "Fixture ICD"],
].map(([kind, slug, name], i) => ({
  id: id(i + 3),
  kind,
  slug,
  name,
  source_record_id: id(2),
  quality_status: "verified",
  created_at: stamp,
  updated_at: stamp,
}));
entities.push({ ...entities[1], id: id(20), slug: "unassigned-port", name: "Fixture Port Without Authority" });
const interest = {
  id: id(10),
  company_id: id(7),
  asset_id: id(5),
  asset_kind: "terminal",
  interest_type: "ownership",
  ownership_pct: null,
  valid_from: "2026-01-01",
  valid_to: null,
  verification_source_id: id(1),
  source_record_id: id(2),
  evidence_excerpt: "Synthetic fixture evidence p.10",
  resolution_method: "document_evidence",
  confidence: 1,
  verification_status: "verified",
  created_at: stamp,
  updated_at: stamp,
  reviewed_at: stamp,
  reviewed_by: id(99),
  supersedes_interest_id: null,
};
const mapping = {
  ...interest,
  id: id(11),
  entity_id: id(5),
  external_id: "terminal-fixture",
  external_name: "Fixture terminal proposal",
  verification_status: "pending",
  reviewed_at: null,
  reviewed_by: null,
  supersedes_mapping_id: null,
};
const rows = {
  sources: [source],
  source_records: [record],
  entities,
  port_authorities: [
    { id: id(3), kind: "port_authority", region: "Test region" },
  ],
  ports: [
    { id: id(20), kind: "port", authority_id: null, latitude: null, longitude: null },
    {
      id: id(4),
      kind: "port",
      authority_id: id(3),
      latitude: null,
      longitude: null,
    },
  ],
  terminals: [
    { id: id(5), kind: "terminal", port_id: id(4), terminal_type: null },
  ],
  berths: [{ id: id(6), kind: "berth", terminal_id: id(5) }],
  icds: [{ id: id(8), kind: "icd", address: null }],
  companies: [
    {
      id: id(7),
      kind: "company",
      legal_name: "Fixture Company",
      enterprise_id: null,
      official_website: null,
      ir_url: null,
    },
  ],
  company_listings: [
    {
      id: id(9),
      company_id: id(7),
      ticker: "TEST",
      exchange: "HOSE",
      valid_from: "2026-01-01",
      valid_to: null,
      source_record_id: id(2),
      verification_status: "verified",
    },
  ],
  company_asset_interests: [interest],
  current_asset_interests: [interest, { ...interest, id: id(12), asset_id: id(8), asset_kind: "icd", interest_type: "indirect", ownership_pct: 25, valid_from: "2025-01-01", evidence_excerpt: "Synthetic ICD evidence" }],
  entity_mappings: [mapping],
};
createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const url = new URL(req.url ?? "/", "http://127.0.0.1:54329");
  const admin = req.headers.authorization === "Bearer fixture-admin";
  if (url.pathname === "/reset" && req.method === "POST") {
    Object.assign(mapping, {
      verification_status: "pending",
      reviewed_at: null,
      reviewed_by: null,
    });
    res.end("{}");
    return;
  }
  if (url.pathname === "/auth/v1/user") {
    res.statusCode = admin ? 200 : 401;
    res.end(
      JSON.stringify(
        admin
          ? { id: id(99), app_metadata: { role: "admin" } }
          : { error: "Unauthorized" },
      ),
    );
    return;
  }
  const table = url.pathname.split("/").at(-1);
  let data = rows[table] ?? [];
  if (["entity_mappings", "company_asset_interests"].includes(table) && !admin)
    data = data.filter((r) => r.verification_status === "verified");
  for (const [column, filter] of url.searchParams) {
    if (["select", "order", "limit", "or"].includes(column)) continue;
    const [op, ...parts] = filter.split(".");
    const value = parts.join(".");
    if (op === "eq") data = data.filter((r) => String(r[column]) === value);
    if (op === "gt") data = data.filter((r) => String(r[column]) > value);
    if (op === "lte") data = data.filter((r) => String(r[column]) <= value);
    if (op === "in")
      data = data.filter((r) =>
        value.slice(1, -1).split(",").includes(String(r[column])),
      );
  }
  const or = url.searchParams.get("or");
  if (or?.startsWith("(valid_to")) {
    const at = or.split("valid_to.gt.")[1]?.replace(")", "");
    data = data.filter(
      (r) => r.valid_to === null || String(r.valid_to) > String(at),
    );
  }
  data = [...data]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .slice(0, Number(url.searchParams.get("limit") ?? 1000));
  if (req.method === "PATCH") {
    if (!admin) {
      res.statusCode = 403;
      res.end("{}");
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const change = JSON.parse(raw);
    for (const row of data)
      Object.assign(row, change, {
        reviewed_by: id(99),
        reviewed_at: new Date().toISOString(),
      });
  }
  res.end(JSON.stringify(data));
}).listen(54329, "127.0.0.1");
