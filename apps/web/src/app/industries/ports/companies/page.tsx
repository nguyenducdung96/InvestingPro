import Link from "next/link";
import { publicRepository } from "@/lib/server";
import {
  CatalogList,
  Metadata,
  SourceBadge,
  Unavailable,
} from "@/components/catalog";
import { pageQuery } from "@invest/port";
import {ResearchDirectory,researchDirectory} from "@/components/company-research";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const search = await searchParams;
  const tabs = (
    <nav aria-label="Danh mục doanh nghiệp">
      <Link href="?view=all">Tất cả doanh nghiệp</Link>
      <Link href="?view=listed">Niêm yết / đăng ký giao dịch</Link>
    </nav>
  );
  if (search.view === "all") {
    try {
      const research=await researchDirectory();
      if(research?.length)return <ResearchDirectory rows={research}/>;
      const result = await publicRepository().list(
        "company",
        pageQuery(new URLSearchParams(search)),
      );
      return (
        <>
          <h1>Danh mục doanh nghiệp</h1>
          {tabs}
          <CatalogList result={result} paginationParams={{ view: "all" }} />
        </>
      );
    } catch {
      return <Unavailable />;
    }
  }
  let result;
  try {
    result = await publicRepository().listedCompanies(
      pageQuery(new URLSearchParams(search)),
    );
  } catch {
    return <Unavailable />;
  }
  return (
    <>
      <p className="eyebrow">DANH MỤC DOANH NGHIỆP</p>
      <h1>Doanh nghiệp niêm yết / đăng ký giao dịch</h1>
      {tabs}
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
        <p>Chưa có thông tin niêm yết đã xác minh.</p>
      )}
      {result.meta.nextCursor && (
        <Link href={`?cursor=${result.meta.nextCursor}`}>Trang tiếp theo</Link>
      )}
    </>
  );
}
