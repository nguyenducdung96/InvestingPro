import type {PortCall} from '@invest/domain';
export function BerthMovements({rows,total}:{rows:PortCall[];total:number}){
 const time=(s:string|null)=>s?new Date(s).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Chưa rõ';
 return <section className="panel" id="berth-movements"><h2>Cập và rời cầu theo dữ liệu cảng</h2>
  <p>{total} sự kiện phù hợp. ATB là giờ cập cầu, ATD là giờ rời cầu; không cộng vào lượt vào/rời vùng nước cảng hoặc biểu đồ phía trên. Nguồn hiện chỉ gồm chuyến container đã rời bến do Cảng Đà Nẵng công bố, chưa bao gồm toàn bộ tàu hay mọi bến. Nguồn không cung cấp DWT.</p>
  <div className="call-table-wrap" tabIndex={0} role="region" aria-label="Bảng cập và rời cầu cuộn ngang"><table className="call-table"><caption>Hoạt động cầu bến thực tế · UTC+7</caption><thead><tr><th scope="col">Thời gian</th><th scope="col">Tên tàu</th><th scope="col">Hoạt động</th><th scope="col">DWT</th><th scope="col">Nguồn</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td data-label="Thời gian">{time(r.occurred_at)}</td><td data-label="Tên tàu">{r.vessel_name}</td><td data-label="Hoạt động">{r.direction==='arrival'?'Cập cầu (ATB)':'Rời cầu (ATD)'}</td><td data-label="DWT">{r.dwt===null?'Chưa có':Number(r.dwt).toLocaleString('vi-VN')}</td><td data-label="Nguồn"><a href={r.source_url} target="_blank" rel="noreferrer">Cảng Đà Nẵng</a></td></tr>)}</tbody></table></div>
  {!total&&<p className="empty">Chưa có hoạt động cầu bến phù hợp; không đồng nghĩa không có tàu.</p>}
 </section>;
}
