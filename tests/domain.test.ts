import { describe, it, expect } from "vitest";
import {
  date,
  effectiveAt,
  pageQuery,
  validateProposal,
} from "../packages/modules/port/src/index";
const id = "00000000-0000-0000-0000-000000000001";
const proposal = {
  valid_from: "2026-01-01",
  valid_to: null,
  verification_source_id: id,
  source_record_id: id,
  evidence_excerpt: "Signed filing p. 10",
  resolution_method: "document_evidence",
  confidence: 1,
  company_id: id,
  asset_id: id,
  asset_kind: "terminal",
  interest_type: "ownership",
  ownership_pct: 0,
};
describe("temporal mappings and validation", () => {
  it("uses exclusive end dates and open-ended periods", () => {
    expect(effectiveAt("2025-01-01", "2026-01-01", "2026-01-01")).toBe(false);
    expect(effectiveAt("2025-01-01", null, "2026-01-01")).toBe(true);
  });
  it("rejects nonexistent dates and inverted periods", () => {
    expect(() => date("2026-02-30")).toThrow();
    expect(() =>
      validateProposal("company_asset_interests", {
        ...proposal,
        valid_to: "2025-01-01",
      }),
    ).toThrow();
  });
  it("preserves zero and unknown ownership separately", () => {
    expect(
      validateProposal("company_asset_interests", proposal).ownership_pct,
    ).toBe(0);
    expect(
      validateProposal("company_asset_interests", {
        ...proposal,
        ownership_pct: null,
      }).ownership_pct,
    ).toBeNull();
  });
  it("rejects forged verification and audit fields", () => {
    expect(() =>
      validateProposal("company_asset_interests", {
        ...proposal,
        verification_status: "verified",
      }),
    ).toThrow();
    expect(() =>
      validateProposal("company_asset_interests", {
        ...proposal,
        reviewed_by: id,
      }),
    ).toThrow();
  });
  it("bounds ownership, pagination and identifiers", () => {
    for (const ownership_pct of [-1, 101, NaN])
      expect(() =>
        validateProposal("company_asset_interests", {
          ...proposal,
          ownership_pct,
        }),
      ).toThrow();
    for (const limit of ["0", "101", "NaN", "2.5"])
      expect(() => pageQuery(new URLSearchParams({ limit }))).toThrow();
    expect(() => pageQuery(new URLSearchParams({ cursor: "a,b" }))).toThrow();
  });
});
