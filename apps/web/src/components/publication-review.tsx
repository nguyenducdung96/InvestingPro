"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicationItem } from "@invest/domain";
import { requestError } from "@/lib/display";

export function PublicationReview({item}:{item:PublicationItem}) {
  const router=useRouter();
  const [note,setNote]=useState("");
  const [basis,setBasis]=useState("");
  const [scope,setScope]=useState("");
  const [termsUrl,setTermsUrl]=useState("");
  const [hash,setHash]=useState("");
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const prefix=`publication-${item.id}`;
  const source=item.kind==="sources";
  const evidence=item.kind==="evidence";
  const label=source?"Duyệt quyền nguồn":evidence?"Xác minh bằng chứng":"Xác minh doanh nghiệp / thực thể";
  async function decide(decision:"approved"|"rejected") {
    if(note.trim().length<20) {setMessage("Vui lòng ghi lý do cụ thể, ít nhất 20 ký tự.");return;}
    setBusy(true);setMessage("");
    try {
      const response=await fetch(`/api/v1/admin/publication/${item.kind}/${item.id}`,{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({decision,note,basis,scope,termsUrl,hash,confirm}),
      });
      if(!response.ok) {
        const result=await response.json().catch(()=>({}));
        setMessage(response.status===400 && typeof result.error==="string" ? result.error :
          response.status===409 ? "Hồ sơ đã thay đổi hoặc chưa đủ điều kiện duyệt. Tải lại trang và kiểm tra nguồn, bằng chứng trước." : requestError(response.status,true));
      } else {setMessage("Đã lưu quyết định và lịch sử người duyệt.");router.refresh();}
    } catch {setMessage("Không kết nối được. Các thông tin bạn nhập vẫn được giữ lại.");}
    finally {setBusy(false);}
  }
  return <section className="publication-form" aria-label={`Quyết định cho ${item.name}`}>
    {source && <>
      <label htmlFor={`${prefix}-basis`}>Căn cứ được phép sử dụng dữ liệu</label>
      <textarea id={`${prefix}-basis`} value={basis} onChange={e=>setBasis(e.target.value)} maxLength={4000} placeholder="Giấy phép, văn bản cho phép hoặc căn cứ áp dụng cụ thể; công khai trên mạng chưa đủ để kết luận." />
      <label htmlFor={`${prefix}-scope`}>Phạm vi được phép sử dụng</label>
      <textarea id={`${prefix}-scope`} value={scope} onChange={e=>setScope(e.target.value)} maxLength={4000} placeholder="Nêu tài liệu, trường dữ liệu, giới hạn, điều kiện ghi nguồn và quyền lưu bản bằng chứng." />
      <label htmlFor={`${prefix}-terms`}>Liên kết điều khoản / văn bản cho phép (nếu có)</label>
      <input id={`${prefix}-terms`} type="url" value={termsUrl} onChange={e=>setTermsUrl(e.target.value)} placeholder="https://…" maxLength={4000} />
    </>}
    {evidence && <>
      <p>Đọc tài liệu gốc và kiểm tra bản lưu riêng tư trong R2. Ghi rõ trang/mục đã kiểm tra, dữ kiện được xác minh và giới hạn trong lý do bên dưới.</p>
      <label htmlFor={`${prefix}-hash`}>SHA-256 thực tế sau khi tải lại từ R2</label>
      <input id={`${prefix}-hash`} value={hash} onChange={e=>setHash(e.target.value.trim().toLowerCase())} maxLength={64} autoComplete="off" spellCheck={false} />
    </>}
    <label htmlFor={`${prefix}-note`}>Bằng chứng và lý do quyết định (20–4.000 ký tự)</label>
    <textarea id={`${prefix}-note`} value={note} onChange={e=>setNote(e.target.value)} maxLength={4000} aria-describedby={`${prefix}-status`} />
    <label className="checkline"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)} />
      <span>{source?"Tôi đã kiểm tra điều khoản, quy định truy cập và quyền lưu/sử dụng trong đúng phạm vi ghi trên.":evidence?"Tôi đã đọc đúng tài liệu, đối chiếu bản lưu R2 và xác nhận phạm vi dữ kiện đã kiểm tra.":"Tôi đã đối chiếu định danh trong bằng chứng, phân biệt pháp nhân và tài sản trùng tên."}</span>
    </label>
    {item.blockers.length>0 && <div className="notice"><ul>{item.blockers.map(x=><li key={x}>{x}</li>)}</ul></div>}
    <div className="actions">
      <button disabled={busy || !confirm || item.blockers.length>0} onClick={()=>decide("approved")}>{busy?"Đang lưu…":label}</button>
      <button disabled={busy} onClick={()=>decide("rejected")}>Từ chối hồ sơ</button>
    </div>
    <p id={`${prefix}-status`} role="status" className="error">{message}</p>
  </section>;
}
