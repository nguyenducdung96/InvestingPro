export type Quality = "verified" | "preliminary" | "estimated" | "incomplete";
export type Verification = "pending" | "verified" | "rejected";
export type EntityKind =
  "port_authority" | "port" | "terminal" | "berth" | "company" | "icd";
export type AssetKind = Extract<EntityKind, "port" | "terminal" | "berth" | "icd">;
export type InterestType =
  | "ownership"
  | "operator"
  | "joint_venture"
  | "concession"
  | "lease"
  | "indirect";
export type ResolutionMethod =
  "official_identifier" | "document_evidence" | "fuzzy_name";
export interface Source {
  id: string;
  code: string;
  name: string;
  owner: string;
  source_class: string;
  base_url: string;
  rights_status: "to_verify" | "approved" | "blocked";
  rights_notes: string;
  terms_url: string | null;
  robots_checked_at: string | null;
  verified_at: string | null;
  created_at: string;
}
export interface SourceRecord {
  id: string;
  source_id: string;
  source_url: string;
  canonical_url: string;
  external_id: string;
  published_at: string | null;
  updated_at: string | null;
  fetched_at: string;
  reporting_period_start: string | null;
  reporting_period_end: string | null;
  content_type: string;
  content_hash: string;
  raw_storage_key: string;
  parser_name: string;
  parser_version: string;
  quality_status: Quality;
  supersedes_source_record_id: string | null;
  created_at: string;
}
export interface Entity {
  id: string;
  kind: EntityKind;
  slug: string;
  name: string;
  source_record_id: string;
  quality_status: Quality;
  created_at: string;
  updated_at: string;
}
export interface Authority {
  id: string;
  kind: "port_authority";
  region: string | null;
}
export interface Port {
  id: string;
  kind: "port";
  authority_id: string | null;
  port_category?: "marine" | "river" | "unknown";
  latitude: number | null;
  longitude: number | null;
}
export interface Terminal {
  id: string;
  kind: "terminal";
  port_id: string;
  terminal_type: string | null;
}
export interface Berth {
  id: string;
  kind: "berth";
  terminal_id: string;
}
export interface InlandDepot {
  id: string;
  kind: "icd";
  address: string | null;
}
export interface Company {
  id: string;
  kind: "company";
  legal_name: string;
  enterprise_id: string | null;
  official_website: string | null;
  ir_url: string | null;
}
export interface Listing {
  id: string;
  company_id: string;
  ticker: string;
  exchange: "HOSE" | "HNX" | "UPCOM" | "OTC";
  valid_from: string;
  valid_to: string | null;
  source_record_id: string;
  verification_status: Verification;
  verified_by: string | null;
  verified_at: string | null;
  evidence_excerpt?: string | null;
  review_note?: string | null;
}
export interface MappingAudit {
  id: string;
  valid_from: string;
  valid_to: string | null;
  verification_status: Verification;
  verification_source_id: string;
  source_record_id: string;
  evidence_excerpt: string;
  resolution_method: ResolutionMethod;
  confidence: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}
export interface AssetInterest extends MappingAudit {
  company_id: string;
  asset_id: string;
  asset_kind: AssetKind;
  interest_type: InterestType;
  ownership_pct: number | null;
  supersedes_interest_id: string | null;
}
export interface EntityMapping extends MappingAudit {
  entity_id: string;
  external_id: string;
  external_name: string;
  supersedes_mapping_id: string | null;
}
export interface AuditEvent {
  id: string;
  table_name: string;
  record_id: string;
  actor_id: string | null;
  action: string;
  before_row: unknown;
  after_row: unknown;
  created_at: string;
}
export interface Citation {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  canonicalUrl: string;
  sourceRecordId: string;
  fetchedAt: string;
  publishedAt: string | null;
  reportingPeriod: { from: string | null; to: string | null };
  quality: Quality;
  contentHash: string;
  rawStorageKey: string;
  parserVersion: string;
}
export interface Meta {
  asOf: string | null;
  reportingPeriod: { from: string; to: string } | null;
  sources: Citation[];
  quality: Quality;
  coverage: {
    expectedDays: null;
    observedDays: null;
    ratio: null;
    scope: string;
  };
  methodologyVersion: "catalog-v1";
  unit: null;
  entitlement: "public_catalog" | "admin";
  warnings: string[];
  nextCursor?: string | null;
}
export interface Envelope<T> {
  data: T;
  meta: Meta;
}
export interface CatalogItem {
  entity: Entity;
  details: Authority | Port | Terminal | Berth | Company | InlandDepot;
  lineage: Citation;
}
export interface InterestItem {
  interest: AssetInterest;
  asset: Entity;
  company: Entity;
  lineage: Citation;
}
export interface ReviewItem {
  type: "company_asset_interests" | "entity_mappings" | "company_listings";
  mapping: AssetInterest | EntityMapping | Listing;
  lineage: Citation;
  blockers?: string[];
  targets?: Entity[];
}
export type PublicationKind = "sources" | "evidence" | "entities";
export interface PublicationItem {
  id: string;
  kind: PublicationKind;
  name: string;
  source: Source;
  record?: SourceRecord;
  entity?: Entity;
  company?: Company | null;
  blockers: string[];
}
export interface PublicationInput {
  decision: "approved" | "rejected";
  note: string;
  basis?: string;
  scope?: string;
  termsUrl?: string;
  hash?: string;
  confirm: boolean;
}
export interface PublicationDecision {
  id: string;
  replacementRecordId: string | null;
  decision: "approved" | "rejected";
}
export interface PublicationReviewEvent {
  id: string;
  kind: PublicationKind;
  target_id: string;
  decision: "approved" | "rejected";
  note: string;
  basis: string | null;
  scope: string | null;
  confirmed_hash: string | null;
  replacement_record_id: string | null;
  actor_id: string;
  reviewed_at: string;
}
export interface PageQuery {
  limit: number;
  cursor?: string;
  at: string;
}
export interface ReportedAssetObservation {
  id: string; dossier_id: string; company_id: string; asset_id: string | null;
  asset_name: string; asset_kind: "terminal" | "berth" | "river_port" | "icd" | "port";
  scope_group: "main" | "supplementary_industrial_base";
  reported_role: string; via: string[]; berth_scope: string[];
  reporting_period_end: string; relationship_started_on: string | null;
  documented_date: string | null;
  date_basis: string | null; source_record_id: string;
  supporting_evidence: { source_url: string; content_hash: string; reviewed_pages: number[] }[];
  evidence_pages: number[]; evidence_note: string;
  verification_status: Verification; reviewed_by: string | null;
  reviewed_at: string | null; review_note: string | null; supersedes_observation_id: string | null;
}
export interface CatalogDossier {
  id: string; company_id: string; ticker: string; reporting_period_end: string;
  source_record_id: string; reviewed_pages: number[];
  review_outcome: "reported_assets" | "no_assertable_assets";
  review_note: string; gaps: string[]; scope_version: string;
}
export interface ReportedAssetItem { observation: ReportedAssetObservation; lineage: Citation }
export interface DossierResearchPath {
  id:string; dossier_id:string; child_ticker:string; asset_name:string; via:string[]; berth_scope:string[];
  evidence_path:{ticker:string;pages:number[];source_url:string;content_hash:string}[];
  decision:"requires_chain_and_period_review";
}
export interface DossierItem { dossier: CatalogDossier; company: Entity; lineage: Citation; observations: ReportedAssetItem[]; researchPaths:DossierResearchPath[] }
export interface ReferenceSnapshot {
 id:string;company_id:string;ticker:string;provider:string;fetched_at:string;raw_sha256:string;
 reference_data:Record<string,unknown>;review_status:"pending"|"accepted"|"rejected";
 reviewed_by:string|null;reviewed_at:string|null;review_note:string|null;run_id:string;
}
export interface RelationshipSnapshot {
 id:string;company_id:string;ticker:string;provider:string;fetched_at:string;raw_sha256:string;run_id:string;
 relationship_data:{symbol:string;name:string;rate:number|null;sub_symbol:string|null}[];
}
export interface CatalogRepository {
  reviewReported(id:string,decision:"verified"|"rejected",note:string):Promise<ReportedAssetObservation>;
  reportedAssets(companyId: string, query: PageQuery): Promise<Envelope<ReportedAssetItem[]>>;
  researchCatalog(query: PageQuery, ticker?: string): Promise<Envelope<DossierItem[]>>;
  publicationQueue(kind: PublicationKind, query: PageQuery): Promise<Envelope<PublicationItem[]>>;
  reviewPublication(kind: PublicationKind, id: string, input: PublicationInput): Promise<PublicationDecision>;
  list(
    kind: EntityKind,
    query: PageQuery,
    parentId?: string,
  ): Promise<Envelope<CatalogItem[]>>;
  detail(kind: EntityKind, key: string): Promise<Envelope<CatalogItem | null>>;
  listedCompanies(
    query: PageQuery,
    ticker?: string,
  ): Promise<Envelope<(CatalogItem & { listings: Listing[] })[]>>;
  companyAssets(
    companyId: string,
    query: PageQuery,
  ): Promise<Envelope<InterestItem[]>>;
  reviewQueue(
    type: ReviewItem["type"],
    query: PageQuery,
  ): Promise<Envelope<ReviewItem[]>>;
  propose(
    type: ReviewItem["type"],
    input: Proposal,
  ): Promise<Envelope<MappingAudit | Listing>>;
  review(
    type: ReviewItem["type"],
    id: string,
    decision: "verified" | "rejected",
    note: string,
  ): Promise<Envelope<MappingAudit | Listing>>;
}
export type Proposal = Pick<
  MappingAudit,
  | "valid_from"
  | "valid_to"
  | "verification_source_id"
  | "source_record_id"
  | "evidence_excerpt"
  | "resolution_method"
  | "confidence"
> &
  Partial<
    Pick<
      AssetInterest,
      | "company_id"
      | "asset_id"
      | "asset_kind"
      | "interest_type"
      | "ownership_pct"
      | "supersedes_interest_id"
    >
  > &
  Partial<
    Pick<
      EntityMapping,
      "entity_id" | "external_id" | "external_name" | "supersedes_mapping_id"
    >
  >;
export interface EditorialCompany {
 ticker:string;company_id:string;name:string;market_as_reported:string;period:string;
 source:{url:string;sha256:string;pages:number[]};
 assets:{name:string;kind:string;role:string;via:string[];berth_scope:string[];scope_group:string;started_on:string|null;documented_date:string|null;date_basis:string|null}[];
 research_paths:{ticker:string;asset:string}[];
}
export interface EditorialEdition {id:string;published_at:string;entries:EditorialCompany[];basis:string}
export interface PortCall {
 id:string;event_key:string;artifact_id:string;vessel_id:string;vessel_name:string;
 source_area:string;event_kind:'reported'|'in_port';berth:string|null;direction:'arrival'|'departure';occurred_at:string|null;reported_day:string;
 time_day:string|null;time_precision:'minute'|'day'|'unknown';
 event_day:string|null;gt:number|null;
 time_basis:'port_arrival'|'anchorage_start';
 raw_time:string;dwt:number|null;row_number:number;quarantine_reason:string|null;
 source_url:string;raw_sha256:string;fetched_at:string;parser_version:string;identity_confidence:string;
}
export interface CallCoverage {reported_day:string;artifact_id:string;fetched_at:string;parser_version:string;quarantined:number;source_area:string;event_kind:'reported'|'in_port'}
export interface CallArtifact {id:string;source_url:string;raw_sha256:string;raw_text:string;fetched_at:string;parser_version:string;reported_days:string[]}
export type StoredPortCall=Omit<PortCall,'source_url'|'raw_sha256'|'fetched_at'|'parser_version'|'identity_confidence'|'occurred_at'>&{occurred_at:string|null};
