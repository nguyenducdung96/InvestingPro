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
  ): Promise<MappingAudit[]>;
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
        apikey: key,
        Authorization: `Bearer ${token ?? key}`,
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
    read: (s, t, p) => request(s, String(t), p),
    activeInterests: (p) => request("port", "current_asset_interests", p),
    write: (t, p, b, m) => request("port", t, p, m, b),
  };
}
const detailsTables = {
  port_authority: "port_authorities",
  port: "ports",
  terminal: "terminals",
  berth: "berths",
  company: "companies",
} as const;
const params = (values: Record<string, string>) => new URLSearchParams(values);
const ids = (values: string[]) => `in.(${values.join(",")})`;
export class SupabaseCatalogRepository implements CatalogRepository {
  constructor(
    private db: Transport,
    private admin = false,
  ) {}
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
      if (kind === "company" || kind === "port_authority")
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
  async reviewQueue(type: ReviewItem["type"], q: PageQuery) {
    if (!this.admin) throw new DatabaseError(403);
    const p = params({
      verification_status: "eq.pending",
      order: "id.asc",
      limit: String(q.limit + 1),
    });
    if (q.cursor) p.set("id", `gt.${q.cursor}`);
    const rows = await this.db.read("port", type, p);
    const page = rows.slice(0, q.limit);
    const cites = await this.citations(page.map((r) => r.source_record_id));
    const data = page.map((mapping) => {
      const lineage = cites.get(mapping.source_record_id);
      if (!lineage) throw new DatabaseError(502, "missing_lineage");
      return { type, mapping, lineage };
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
