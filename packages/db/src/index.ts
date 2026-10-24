import {supabaseKeyHeaders} from './api-key-headers.mjs';
import type {
  AssetInterest,
  CatalogItem,
  CatalogRepository,
  Citation,
  Entity,
  EntityKind,
  Envelope,
  InterestItem,
  MappingAudit,
  Meta,
  PageQuery,
  Proposal,
  ReviewItem,
  Listing,
  PublicationKind, PublicationItem, PublicationInput, PublicationDecision,
  ReportedAssetItem, DossierItem,
  ReportedAssetObservation,
  ReferenceSnapshot,
} from "@invest/domain";
import type { Tables } from "./database.types";
export type { Database } from "./database.types";
export class DatabaseError extends Error {
  constructor(
    public status: number,
    public code?: string,
  ) {
    super("Database request failed");
  }
}
export interface Transport {
  phpPlanEvents?(asset:string,day:string):Promise<import('../../modules/port/src/tanvu-plans').TanVuPlanEvents|null>;
  tanvuPlanEvents?(day:string):Promise<import('../../modules/port/src/tanvu-plans').TanVuPlanEvents|null>;
  reviewThroughput?(body:object):Promise<object>;
  importCalls?(body:object):Promise<Record<string,unknown>>;
  publishEditorial?(body:object):Promise<{inserted:number;companies:number}>;
  importReferences?(body:object):Promise<{inserted:number;received:number}>;
  reviewReference?(body:object):Promise<ReferenceSnapshot>;
  reviewReported?(body: object): Promise<ReportedAssetObservation>;
  publicationQueue?(body: object): Promise<PublicationItem[]>;
  reviewPublication?(body: object): Promise<PublicationDecision>;
  read<S extends keyof Tables, T extends keyof Tables[S]>(
    schema: S,
    table: T,
    params: URLSearchParams,
  ): Promise<Tables[S][T][]>;
  activeInterests(params: URLSearchParams): Promise<AssetInterest[]>;
  write(
    type: ReviewItem["type"],
    params: URLSearchParams,
    body: object,
    method: "POST" | "PATCH",
  ): Promise<(MappingAudit | Listing)[]>;
}
export function supabaseTransport(
  url: string,
  key: string,
  token?: string,
): Transport {
  const base = new URL(url);
  if (!["https:", "http:"].includes(base.protocol))
    throw new Error("Invalid Supabase URL");
  async function request<T>(
    schema: string,
    table: string,
    params: URLSearchParams,
    method = "GET",
    body?: object,
  ): Promise<T[]> {
    const response = await fetch(new URL(`/rest/v1/${table}?${params}`, base), {
      method,
      headers: {
        ...supabaseKeyHeaders(key,token),
        "Accept-Profile": schema,
        "Content-Profile": schema,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const error = (await response
        .json()
        .catch(() => ({ code: undefined }))) as { code?: string };
      throw new DatabaseError(response.status, error.code);
    }
    return response.json() as Promise<T[]>;
  }
  return {
    phpPlanEvents: (asset,day) => request('port','rpc/php_plan_events',new URLSearchParams(),'POST',{p_asset:asset,p_day:day}) as unknown as Promise<import('../../modules/port/src/tanvu-plans').TanVuPlanEvents|null>,
    tanvuPlanEvents: (day) => request('port','rpc/tanvu_plan_events',new URLSearchParams(),'POST',{p_day:day}) as unknown as Promise<import('../../modules/port/src/tanvu-plans').TanVuPlanEvents|null>,
    reviewThroughput: (b) => request('port','rpc/review_monthly_throughput',new URLSearchParams(),'POST',b),
    importCalls: (b) => request('port','rpc/import_port_calls',new URLSearchParams(),'POST',b) as unknown as Promise<Record<string,unknown>>,
    publishEditorial: (b) => request("port","rpc/publish_editorial_catalog",new URLSearchParams(),"POST",b) as unknown as Promise<{inserted:number;companies:number}>,
    importReferences: (b) => request("port","rpc/import_reference_refresh",new URLSearchParams(),"POST",b) as unknown as Promise<{inserted:number;received:number}>,
    reviewReference: (b) => request("port","rpc/review_reference_snapshot",new URLSearchParams(),"POST",b) as unknown as Promise<ReferenceSnapshot>,
    reviewReported: (b) => request("port", "rpc/review_reported_observation", new URLSearchParams(), "POST", b) as unknown as Promise<ReportedAssetObservation>,
    publicationQueue: (b) => request("core", "rpc/publication_queue", new URLSearchParams(), "POST", b),
    reviewPublication: (b) => request("core", "rpc/review_publication", new URLSearchParams(), "POST", b) as unknown as Promise<PublicationDecision>,
    read: (s, t, p) => request(s, String(t), p),
    activeInterests: (p) => request("port", "current_asset_interests", p),
    write: (t, p, b, m) => request(t === "company_listings" ? "catalog" : "port", t, p, m, b),
  };
}
const detailsTables = {
  port_authority: "port_authorities",
  port: "ports",
  terminal: "terminals",
  berth: "berths",
  icd: "icds",
  company: "companies",
} as const;
const params = (values: Record<string, string>) => new URLSearchParams(values);
const ids = (values: string[]) => `in.(${values.join(",")})`;
export class SupabaseCatalogRepository implements CatalogRepository {
  constructor(
    private db: Transport,
    private admin = false,
  ) {}
  async tanvuPlans(){
    const rows=await this.db.read('port','tanvu_plan_days',params({select:'*',order:'report_day.asc',limit:'1000'}));
    for(let offset=1000;rows.length===offset;offset+=1000){
      const page=await this.db.read('port','tanvu_plan_days',params({select:'*',order:'report_day.asc',limit:'1000',offset:String(offset)}));
      rows.push(...page);if(page.length<1000)break;
    }
    const run=(await this.db.read('port','tanvu_plan_runs',params({select:'*',order:'checked_at.desc,id.desc',limit:'1'})))[0]??null;
    return {days:rows,run};
  }
  async tanvuPlanEvents(day:string){return this.db.tanvuPlanEvents?.(day)??null;}
  async phpPlans(asset:string){
    const rows:Tables['port']['php_plan_days'][]=[];
    for(let offset=0;;offset+=1000){
      const page=await this.db.read('port','php_plan_days',params({select:'*',asset_code:`eq.${asset}`,order:'report_day.asc',limit:'1000',offset:String(offset)}));
      rows.push(...page);if(page.length<1000)break;
    }
    const run=(await this.db.read('port','php_plan_runs',params({select:'*',asset_code:`eq.${asset}`,order:'checked_at.desc,id.desc',limit:'1'})))[0]??null;
    return {days:rows,run};
  }
  async phpPlanEvents(asset:string,day:string){return this.db.phpPlanEvents?.(asset,day)??null;}
  async phpPlanCoverage(){return this.db.read('port','php_plan_coverage',params({select:'*',order:'asset_code.asc'}));}
  async companyBerthScope() {
    return (await this.db.read('port','company_berth_editions',params({select:'id,ticker,observed_on,published_at,entries',ticker:'eq.PHP',order:'observed_on.desc,published_at.desc,id.desc',limit:'1'})))[0]??null;
  }
  async monthlyThroughput() {
    return this.db.read('port','published_monthly_throughput',params({select:'*',asset_code:'eq.tan_vu',order:'period.asc,id.asc',limit:'1000'}));
  }
  async throughputQueue() {
    if(!this.admin)throw new DatabaseError(403);
    const pending=await this.db.read('port','monthly_throughput',params({select:'*',verification_status:'eq.pending',order:'period.desc,id.asc',limit:'100'}));
    const released=pending.length?await this.db.read('port','throughput_publications',params({select:'fact_id',fact_id:ids(pending.map(r=>r.id)),limit:'100'})):[];
    const rows=pending.filter(r=>!released.some(p=>p.fact_id===r.id));
    if(!rows.length)return [];
    const records=await this.db.read('core','source_records',params({id:ids([...new Set(rows.map(r=>r.source_record_id))]),select:'*',limit:'100'}));
    return rows.map(r=>({...r,evidence:records.find(s=>s.id===r.source_record_id)}));
  }
  async reviewThroughput(id:string,decision:string,note:string) {
    if(!this.admin||!this.db.reviewThroughput)throw new DatabaseError(403);
    return this.db.reviewThroughput({p_id:id,p_decision:decision,p_note:note});
  }
  async callFacts(from:string,to:string,area?:string) {
    const scope:Record<string,string>=area?{source_area:`eq.${area}`}:{ };
    return Promise.all([
      this.db.read('port','published_port_calls',params({...scope,select:'*',event_day:`gte.${from}`,and:`(event_day.lte.${to})`,order:'event_day.desc,occurred_at.desc.nullslast,id.desc',limit:'1000'})),
      this.db.read('port','call_coverage',params({...scope,select:'*',reported_day:`gte.${from}`,and:`(reported_day.lte.${to})`,order:'reported_day.asc',limit:'1000'})),
    ]);
  }
  async callArtifact(id:string) {
    if(!this.admin)throw new DatabaseError(403);
    return (await this.db.read('port','call_artifacts',params({id:`eq.${id}`,limit:'1'})))[0]??null;
  }
  async callSnapshots(area?:string) {
    const scope:Record<string,string>=area?{source_area:`eq.${area}`}:{ };
    const rows=await this.db.read('port','published_in_port_snapshots',params({...scope,select:'*',order:'source_area.asc,vessel_name.asc,id.asc',limit:'1000'}));
    for(let offset=1000;rows.length===offset&&offset<5000;offset+=1000){
      const page=await this.db.read('port','published_in_port_snapshots',params({...scope,select:'*',order:'source_area.asc,vessel_name.asc,id.asc',limit:'1000',offset:String(offset)}));
      rows.push(...page);if(page.length<1000)break;
    }
    return rows;
  }
  async quarantinedCalls() {
    if(!this.admin)throw new DatabaseError(403);
    return this.db.read('port','current_quarantined_calls',params({order:'reported_day.desc,id.desc',limit:'100'}));
  }
  async importCalls(bundle:object,rows:object[],days:string[],parser:string) {
    if(!this.admin||!this.db.importCalls)throw new DatabaseError(403);
    return this.db.importCalls({p_bundle:bundle,p_rows:rows,p_days:days,p_parser:parser});
  }
  async editorialEdition() {
    return (await this.db.read("port","editorial_catalog_editions",params({select:"id,published_at,basis,entries",order:"published_at.desc,id.desc",limit:"1"})))[0]??null;
  }
  async publishEditorial(id:string,entries:object[],note:string) {
    if(!this.admin||!this.db.publishEditorial)throw new DatabaseError(403);
    return this.db.publishEditorial({p_id:id,p_entries:entries,p_note:note});
  }
  async referenceSnapshots(ticker?:string) {
    if(!this.admin) throw new DatabaseError(403);
    const p=params({select:"id,company_id,ticker,provider,fetched_at,raw_sha256,reference_data,review_status,reviewed_by,reviewed_at,review_note,run_id",order:"fetched_at.desc,id.desc",limit:"500"});
    if(ticker)p.set("ticker",`eq.${ticker}`);
    return this.db.read("port","company_reference_snapshots",p);
  }
  async referenceRuns() {
    if(!this.admin)throw new DatabaseError(403);
    return this.db.read("port","reference_refresh_runs",params({select:"*",order:"imported_at.desc",limit:"5"}));
  }
  async relationshipSnapshots(ticker?:string) {
    if(!this.admin)throw new DatabaseError(403);
    const p=params({select:"id,company_id,ticker,provider,fetched_at,raw_sha256,relationship_data,run_id",order:"fetched_at.desc,id.desc",limit:"500"});
    if(ticker)p.set("ticker",`eq.${ticker}`);
    return this.db.read("port","company_relationship_snapshots",p);
  }
  async importReferences(id:string,entries:object[]) {
    if(!this.admin||!this.db.importReferences)throw new DatabaseError(403);
    return this.db.importReferences({p_id:id,p_entries:entries});
  }
  async reviewReference(id:string,decision:string,note:string) {
    if(!this.admin||!this.db.reviewReference)throw new DatabaseError(403);
    return this.db.reviewReference({p_id:id,p_decision:decision,p_note:note});
  }
  async publicationQueue(kind: PublicationKind, q: PageQuery) {
    if (!this.admin) throw new DatabaseError(403);
    if (!this.db.publicationQueue) throw new DatabaseError(503);
    const rows = await this.db.publicationQueue({p_kind:kind,p_limit:q.limit+1,p_cursor:q.cursor ?? null});
    const page = rows.slice(0,q.limit);
    return this.envelope(page, [], "admin publication review", rows.length>q.limit ? page.at(-1)!.id : null);
  }
  async reviewPublication(kind: PublicationKind, id: string, input: PublicationInput) {
    if (!this.admin) throw new DatabaseError(403);
    if (!this.db.reviewPublication) throw new DatabaseError(503);
    return this.db.reviewPublication({p_kind:kind,p_id:id,p_decision:input.decision,p_note:input.note,
      p_basis:input.basis ?? null,p_scope:input.scope ?? null,p_terms_url:input.termsUrl || null,
      p_hash:input.hash ?? null,p_confirm:input.confirm});
  }
  private async citations(recordIds: string[]): Promise<Map<string, Citation>> {
    if (!recordIds.length) return new Map();
    const records = await this.db.read(
      "core",
      "source_records",
      params({ id: ids([...new Set(recordIds)]) }),
    );
    const sources = records.length
      ? await this.db.read(
          "core",
          "sources",
          params({ id: ids([...new Set(records.map((r) => r.source_id))]) }),
        )
      : [];
    return new Map(
      records.map((r) => {
        const s = sources.find((s) => s.id === r.source_id);
        if (!s) throw new DatabaseError(502, "missing_lineage");
        return [
          r.id,
          {
            sourceId: s.id,
            sourceName: s.name,
            sourceUrl: r.source_url,
            canonicalUrl: r.canonical_url,
            sourceRecordId: r.id,
            fetchedAt: r.fetched_at,
            publishedAt: r.published_at,
            reportingPeriod: {
              from: r.reporting_period_start,
              to: r.reporting_period_end,
            },
            quality: r.quality_status,
            contentHash: r.content_hash,
            rawStorageKey: r.raw_storage_key,
            parserVersion: r.parser_version,
          },
        ];
      }),
    );
  }
  private envelope<T>(
    data: T,
    citations: Citation[],
    scope: string,
    nextCursor?: string | null,
  ): Envelope<T> {
    const unique = [
      ...new Map(citations.map((c) => [c.sourceRecordId, c])).values(),
    ];
    const dates = unique.map((c) => c.fetchedAt).sort();
    const meta: Meta = {
      asOf: dates.at(-1) ?? null,
      reportingPeriod: null,
      sources: unique,
      quality:
        unique.length && unique.every((c) => c.quality === "verified")
          ? "verified"
          : "incomplete",
      coverage: { expectedDays: null, observedDays: null, ratio: null, scope },
      methodologyVersion: "catalog-v1",
      unit: null,
      entitlement: this.admin ? "admin" : "public_catalog",
      warnings: [
        "Catalog evidence does not establish operational data coverage.",
      ],
      nextCursor,
    };
    if (!unique.length) meta.warnings.push("No verified evidence available.");
    return { data, meta };
  }
  private async hydrate(entities: Entity[]): Promise<CatalogItem[]> {
    const lineage = await this.citations(
      entities.map((e) => e.source_record_id),
    );
    const kinds = [...new Set(entities.map((e) => e.kind))];
    const details = (
      await Promise.all(
        kinds.map((k) =>
          k === "company"
            ? this.db.read(
                "catalog",
                "companies",
                params({
                  id: ids(
                    entities.filter((e) => e.kind === k).map((e) => e.id),
                  ),
                }),
              )
            : this.db.read(
                "port",
                detailsTables[k],
                params({
                  id: ids(
                    entities.filter((e) => e.kind === k).map((e) => e.id),
                  ),
                }),
              ),
        ),
      )
    ).flat();
    return entities.map((entity) => {
      const detail = details.find((d) => d.id === entity.id);
      const citation = lineage.get(entity.source_record_id);
      if (!detail || !citation)
        throw new DatabaseError(502, "incomplete_catalog");
      return { entity, details: detail, lineage: citation };
    });
  }
  async list(
    kind: EntityKind,
    q: PageQuery,
    parentId?: string,
  ): Promise<Envelope<CatalogItem[]>> {
    const p = params({
      kind: `eq.${kind}`,
      quality_status: "eq.verified",
      order: "id.asc",
      limit: String(q.limit + 1),
    });
    if (q.cursor) p.set("id", `gt.${q.cursor}`);
    if (parentId) {
      const column =
        kind === "port"
          ? "authority_id"
          : kind === "terminal"
            ? "port_id"
            : "terminal_id";
      if (kind === "company" || kind === "port_authority" || kind === "icd")
        throw new DatabaseError(400);
      // Filter and paginate in PostgreSQL, not by scanning the entire catalog.
      const dp = params({
        [column]: `eq.${parentId}`,
        order: "id.asc",
        limit: String(q.limit + 1),
      });
      if (q.cursor) dp.set("id", `gt.${q.cursor}`);
      const children = await this.db.read("port", detailsTables[kind], dp);
      if (!children.length) return this.envelope([], [], "catalog");
      p.set("id", ids(children.map((c) => c.id)));
    }
    const entities = await this.db.read("catalog", "entities", p);
    const data = await this.hydrate(entities.slice(0, q.limit));
    return this.envelope(
      data,
      data.map((d) => d.lineage),
      "catalog",
      entities.length > q.limit ? data.at(-1)!.entity.id : null,
    );
  }
  async detail(
    kind: EntityKind,
    key: string,
  ): Promise<Envelope<CatalogItem | null>> {
    const byId = /^[0-9a-f-]{36}$/i.test(key);
    const entities = await this.db.read(
      "catalog",
      "entities",
      params({
        kind: `eq.${kind}`,
        [byId ? "id" : "slug"]: `eq.${key}`,
        quality_status: "eq.verified",
        limit: "1",
      }),
    );
    const items = await this.hydrate(entities);
    return this.envelope(
      items[0] ?? null,
      items.map((d) => d.lineage),
      "catalog",
    );
  }
  async listedCompanies(q: PageQuery, ticker?: string) {
    const p = params({
      verification_status: "eq.verified",
      valid_from: `lte.${q.at}`,
      or: `(valid_to.is.null,valid_to.gt.${q.at})`,
      order: "id.asc",
      limit: String(q.limit + 1),
    });
    if (q.cursor) p.set("id", `gt.${q.cursor}`);
    if (ticker) p.set("ticker", `eq.${ticker}`);
    const listings = await this.db.read("catalog", "company_listings", p);
    const page = listings.slice(0, q.limit);
    const entities = page.length
      ? await this.db.read(
          "catalog",
          "entities",
          params({
            id: ids([...new Set(page.map((l) => l.company_id))]),
            quality_status: "eq.verified",
          }),
        )
      : [];
    const companies = await this.hydrate(entities);
    const data = companies.map((c) => ({
      ...c,
      listings: page.filter((l) => l.company_id === c.entity.id),
    }));
    const cites = await this.citations(page.map((l) => l.source_record_id));
    return this.envelope(
      data,
      [...data.map((c) => c.lineage), ...cites.values()],
      "listed-company registry",
      listings.length > q.limit ? page.at(-1)!.id : null,
    );
  }
  async companyAssets(
    companyId: string,
    q: PageQuery,
  ): Promise<Envelope<InterestItem[]>> {
    const p = params({
      company_id: `eq.${companyId}`,
      valid_from: `lte.${q.at}`,
      or: `(valid_to.is.null,valid_to.gt.${q.at})`,
      order: "id.asc",
      limit: String(q.limit + 1),
    });
    if (q.cursor) p.set("id", `gt.${q.cursor}`);
    const interests = await this.db.activeInterests(p);
    const page = interests.slice(0, q.limit);
    const entities = page.length
      ? await this.db.read(
          "catalog",
          "entities",
          params({
            id: ids([...new Set([companyId, ...page.map((i) => i.asset_id)])]),
          }),
        )
      : [];
    const cites = await this.citations([
      ...page.map((i) => i.source_record_id),
      ...entities.map((e) => e.source_record_id),
    ]);
    const data = page.map((interest) => {
      const asset = entities.find((e) => e.id === interest.asset_id);
      const company = entities.find((e) => e.id === companyId);
      const lineage = cites.get(interest.source_record_id);
      if (!asset || !company || !lineage)
        throw new DatabaseError(502, "missing_lineage");
      return { interest, asset, company, lineage };
    });
    return this.envelope(
      data,
      [...cites.values()],
      `verified interests effective ${q.at}`,
      interests.length > q.limit ? page.at(-1)!.id : null,
    );
  }
  async reportedAssets(companyId: string, q: PageQuery): Promise<Envelope<ReportedAssetItem[]>> {
    const p = params({company_id:`eq.${companyId}`, reporting_period_end:`lte.${q.at}`, order:"id.asc", limit:String(q.limit+1)});
    if(q.cursor) p.set("id",`gt.${q.cursor}`);
    if(!this.admin) p.set("verification_status","eq.verified");
    const rows=await this.db.read("port",this.admin?"reported_asset_observations":"published_asset_observations",p);
    const page=rows.slice(0,q.limit);
    const cites=await this.citations(page.map(r=>r.source_record_id));
    const data=page.map(observation=>{
      const lineage=cites.get(observation.source_record_id);
      if(!lineage) throw new DatabaseError(502,"missing_lineage");
      return {observation,lineage};
    });
    const result=this.envelope(data,[...cites.values()],"reported relationships; report date is not an ownership commencement date",rows.length>q.limit?page.at(-1)!.id:null);
    result.meta.warnings.push("Quan hệ theo kỳ báo cáo; không xác nhận tình trạng hiện tại hoặc ngày bắt đầu sở hữu/khai thác.");
    return result;
  }
  async researchCatalog(q: PageQuery, ticker?: string): Promise<Envelope<DossierItem[]>> {
    if(!this.admin) throw new DatabaseError(403);
    const p=params({order:"id.asc",reporting_period_end:`lte.${q.at}`,limit:String(q.limit+1)});
    if(q.cursor) p.set("id",`gt.${q.cursor}`);
    if(ticker) p.set("ticker",`eq.${ticker}`);
    const rows=await this.db.read("port","catalog_dossiers",p);
    const page=rows.slice(0,q.limit);
    const entities=page.length?await this.db.read("catalog","entities",params({id:ids(page.map(r=>r.company_id))})):[];
    const observations=page.length?await this.db.read("port","reported_asset_observations",params({company_id:ids(page.map(r=>r.company_id)),reporting_period_end:`lte.${q.at}`,order:"id.asc",limit:"1000"})):[];
    const researchPaths=page.length?await this.db.read("port","dossier_research_paths",params({dossier_id:ids(page.map(r=>r.id)),order:"id.asc",limit:"1000"})):[];
    if(observations.length>=1000) throw new DatabaseError(413,"snapshot_page_too_large");
    const cites=await this.citations([...page.map(r=>r.source_record_id),...observations.map(r=>r.source_record_id)]);
    const data=page.map(dossier=>{
      const company=entities.find(e=>e.id===dossier.company_id),lineage=cites.get(dossier.source_record_id);
      if(!company||!lineage) throw new DatabaseError(502,"missing_lineage");
      const items=observations.filter(o=>o.dossier_id===dossier.id).map(observation=>{
        const evidence=cites.get(observation.source_record_id);
        if(!evidence) throw new DatabaseError(502,"missing_lineage");
        return {observation,lineage:evidence};
      });
      return {dossier,company,lineage,observations:items,researchPaths:researchPaths.filter(p=>p.dossier_id===dossier.id)};
    });
    return this.envelope(data,[...cites.values()],"private scoped catalog review; not public publication",rows.length>q.limit?page.at(-1)!.id:null);
  }
  async reviewReported(id:string, decision:"verified"|"rejected",note:string) {
    if(!this.admin||!this.db.reviewReported) throw new DatabaseError(403);
    return this.db.reviewReported({p_id:id,p_decision:decision,p_note:note});
  }
  async reviewQueue(type: ReviewItem["type"], q: PageQuery) {
    if (!this.admin) throw new DatabaseError(403);
    const p = params({
      verification_status: "eq.pending",
      order: "id.asc",
      limit: String(q.limit + 1),
    });
    if (q.cursor) p.set("id", `gt.${q.cursor}`);
    const rows = type === "company_listings"
      ? await this.db.read("catalog", "company_listings", p)
      : await this.db.read("port", type, p);
    const page = rows.slice(0, q.limit);
    const cites = await this.citations(page.map((r) => r.source_record_id));
    const recordRows = page.length ? await this.db.read("core","source_records",params({id:ids(page.map(r=>r.source_record_id))})) : [];
    const sourceRows = recordRows.length ? await this.db.read("core","sources",params({id:ids(recordRows.map(r=>r.source_id))})) : [];
    const targetIds = page.flatMap(r=>"company_id" in r ? [r.company_id,...("asset_id" in r ? [r.asset_id] : [])] : [r.entity_id]);
    const targetRows = targetIds.length ? await this.db.read("catalog","entities",params({id:ids([...new Set(targetIds)])})) : [];
    const data = page.map((mapping) => {
      const lineage = cites.get(mapping.source_record_id);
      if (!lineage) throw new DatabaseError(502, "missing_lineage");
      const record = recordRows.find(r=>r.id===mapping.source_record_id);
      const source = sourceRows.find(s=>s.id===record?.source_id);
      const requiredIds = "company_id" in mapping ? [mapping.company_id,...("asset_id" in mapping ? [mapping.asset_id] : [])] : [mapping.entity_id];
      const targets = targetRows.filter(e=>requiredIds.includes(e.id));
      const blockers = [];
      if (source?.rights_status !== "approved") blockers.push("Cần duyệt quyền sử dụng nguồn.");
      if (record?.quality_status !== "verified") blockers.push("Cần xác minh bằng chứng.");
      if (requiredIds.some(id=>!targets.some(e=>e.id===id && e.quality_status==="verified"))) blockers.push("Cần xác minh doanh nghiệp và tài sản liên quan.");
      return { type, mapping, lineage, blockers, targets };
    });
    return this.envelope(
      data,
      [...cites.values()],
      "admin mapping proposals",
      rows.length > q.limit ? page.at(-1)!.id : null,
    );
  }
  async propose(type: ReviewItem["type"], input: Proposal) {
    if (!this.admin) throw new DatabaseError(403);
    if (type === "company_listings") throw new DatabaseError(400, "trusted_listing_import_required");
    const [row] = await this.db.write(
      type,
      params({}),
      { ...input, verification_status: "pending" },
      "POST",
    );
    const cites = await this.citations([row.source_record_id]);
    return this.envelope(row, [...cites.values()], "admin mapping proposal");
  }
  async review(
    type: ReviewItem["type"],
    id: string,
    decision: "verified" | "rejected",
    note: string,
  ) {
    if (!this.admin) throw new DatabaseError(403);
    const [row] = await this.db.write(
      type,
      params({ id: `eq.${id}`, verification_status: "eq.pending" }),
      { verification_status: decision, review_note: note },
      "PATCH",
    );
    if (!row) throw new DatabaseError(409, "already_reviewed");
    const cites = await this.citations([row.source_record_id]);
    return this.envelope(row, [...cites.values()], "admin mapping decision");
  }
}
