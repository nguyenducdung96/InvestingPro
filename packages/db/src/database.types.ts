// Schema-aligned types. Regenerate with Supabase CLI after applying migrations;
// keep this checked-in contract usable before a project is provisioned.
import type {
  PortCall, CallCoverage, CallArtifact, StoredPortCall,
  EditorialEdition,
  Source,
  SourceRecord,
  Entity,
  Authority,
  Port,
  Terminal,
  Berth,
  InlandDepot,
  Company,
  Listing,
  AssetInterest,
  EntityMapping,
  CatalogDossier, ReportedAssetObservation,
  DossierResearchPath,
  ReferenceSnapshot,
  RelationshipSnapshot,
  AuditEvent,
  PublicationReviewEvent, PublicationItem, PublicationDecision,
} from "@invest/domain";
export interface Tables {
  core: {
    sources: Source;
    source_records: SourceRecord;
    audit_events: AuditEvent;
    publication_reviews: PublicationReviewEvent;
  };
  catalog: { entities: Entity; companies: Company; company_listings: Listing };
  port: {
    company_berth_editions: import('../../modules/port/src/company-berths').CompanyBerthEdition;
    published_monthly_throughput: import('../../modules/port/src/throughput').ThroughputFact;
    throughput_publications: {fact_id:string};
    monthly_throughput: {id:string;period:string;cargo_tonnes:number|null;container_teu:number|null;source_record_id:string;extraction_note:string;verification_status:string};
    published_port_calls: PortCall;
    published_in_port_snapshots: PortCall;
    call_coverage: CallCoverage;
    call_artifacts: CallArtifact;
    port_calls: StoredPortCall;
    current_quarantined_calls: StoredPortCall;
    editorial_catalog_editions: EditorialEdition;
    port_authorities: Authority;
    ports: Port;
    terminals: Terminal;
    berths: Berth;
    icds: InlandDepot;
    company_asset_interests: AssetInterest;
    entity_mappings: EntityMapping;
    catalog_dossiers: CatalogDossier;
    reported_asset_observations: ReportedAssetObservation;
    published_asset_observations: ReportedAssetObservation;
    dossier_research_paths: DossierResearchPath;
    company_reference_snapshots: ReferenceSnapshot;
    company_relationship_snapshots: RelationshipSnapshot;
    reference_refresh_runs: {id:string;imported_at:string;imported_by:string;entry_count:number};
  };
}
type RequiredFields<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;
interface Inserts {
  core: {
    sources: RequiredFields<
      Source,
      "code" | "name" | "owner" | "source_class" | "base_url" | "rights_notes"
    >;
    source_records: RequiredFields<
      SourceRecord,
      | "source_id"
      | "source_url"
      | "canonical_url"
      | "external_id"
      | "fetched_at"
      | "content_type"
      | "content_hash"
      | "raw_storage_key"
      | "parser_name"
      | "parser_version"
      | "quality_status"
    >;
    audit_events: never;
    publication_reviews: never;
  };
  catalog: {
    entities: RequiredFields<
      Entity,
      "kind" | "slug" | "name" | "source_record_id"
    >;
    companies: RequiredFields<Company, "id" | "legal_name">;
    company_listings: RequiredFields<
      Listing,
      "company_id" | "ticker" | "exchange" | "valid_from" | "source_record_id"
    >;
  };
  port: {
    port_authorities: RequiredFields<Authority, "id">;
    ports: RequiredFields<Port, "id" | "authority_id">;
    terminals: RequiredFields<Terminal, "id" | "port_id">;
    berths: RequiredFields<Berth, "id" | "terminal_id">;
    icds: RequiredFields<InlandDepot, "id">;
    company_asset_interests: RequiredFields<
      AssetInterest,
      | "company_id"
      | "asset_id"
      | "asset_kind"
      | "interest_type"
      | "valid_from"
      | "verification_source_id"
      | "source_record_id"
      | "evidence_excerpt"
      | "resolution_method"
      | "confidence"
    >;
    entity_mappings: RequiredFields<
      EntityMapping,
      | "entity_id"
      | "external_id"
      | "external_name"
      | "valid_from"
      | "verification_source_id"
      | "source_record_id"
      | "evidence_excerpt"
      | "resolution_method"
      | "confidence"
    >;
  };
}
type Schema<S extends keyof Tables> = {
  Tables: {
    [K in keyof Tables[S]]: {
      Row: Tables[S][K];
      Insert: K extends keyof Inserts[S] ? Inserts[S][K] : never;
      Update: Partial<Tables[S][K]>;
      Relationships: [];
    };
  };
  Views: S extends "port"
    ? { current_asset_interests: { Row: AssetInterest; Relationships: [] } }
    : Record<string, never>;
  Functions: S extends "core"
    ? { is_admin: { Args: Record<string, never>; Returns: boolean };
        publication_queue: { Args: {p_kind:string;p_limit?:number;p_cursor?:string|null}; Returns: PublicationItem[] };
        review_publication: { Args: {p_kind:string;p_id:string;p_decision:string;p_note:string;p_basis?:string|null;p_scope?:string|null;p_terms_url?:string|null;p_hash?:string|null;p_confirm?:boolean}; Returns: PublicationDecision } }
    : Record<string, never>;
  Enums: Record<string, never>;
  CompositeTypes: Record<string, never>;
};
export type Database = { [S in keyof Tables]: Schema<S> };
