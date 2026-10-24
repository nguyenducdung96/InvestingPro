import Link from 'next/link';
import {loadNorthOverview} from '@/lib/north-overview';
import {YoyChange} from '@/components/yoy-change';
export const dynamic='force-dynamic';
export const metadata={title:'Tổng quan cảng phía Bắc | InvestingPro'};
const number=(n:number|null|undefined)=>n==null?'—':n.toLocaleString('vi-VN',{maximumFractionDigits:2});
const updated=(s:string|null)=>s?new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(s)):'Chưa có bản lịch ngày chốt';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}){
 const query=await searchParams;
 let data;try{data=await loadNorthOverview(query);}catch{return <><h1>Tổng quan cảng phía Bắc</h1><section className="panel" role="status"><p>Chưa tải được dữ liệu tổng quan. Vui lòng thử lại.</p><Link href="/industries/ports/north">Tải lại tổng quan</Link></section></>;}
 const {selection:s,rows}=data;
 const groupNames={hai_phong:'Hải Phòng · lịch vào/rời tại bến',quang_ninh:'Quảng Ninh · kế hoạch cập/rời cầu'};
 return <>
  <p className="eyebrow">THEO DÕI DOANH NGHIỆP · HẢI PHÒNG & QUẢNG NINH</p>
  <h1>Tổng quan cảng phía Bắc</h1>
  <p>So sánh hoạt động theo lịch công bố của 9 mã trong phạm vi đã đối chiếu. Chọn mã để xem cảng, biểu đồ và lịch từng ngày.</p>
  <nav className="section-tabs" aria-label="Tra cứu ngành cảng"><Link href="/industries/ports/north" aria-current="page">Tổng quan phía Bắc</Link><Link href="/industries/ports/companies?view=all">Danh mục doanh nghiệp</Link><Link href="/industries/ports">Danh mục cảng</Link></nav>
  <form method="get" className="call-filters north-filters" action="/industries/ports/north">
   <div><label htmlFor="north-frequency">Kỳ theo dõi</label><select id="north-frequency" name="frequency" defaultValue={s.frequency}><option value="month">Tháng</option><option value="quarter">Quý</option></select></div>
   <div><label htmlFor="north-period">Thời kỳ</label><select id="north-period" name="period" defaultValue={s.period}>{s.periods.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
   <div><label htmlFor="north-direction">Chiều tàu</label><select id="north-direction" name="direction" defaultValue={s.direction}><option value="departure">Rời bến/cầu</option><option value="arrival">Vào bến/cập cầu</option></select></div>
   <div><label htmlFor="north-sort">Sắp xếp trong nhóm</label><select id="north-sort" name="sort" defaultValue={s.sort}><option value="ticker">Danh sách theo dõi</option><option value="dwt">DWT giảm dần</option><option value="yoy">YoY DWT giảm dần</option></select></div><button>Xem tổng quan</button>
  </form>
  <div className="stats-strip north-stats"><div className="stat"><span>Mã theo dõi</span><strong>{data.scope.tickers}</strong><span>Phạm vi doanh nghiệp đã chốt</span></div><div className="stat"><span>Cảng/bến trong mẫu</span><strong>{data.scope.unique_assets}</strong><span>Đã loại trùng VIP Greenport</span></div><div className="stat"><span>Kỳ đủ DWT</span><strong>{data.ready_rows} / {data.scope.tickers}</strong><span>Đủ ngày và DWT, không còn nhóm mơ hồ</span></div></div>
  <p className="meta">Kỳ {s.period}{s.partial?' · đang tích lũy':''}: {s.from} → {s.through}. Cùng kỳ: {s.priorFrom} → {s.priorThrough}. Ngày chốt dữ liệu: {s.cutoff} · giờ Việt Nam.</p>
  <p className="notice">DWT là trọng tải thiết kế tàu theo lịch, chưa xác nhận thực hiện và không phải lượng hàng. Không cộng các dòng mã thành tổng khu vực: VIP Greenport dùng chung cho VGR/VSC; CQN có điều chuyển nội cảng và được trình bày riêng.</p>
  {data.read_errors.length>0&&<p className="notice" role="status">Chưa tải được một phần dữ liệu. Các mã vẫn được giữ trong danh sách; phần chưa đủ dữ liệu hiển thị dấu —.</p>}
  {(['hai_phong','quang_ninh'] as const).map(group=><section className="panel north-panel" key={group} aria-label={groupNames[group]}>
   <div className="section-heading"><div><p className="eyebrow">{group==='hai_phong'?'8 MÃ · NGUỒN HẢI PHÒNG':'1 MÃ · NGUỒN QUẢNG NINH'}</p><h2>{groupNames[group]}</h2></div></div>
   {group==='quang_ninh'&&<p className="meta">Gồm kế hoạch điều chuyển nội cảng tại bốn cầu CQN. Chưa gồm bến tạm/khu neo; loại CICT. Không xếp hạng cùng chỉ tiêu Hải Phòng.</p>}
   <div className="call-table-wrap"><table className="call-table north-table"><caption>{s.period} · {s.direction==='arrival'?'Vào bến / cập cầu':'Rời bến / rời cầu'} · theo lịch công bố</caption><thead><tr><th scope="col">Mã / phạm vi</th><th scope="col">Lượt</th><th scope="col">DWT</th><th scope="col">YoY DWT</th><th scope="col">Độ phủ kỳ</th><th scope="col">Cập nhật / chất lượng</th></tr></thead><tbody>{rows.filter(r=>r.group===group).map(r=><tr key={r.ticker} data-ticker={r.ticker}>
    <td data-label="Mã / phạm vi"><Link className="north-ticker" href={r.href}>{r.ticker}</Link><small>{r.scope}</small>{r.ticker==='GMD'&&<small>Phạm vi Hải Phòng</small>}{(r.ticker==='VGR'||r.ticker==='VSC')&&<small>VIP Greenport dùng chung</small>}</td>
    <td data-label="Lượt">{number(r.metric?.current.rows)}</td><td data-label="DWT"><strong>{number(r.metric?.current.dwt)}</strong><small>Cùng kỳ: {number(r.metric?.prior.dwt)}</small></td>
    <td data-label="YoY DWT"><YoyChange value={r.metric?.yoy.dwt??null}/></td>
    <td data-label="Độ phủ kỳ"><span>{r.metric?.current.reported_days??0}/{s.expected_days} ngày</span><small>Cùng kỳ: {r.metric?.prior.reported_days??0}/{r.metric?.prior.expected_days??s.prior_expected_days} ngày</small></td>
    <td data-label="Cập nhật / chất lượng"><span className={`badge${r.stale||r.refresh_error?' north-warning':''}`}>{r.refresh_error?'Cập nhật cần kiểm tra':r.stale?'Chậm / thiếu cập nhật':'Đã có lịch ngày chốt'}</span><small>{updated(r.updated_at)}</small>{r.metric?.current.dwt==null&&<small className="error">Kỳ chưa đủ DWT</small>}<details><summary>{r.flags.length?'Độ phủ và lưu ý':'Phạm vi và nguồn'}</summary><p>{r.scope_note}</p>{r.flags.length>0&&<ul>{r.flags.map(flag=><li key={flag}>{flag}</li>)}</ul>}{r.metric&&<><p>Thiếu ngày kỳ theo dõi: {r.metric.current.missing_days.length}; thiếu DWT: {r.metric.current.missing_dwt}; nhóm cần đối chiếu: {r.metric.current.ambiguous_groups}.</p><p>Thiếu ngày cùng kỳ: {r.metric.prior.missing_days.length}; thiếu DWT cùng kỳ: {r.metric.prior.missing_dwt}.</p></>}<Link href={r.href}>Xem chi tiết {r.ticker} và nguồn</Link></details></td>
   </tr>)}</tbody></table></div>
  </section>)}
  <details className="panel"><summary>Phạm vi so sánh và cách đọc</summary><p>Danh sách này là mẫu cảng/bến của 9 mã đã đối chiếu, chưa đại diện toàn bộ cảng phía Bắc hoặc hoạt động toàn quốc của các doanh nghiệp. Không điều chỉnh DWT theo tỷ lệ sở hữu, không cộng các dòng mã và không coi sắp xếp là thị phần.</p><p>YoY chỉ hiện khi đủ dữ liệu hai kỳ cùng khoảng ngày và nền DWT lớn hơn 0. Dấu — là chưa đủ dữ liệu hoặc nền bằng 0; số 0 chỉ xuất hiện khi có bản lịch đủ phạm vi. PHP có bến mới HTIT ảnh hưởng nền so sánh.</p><p>Ngày cập nhật dựa trên bản lịch của ngày chốt; cảnh báo khi thiếu bản lịch hoặc quá 36 giờ. Kỳ cũ có thể vẫn đủ số liệu dù cập nhật ngày chốt bị chậm. Mở từng mã để đối chiếu nguồn và giới hạn phạm vi.</p></details>
 </>;
}
