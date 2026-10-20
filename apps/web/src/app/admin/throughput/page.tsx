import {adminRepository,HttpError} from '@/lib/server';
import {AdminSession} from '@/components/admin-session';
import {Unavailable} from '@/components/catalog';
import {ThroughputReview} from '@/components/throughput-review';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default async function Page() {
 let rows;try{rows=await(await adminRepository()).throughputQueue();}catch(e){return <><h1>Duyệt sản lượng Tân Vũ</h1>{e instanceof HttpError&&[401,403].includes(e.status)?<AdminSession/>:<Unavailable/>}</>;}
 return <><h1>Duyệt sản lượng Tân Vũ</h1><p>Đối chiếu PDF gốc, kỳ khai thác, hàng Tân Vũ và đơn vị. Chỉ duyệt sau khi quyền nguồn và bằng chứng hiện hành đã được xác minh.</p><p><Link href="/admin/publication">Duyệt nguồn và bằng chứng</Link> · <Link href="/companies/PHP">Xem PHP</Link></p>{!rows.length&&<p>Chưa có số liệu chờ duyệt.</p>}{rows.map(r=><article className="panel" key={r.id}><h2>{r.period.slice(0,7)}</h2><p>{r.cargo_tonnes?.toLocaleString('vi-VN')??'Chưa có'} tấn hàng · {r.container_teu?.toLocaleString('vi-VN')??'Chưa có'} TEU</p><p>{r.extraction_note}</p><p>Bằng chứng: <code>{r.source_record_id}</code></p>{r.evidence&&<p><a href={r.evidence.source_url} target="_blank" rel="noreferrer">Mở PDF chính thức</a> · SHA-256: <code className="throughput-hash">{r.evidence.content_hash}</code></p>}<ThroughputReview id={r.id}/></article>)}</>;
}
