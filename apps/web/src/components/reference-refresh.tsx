"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ReferenceImport() {
 const [file,setFile]=useState<File|null>(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const router=useRouter();
 async function submit(){if(!file)return;setBusy(true);setMessage("");try{
  if(file.size>2000000)throw new Error();
  const response=await fetch("/api/v1/admin/reference-refresh",{method:"POST",headers:{"Content-Type":"application/json"},body:await file.text()});
  if(!response.ok)throw new Error();const result=await response.json();setMessage(`Đã nhận ${result.received} hồ sơ, thêm ${result.inserted} phiên bản mới. Dữ kiện vẫn chờ đối chiếu.`);router.refresh();
 }catch{setMessage("Chưa nhập được. Kiểm tra file bundle, phiên đăng nhập và kết nối; dữ liệu trước được giữ nguyên.");}finally{setBusy(false);}}
 return <section aria-label="Nhập kết quả refresh"><h2>Cập nhật từ API</h2><p>Chạy pnpm data:refresh, rồi chọn file .local/company-refresh/staging-bundle.json. Hệ thống kiểm tra hash, mã doanh nghiệp và giữ lịch sử; không tự công bố.</p><label htmlFor="reference-bundle">File kết quả refresh JSON (tối đa 2 MB)</label><input id="reference-bundle" type="file" accept="application/json,.json" disabled={busy} onChange={e=>setFile(e.target.files?.[0]??null)}/><button type="button" disabled={!file||busy} onClick={submit}>{busy?"Đang nhập…":"Nhập và đối chiếu thay đổi"}</button><p role="status">{message}</p></section>;
}
export function ReferenceReview({id}:{id:string}) {
 const [note,setNote]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const router=useRouter();
 async function review(decision:string){setBusy(true);try{const response=await fetch("/api/v1/admin/reference-refresh",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"review",id,decision,note})});if(!response.ok)throw new Error();router.refresh();}catch{setMessage("Chưa lưu được quyết định. Kiểm tra phiên quản trị và tải lại trạng thái.");}finally{setBusy(false);}}
 return <details><summary>Đối chiếu hồ sơ tham chiếu</summary><p>Chấp nhận để tham khảo nội bộ; không xác minh quyền sở hữu cảng hoặc quyền công bố nguồn.</p><label htmlFor={`ref-note-${id}`}>Kết quả đối chiếu (20–4.000 ký tự)</label><textarea id={`ref-note-${id}`} value={note} maxLength={4000} onChange={e=>setNote(e.target.value)}/><button disabled={busy||note.trim().length<20} onClick={()=>review("accepted")}>Chấp nhận tham chiếu</button>{" "}<button disabled={busy||note.trim().length<20} onClick={()=>review("rejected")}>Từ chối tham chiếu</button><p role="status">{busy?"Đang lưu…":message}</p></details>;
}
