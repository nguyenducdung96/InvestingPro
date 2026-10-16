import Link from "next/link";
import { adminRepository, HttpError } from "@/lib/server";
import { pageQuery } from "@invest/port";
import { AdminSession } from "@/components/admin-session";
import { SourceBadge, Unavailable } from "@/components/catalog";
import { ReportedAssets } from "@/components/reported-assets";
import { displayDate } from "@/lib/display";
export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}) {
  const search=await searchParams;
  let result;
  try {
    const ticker=search.ticker?.trim().toUpperCase()||undefined;
    if(ticker&&!/^[A-Z0-9]{1,12}$/.test(ticker)) return <Unavailable message="Mã doanh nghiệp không hợp lệ."/>;
    result=await(await adminRepository()).researchCatalog(pageQuery(new URLSearchParams(search)),ticker);
  } catch(e) {
    return <><h1>Hồ sơ doanh nghiệp theo kỳ báo cáo</h1>{e instanceof HttpError&&[401,403].includes(e.status)?<AdminSession/>:<Unavailable/>}</>;
  }
  return <>
    <p className="eyebrow">SLICE 1 / HỒ SƠ NỘI BỘ</p>
    <h1>Hồ sơ doanh nghiệp theo kỳ báo cáo</h1>
    <p className="notice">Phạm vi đối chiếu: 41 doanh nghiệp ứng viên trong bộ báo cáo 2025, không phải chứng nhận đầy đủ toàn thị trường. Hồ sơ nội bộ có thể chứa nguồn chưa được duyệt để công bố. Không đồng nhất việc rà soát tài liệu với quyền công bố hoặc tình trạng giao dịch hiện tại.</p>
    <form method="get"><label htmlFor="catalog-ticker">Mã doanh nghiệp</label><input id="catalog-ticker" name="ticker" defaultValue={search.ticker??""} maxLength={12} placeholder="Ví dụ: GMD"/><button type="submit">Tra cứu hồ sơ</button></form>
    <p><Link href="/admin/catalog">Toàn bộ phạm vi đối chiếu</Link> · <Link href="/admin/refresh">Cập nhật từ API</Link> · <Link href="/admin/publication">Duyệt nguồn và bằng chứng</Link></p>
    {result.data.map(({dossier:d,company,lineage,observations,researchPaths})=><section key={d.id} aria-label={`Hồ sơ ${d.ticker}`}>
      <h2>{d.ticker} · {company.name}</h2>
      <p>Kỳ báo cáo đến {displayDate(d.reporting_period_end)} · {observations.length} quan sát tài sản trong hồ sơ</p>
      <SourceBadge citation={lineage}/>
      {d.review_outcome==="no_assertable_assets"&&<p>Chưa có quan hệ tài sản đủ căn cứ để khẳng định trong các trang đã đọc; không có nghĩa doanh nghiệp không có tài sản cảng.</p>}
      <details><summary>Kết quả đối chiếu và phần chưa xác minh</summary><p>{d.review_note}</p><ul>{d.gaps.map(g=><li key={g}>{g}</li>)}</ul></details>
      {observations.length>0&&<ReportedAssets items={observations} review/>}
      {researchPaths.length>0&&<section aria-label={`Chuỗi pháp nhân ${d.ticker}`}><h3>Đường liên hệ qua pháp nhân cần đối chiếu</h3><p>Đây là đường nghiên cứu nối hai tài liệu, chưa phải quan hệ sở hữu/khai thác đã xác minh. Không nhân tỷ lệ vốn thành tỷ lệ sở hữu tài sản.</p>
        {researchPaths.map(p=><details key={p.id}><summary>{p.child_ticker} → {p.asset_name}</summary><p>{p.via.join(" → ")}</p>{p.berth_scope.length>0&&<p>Phạm vi: {p.berth_scope.join(", ")}</p>}{p.evidence_path.map(e=><p key={e.ticker}><a href={e.source_url} target="_blank" rel="noreferrer">Tài liệu {e.ticker}</a> · Trang PDF {e.pages.join(", ")}</p>)}</details>)}
      </section>}
    </section>)}
    {!result.data.length&&<p>Không có hồ sơ trong phạm vi tra cứu.</p>}
    {result.meta.nextCursor&&<Link href={`?${new URLSearchParams({...search,cursor:result.meta.nextCursor})}`}>Trang tiếp theo</Link>}
  </>;
}
