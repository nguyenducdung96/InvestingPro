import Link from "next/link";
import type { PublicationKind } from "@invest/domain";
import { adminRepository,HttpError } from "@/lib/server";
import { AdminSession } from "@/components/admin-session";
import { PublicationReview } from "@/components/publication-review";
import { Unavailable } from "@/components/catalog";
import { pageQuery } from "@invest/port";
import { displayDate } from "@/lib/display";
export const dynamic="force-dynamic";
const steps={sources:"1. Quyền sử dụng nguồn",evidence:"2. Bằng chứng",entities:"3. Doanh nghiệp / thực thể"};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}) {
  const search=await searchParams;
  const kind:PublicationKind=search.kind==="evidence"?"evidence":search.kind==="entities"?"entities":"sources";
  let result;
  try {result=await (await adminRepository()).publicationQueue(kind,pageQuery(new URLSearchParams(search)));}
  catch(e) {return <><h1>Duyệt hồ sơ công bố</h1>{e instanceof HttpError && [401,403].includes(e.status)?<AdminSession/>:<Unavailable/>}</>;}
  return <>
    <p className="eyebrow">QUẢN TRỊ / DUYỆT HỒ SƠ</p>
    <h1>Duyệt hồ sơ công bố</h1>
    <p>Hoàn thành từng bước theo thứ tự. Chỉ duyệt nội dung bạn đã đối chiếu; quyền tải tài liệu công khai không tự đồng nghĩa quyền phát hành lại.</p>
    <nav aria-label="Các bước duyệt hồ sơ">{Object.entries(steps).map(([value,text])=><Link key={value} href={`?kind=${value}`} aria-current={kind===value?"page":undefined}>{text}</Link>)}<Link href="/admin/mappings">4. Mã chứng khoán và quan hệ</Link></nav>
    <div className="notice"><p>Bằng chứng gốc được giữ nguyên. Xác minh bằng chứng tạo một bản đã duyệt và chuyển các đề xuất chưa duyệt sang bản đó. Sau đó bạn vẫn cần duyệt doanh nghiệp, mã chứng khoán và từng quan hệ riêng.</p></div>
    <h2>{steps[kind]}</h2>
    {result.data.map(item=><article className="panel" key={item.id}>
      <h3>{item.name}</h3>
      <p>Đơn vị công bố: {item.source.owner}</p>
      <p>Quyền nguồn: {item.source.rights_status==="approved"?"Đã duyệt":item.source.rights_status==="blocked"?"Đang chặn":"Chưa duyệt"}</p>
      <p><a href={item.record?.source_url ?? item.source.base_url} target="_blank" rel="noopener noreferrer">Mở tài liệu / nguồn gốc</a></p>
      {item.kind==="sources" && <p>{item.source.rights_notes}</p>}
      {item.entity && <p>Định danh: {item.entity.id} · {item.entity.name}</p>}
      {item.company && <dl className="facts"><div><dt>Tên pháp nhân</dt><dd>{item.company.legal_name}</dd></div><div><dt>Mã số doanh nghiệp</dt><dd>{item.company.enterprise_id ?? "Chưa có bằng chứng mã số doanh nghiệp"}</dd></div></dl>}
      {item.record && <details><summary>Thông tin bản bằng chứng để đối chiếu</summary>
        <dl className="facts"><div><dt>Thời điểm tải gốc</dt><dd>{displayDate(item.record.fetched_at)}</dd></div><div><dt>Thời điểm công bố</dt><dd>{displayDate(item.record.published_at,"Chưa xác định")}</dd></div></dl>
        <p>SHA-256: <code>{item.record.content_hash}</code></p><p>Object R2 riêng tư: <code>{item.record.raw_storage_key}</code></p>
        <p>Phiên bản xử lý: {item.record.parser_version}</p>
      </details>}
      <PublicationReview item={item}/>
    </article>)}
    {!result.data.length && <p>Không còn hồ sơ chờ duyệt ở bước này. Chuyển sang bước tiếp theo để kiểm tra.</p>}
    {result.meta.nextCursor && <Link href={`?kind=${kind}&cursor=${result.meta.nextCursor}`}>Trang tiếp theo</Link>}
  </>;
}
