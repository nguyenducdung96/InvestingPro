import Link from 'next/link';
import {publicRepository} from '@/lib/server';
import {throughputSeries} from '@invest/port';
const number=(n:number|null)=>n===null?'Chưa đủ dữ liệu':n.toLocaleString('vi-VN');
const change=(n:number|null)=>n===null?'—':`${n>0?'+':''}${n.toLocaleString('vi-VN',{maximumFractionDigits:1})}%`;
export async function PhpThroughput({query}:{query:Record<string,string>}) {
 let series;
 try {series=throughputSeries(await publicRepository().monthlyThroughput());}
 catch {return <section className="panel" aria-label="Sản lượng Tân Vũ"><h2>Sản lượng Tân Vũ</h2><p role="status">Chưa kết nối được dữ liệu sản lượng. Vui lòng thử lại.</p></section>;}
 const metric=query.metric==='container_teu'?'container_teu':'cargo_tonnes';
 const unit=metric==='cargo_tonnes'?'tấn hàng':'TEU';
 const quarterly=query.period==='quarter';
 const rows=quarterly?series.quarters:series.months;
 const max=Math.max(1,...rows.map(r=>r[metric]??0));
 const latest=series.months.at(-1);
 const checked=series.months.flatMap(m=>m.sources.map(s=>s.source_checked_at)).sort().at(-1);
 const errors=series.months.some(m=>m.sources.some(s=>s.source_error));
 const stale=latest?Date.now()-Date.parse(`${latest.period}-01T00:00:00Z`)>75*86400000:false;
 return <section id="throughput" aria-label="Sản lượng Tân Vũ" className="panel throughput-panel">
  <p className="eyebrow">PHP · TÂN VŨ · SẢN LƯỢNG CÔNG BỐ</p><h2>Theo dõi hoạt động cảng</h2>
  <p>Phạm vi hiện có: Tân Vũ. Chùa Vẽ, Hoàng Diệu và HTIT chưa có chuỗi được duyệt. Chỉ tiêu tấn hàng/TEU độc lập với trọng tải DWT và lượt tàu.</p>
  {!latest?<p role="status">Chưa có kỳ số liệu được duyệt công bố. Số đang chờ kiểm tra không được xem là 0.</p>:<>
   <div className="stats-strip"><div className="stat"><span>Kỳ mới nhất đã duyệt</span><strong>{latest.period}</strong></div><div className="stat"><span>Tấn hàng</span><strong>{number(latest.cargo_tonnes)}</strong></div><div className="stat"><span>Container (TEU)</span><strong>{number(latest.container_teu)}</strong></div></div>
   <p>Lần thử kiểm tra nguồn gần nhất: {checked?new Date(checked).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Chưa xác định'} · Kỳ số liệu: {latest.period}. Có {series.coverage.reviewed_months} tháng được duyệt.</p>
   {!!series.coverage.missing_months.length&&<p className="notice">Thiếu kỳ trong khoảng dữ liệu: {series.coverage.missing_months.join(', ')}. Không nội suy tháng thiếu.</p>}
   {(errors||stale)&&<p className="notice" role="status">{errors?'Nguồn có lỗi tải; đang giữ dữ liệu đã duyệt trước đó. ':''}{stale?'Kỳ số liệu đã cũ; cần kiểm tra bản tin mới.':''}</p>}
   <form method="get" className="call-filters"><div><label htmlFor="throughput-metric">Chỉ tiêu</label><select name="metric" id="throughput-metric" defaultValue={metric}><option value="cargo_tonnes">Tấn hàng</option><option value="container_teu">TEU</option></select></div><div><label htmlFor="throughput-period">Kỳ</label><select name="period" id="throughput-period" defaultValue={quarterly?'quarter':'month'}><option value="month">Tháng</option><option value="quarter">Quý</option></select></div><button>Xem số liệu</button></form>
   <div aria-label={`Biểu đồ sản lượng theo ${quarterly?'quý':'tháng'}, ${unit}`}>{rows.map(r=><div className="call-chart-row" key={r.period}><span>{r.period}</span><div className="call-chart-track" aria-hidden="true"><div style={{width:`${(r[metric]??0)/max*100}%`}}/></div><span>{r[metric]===null?'—':number(r[metric])}</span></div>)}</div>
   <div className="call-table-wrap"><table className="call-table"><caption>Sản lượng {unit}; quý thiếu tháng/chỉ tiêu giữ trống. YoY so cùng kỳ năm trước.</caption><thead><tr><th>Kỳ</th><th>{unit}</th><th>YoY</th><th>Nguồn</th></tr></thead><tbody>{rows.map(r=><tr key={r.period}><td data-label="Kỳ">{r.period}</td><td data-label={unit}>{number(r[metric])}</td><td data-label="YoY">{'yoy_pct' in r?change(r.yoy_pct[metric]):'—'}</td><td data-label="Nguồn">{'sources' in r?r.sources.map(s=><details key={s.id}><summary>Bản tin · trang {s.pdf_page}</summary><a href={s.source_url} target="_blank" rel="noreferrer">Mở PDF chính thức</a><p>Phát hành {s.publication_month.slice(0,7)}</p><code className="throughput-hash">{s.source_sha256}</code></details>):'Cộng các tháng đã duyệt'}</td></tr>)}</tbody></table></div>
   <p>Lũy kế cùng kỳ: {series.ytd[metric]?`${number(series.ytd[metric]!.current)} ${unit} · đến tháng ${series.ytd[metric]!.through_month} · ${change(series.ytd[metric]!.yoy_pct)}`:'Chưa đủ dữ liệu liên tục từ tháng 1 ở cả hai năm.'}</p>
  </>}
  {!!series.conflicts.length&&<p role="status">Các kỳ có số mâu thuẫn đang chờ đối chiếu: {series.conflicts.join(', ')}.</p>}
  <Link href="/api/v1/companies/PHP/throughput">Xem dữ liệu API và nguồn</Link>
 </section>;
}
