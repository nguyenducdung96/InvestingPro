import type { Proposal, PageQuery, ReviewItem } from "@invest/domain";
export * from './calls';
export * from './call-quality';
export * from './call-coverage-targets';
export * from './public-anchorage';
// Keep XLSX decompression/XML code off ordinary API requests and client bundles.
export async function fetchNgheAnReports(fetcher:typeof fetch=fetch){return (await import('./nghean-reports.ts')).fetchNgheAnReports(fetcher,1);}
export class InputError extends Error {}
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function date(value: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new InputError("Use a valid YYYY-MM-DD date");
  return value;
}
export function pageQuery(params: URLSearchParams): PageQuery {
  const raw = params.get("limit") ?? "25";
  if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 100)
    throw new InputError("Limit must be 1–100");
  const cursor = params.get("cursor") ?? undefined;
  if (cursor && !UUID.test(cursor)) throw new InputError("Invalid cursor");
  return {
    limit: Number(raw),
    cursor,
    at: date(params.get("at") ?? new Date().toISOString().slice(0, 10)),
  };
}
export function mappingType(value: unknown): ReviewItem["type"] {
  if (value !== "company_asset_interests" && value !== "entity_mappings" && value !== "company_listings")
    throw new InputError("Invalid mapping type");
  return value;
}
export function validateProposal(
  type: ReviewItem["type"],
  value: unknown,
): Proposal {
  if (type === "company_listings") throw new InputError("Listing proposals are created by the reviewed catalog import");
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Expected mapping object");
  const v = value as Record<string, unknown>;
  const common = [
    "valid_from",
    "valid_to",
    "verification_source_id",
    "source_record_id",
    "evidence_excerpt",
    "resolution_method",
    "confidence",
  ];
  const specific =
    type === "company_asset_interests"
      ? [
          "company_id",
          "asset_id",
          "asset_kind",
          "interest_type",
          "ownership_pct",
          "supersedes_interest_id",
        ]
      : ["entity_id", "external_id", "external_name", "supersedes_mapping_id"];
  if (Object.keys(v).some((k) => ![...common, ...specific].includes(k)))
    throw new InputError("Unknown or protected field");
  const ids = [
    "verification_source_id",
    "source_record_id",
    ...(type === "company_asset_interests"
      ? ["company_id", "asset_id"]
      : ["entity_id"]),
  ];
  if (ids.some((k) => typeof v[k] !== "string" || !UUID.test(v[k] as string)))
    throw new InputError("Invalid entity/evidence identifier");
  for (const k of ["supersedes_interest_id", "supersedes_mapping_id"])
    if (
      v[k] != null &&
      (typeof v[k] !== "string" || !UUID.test(v[k] as string))
    )
      throw new InputError("Invalid correction identifier");
  if (typeof v.valid_from !== "string")
    throw new InputError("Effective start required");
  date(v.valid_from);
  if (
    v.valid_to != null &&
    (typeof v.valid_to !== "string" || date(v.valid_to) <= v.valid_from)
  )
    throw new InputError("Effective end must follow start");
  for (const k of [
    "evidence_excerpt",
    ...(type === "entity_mappings" ? ["external_id", "external_name"] : []),
  ])
    if (
      typeof v[k] !== "string" ||
      !(v[k] as string).trim() ||
      (v[k] as string).length > 4000
    )
      throw new InputError(`${k} required (max 4000 characters)`);
  if (
    !["official_identifier", "document_evidence", "fuzzy_name"].includes(
      String(v.resolution_method),
    )
  )
    throw new InputError("Invalid resolution method");
  if (
    typeof v.confidence !== "number" ||
    !Number.isFinite(v.confidence) ||
    v.confidence < 0 ||
    v.confidence > 1
  )
    throw new InputError("Confidence must be 0–1");
  if (type === "company_asset_interests") {
    if (
      !["port", "terminal", "berth", "icd"].includes(String(v.asset_kind)) ||
      ![
        "ownership",
        "operator",
        "joint_venture",
        "concession",
        "lease",
        "indirect",
      ].includes(String(v.interest_type))
    )
      throw new InputError("Invalid asset or interest type");
    if (
      v.ownership_pct != null &&
      (typeof v.ownership_pct !== "number" ||
        !Number.isFinite(v.ownership_pct) ||
        v.ownership_pct < 0 ||
        v.ownership_pct > 100)
    )
      throw new InputError("Ownership must be 0–100 or null");
  }
  return { ...v, valid_to: v.valid_to ?? null } as unknown as Proposal;
}
export function effectiveAt(from: string, to: string | null, at: string) {
  return from <= at && (to === null || at < to);
}
export {isBerthCallSource,splitCallMovements} from './call-movements';
export {throughputSeries, type ThroughputFact} from './throughput';
export {phpBerths,phpPlanScopes,isPhpPlanScope,aggregatePhpPlanDays,aggregateBerthPlanDays,type PhpPlanScope,isPhpBerth,phpPlanSeries,type PhpBerth,phpThroughputScopes,isPhpThroughputScope,type PhpThroughputScope} from './php-berths';
export {tanvuPlanSeries,validPlanDate,type TanVuPlanDay,type TanVuPlanRun,type TanVuPlanEvents} from './tanvu-plans';

export * from './company-berths';

export * from './dvp-plans';

export * from './vsc-plans';

export * from './north-overview';

export * from './central-overview';
export * from './qnp-plans';
export * from './qnp-reviewed';
