import Link from "next/link";
import type {
  CatalogItem,
  Envelope,
  Meta,
  Citation,
  InterestItem,
} from "@invest/domain";
export function SourceBadge({ citation }: { citation: Citation }) {
  return (
    <details>
      <summary>
        <span className="badge">{citation.quality}</span> {citation.sourceName}
      </summary>
      <p className="meta">
        <a href={citation.sourceUrl} target="_blank" rel="noopener noreferrer">
          Official source
        </a>{" "}
        · Fetched {citation.fetchedAt} · Published{" "}
        {citation.publishedAt ?? "Not reported"}
      </p>
      <p className="meta">
        Reporting period: {citation.reportingPeriod.from ?? "Not reported"} →{" "}
        {citation.reportingPeriod.to ?? "Not reported"}
        <br />
        Parser: {citation.parserVersion}
        <br />
        Evidence: {citation.sourceRecordId}
        <br />
        SHA-256: {citation.contentHash}
      </p>
    </details>
  );
}
export function Metadata({ meta }: { meta: Meta }) {
  return (
    <aside className="notice" aria-label="Data confidence">
      <span className="badge">{meta.quality}</span>
      <p className="meta">
        As of: {meta.asOf ?? "Not available"} · Coverage: {meta.coverage.scope}{" "}
        · Operational coverage: not measured · Methodology:{" "}
        {meta.methodologyVersion}
      </p>
      {meta.warnings.map((w) => (
        <p className="meta" key={w}>
          {w}
        </p>
      ))}
    </aside>
  );
}
const hrefs = {
  port_authority: "/industries/ports/authorities/",
  port: "/ports/",
  terminal: "/terminals/",
  berth: "/berths/",
  company: "/companies/id/",
};
export function CatalogList({ result }: { result: Envelope<CatalogItem[]> }) {
  return (
    <>
      <Metadata meta={result.meta} />
      {result.data.length ? (
        <div className="grid">
          {result.data.map((item) => (
            <article className="panel" key={item.entity.id}>
              <p className="eyebrow">{item.entity.kind.replace("_", " ")}</p>
              <h2>
                <Link
                  href={`${hrefs[item.entity.kind]}${item.entity.kind === "company" ? item.entity.id : item.entity.slug}`}
                >
                  {item.entity.name}
                </Link>
              </h2>
              <SourceBadge citation={item.lineage} />
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>No verified records yet</h2>
          <p>
            Catalog entries appear after official evidence is recorded and
            reviewed. Missing data is not shown as zero.
          </p>
        </div>
      )}
      {result.meta.nextCursor && (
        <Link href={`?cursor=${result.meta.nextCursor}`}>Next page</Link>
      )}
    </>
  );
}
export function AssetList({ result }: { result: Envelope<InterestItem[]> }) {
  return (
    <>
      <Metadata meta={result.meta} />
      {result.data.length ? (
        result.data.map(({ interest, asset, lineage }) => (
          <article className="panel" key={interest.id}>
            <h2>
              <Link href={`${hrefs[asset.kind]}${asset.slug}`}>
                {asset.name}
              </Link>
            </h2>
            <dl className="facts">
              <div>
                <dt>Interest</dt>
                <dd>{interest.interest_type}</dd>
              </div>
              <div>
                <dt>Ownership</dt>
                <dd>
                  {interest.ownership_pct === null
                    ? "Not reported"
                    : `${interest.ownership_pct}%`}
                </dd>
              </div>
              <div>
                <dt>Effective from</dt>
                <dd>{interest.valid_from}</dd>
              </div>
              <div>
                <dt>Effective to (exclusive)</dt>
                <dd>{interest.valid_to ?? "Open ended"}</dd>
              </div>
            </dl>
            <p>{interest.evidence_excerpt}</p>
            <SourceBadge citation={lineage} />
          </article>
        ))
      ) : (
        <div className="empty">
          <h2>No verified asset mappings</h2>
          <p>
            No ownership or operator relationship is inferred from a similar
            company name.
          </p>
        </div>
      )}
      {result.meta.nextCursor && (
        <Link href={`?cursor=${result.meta.nextCursor}`}>Next page</Link>
      )}
    </>
  );
}
export function Unavailable({
  message = "Catalog database is not available yet",
}: {
  message?: string;
}) {
  return (
    <section className="notice" role="status">
      <h2>{message}</h2>
      <p>Verified data could not be loaded. Please try again later.</p>
    </section>
  );
}
