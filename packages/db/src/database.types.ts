// Schema-aligned types. Regenerate with Supabase CLI after applying migrations;
// keep this checked-in contract usable before a project is provisioned.
import type {
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
  AuditEvent,
} from "@invest/domain";
export interface Tables {
  core: {
    sources: Source;
    source_records: SourceRecord;
    audit_events: AuditEvent;
  };
  catalog: { entities: Entity; companies: Company; company_listings: Listing };
  port: {
    port_authorities: Authority;
    ports: Port;
    terminals: Terminal;
    berths: Berth;
    icds: InlandDepot;
    company_asset_interests: AssetInterest;
    entity_mappings: EntityMapping;
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
    ? { is_admin: { Args: Record<string, never>; Returns: boolean } }
    : Record<string, never>;
  Enums: Record<string, never>;
  CompositeTypes: Record<string, never>;
};
export type Database = { [S in keyof Tables]: Schema<S> };
