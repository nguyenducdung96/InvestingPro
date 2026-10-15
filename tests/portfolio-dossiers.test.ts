import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

type Asset = {terminal_number?:number;name?:string;asset_kind?:string;role:string;via:string[];effective_from:string|null;date_basis?:string;canonical_terminal_id?:string;canonical_berth_ids?:string[];berth_subset?:string[];sql_interest_generated:boolean};
type Dossier = {ticker:string;artifact_label:string;reviewed_pages:number[];assets:Asset[];publication_status:string;current_status_verified:boolean;evidence:{source_url:string;content_hash:string;raw_storage_key:string;rights_status:string;r2_verified:boolean};unresolved:string[]};
const manifest=JSON.parse(readFileSync("docs/catalog-review/company-portfolios-manifest.json","utf8")) as {items:Dossier[];further_universe_research:{ticker:string}[]};
const find=(ticker:string)=>manifest.items.find(d=>d.ticker===ticker)!;

it("retains evidence lineage and explicit gaps for each of the 29 archived issuer dossiers",()=>{
  expect(manifest.items).toHaveLength(29);
  expect(new Set(manifest.items.map(d=>d.ticker)).size).toBe(29);
  for(const d of manifest.items) {
    expect(d.publication_status).toBe("research_only");
    expect(d.current_status_verified).toBe(false);
    expect(d.reviewed_pages.length).toBeGreaterThan(0);
    expect(d.unresolved.length).toBeGreaterThan(0);
    expect(d.evidence.content_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(d.evidence.raw_storage_key).toBe(`catalog-evidence/sha256/${d.evidence.content_hash}`);
    expect(d.evidence.source_url).toMatch(/^https:\/\//);
    for(const a of d.assets) {
      expect(a.sql_interest_generated).toBe(false);
      expect(a).not.toHaveProperty("ownership_pct");
      if(a.terminal_number) expect(a.canonical_terminal_id).toMatch(/^[a-f0-9-]{36}$/);
      if(a.effective_from!==null) expect(a.date_basis).toBeTruthy();
    }
  }
  expect(manifest.further_universe_research.map(x=>x.ticker)).toEqual(expect.arrayContaining(["PVS","ILB","STG","TCW"]));
});

it("keeps Cai Lan 2–3–4 separate from the other Cai Lan berths and preserves canonical IDs",()=>{
  const cpi=find("CPI").assets[0];
  expect(cpi.role).toBe("indirect");
  expect(cpi.berth_subset).toEqual(["Cầu cảng số 2","Cầu cảng số 3","Cầu cảng số 4"]);
  expect(cpi.canonical_berth_ids).toHaveLength(3);
  const catalog=readFileSync("supabase/imports/505_commercial_catalog.reviewed.sql","utf8");
  for(const id of cpi.canonical_berth_ids!) expect(catalog).toContain(id);
  expect(find("PHP").assets.find(a=>a.terminal_number===38)?.canonical_terminal_id).toBe("10000000-0000-0000-0000-000000000007");
});

it("separates river ports and ICDs and does not promote uncertain roles or dates",()=>{
  expect(find("CCT").assets.filter(a=>a.terminal_number).map(a=>a.terminal_number)).toEqual([290,296]);
  expect(find("CCT").assets.some(a=>a.asset_kind==="river_port")).toBe(true);
  expect(find("CAG").assets.some(a=>a.name==="Cảng Bình Long" && a.asset_kind==="river_port")).toBe(true);
  expect(find("IST").assets[0].asset_kind).toBe("icd");
  expect(find("TCL").assets[0].role).toBe("cargo_handling_service");
  expect(find("QSP").assets[0].role).toBe("lessor_and_infrastructure_cooperation");
  expect(find("PSB").assets).toEqual([]);
  expect(find("HAH").assets[0]).toMatchObject({terminal_number:46,role:"indirect",via:["Công ty TNHH Cảng Hải An"],effective_from:null});
  expect(find("PNP").assets).toEqual([]);
  expect(find("GMD").assets.every(a=>a.effective_from===null)).toBe(true);
});

it("retains both source documents and berth limits in MVN indirect research paths",()=>{
  const mvn=JSON.parse(readFileSync("docs/catalog-review/company-portfolios-manifest.json","utf8")).items.find((d:{ticker:string})=>d.ticker==="MVN");
  const cpi=mvn.derived_candidates.find((a:{child_ticker:string})=>a.child_ticker==="CPI");
  expect(cpi).toMatchObject({role:"indirect",effective_from:null,terminal_number:11,decision:"requires_chain_and_period_review",sql_interest_generated:false});
  expect(cpi.evidence_path.map((p:{ticker:string})=>p.ticker)).toEqual(["MVN","CPI"]);
  expect(cpi.canonical_berth_ids).toHaveLength(3);
  expect(cpi).not.toHaveProperty("ownership_pct");
  expect(cpi).not.toHaveProperty("equity_pct");
  expect(cpi.via).toEqual(["Công ty Cổ phần Đầu tư Cảng Cái Lân","Công ty TNHH Cảng container quốc tế Cái Lân"]);
});
