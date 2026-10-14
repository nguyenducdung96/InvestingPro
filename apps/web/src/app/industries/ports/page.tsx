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
      <p className="eyebrow">VIỆT NAM / DANH MỤC ĐÃ XÁC MINH</p>
      <h1>Thông tin cảng biển từ nguồn xác minh.</h1>
      <p>
        Tra cứu cảng vụ, cảng biển, bến cảng và quan hệ doanh nghiệp với nguồn
        bằng chứng cho từng quan hệ.
      </p>
      {content}
      <section className="panel">
        <h2>Phạm vi dữ liệu hoạt động</h2>
        <p>
          Phiên bản danh mục này chưa có lượt tàu, DWT, sản lượng và xếp hạng.
          DWT là trọng tải thiết kế của tàu, không phải sản lượng hàng hóa thực tế.
        </p>
      </section>
    </>
  );
}
