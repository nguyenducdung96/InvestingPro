import {adminRepository,HttpError} from '@/lib/server';
import {AdminSession} from '@/components/admin-session';
import {CallImport} from '@/components/call-import';
import {Unavailable} from '@/components/catalog';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default async function Page(){let rows;try{rows=await(await adminRepository()).quarantinedCalls();}catch(e){return <><h1>Cập nhật lượt tàu</h1>{e instanceof HttpError&&[401,403].includes(e.status)?<AdminSession/>:<Unavailable/>}</>;}
 return <><h1>Cập nhật lượt tàu</h1><p><Link href="/industries/ports/calls">Mở nhật ký công khai</Link></p><CallImport/><section className="panel"><h2>Dòng cần xử lý</h2><p>Giữ nguyên dữ liệu nguồn; sửa ở connector rồi nhập phiên bản mới có căn cứ. Không sửa trực tiếp dòng đã lưu.</p>{!rows.length&&<p>Chưa có dòng cần xử lý.</p>}{rows.map(r=><article key={r.id}><h3>{r.vessel_name} · {r.reported_day}</h3><p>{r.raw_time||'Thiếu thời gian'} · {r.quarantine_reason}</p><a href={`/api/v1/admin/port-calls?artifact=${r.artifact_id}`}>Tải bản gốc đối chiếu</a></article>)}</section></>;
}
