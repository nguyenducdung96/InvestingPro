import { label, displayDate, warningLabel } from "@/lib/display";
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
        <span className="badge">{label(citation.quality)}</span> {citation.sourceName}
      </summary>
      <p className="meta">
        <a href={citation.sourceUrl} target="_blank" rel="noopener noreferrer">
          Nguồn chính thức
        </a>{" "}
        · Thu thập {displayDate(citation.fetchedAt)} · Công bố{" "}
        {displayDate(citation.publishedAt)}
      </p>
      <p className="meta">
        Kỳ báo cáo: {displayDate(citation.reportingPeriod.from)} →{" "}
        {displayDate(citation.reportingPeriod.to)}
        <br />
        Phiên bản bộ phân tích: {citation.parserVersion}
        <br />
        Mã bằng chứng: {citation.sourceRecordId}
        <br />
        SHA-256: {citation.contentHash}
      </p>
    </details>
  );
}
export function Metadata({ meta }: { meta: Meta }) {
  return (
    <aside className="notice" aria-label="Độ tin cậy dữ liệu">
      <span className="badge">{label(meta.quality)}</span>
      <p className="meta">
        Dữ liệu tính đến: {displayDate(meta.asOf, "Chưa có dữ liệu")} · Phạm vi: {label(meta.coverage.scope)}{" "}
        · Độ bao phủ hoạt động: chưa đo lường · Phương pháp:{" "}
        {meta.methodologyVersion}
      </p>
      {meta.warnings.map((w) => (
        <p className="meta" key={w}>
          {warningLabel(w)}
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
              <p className="eyebrow">{label(item.entity.kind)}</p>
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
          <h2>Chưa có bản ghi đã xác minh</h2>
          <p>
            Bản ghi hiển thị sau khi bằng chứng chính thức được lưu và xét duyệt.
            Dữ liệu thiếu không được hiển thị thành số 0.
          </p>
        </div>
      )}
      {result.meta.nextCursor && (
        <Link href={`?cursor=${result.meta.nextCursor}`}>Trang tiếp theo</Link>
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
                <dt>Loại quan hệ</dt>
                <dd>{label(interest.interest_type)}</dd>
              </div>
              <div>
                <dt>Tỷ lệ sở hữu</dt>
                <dd>
                  {interest.ownership_pct === null
                    ? "Chưa công bố"
                    : `${interest.ownership_pct}%`}
                </dd>
              </div>
              <div>
                <dt>Hiệu lực từ</dt>
                <dd>{displayDate(interest.valid_from)}</dd>
              </div>
              <div>
                <dt>Hiệu lực đến (không gồm ngày này)</dt>
                <dd>{displayDate(interest.valid_to, "Chưa có ngày kết thúc")}</dd>
              </div>
            </dl>
            <p>{interest.evidence_excerpt}</p>
            <SourceBadge citation={lineage} />
          </article>
        ))
      ) : (
        <div className="empty">
          <h2>Chưa có quan hệ tài sản đã xác minh</h2>
          <p>
            Không suy luận quan hệ sở hữu hoặc vận hành chỉ từ tên doanh nghiệp
            tương tự.
          </p>
        </div>
      )}
      {result.meta.nextCursor && (
        <Link href={`?cursor=${result.meta.nextCursor}`}>Trang tiếp theo</Link>
      )}
    </>
  );
}
export function Unavailable({
  message = "Chưa kết nối được cơ sở dữ liệu danh mục",
}: {
  message?: string;
}) {
  return (
    <section className="notice" role="status">
      <h2>{message}</h2>
      <p>Không tải được dữ liệu đã xác minh. Vui lòng thử lại sau.</p>
    </section>
  );
}
