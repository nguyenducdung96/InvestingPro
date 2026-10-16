import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

type Receipt = {artifact_label:string;content_hash:string;raw_storage_key:string;status:string;checked_at:string};
const receipt=JSON.parse(readFileSync("docs/catalog-review/r2-additional-readback-20261016.json","utf8")) as {bucket:string;public_access_changed:boolean;publication_performed:boolean;items:Receipt[]};

it("has a private, byte-verified R2 receipt for every raw object referenced by the combined handoff",()=>{
  expect(receipt.bucket).toBe("investing-pro-evidence-staging");
  expect(receipt.public_access_changed).toBe(false);
  expect(receipt.publication_performed).toBe(false);
  expect(new Set(receipt.items.map(r=>r.artifact_label)).size).toBe(receipt.items.length);
  const sql=readFileSync("supabase/imports/slice1_company_catalog.handoff.sql","utf8");
  const referenced=new Set([...sql.matchAll(/catalog-evidence\/sha256\/([a-f0-9]{64})/g)].map(m=>m[1]));
  expect(referenced.size).toBeGreaterThan(40);
  const checked=new Set(receipt.items.filter(r=>r.status==='sha256_readback_verified').map(r=>r.content_hash));
  expect([...referenced].filter(hash=>!checked.has(hash))).toEqual([]);
  for(const row of receipt.items) {
    expect(row.raw_storage_key).toBe(`catalog-evidence/sha256/${row.content_hash}`);
    expect(Number.isNaN(Date.parse(row.checked_at))).toBe(false);
  }
});

it("keeps acquisition metadata and market-status uncertainty separate from storage verification",()=>{
  const artifacts=JSON.parse(readFileSync("docs/catalog-review/evidence-artifacts.json","utf8")).artifacts as {artifact_label:string;content_hash:string;r2_verified:boolean;rights_status:string}[];
  for(const artifact of artifacts.filter(a=>a.r2_verified)) {
    expect(receipt.items.some(r=>r.artifact_label===artifact.artifact_label && r.content_hash===artifact.content_hash)).toBe(true);
    expect(artifact.rights_status).toBe("to_verify");
  }
  const market=JSON.parse(readFileSync("docs/catalog-review/market-issuer-registry-manifest.json","utf8")).items as {current_status_verified:boolean;storage_status:string;storage_status_at_capture:string;r2_verified:boolean}[];
  expect(market).toHaveLength(16);
  for(const row of market) {
    expect(row.current_status_verified).toBe(false);
    expect(row.storage_status_at_capture).toBe("local_only");
    expect(row.storage_status).toBe("private_r2_readback_verified");
    expect(row.r2_verified).toBe(true);
  }
});
