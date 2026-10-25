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
const publicationState={sources:false,evidence:false,entities:false};
const reportedFixture={id:id(61),dossier_id:id(60),company_id:id(7),asset_id:id(5),asset_name:'Fixture report-period terminal',asset_kind:'terminal',reported_role:'operator',via:[],berth_scope:[],reporting_period_end:'2025-12-31',relationship_started_on:null,date_basis:null,source_record_id:id(2),supporting_evidence:[],evidence_pages:[10],evidence_note:'Synthetic report-period facts, not a current ownership certification.',verification_status:'verified',reviewed_by:id(99),reviewed_at:stamp,review_note:'Synthetic reviewed observation',supersedes_observation_id:null};
rows.catalog_dossiers=[{id:id(60),company_id:id(7),ticker:'TEST',reporting_period_end:'2025-12-31',source_record_id:id(2),reviewed_pages:[10],review_outcome:'reported_assets',review_note:'Synthetic scoped dossier review',gaps:['Historical start remains unknown'],scope_version:'fixture-scope'}];
rows.reported_asset_observations=[reportedFixture];
rows.published_asset_observations=[reportedFixture];
rows.company_reference_snapshots=[];
rows.reference_refresh_runs=[];
rows.company_relationship_snapshots=[];
rows.editorial_catalog_editions=[];
rows.published_port_calls=[{id:id(201),event_key:'e'.repeat(64),artifact_id:id(202),vessel_id:id(203),vessel_name:'SYNTHETIC TEST SHIP',source_area:'quangtri-cua-viet',event_kind:'reported',event_day:'2026-10-16',gt:null,berth:null,direction:'arrival',occurred_at:'2026-10-16T23:30:00+07:00',reported_day:'2026-10-16',raw_time:'23:30-16/10',dwt:null,row_number:1,quarantine_reason:null,source_url:'https://example.gov.vn/test-only',raw_sha256:'a'.repeat(64),fetched_at:stamp,parser_version:'quangtri-notices/1.0.0',identity_confidence:'source_observation'}];
rows.published_port_calls.push({...rows.published_port_calls[0],id:id(220),event_key:'b'.repeat(64),source_area:'danang-berth-reported',vessel_name:'SYNTHETIC BERTH SHIP',time_basis:'berth_movement',movement_scope:'berth'});
rows.call_coverage=[{source_area:'quangtri-cua-viet',event_kind:'reported',reported_day:'2026-10-16',artifact_id:id(202),fetched_at:stamp,parser_version:'quangtri-notices/1.0.0',quarantined:1}];
rows.call_coverage.push({...rows.call_coverage[0],source_area:'quangtri-len-bang'});
  rows.published_in_port_snapshots=[{...rows.published_port_calls[0],id:id(211),event_key:'f'.repeat(64),source_area:'cantho-ct',event_kind:'in_port',vessel_name:'SYNTHETIC IN PORT SHIP',berth:'TEST BERTH',occurred_at:'2025-08-02T02:00:00+07:00',parser_version:'cantho-positions/1.0.0'}];rows.published_in_port_snapshots.push(...Array.from({length:51},(_,n)=>({...rows.published_in_port_snapshots[0],id:id(400+n),source_area:'haiphong-in-port',vessel_name:`PAGINATION SHIP ${String(n+1).padStart(2,'0')}`,berth:'TEST HP BERTH',occurred_at:null,time_day:n===0?'2026-10-17':null,time_precision:n===0?'day':'unknown',raw_time:''})));rows.port_calls=[];rows.call_artifacts=[];
rows.current_quarantined_calls=[];
const publicationSource={...source,id:id(40),owner:"Fixture issuing company",base_url:"https://example.gov.vn",rights_notes:"Fixture only: permission must be explicitly reviewed.",rights_status:"to_verify"};
createServer(async (req, res) => {
  if(req.url==='/__plans'&&req.method==='POST'){
    let raw='';for await(const chunk of req)raw+=chunk;const data=JSON.parse(raw);
    rows.tanvu_plan_days=data.days;rows.tanvu_plan_runs=data.runs??[];rows.tanvu_plan_details=data.details??[];
    rows.php_plan_days=data.days.map(d=>({asset_code:'tan_vu',...d}));rows.php_plan_runs=(data.runs??[]).map(d=>({asset_code:'tan_vu',...d}));rows.php_plan_details=(data.details??[]).map(d=>({asset_code:'tan_vu',...d}));
    rows.php_plan_coverage=[...new Set(rows.php_plan_days.map(d=>d.asset_code))].map(asset_code=>({asset_code,source_days:rows.php_plan_days.filter(d=>d.asset_code===asset_code).length,last_source_day:rows.php_plan_days.filter(d=>d.asset_code===asset_code).at(-1)?.report_day}));
    res.end('{}');return;
  }
  // Test-only mutable throughput store: proves request-time reads, never imported by the app.
  if(req.url==='/__berths'&&req.method==='POST') {
    let raw='';for await(const chunk of req)raw+=chunk;
    rows.company_berth_editions=JSON.parse(raw);res.end('{}');return;
  }
  if(req.url==='/__throughput'&&req.method==='POST') {
    let raw='';for await(const chunk of req)raw+=chunk;
    rows.published_monthly_throughput=JSON.parse(raw);
    rows.editorial_catalog_editions=[{id:id(900),published_at:stamp,basis:'test-only',entries:[...['VGR','VSC','GMD','HAH','DXP','PSP','CQN','CDN','QNP','CMP','NAP','SGP'].map((ticker,i)=>({ticker,company_id:id(910+i),name:'TEST ONLY '+ticker,market_as_reported:'HOSE',period:'2025-12-31',assets:[],research_paths:[],source:{url:'https://example.gov.vn/test-only',sha256:'a'.repeat(64),pages:[1]}})),{ticker:'DVP',company_id:id(901),name:'TEST ONLY · DVP',market_as_reported:'HOSE',period:'2025-12-31',assets:[{name:'Bến cảng Đình Vũ',kind:'terminal',role:'operator',via:[],berth_scope:[],scope_group:'main',started_on:null,documented_date:null,date_basis:null}],research_paths:[],source:{url:'https://example.gov.vn/test-only',sha256:'a'.repeat(64),pages:[1]}},{ticker:'PHP',company_id:id(7),name:'TEST ONLY · PHP',market_as_reported:'UPCoM',period:'2025-12-31',assets:[],research_paths:[],source:{url:'https://example.gov.vn/test-only',sha256:'a'.repeat(64),pages:[1]}}]}];
    res.end('{}');return;
  }
  res.setHeader("Content-Type", "application/json");
  const url = new URL(req.url ?? "/", "http://127.0.0.1:54329");
  const admin = req.headers.authorization === "Bearer fixture-admin";
  if (url.pathname === "/reset" && req.method === "POST") {
    rows.company_reference_snapshots=[];rows.reference_refresh_runs=[];rows.company_relationship_snapshots=[];
    rows.editorial_catalog_editions=[];
    Object.assign(publicationState,{sources:false,evidence:false,entities:false});
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
  if(table==='php_plan_events'){
    let raw='';for await(const chunk of req)raw+=chunk;const data=JSON.parse(raw);res.end(JSON.stringify((rows.php_plan_details??[]).find(d=>d.asset_code===data.p_asset&&d.report_day===data.p_day)??null));return;
  }
  if(table==='tanvu_plan_events'){
    let raw='';for await(const chunk of req)raw+=chunk;
    const data=JSON.parse(raw);res.end(JSON.stringify((rows.tanvu_plan_details??[]).find(d=>d.report_day===data.p_day)??null));return;
  }
  if(table==='publish_editorial_catalog'){
    if(!admin){res.statusCode=403;res.end('{}');return;}
    let raw='';for await(const chunk of req)raw+=chunk;const input=JSON.parse(raw);
    const inserted=rows.editorial_catalog_editions.some(r=>r.id===input.p_id)?0:1;
    if(inserted)rows.editorial_catalog_editions.push({id:input.p_id,entries:input.p_entries,published_at:stamp,basis:'structured-facts-only-v1'});
    res.end(JSON.stringify({inserted,companies:41}));return;
  }
  if(['import_reference_refresh','review_reference_snapshot'].includes(table)) {
    if(!admin){res.statusCode=403;res.end('{}');return;}
    let raw='';for await(const chunk of req)raw+=chunk;const input=JSON.parse(raw);
    if(table==='review_reference_snapshot'){
      const row=rows.company_reference_snapshots.find(r=>r.id===input.p_id);
      Object.assign(row,{review_status:input.p_decision,review_note:input.p_note,reviewed_by:id(99),reviewed_at:stamp});res.end(JSON.stringify(row));return;
    }
    let inserted=0;for(const entry of input.p_entries){if(entry.relationships)rows.company_relationship_snapshots.push({id:id(95),company_id:entry.company_id,ticker:entry.ticker,provider:entry.provider,...entry.relationships,relationship_data:JSON.parse(entry.relationships.raw_text)});if(rows.company_reference_snapshots.some(r=>r.raw_sha256===entry.raw_sha256&&r.company_id===entry.company_id))continue;rows.company_reference_snapshots.push({...entry,id:id(81+inserted),reference_data:JSON.parse(entry.raw_text)[0],review_status:'pending',review_note:null,run_id:input.p_id});inserted++;}
    rows.reference_refresh_runs.push({id:input.p_id,imported_at:stamp,entry_count:input.p_entries.length});res.end(JSON.stringify({inserted,received:input.p_entries.length}));return;
  }
  if (["publication_queue","review_publication"].includes(table)) {
    if(!admin) {res.statusCode=403;res.end('{}');return;}
    let raw="";for await(const chunk of req) raw+=chunk;
    const input=JSON.parse(raw);
    if(table==="review_publication") {
      publicationState[input.p_kind]=true;
      res.end(JSON.stringify({id:id(49),replacementRecordId:input.p_kind==='evidence'?id(45):null,decision:input.p_decision}));return;
    }
    const kind=input.p_kind;
    const blockers=kind==='evidence' && !publicationState.sources?['Cần duyệt quyền sử dụng nguồn trước.']:kind==='entities' && !publicationState.evidence?['Cần duyệt nguồn và xác minh bằng chứng trước.']:[];
    const item={id:id(kind==='sources'?40:kind==='evidence'?41:42),kind,name:kind==='sources'?'Fixture publication source':kind==='evidence'?'Fixture evidence p.1–2':'Fixture pending company',source:{...publicationSource,rights_status:publicationState.sources?'approved':'to_verify'},blockers};
    if(kind!=='sources') item.record={...record,id:id(41),source_id:id(40),quality_status:publicationState.evidence?'verified':'incomplete'};
    if(kind==='entities') item.entity={...entities[4],id:id(42),name:'Fixture pending company',quality_status:'incomplete'};
    res.end(JSON.stringify(publicationState[kind]?[]:[item]));return;
  }
  let data = rows[table] ?? [];
  if(table==='catalog_dossiers'&&!admin) data=[];
  if (["entity_mappings", "company_asset_interests"].includes(table) && !admin)
    data = data.filter((r) => r.verification_status === "verified");
  for (const [column, filter] of url.searchParams) {
    if (["select", "order", "limit", "offset", "or"].includes(column)) continue;
    const [op, ...parts] = filter.split(".");
    const value = parts.join(".");
    if (op === "eq") data = data.filter((r) => String(r[column]) === value);
    if (op === "gt") data = data.filter((r) => String(r[column]) > value);
    if (op === "gte") data = data.filter((r) => String(r[column]) >= value);
    if (op === "lte") data = data.filter((r) => String(r[column]) <= value);
    if (op === "in")
      data = data.filter((r) =>
        value.slice(1, -1).split(",").includes(String(r[column])),
      );
  }
  const or = url.searchParams.get("or");
  const and=url.searchParams.get('and');
  const planRange=and?.match(/^\(report_day\.gte\.(\d{4}-\d{2}-\d{2}),report_day\.lte\.(\d{4}-\d{2}-\d{2})\)$/);if(planRange)data=data.filter(r=>r.report_day>=planRange[1]&&r.report_day<=planRange[2]);if(and?.startsWith('(reported_day.lte.'))data=data.filter(r=>r.reported_day<=and.slice(18,-1));
  if(and?.startsWith('(event_day.lte.'))data=data.filter(r=>r.event_day<=and.slice(15,-1));
  if(and?.startsWith('(occurred_at.lte.'))data=data.filter(r=>Date.parse(r.occurred_at)<=Date.parse(and.slice(17,-1)));
  if (or?.startsWith("(valid_to")) {
    const at = or.split("valid_to.gt.")[1]?.replace(")", "");
    data = data.filter(
      (r) => r.valid_to === null || String(r.valid_to) > String(at),
    );
  }
  data = [...data]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .slice(Number(url.searchParams.get("offset") ?? 0), Number(url.searchParams.get("offset") ?? 0)+Number(url.searchParams.get("limit") ?? 1000));
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
