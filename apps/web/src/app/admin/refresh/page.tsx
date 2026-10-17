import Link from "next/link";
import { adminRepository,HttpError } from "@/lib/server";
import { AdminSession } from "@/components/admin-session";
import { Unavailable } from "@/components/catalog";
import { ReferenceImport,ReferenceReview } from "@/components/reference-refresh";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}) {
 const search=await searchParams;const ticker=search.ticker?.trim().toUpperCase();
 if(ticker&&!/^[A-Z0-9]{1,12}$/.test(ticker))return <Unavailable message="Mã doanh nghiệp không hợp lệ."/>;
 let snapshots,runs;try{const repo=await adminRepository();[snapshots,runs]=await Promise.all([repo.referenceSnapshots(ticker),repo.referenceRuns()]);}catch(e){return <><h1>Cập nhật hồ sơ từ API</h1>{e instanceof HttpError&&[401,403].includes(e.status)?<AdminSession/>:<Unavailable/>}</>;}
 const latest=snapshots.filter((s,i,all)=>all.findIndex(x=>x.company_id===s.company_id)===i);
 return <><p className="eyebrow">SLICE 1 / CẬP NHẬT DỮ LIỆU</p><h1>Cập nhật hồ sơ từ API</h1><p className="notice">Hồ sơ tham chiếu từ VCI qua Vnstock. Thời điểm lấy dữ liệu không chứng nhận mọi trường đã cập nhật tới hôm nay. Quan hệ công ty có góp vốn được cập nhật cùng hồ sơ API; tài sản cảng được đối chiếu riêng bằng hồ sơ theo kỳ và website doanh nghiệp.</p><p><Link href="/admin/catalog">Hồ sơ theo kỳ và nguồn bổ sung</Link></p><ReferenceImport/>
 <p>{latest.length} doanh nghiệp có phiên bản trong kết quả này. {runs[0]&&`Lần nhập gần nhất: ${new Date(runs[0].imported_at).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})} · ${runs[0].entry_count} hồ sơ.`}</p>
 <form method="get"><label htmlFor="refresh-ticker">Mã doanh nghiệp</label><input id="refresh-ticker" name="ticker" defaultValue={ticker} maxLength={12}/><button>Tra cứu cập nhật</button></form>
 {latest.map(row=>{const prior=snapshots.find(s=>s.company_id===row.company_id&&s.id!==row.id);const fields=[['name','Tên doanh nghiệp'],['short_name','Tên ngắn'],['sector','Ngành'],['listing_date','Mốc niêm yết do nguồn trả về'],['profile','Giới thiệu']] as const;return <section key={row.id} aria-label={`Tham chiếu ${row.ticker}`}><h2>{row.ticker} · {String(row.reference_data.name??"")}</h2><p>{row.review_status==="pending"?"Chờ đối chiếu":row.review_status==="accepted"?"Đã chấp nhận tham chiếu nội bộ":"Đã từ chối tham chiếu"} · Lấy lúc {new Date(row.fetched_at).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}</p><p>Nguồn: VCI qua Vnstock · <a href="https://www.vnstocks.com/docs/vnstock/tham-chieu-reference" target="_blank" rel="noreferrer">Tài liệu nguồn</a> · <Link href={`/admin/catalog?ticker=${row.ticker}`}>Đối chiếu hồ sơ cảng</Link></p>
 <details><summary>{prior?"Thay đổi so với phiên bản trước":"Dữ liệu lần nhập đầu"}</summary>{fields.map(([key,label])=><div key={key}><h3>{label}</h3>{prior&&prior.reference_data[key]!==row.reference_data[key]&&<p>Trước: {String(prior.reference_data[key]??"Chưa có")}</p>}<p>{String(row.reference_data[key]??"Chưa có")}</p></div>)}<p className="source-hash">SHA-256: {row.raw_sha256}</p></details>{row.review_note&&<p>Kết quả đối chiếu: {row.review_note}</p>}{row.review_status==="pending"&&<ReferenceReview id={row.id}/>}</section>;})}
 {!latest.length&&<p>Chưa có snapshot API trong phạm vi này. Nhập file refresh để bắt đầu.</p>}
 </>;
}
