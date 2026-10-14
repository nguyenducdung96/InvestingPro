import { label, displayDate } from "@/lib/display";
import Link from "next/link";
import { adminRepository, HttpError } from "@/lib/server";
import { AdminSession } from "@/components/admin-session";
import { ReviewActions } from "@/components/review-actions";
import { Metadata, SourceBadge, Unavailable } from "@/components/catalog";
import { mappingType, pageQuery } from "@invest/port";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const search = await searchParams;
  let result;
  let type;
  try {
    type = mappingType(search.type ?? "company_asset_interests");
    result = await (
      await adminRepository()
    ).reviewQueue(type, pageQuery(new URLSearchParams(search)));
  } catch (e) {
    return (
      <>
        <h1>Duyệt quan hệ</h1>
        {e instanceof HttpError && [401, 403].includes(e.status) ? (
          <AdminSession />
        ) : (
          <Unavailable />
        )}
      </>
    );
  }
  return (
    <>
      <p className="eyebrow">QUẢN TRỊ / XÉT DUYỆT BẰNG CHỨNG</p>
      <h1>Danh sách quan hệ chờ duyệt</h1>
      <nav aria-label="Loại đề xuất">
        <Link href="?type=company_asset_interests">Quan hệ doanh nghiệp</Link>
        <Link href="?type=entity_mappings">Định danh thực thể</Link>
      </nav>
      <Metadata meta={result.meta} />
      {result.data.map((item) => (
        <article className="panel" key={item.mapping.id}>
            <span className="badge">{label(item.mapping.verification_status)}</span>
          <h2>
            {"external_name" in item.mapping
              ? item.mapping.external_name
              : `${label(item.mapping.interest_type)}: ${item.mapping.asset_id}`}
          </h2>
          <p>
            Hiệu lực {displayDate(item.mapping.valid_from)} →{" "}
            {displayDate(item.mapping.valid_to, "Chưa có ngày kết thúc")} · Phương thức:{" "}
            {label(item.mapping.resolution_method)} · Độ tin cậy:{" "}
            {item.mapping.confidence}
          </p>
          <p>{item.mapping.evidence_excerpt}</p>
          <SourceBadge citation={item.lineage} />
          <ReviewActions item={item} />
        </article>
      ))}
      {!result.data.length && <p>Không có đề xuất chờ duyệt.</p>}
      {result.meta.nextCursor && (
        <Link href={`?type=${type}&cursor=${result.meta.nextCursor}`}>
          Trang tiếp theo
        </Link>
      )}
    </>
  );
}
