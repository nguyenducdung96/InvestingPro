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

it("imports PAP's exact legal berths as pending proposals, retains date precision and replays without new audit", async()=>{
  const proposal=readFileSync("supabase/imports/pap_assets.proposals.sql","utf8");
  const approvedBefore=await db.query("select * from catalog.entities where quality_status='verified' order by id");
  await db.exec(proposal);
  const rows=await db.query<{name:string;valid_from:string;ownership_pct:null;verification_status:string;evidence_excerpt:string}>(`select e.name,i.valid_from::text,i.ownership_pct,i.verification_status,i.evidence_excerpt from port.company_asset_interests i join catalog.entities e on e.id=i.asset_id where i.company_id='c0a6f7c5-4ee6-503b-8ad5-5183696ff2ae' order by e.name`);
  expect(rows.rows.map(row=>({name:row.name,valid_from:row.valid_from,ownership_pct:row.ownership_pct,verification_status:row.verification_status}))).toEqual([
    {name:"Cầu cảng số 5 – Phước An",valid_from:"2024-12-31",ownership_pct:null,verification_status:"pending"},
    {name:"Cầu cảng số 6 – Phước An",valid_from:"2024-12-31",ownership_pct:null,verification_status:"pending"},
    {name:"Cầu cảng số 7 – Phước An",valid_from:"2025-12-05",ownership_pct:null,verification_status:"pending"},
  ]);
  expect(String(rows.rows[1].evidence_excerpt)).toContain("phần nối dài có quyết định riêng ngày 2025-12-05");
  const evidence=await db.query<{quality_status:string;rights_status:string;published_at:null;fetched_at:Date}>(`select r.quality_status,s.rights_status,r.published_at,r.fetched_at from core.source_records r join core.sources s on s.id=r.source_id where r.external_id='PAP-2025:asset-review-p3-p4'`);
  expect(evidence.rows[0]).toMatchObject({quality_status:"incomplete",rights_status:"to_verify",published_at:null});
  expect(evidence.rows[0].fetched_at.toISOString()).toBe("2026-10-14T20:31:18.950Z");
  expect((await db.query("select * from catalog.entities where quality_status='verified' order by id")).rows).toEqual(approvedBefore.rows);
  const audits=await db.query("select count(*) from core.audit_events");
  await db.exec(proposal);
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(audits.rows);
  await db.exec("set role anon");
  expect((await db.query("select * from port.company_asset_interests where company_id='c0a6f7c5-4ee6-503b-8ad5-5183696ff2ae'")).rows).toHaveLength(0);
  await db.exec("reset role");
});

it("adds VSC beyond the fifteen-ticker baseline without inventing company-asset interests",async()=>{
  const proposal=readFileSync("supabase/imports/vsc_registry.proposals.sql","utf8");
  const assets=await db.query("select * from port.company_asset_interests order by id");
  await db.exec(proposal);
  expect((await db.query(`select c.legal_name,c.enterprise_id,l.ticker,l.exchange,l.valid_from::text,l.verification_status from catalog.companies c join catalog.company_listings l on l.company_id=c.id where l.ticker='VSC'`)).rows).toEqual([
    {legal_name:"Công ty Cổ phần Container Việt Nam",enterprise_id:"0200453688",ticker:"VSC",exchange:"HOSE",valid_from:"2008-01-09",verification_status:"pending"},
  ]);
  expect((await db.query("select * from port.company_asset_interests order by id")).rows).toEqual(assets.rows);
  const audits=await db.query("select count(*) from core.audit_events");
  await db.exec(proposal);
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(audits.rows);
  await db.exec("set role anon");
  expect((await db.query("select * from catalog.company_listings where ticker='VSC'")).rows).toHaveLength(0);
  await db.exec("reset role");
});

it("runs the exact user handoff bundle safely after either individual import",async()=>{
  const bundle=readFileSync("supabase/imports/slice1_additional_catalog.handoff.sql","utf8");
  const audits=await db.query("select count(*) from core.audit_events");
  const results=await db.exec(bundle);
  expect(results.at(-1)?.rows).toEqual([
    {item:"PAP berth proposals",rows:3,pending:3},
    {item:"VSC listing",rows:1,pending:1},
  ]);
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(audits.rows);
});

it("rolls back earlier rows when a later issuer identity conflicts",async()=>{
  const proposal=readFileSync("supabase/imports/expanded_issuer_registry.proposals.sql","utf8");
  const audits=await db.query("select count(*) from core.audit_events");
  await expect(db.exec(proposal.replace("enterprise_id='0309444635'", "enterprise_id='0200453688'"))).rejects.toThrow("PNP identity already exists");
  await db.exec("rollback");
  expect((await db.query("select * from catalog.company_listings where ticker in ('CAG','CCR','TCL','PNP')")).rows).toHaveLength(0);
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(audits.rows);
});

it("imports four additional issuer histories without publishing or creating guessed asset interests",async()=>{
  const proposal=readFileSync("supabase/imports/expanded_issuer_registry.proposals.sql","utf8");
  const interests=await db.query("select * from port.company_asset_interests order by id");
  const reviewed=await db.query("select * from catalog.entities where quality_status='verified' order by id");
  const result=await db.exec(proposal);
  expect(result.at(-1)?.rows).toEqual([
    {ticker:"CAG",exchange:"HNX",valid_from:new Date("2017-12-04T00:00:00Z"),verification_status:"pending"},
    {ticker:"CCR",exchange:"HNX",valid_from:new Date("2021-11-19T00:00:00Z"),verification_status:"pending"},
    {ticker:"PNP",exchange:"UPCOM",valid_from:new Date("2019-05-17T00:00:00Z"),verification_status:"pending"},
    {ticker:"TCL",exchange:"HOSE",valid_from:new Date("2009-12-24T00:00:00Z"),verification_status:"pending"},
  ]);
  expect((await db.query("select * from port.company_asset_interests order by id")).rows).toEqual(interests.rows);
  expect((await db.query("select * from catalog.entities where quality_status='verified' order by id")).rows).toEqual(reviewed.rows);
  const lineage=await db.query<{rights_status:string;quality_status:string;published_at:null;raw_storage_key:string;content_hash:string}>(`select s.rights_status,r.quality_status,r.published_at,r.raw_storage_key,r.content_hash from catalog.company_listings l join core.source_records r on r.id=l.source_record_id join core.sources s on s.id=r.source_id where l.ticker in ('CAG','CCR','TCL','PNP')`);
  expect(lineage.rows).toHaveLength(4);
  for(const row of lineage.rows) {
    expect(row).toMatchObject({rights_status:"to_verify",quality_status:"incomplete",published_at:null});
    expect(row.raw_storage_key).toBe(`catalog-evidence/sha256/${row.content_hash}`);
  }
  const audit=await db.query("select count(*) from core.audit_events");
  await db.exec(proposal);
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(audit.rows);
  await db.exec("set role anon");
  expect((await db.query("select * from catalog.company_listings where ticker in ('CAG','CCR','TCL','PNP')")).rows).toHaveLength(0);
  await db.exec("reset role");
});

it("denies publication RPCs to ordinary users and anonymous callers",async()=>{
  await db.exec(`select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000098","app_metadata":{"role":"user"},"user_metadata":{"role":"admin"}}',false);set role authenticated`);
  await expect(db.query("select * from core.publication_queue('sources')")).rejects.toThrow("Admin review required");
  await expect(db.query("select core.review_publication('sources','00000000-0000-0000-0000-000000000001','approved','A sufficiently long review note')")).rejects.toThrow("Admin review required");
  await db.exec("reset role;set role anon");
  await expect(db.query("select * from core.publication_queue('evidence')")).rejects.toThrow("permission denied");
  await db.exec("reset role");
});

it("imports sixteen additional HNX histories while preserving suspensions, renamed identities and review gates",async()=>{
  const sql=readFileSync("supabase/imports/market_issuer_registry.proposals.sql","utf8");
  const audits=await db.query("select count(*) from core.audit_events");
  // The last row fails after preceding inserts: none of them may survive.
  await expect(db.exec(sql.replace("enterprise_id='0201768923'","enterprise_id='0200453688'"))).rejects.toThrow("GIC identity already exists");
  await db.exec("rollback");
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(audits.rows);
  expect((await db.query("select * from catalog.company_listings where ticker='CCP'")).rows).toHaveLength(0);
  const previousInterests=await db.query("select * from port.company_asset_interests order by id");
  await db.exec(sql);
  expect((await db.query("select * from catalog.companies")).rows).toHaveLength(36);
  expect((await db.query("select * from catalog.company_listings")).rows).toHaveLength(36);
  expect((await db.query("select * from port.company_asset_interests order by id")).rows).toEqual(previousInterests.rows);
  expect((await db.query("select valid_from::text from catalog.company_listings where ticker='PSB'")).rows).toEqual([{valid_from:"2010-02-25"}]);
  expect((await db.query("select legal_name,enterprise_id from catalog.companies c join catalog.company_listings l on l.company_id=c.id where ticker='PSB'")).rows).toEqual([{legal_name:"Công ty Cổ phần Cảng Kỹ thuật PTSC Sao Mai",enterprise_id:"3500794814"}]);
  const cpi=await db.query<{evidence_excerpt:string}>("select evidence_excerpt from catalog.company_listings where ticker='CPI'");
  expect(cpi.rows[0].evidence_excerpt).toContain("Tạm ngừng giao dịch");
  const cmp=await db.query<{evidence_excerpt:string}>("select evidence_excerpt from catalog.company_listings where ticker='CMP'");
  expect(cmp.rows[0].evidence_excerpt).toContain("không đáp ứng điều kiện công ty đại chúng");
  const records=await db.query<{reporting_period_start:null;reporting_period_end:null;quality_status:string}>("select reporting_period_start,reporting_period_end,quality_status from core.source_records where parser_name='manual-indexed-profile-field-review'");
  expect(records.rows).toHaveLength(16);
  expect(records.rows.every(r=>r.reporting_period_start===null && r.reporting_period_end===null && r.quality_status==='incomplete')).toBe(true);
  const after=await db.query("select count(*) from core.audit_events");
  await db.exec(sql);
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(after.rows);
  await db.exec("set role anon");
  expect((await db.query("select * from catalog.company_listings where ticker in ('CCP','CCT','CPI','IST','PSB','SWC','TNP','TCW','VGP','PVS','CMP','PQN','VLG','PSN','VMS','GIC')")).rows).toHaveLength(0);
  await db.exec("reset role");
});

it("keeps issuer identity evidence separate from historical listing dates including the reviewed STG date",async()=>{
  const sql=readFileSync("supabase/imports/final_issuer_identities.proposals.sql","utf8");
  await db.exec(sql);
  expect((await db.query("select * from catalog.companies")).rows).toHaveLength(41);
  expect((await db.query("select * from catalog.company_listings")).rows).toHaveLength(41);
  expect((await db.query("select ticker,valid_from::text from catalog.company_listings where ticker in ('HAH','CLL','ILB','TMS','STG') order by ticker")).rows).toEqual([
    {ticker:"CLL",valid_from:"2014-07-08"},
    {ticker:"HAH",valid_from:"2015-03-11"},
    {ticker:"ILB",valid_from:"2019-05-15"},
    {ticker:"STG",valid_from:"2010-03-02"},
    {ticker:"TMS",valid_from:"2000-08-04"},
  ]);
  expect((await db.query("select legal_name from catalog.companies where enterprise_id='0300645369'")).rows).toEqual([{legal_name:"Công ty Cổ phần Kho vận Miền Nam"}]);
  const lineage=await db.query<{ticker:string;identity_url:string;listing_url:string}>(`select l.ticker,ir.source_url identity_url,lr.source_url listing_url from catalog.company_listings l join catalog.entities e on e.id=l.company_id join core.source_records ir on ir.id=e.source_record_id join core.source_records lr on lr.id=l.source_record_id where l.ticker in ('HAH','ILB','TMS','STG')`);
  expect(lineage.rows).toHaveLength(4);
  for(const row of lineage.rows) expect(row.identity_url).not.toBe(row.listing_url);
  expect(lineage.rows.find(r=>r.ticker==='ILB')?.listing_url).toContain("staticfile.hsx.vn");
  expect(lineage.rows.find(r=>r.ticker==='STG')?.listing_url).toContain("Sotrans_Bao_cao_thuong_nien_nam_2012_Cus.pdf");
  const audit=await db.query("select count(*) from core.audit_events");
  await db.exec(sql);
  expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(audit.rows);
  await db.exec("set role anon");
  expect((await db.query("select * from catalog.company_listings where ticker in ('HAH','CLL','ILB','TMS')")).rows).toHaveLength(0);
  await db.exec("reset role");
});

it("publishes through explicit source, immutable evidence, entity and listing decisions; withdrawal hides the result",async()=>{
  await db.exec(`select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000099","app_metadata":{"role":"admin"}}',false);set role authenticated`);
  const originalId='a40343bd-a826-5470-bc99-9cccce655d59';
  const original=(await db.query<{source_id:string;content_hash:string;fetched_at:Date;published_at:null;raw_storage_key:string;quality_status:string}>(`select * from core.source_records where id='${originalId}'`)).rows[0];
  const note="Đã đối chiếu hồ sơ thử nghiệm, trang 1–2 và phạm vi dữ kiện.";
  // Fixture only; no source rights are decided by production scripts or tests.
  const approveEvidence=(hash:string)=>db.query<{result:{replacementRecordId:string}}>(`select core.review_publication('evidence','${originalId}','approved',$1,null,null,null,$2,true) as result`,[note,hash]);
  await expect(approveEvidence(original.content_hash)).rejects.toThrow("Source rights approval required");
  await expect(db.query(`select core.review_publication('sources','${original.source_id}','approved',$1,'too short','too short',null,null,true)`,[note])).rejects.toThrow("Source basis and scope required");
  await db.query(`select core.review_publication('sources','${original.source_id}','approved',$1,$2,$3,null,null,true)`,[note,"TEST ONLY: fixture license covering these exact factual fields.","TEST ONLY: fixture identity and listing evidence, no third-party publication."]);
  const queue=await db.query<{publication_queue:{id:string;blockers:string[]}}>("select * from core.publication_queue('evidence',100)");
  expect(queue.rows.find(x=>x.publication_queue.id===originalId)?.publication_queue.blockers).toEqual([]);
  await expect(approveEvidence('0'.repeat(64))).rejects.toThrow("Evidence hash confirmation required");
  const result=(await approveEvidence(original.content_hash)).rows[0].result;
  expect((await db.query<{publication_queue:{id:string}}>("select * from core.publication_queue('evidence',100)")).rows.some(x=>x.publication_queue.id===originalId)).toBe(false);
  const copy=(await db.query<typeof original>(`select * from core.source_records where id='${result.replacementRecordId}'`)).rows[0];
  expect(copy).toMatchObject({quality_status:"verified",content_hash:original.content_hash,raw_storage_key:original.raw_storage_key,published_at:original.published_at});
  expect(copy.fetched_at).toEqual(original.fetched_at);
  expect((await db.query(`select quality_status from core.source_records where id='${originalId}'`)).rows).toEqual([{quality_status:"incomplete"}]);
  await expect(approveEvidence(original.content_hash)).rejects.toThrow("already decided");
  await expect(db.exec(`update core.source_records set quality_status='verified' where id='${originalId}'`)).rejects.toThrow("immutable");
  expect((await db.query(`select source_record_id from catalog.company_listings where ticker='DVP'`)).rows).toEqual([{source_record_id:result.replacementRecordId}]);
  await db.query(`select core.review_publication('entities','fafba875-a5cd-55f2-ac4f-0acf54a64164','approved',$1,null,null,null,null,true)`,[note]);
  await db.query(`update catalog.company_listings set verification_status='verified',review_note=$1 where ticker='DVP'`,[note]);
  const history=await db.query<{actor_id:string}>("select actor_id from core.publication_reviews");
  expect(history.rows.length).toBe(3);
  expect(history.rows.every(r=>r.actor_id==='00000000-0000-0000-0000-000000000099')).toBe(true);
  await db.exec("reset role;set role anon");
  expect((await db.query("select ticker from catalog.company_listings where ticker='DVP'")).rows).toEqual([{ticker:"DVP"}]);
  // Separate DVP asset evidence has not been reviewed just because registry evidence was.
  expect((await db.query("select * from port.company_asset_interests where company_id='fafba875-a5cd-55f2-ac4f-0acf54a64164'")).rows).toHaveLength(0);
  await db.exec("reset role;set role authenticated");
  await db.query(`select core.review_publication('sources','${original.source_id}','rejected',$1)`,["TEST ONLY: withdraw this fixture source pending corrected permission."]);
  await db.exec("reset role;set role anon");
  expect((await db.query("select ticker from catalog.company_listings where ticker='DVP'")).rows).toHaveLength(0);
  await db.exec("reset role");
});
