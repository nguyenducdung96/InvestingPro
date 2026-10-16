"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ReportedReview({id}:{id:string}) {
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const router=useRouter();
  async function review(decision:"verified"|"rejected") {
    setBusy(true);setMessage("");
    try {
      const response=await fetch(`/api/v1/admin/reported-assets/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision,note})});
      if(!response.ok) {setMessage("Chưa duyệt được. Kiểm tra quyền nguồn, bằng chứng đã xác minh, định danh doanh nghiệp/tài sản và phiên đăng nhập.");return;}
      router.refresh();
    } catch {setMessage("Không kết nối được. Tải lại hồ sơ để kiểm tra trước khi thử lại.");}
    finally {setBusy(false);}
  }
  return <div><label htmlFor={`reported-note-${id}`}>Phạm vi dữ kiện đã đối chiếu và lý do quyết định (20–4.000 ký tự)</label><textarea id={`reported-note-${id}`} value={note} maxLength={4000} onChange={e=>setNote(e.target.value)}/>
    <button type="button" disabled={busy||note.trim().length<20} onClick={()=>review("verified")}>Xác minh quan sát theo kỳ</button>{" "}
    <button type="button" disabled={busy||note.trim().length<20} onClick={()=>review("rejected")}>Từ chối quan sát</button>
    <p role="status">{busy?"Đang kiểm tra quyết định…":message}</p>
  </div>;
}
