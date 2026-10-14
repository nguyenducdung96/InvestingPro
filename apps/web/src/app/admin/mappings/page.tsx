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
        <h1>Mapping review</h1>
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
      <p className="eyebrow">ADMIN / EVIDENCE REVIEW</p>
      <h1>Mapping review queue</h1>
      <nav aria-label="Proposal types">
        <Link href="?type=company_asset_interests">Company interests</Link>
        <Link href="?type=entity_mappings">Entity identities</Link>
      </nav>
      <Metadata meta={result.meta} />
      {result.data.map((item) => (
        <article className="panel" key={item.mapping.id}>
            <span className="badge">{item.mapping.verification_status} proposal</span>
          <h2>
            {"external_name" in item.mapping
              ? item.mapping.external_name
              : `${item.mapping.interest_type}: ${item.mapping.asset_id}`}
          </h2>
          <p>
            Effective {item.mapping.valid_from} →{" "}
            {item.mapping.valid_to ?? "open ended"} · Method:{" "}
            {item.mapping.resolution_method} · Confidence:{" "}
            {item.mapping.confidence}
          </p>
          <p>{item.mapping.evidence_excerpt}</p>
          <SourceBadge citation={item.lineage} />
          <ReviewActions item={item} />
        </article>
      ))}
      {!result.data.length && <p>No pending proposals.</p>}
      {result.meta.nextCursor && (
        <Link href={`?type=${type}&cursor=${result.meta.nextCursor}`}>
          Next page
        </Link>
      )}
    </>
  );
}
