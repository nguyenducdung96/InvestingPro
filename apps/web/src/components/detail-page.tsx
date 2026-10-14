import { notFound } from "next/navigation";
import type { EntityKind } from "@invest/domain";
import { publicRepository } from "@/lib/server";
import { CatalogList, Metadata, SourceBadge, Unavailable } from "./catalog";
export async function DetailPage({
  kind,
  slug,
}: {
  kind: EntityKind;
  slug: string;
}) {
  let result;
  let children;
  try {
    const repo = publicRepository();
    result = await repo.detail(kind, slug);
    if (result.data && ["port_authority", "port", "terminal"].includes(kind)) {
      children = await repo.list(
        kind === "port_authority"
          ? "port"
          : kind === "port"
            ? "terminal"
            : "berth",
        { limit: 25, at: new Date().toISOString().slice(0, 10) },
        result.data.entity.id,
      );
    }
  } catch {
    return <Unavailable />;
  }
  if (!result.data) notFound();
  const item = result.data;
  return (
    <>
      <p className="eyebrow">VERIFIED {kind.replace("_", " ")}</p>
      <h1>{item.entity.name}</h1>
      <Metadata meta={result.meta} />
      <section className="panel">
        <h2>Catalog evidence</h2>
        <SourceBadge citation={item.lineage} />
        <dl className="facts">
          {Object.entries(item.details)
            .filter(([k]) => !["id", "kind"].includes(k))
            .map(([k, v]) => (
              <div key={k}>
                <dt>{k.replaceAll("_", " ")}</dt>
                <dd>{v === null ? "Not reported" : String(v)}</dd>
              </div>
            ))}
        </dl>
      </section>
      {children && (
        <section>
          <h2>
            {kind === "port_authority"
              ? "Ports"
              : kind === "port"
                ? "Terminals"
                : "Berths"}
          </h2>
          <CatalogList result={children} />
        </section>
      )}
      <section className="panel">
        <h2>Operating data</h2>
        <p>
          Operating metrics have not been published in this catalog release.
        </p>
      </section>
    </>
  );
}
