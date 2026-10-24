import { CatalogList, Unavailable } from "@/components/catalog";
import { publicRepository } from "@/lib/server";
import { pageQuery } from "@invest/port";
import Link from "next/link";
const views = [
  { key: "ports", kind: "port", label: "Cảng" },
  { key: "terminals", kind: "terminal", label: "Bến cảng" },
  { key: "berths", kind: "berth", label: "Cầu cảng" },
  { key: "icds", kind: "icd", label: "ICD và cảng cạn" },
  { key: "authorities", kind: "port_authority", label: "Cảng vụ" },
] as const;
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const search = await searchParams;
  const view = views.find((item) => item.key === search.view) ?? views[0];
  let content;
  try {
    const query = pageQuery(new URLSearchParams(search));
    const result = await publicRepository().list(
      view.kind,
      query,
    );
    content = <CatalogList result={result} paginationParams={{
      view: view.key, limit: String(query.limit), at: query.at,
    }} />;
  } catch {
    content = <Unavailable />;
  }
  return (
    <>
      <p className="eyebrow">VIỆT NAM / DANH MỤC ĐÃ XÁC MINH</p>
      <h1>Thông tin cảng biển từ nguồn xác minh.</h1>
      <p>
        Tra cứu cảng vụ, cảng biển, bến cảng và quan hệ doanh nghiệp với nguồn
        bằng chứng cho từng quan hệ.
      </p>
      <Link className="button-link" href="/industries/ports/north">Xem tổng quan cảng phía Bắc · 9 mã</Link>
      <nav className="catalog-views" aria-label="Loại danh mục">
        {views.map((item) => (
          <Link key={item.key} href={`?view=${item.key}`}
            aria-current={item.key === view.key ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      <section aria-label={`Danh sách ${view.label.toLowerCase()}`}>
        <h2>{view.label}</h2>
        <p>
          Danh mục được hiển thị trực tiếp, kể cả các cảng chưa xác minh được cảng vụ phụ trách.
          Nhóm cảng biển theo văn bản pháp lý có thể bao gồm bến nằm trên sông.
          ICD và cảng cạn được trình bày riêng.
        </p>
        {content}
      </section>
      <section className="panel" aria-label="Tra cứu doanh nghiệp">
        <h2>Doanh nghiệp và quan hệ với cảng</h2>
        <p>
          Danh mục hạ tầng chưa chứng minh doanh nghiệp sở hữu hay khai thác cảng.
          Mã chứng khoán và quan hệ tài sản chỉ xuất hiện sau khi có bằng chứng được duyệt;
          danh mục doanh nghiệp hiện chưa đầy đủ.
        </p>
        <nav aria-label="Danh mục doanh nghiệp">
          <Link href="/industries/ports/companies">Mã chứng khoán đã xác minh</Link>
          <Link href="/industries/ports/companies?view=all">Tất cả doanh nghiệp đã xác minh</Link>
        </nav>
      </section>
      <section className="panel">
        <h2>Phạm vi dữ liệu hoạt động</h2>
        <p>
          Tổng quan phía Bắc đã có lượt và DWT theo lịch cho các mã trong phạm vi theo dõi; độ phủ và nguồn được trình bày riêng.
          DWT là trọng tải thiết kế của tàu, không phải sản lượng hàng hóa thực tế.
        </p>
      </section>
    </>
  );
}
