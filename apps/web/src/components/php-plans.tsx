import Link from 'next/link';
import {publicRepository} from '@/lib/server';
import {tanvuPlanSeries,validPlanDate} from '@invest/port';
const number=(n:number|null)=>n===null?'Chưa đủ dữ liệu':n.toLocaleString('vi-VN',{maximumFractionDigits:2});
const pct=(n:number|null)=>n===null?'—':`${n>0?'+':''}${n.toLocaleString('vi-VN',{maximumFractionDigits:2})}%`;
export async function PhpPlans({query}:{query:Record<string,string>}){
 const direction=query.plan_direction==='arrival'?'arrival':'departure';
 const quarterly=query.plan_period==='quarter';
 const repo=publicRepository();
 let stored;
 try{stored=await repo.tanvuPlans();}catch{return <section id="vessel-plans" className="panel"><h2>Lịch điều động Tân Vũ</h2><p role="status">Chưa kết nối được dữ liệu lịch điều động. Vui lòng thử lại.</p></section>;}
 const series=tanvuPlanSeries(stored.days,direction,new Date(),stored.run);
 const latest=series.months.at(-1);
 const availableYears=[...new Set(series.months.map(m=>m.period.slice(0,4)))].reverse();
 const year=availableYears.includes(query.plan_year)?query.plan_year:query.plan_year==='all'?'all':series.cutoff.slice(0,4);
 const rows=(quarterly?series.quarters:series.months).filter(r=>year==='all'||r.period.startsWith(year));
 const maximum=Math.max(1,...rows.flatMap(r=>[r.current.dwt??0,r.prior.dwt??0]));
 const selectedDay=validPlanDate(query.plan_day??'')?query.plan_day:series.cutoff;
 let detail=null;let detailError=false;
 if(latest)try{detail=await repo.tanvuPlanEvents(selectedDay);}catch{detailError=true;}
 const label=direction==='arrival'?'Tàu vào':'Tàu rời';
 return <section id="vessel-plans" aria-label="Lịch điều động Tân Vũ" className="panel throughput-panel">
  <p className="eyebrow">PHP · TÂN VŨ · LỊCH ĐIỀU ĐỘNG CẢNG VỤ</p><h2>Lượt tàu và trọng tải theo lịch công bố</h2>
  <p>DWT là trọng tải thiết kế tàu, không phải tấn hàng bốc xếp. Lịch điều động chưa xác nhận đã thực hiện; vào/rời được tính riêng, không cộng thành lượt ghé.</p>
  {!latest?<p role="status">Chưa có lịch được thu thập. Không coi ngày chưa có dữ liệu là 0.</p>:<>
   <div className="stats-strip"><div className="stat"><span>{label} · {latest.period} · 01–{series.cutoff.slice(8)} · {latest.status==='partial'?'đang tích lũy':'tháng đã qua'}</span><strong>{number(latest.current.dwt)} DWT</strong><span>{number(latest.current.rows)} lượt theo lịch · {pct(latest.yoy.dwt)} YoY</span></div>
    <div className="stat"><span>Lũy kế {series.cutoff.slice(0,4)} đến {series.cutoff}</span><strong>{number(series.ytd.current.dwt)} DWT</strong><span>{number(series.ytd.current.rows)} lượt · {pct(series.ytd.yoy.dwt)} YoY</span></div></div>
   <p>Cùng phạm vi tháng: {latest.prior.from} → {latest.prior.through}, {number(latest.prior.dwt)} DWT. Kỳ nguồn mới nhất: {series.coverage.last_source_day??'Chưa có'}.</p>
   <p>Lần lấy nguồn gần nhất: {series.coverage.last_attempt?new Date(series.coverage.last_attempt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Chưa có'}. Job gần nhất: {series.run?.status==='success'?'Thành công':series.run?.status==='running'?'Đang chạy':series.run?.status==='failed'?'Có lỗi':'Chưa ghi nhận'}.</p>
   {(series.coverage.stale||series.coverage.errors>0||series.run?.status==='failed')&&<p className="notice" role="status">{series.coverage.stale?'Dữ liệu chưa theo kịp ngày chốt hoặc quá hạn cập nhật. ':''}{series.coverage.errors>0?'Nguồn có lỗi; giữ bản đã lấy thành công và ghi rõ phần thiếu. ':''}{series.run?.status==='failed'?'Lần chạy gần nhất chưa hoàn tất.':''}</p>}
   {latest.current.missing_days.length>0&&<p className="notice">Thiếu {latest.current.missing_days.length} ngày trong tháng. Đã quan sát {number(latest.current.known_rows)} dòng / {number(latest.current.known_dwt)} DWT; chưa dùng làm tổng kỳ đầy đủ.</p>}
   <form method="get" action="/companies/PHP#vessel-plans" className="call-filters"><div><label htmlFor="plan-direction">Chiều tàu</label><select id="plan-direction" name="plan_direction" defaultValue={direction}><option value="departure">Tàu rời</option><option value="arrival">Tàu vào</option></select></div><div><label htmlFor="plan-period">Kỳ</label><select id="plan-period" name="plan_period" defaultValue={quarterly?'quarter':'month'}><option value="month">Tháng</option><option value="quarter">Quý</option></select></div><div><label htmlFor="plan-year">Năm</label><select id="plan-year" name="plan_year" defaultValue={year}><option value="all">Toàn bộ lịch sử</option>{availableYears.map(y=><option key={y} value={y}>{y}</option>)}</select></div><button>Xem lịch</button></form>
   <p>Màu xanh: kỳ theo dõi; thanh nhạt: cùng phạm vi năm trước. Tháng/quý đang tích lũy so đúng khoảng ngày, không so với cả kỳ năm trước.</p>
   <div aria-label={`Biểu đồ DWT ${label.toLowerCase()} theo ${quarterly?'quý':'tháng'}`}>{rows.map(r=><div className="call-chart-row" key={r.period}><span>{r.period}{r.status==='partial'?' · lũy kế':''}</span><div className="call-chart-track" aria-hidden="true"><div style={{width:`${(r.current.dwt??0)/maximum*100}%`}}/><div style={{width:`${(r.prior.dwt??0)/maximum*100}%`,opacity:0.35}}/></div><span>{r.current.dwt===null?'—':number(r.current.dwt)}</span></div>)}</div>
   <div className="call-table-wrap"><table className="call-table"><caption>{label} · theo lịch điều động Cảng vụ · DWT thiết kế · giờ Việt Nam</caption><thead><tr><th>Kỳ</th><th>Lượt</th><th>DWT</th><th>Cùng kỳ DWT</th><th>YoY DWT</th><th>Phạm vi / độ phủ</th></tr></thead><tbody>{rows.map(r=><tr key={r.period}><td data-label="Kỳ">{r.period}{r.status==='partial'&&<small> Đang tích lũy</small>}</td><td data-label="Lượt">{number(r.current.rows)}</td><td data-label="DWT">{number(r.current.dwt)}</td><td data-label="Cùng kỳ DWT">{number(r.prior.dwt)}</td><td data-label="YoY DWT">{pct(r.yoy.dwt)}</td><td data-label="Phạm vi / độ phủ"><details><summary>{r.current.from} → {r.current.through} · {r.current.reported_days}/{r.current.expected_days} ngày</summary><p>Cùng kỳ: {r.prior.from} → {r.prior.through} · {r.prior.reported_days}/{r.prior.expected_days} ngày.</p>{r.current.missing_days.length>0&&<p>Ngày thiếu: {r.current.missing_days.join(', ')}.</p>}{r.current.missing_dwt>0&&<p>{r.current.missing_dwt} dòng thiếu DWT; không thay bằng GT.</p>}{r.current.ambiguous_groups>0&&<p>{r.current.ambiguous_groups} nhóm cùng tàu/tuyến khác giờ cần đối chiếu.</p>}{r.current.error_days.length>0&&<p>Còn lỗi nguồn: {r.current.error_days.join(', ')}.</p>}</details></td></tr>)}</tbody></table></div>
   <div id="plan-days"><h3>Đối chiếu lịch từng ngày</h3><form method="get" action="/companies/PHP#plan-days" className="call-filters"><input type="hidden" name="plan_direction" value={direction}/><input type="hidden" name="plan_period" value={quarterly?'quarter':'month'}/><input type="hidden" name="plan_year" value={year}/><div><label htmlFor="plan-day">Ngày lịch nguồn</label><input id="plan-day" name="plan_day" type="date" min={series.coverage.first_day??undefined} max={series.cutoff} defaultValue={selectedDay}/></div><button>Tra cứu ngày</button></form>
    {detail?<><p>{detail.report_day} · <a href={detail.source_url} target="_blank" rel="noreferrer">Lịch Cảng vụ tại lúc thu thập</a>. URL dùng độ lệch ngày; ngày mở lại có thể khác. Bản đối chiếu: {new Date(detail.fetched_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}.</p><details><summary>Thông tin nguồn</summary><code className="throughput-hash">{detail.source_sha256}</code><p>{detail.parser_version}</p></details><div className="call-table-wrap"><table className="call-table"><caption>{label} ngày {detail.report_day} · kế hoạch công bố</caption><thead><tr><th>Giờ dự kiến</th><th>Tàu</th><th>DWT</th><th>Từ</th><th>Đến</th></tr></thead><tbody>{detail.events.filter(e=>e.direction===direction).map((e,i)=><tr key={i}><td data-label="Giờ dự kiến">{e.planned_time}</td><td data-label="Tàu">{e.vessel_name}</td><td data-label="DWT">{number(e.dwt)}</td><td data-label="Từ">{e.from_berth}</td><td data-label="Đến">{e.to_berth}</td></tr>)}</tbody></table></div>{!detail.events.some(e=>e.direction===direction)&&<p>Không có dòng {label.toLowerCase()} Tân Vũ trong lịch nguồn đã lấy; không xác nhận số tàu thực tế bằng 0.</p>}</>:<p role="status">{detailError?'Chưa tải được chi tiết ngày.':'Chưa có bản lịch ngày này.'}</p>}
   </div>
  </>}
  <Link href="/api/v1/companies/PHP/plans">Xem dữ liệu API và độ phủ</Link>
 </section>;
}
