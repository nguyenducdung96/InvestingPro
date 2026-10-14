import { CatalogList, Unavailable } from "@/components/catalog";
import { publicRepository } from "@/lib/server";
import { pageQuery } from "@invest/port";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  let content;
  try {
    const result = await publicRepository().list(
      "port_authority",
      pageQuery(new URLSearchParams(await searchParams)),
    );
    content = <CatalogList result={result} />;
  } catch {
    content = <Unavailable />;
  }
  return (
    <>
      <p className="eyebrow">VIETNAM / VERIFIED CATALOG</p>
      <h1>Port intelligence starts with evidence.</h1>
      <p>
        Explore port authorities, terminals and company interests with a
        traceable source for every relationship.
      </p>
      {content}
      <section className="panel">
        <h2>Operations coverage</h2>
        <p>
          Vessel calls, DWT, throughput and rankings are not available in this
          catalog release. DWT represents vessel design capacity and is not
          actual cargo throughput.
        </p>
      </section>
    </>
  );
}
