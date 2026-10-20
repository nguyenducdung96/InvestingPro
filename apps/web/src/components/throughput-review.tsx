'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export function ThroughputReview({id}:{id:string}) {
 const [note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const router=useRouter();
 async function review(decision:string) {
  setBusy(true);setError('');
  try {const r=await fetch('/api/v1/admin/throughput',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,decision,note})});if(!r.ok){const b=await r.json();throw new Error(b.error);}router.refresh();}
  catch(e){setError(e instanceof Error?e.message:'Không gửi được yêu cầu.');}finally{setBusy(false);}
 }
 return <div><label htmlFor={`note-${id}`}>Ghi chú đối chiếu (ít nhất 20 ký tự)</label><textarea id={`note-${id}`} value={note} onChange={e=>setNote(e.target.value)} maxLength={4000}/><div className="actions"><button disabled={busy||note.trim().length<20} onClick={()=>review('verified')}>Duyệt số liệu</button><button disabled={busy||note.trim().length<20} onClick={()=>review('rejected')}>Từ chối</button></div><p role="status">{error}</p></div>;
}
