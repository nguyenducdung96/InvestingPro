import Link from "next/link";
import { publicRepository } from "@/lib/server";
import { Metadata, SourceBadge, Unavailable } from "@/components/catalog";
import { pageQuery } from "@invest/port";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  let result;
  try {
    result = await publicRepository().listedCompanies(
      pageQuery(new URLSearchParams(await searchParams)),
    );
  } catch {
    return <Unavailable />;
  }
  return (
    <>
      <p className="eyebrow">COMPANY REGISTRY</p>
      <h1>Listed companies</h1>
      <Metadata meta={result.meta} />
      {result.data.length ? (
        result.data.map((c) => (
          <article className="panel" key={c.entity.id}>
            <h2>{c.entity.name}</h2>
            {c.listings.map((l) => (
              <p key={l.id}>
                <Link href={`/companies/${l.ticker}`}>
                  {l.exchange}: {l.ticker}
                </Link>
              </p>
            ))}
            <SourceBadge citation={c.lineage} />
          </article>
        ))
      ) : (
        <p>No verified listings yet.</p>
      )}
      {result.meta.nextCursor && (
        <Link href={`?cursor=${result.meta.nextCursor}`}>Next page</Link>
      )}
    </>
  );
}
