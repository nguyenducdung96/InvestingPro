import Link from "next/link";
import {adminRepository,HttpError} from "@/lib/server";
import {ReportedAssets} from "./reported-assets";
import {SourceBadge} from "./catalog";
import {pageQuery} from "@invest/port";
import type {ReferenceSnapshot} from "@invest/domain";
import {isPublishedCompany} from '@/lib/published-catalog';
export async function researchDirectory() {
 try {
  const repo=await adminRepository();const rows=await repo.referenceSnapshots();
  return rows.filter((r,i)=>isPublishedCompany(r.ticker)&&isPublishedCompany(r.company_id)&&rows.findIndex(x=>x.company_id===r.company_id)===i).sort((a,b)=>a.ticker.localeCompare(b.ticker));
 }catch(error){if(error instanceof HttpError&&[401,403].includes(error.status))return null;throw error;}
}
export function ResearchDirectory({rows}:{rows:ReferenceSnapshot[]}) {
 return <><p className="eyebrow">DOANH NGHIỆP / KHÔNG GIAN NGHIÊN CỨU</p><h1>Doanh nghiệp cảng và logistics</h1><p className="notice">Bạn đang xem hồ sơ tham khảo bằng phiên quản trị. Dữ liệu API và tài liệu doanh nghiệp được gắn nguồn riêng; công ty có góp vốn không đồng nghĩa sở hữu cảng vật lý. Phạm vi {rows.length} doanh nghiệp ứng viên, chưa chứng nhận toàn thị trường.</p><p><Link href="/admin/refresh">Cập nhật dữ liệu API</Link> · <Link href="/industries/ports/companies?view=listed">Thông tin niêm yết đã xác minh</Link></p>{rows.map(r=><article className="panel" key={r.id}><h2><Link href={`/companies/${r.ticker}?view=research`}>{r.ticker} · {String(r.reference_data.name??r.ticker)}</Link></h2><p>Nguồn: VCI qua Vnstock · Lấy lúc {new Date(r.fetched_at).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}</p><p>Hồ sơ API, công ty có góp vốn và tài sản cảng theo nguồn đối chiếu.</p></article>)}</>;
}
export async function CompanyResearch({keyValue}:{keyValue:string}) {
 let repo;try{repo=await adminRepository();}catch(error){if(error instanceof HttpError&&[401,403].includes(error.status))return null;throw error;}
 const profiles=await repo.referenceSnapshots();const profile=profiles.find(p=>p.company_id===keyValue||p.ticker===keyValue.toUpperCase());if(!profile)return null;
 const [relations,dossiers]=await Promise.all([repo.relationshipSnapshots(profile.ticker),repo.researchCatalog({...pageQuery(new URLSearchParams()),limit:100},profile.ticker)]);
 const relation=relations[0];const related=relation?Array.from(new Map(relation.relationship_data.map(r=>[JSON.stringify(r),r])).values()):[];
 return <><p className="eyebrow">HỒ SƠ DOANH NGHIỆP / NGHIÊN CỨU CÓ NGUỒN</p><h1>{profile.ticker} · {String(profile.reference_data.name)}</h1><p className="notice">Hồ sơ tham khảo dành cho phiên đăng nhập. Quan hệ giữa các công ty là thông tin nhà cung cấp báo cáo, không phải kết luận sở hữu/khai thác một tài sản cảng. Thông tin theo kỳ và phần chưa đối chiếu được ghi rõ bên dưới.</p><p><Link href="/industries/ports/companies?view=all">Danh mục doanh nghiệp</Link> · <Link href={`/admin/refresh?ticker=${profile.ticker}`}>Lịch sử cập nhật và đối chiếu</Link></p>
 <section aria-label="Hồ sơ API"><h2>Thông tin doanh nghiệp</h2><p>Nguồn VCI qua Vnstock · Lấy lúc {new Date(profile.fetched_at).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}</p><p>{String(profile.reference_data.profile??"Nguồn chưa cung cấp giới thiệu.")}</p><details><summary>Bằng chứng API hồ sơ</summary><p>SHA-256: {profile.raw_sha256}</p><a href="https://www.vnstocks.com/docs/vnstock/tham-chieu-reference" target="_blank" rel="noreferrer">Thông tin nguồn và cấu trúc dữ liệu</a></details></section>
 <section aria-label="Quan hệ công ty từ API"><h2>Công ty có góp vốn theo nhà cung cấp</h2>{relation?<><p>{related.length} quan hệ trong bản trả về · Lấy lúc {new Date(relation.fetched_at).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}. Thời điểm lấy không phải ngày hiệu lực đầu tư.</p>{related.map((r,i)=><article className="panel" key={i}><h3>{r.name}</h3><p>{r.sub_symbol?`Mã bên nhận vốn: ${r.sub_symbol} · `:""}Tỷ lệ vốn nhà cung cấp báo cáo: {r.rate===null?"Chưa cung cấp":new Intl.NumberFormat("vi-VN",{style:"percent",maximumFractionDigits:4}).format(r.rate)}</p></article>)}{!related.length&&<p>Nguồn không trả về quan hệ trong lần này; không kết luận doanh nghiệp không có khoản đầu tư.</p>}<details><summary>Bằng chứng API quan hệ</summary><p>Nguồn: VCI qua Vnstock · SHA-256: {relation.raw_sha256}</p></details></>:<p>Chưa có bản API quan hệ. Hồ sơ tài sản đối chiếu bên dưới vẫn được giữ.</p>}</section>
 {dossiers.data.map(d=><section key={d.dossier.id} aria-label="Tài sản theo nguồn đối chiếu"><h2>Cảng biển, cảng sông và ICD theo hồ sơ đối chiếu</h2><SourceBadge citation={d.lineage}/>{d.observations.length?<ReportedAssets items={d.observations}/>:<p>Chưa đủ căn cứ khẳng định tài sản từ phần tài liệu đã đối chiếu.</p>}{d.researchPaths.length>0&&<details><summary>{d.researchPaths.length} đường liên hệ qua pháp nhân cần đối chiếu</summary>{d.researchPaths.map(p=><p key={p.id}>{p.child_ticker} → {p.asset_name}</p>)}</details>}</section>)}
 </>;
}
