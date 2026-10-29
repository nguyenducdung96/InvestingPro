import {pairedYtd,pairedMonthLabel} from '@/lib/paired-ytd';
import {dungquatActivitySeries,dungquatEvents,dungquatHistory,validPlanDate} from '@invest/port';
import {cdnPeriodDisplay,observedGrowth} from '@/lib/cdn-comparison';
import {PlanColumnChart,type PlanColumn} from './plan-column-chart';
import {YoyChange} from './yoy-change';

const number=(n:number|null)=>n===null?'—':n.toLocaleString('vi-VN',{maximumFractionDigits:2});

export function DungquatActivity({query}:{query:Record<string,string>}){
 const now=new Date(),direction=query.plan_direction==='departure'?'departure':'arrival',quarter=query.plan_period==='quarter',byRows=query.plan_metric!=='observed_dwt';
 const series=dungquatActivitySeries(dungquatHistory.events,direction,now),journal=dungquatEvents(dungquatHistory.events,now);
 const years=[...new Set(series.months.map(p=>p.period.slice(0,4)))].reverse();
 const year=years.includes(query.plan_year)?query.plan_year:series.cutoff.slice(0,4);
 const periods=quarter?series.quarters:series.months,selected=periods.filter(p=>p.period.startsWith(year));
 const ytd=pairedYtd(series,year,byRows?'rows':'observed_dwt');
 type Range=typeof ytd.current;
 const value=(r:Range)=>byRows?(r.observed_days?r.known_rows:null):r.observed_dwt;
 const history:PlanColumn[]=periods.map(p=>({key:p.period,label:p.period,current:value(p.current),partial:p.status==='partial'}));
 const calendar:PlanColumn[]=Array.from({length:quarter?4:12},(_,i)=>{
  const suffix=quarter?`Q${i+1}`:String(i+1).padStart(2,'0'),p=periods.find(p=>p.period===`${year}-${suffix}`),prior=periods.find(p=>p.period===`${Number(year)-1}-${suffix}`);
  return {key:`${year}-${suffix}`,label:`${quarter?'Q':'T'}${i+1}`,current:p?value(p.current):null,prior:p?value(p.prior):prior?value(prior.current):null,partial:p?.status==='partial',yoy:p?observedGrowth(value(p.current),value(p.prior)):null};
 });
 const params=(extra:Record<string,string>={})=>new URLSearchParams({central_asset:'gemadept_dung_quat',plan_direction:direction,plan_period:quarter?'quarter':'month',plan_year:year,plan_metric:byRows?'rows':'observed_dwt',...extra});
 const inYear=journal.filter(e=>e.kind===direction&&e.day.startsWith(year));
 const day=validPlanDate(query.plan_day??'')&&query.plan_day<=series.cutoff?query.plan_day:inYear.at(-1)?.day??series.cutoff;
 const detail=journal.filter(e=>e.kind===direction&&e.day===day),label=direction==='arrival'?'Đến theo công bố':'Rời theo công bố',unit=byRows?'lượt':'DWT';
 const daily:PlanColumn[]=Array.from({length:90},(_,i)=>{
  const day=new Date(Date.parse(series.cutoff)-(89-i)*86400000).toISOString().slice(0,10),row=series.days.find(d=>d.day===day);
  return {key:day,label:day.slice(8)+'/'+day.slice(5,7),current:row?(byRows?row.rows:row.dwt):null,href:`?${params({plan_day:day})}#dq-days`};
 });
 const sourceErrors:readonly {article_id:number;error:string}[]=dungquatHistory.quality.source_errors;
 return <section className="panel vessel-plans" id="dungquat-activity" aria-label="Hoạt động tàu Gemadept Dung Quất">
  <p className="eyebrow">GMD · DUNG QUẤT · DỮ LIỆU CÔNG BỐ CHỌN LỌC</p>
  <h2>Lượt tàu và trọng tải theo công bố doanh nghiệp</h2>
  <p>Các sự kiện có ngày cập cảng được doanh nghiệp nêu rõ. Đây là dữ liệu chọn lọc từ bài công bố, chưa có chuỗi báo cáo định kỳ. DWT là trọng tải tàu; giữ riêng với tấn hàng bốc xếp.</p>
  <form method="get" action="/companies/GMD#dungquat-activity" className="call-filters">
   <input type="hidden" name="central_asset" value="gemadept_dung_quat"/>
   <div><label htmlFor="dq-metric">Chỉ tiêu biểu đồ</label><select id="dq-metric" name="plan_metric" defaultValue={byRows?'rows':'observed_dwt'}><option value="rows">Lượt đã công bố</option><option value="observed_dwt">DWT đã ghi nhận</option></select></div>
   <div><label htmlFor="dq-direction">Chiều tàu</label><select id="dq-direction" name="plan_direction" defaultValue={direction}><option value="arrival">Đến theo công bố</option><option value="departure">Rời theo công bố</option></select></div>
   <div><label htmlFor="dq-period">Kỳ</label><select id="dq-period" name="plan_period" defaultValue={quarter?'quarter':'month'}><option value="month">Tháng</option><option value="quarter">Quý</option></select></div>
   <div><label htmlFor="dq-year">Năm</label><select id="dq-year" name="plan_year" defaultValue={year}>{years.map(y=><option key={y}>{y}</option>)}</select></div><button>Xem dữ liệu</button>
  </form>
  <p className="meta">Ngày chốt: {series.cutoff} · giờ Việt Nam. Tháng hiện tại đang cập nhật; số đã ghi nhận tính đến ngày chốt. Các kỳ chưa có quan sát để trống.</p>
  <div className="stats-strip"><div className="stat"><span>{label} · {selected.at(-1)?.period??year}</span><strong>{number(selected.length?value(selected.at(-1)!.current):null)} {unit}</strong></div><div className="stat"><span>Lũy kế cùng kỳ {year} ({pairedMonthLabel(series,year,byRows?'rows':'observed_dwt')})</span><strong>{number(value(ytd.current))} {unit}</strong></div><div className="stat"><span>YoY số đã ghi nhận · lũy kế</span><strong><YoyChange value={observedGrowth(value(ytd.current),value(ytd.prior))}/></strong></div></div>
  <details><summary>Chi tiết dữ liệu và nguồn Dung Quất</summary>
   <p>{journal.length} sự kiện đã đối chiếu, {journal.filter(e=>e.dwt===null).length} sự kiện thiếu DWT. {dungquatHistory.quality.reviewed_articles} bài công bố được trích xuất. Ngày đăng bài tách với ngày sự kiện; không tạo giờ 00:00 khi nguồn chỉ nêu ngày.</p>
   <p>Ngày không có bản công bố không có nghĩa là không có tàu. Chưa có báo cáo ngày đầy đủ, chưa đủ căn cứ đánh giá xu hướng toàn cảng hoặc tăng trưởng toàn bộ hoạt động. Không cộng quan sát vị trí, đại lý tàu, kế hoạch chưa thực hiện, Nam Đình Vũ hay Gemalink vào chuỗi này.</p>
   <p>Kiểm tra nguồn thành công gần nhất: {dungquatHistory.quality.last_success?new Date(dungquatHistory.quality.last_success).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'chưa có'}. {sourceErrors.length} lỗi nguồn; sự kiện đã có bằng chứng giữ nguyên khi nguồn lỗi.</p>
   {sourceErrors.length>0&&<ul>{sourceErrors.map(e=><li key={e.article_id}>Bài {e.article_id}: {e.error}</li>)}</ul>}
   <ul>{dungquatHistory.quality.excluded_disclosures.map(e=><li key={e.article_id}>{e.vessel}: {e.reason}</li>)}</ul>
   <p>Quét Smartport ngày 25/10/2026: danh sách công khai trong tab lịch tàu không có Dung Quất. Bảng kế hoạch tàu vào của Cảng vụ có bốn dòng thuộc phạm vi khác, không dùng làm lịch sử Gemadept.</p>
   <a href="https://dqp.gemadept.com.vn/tin-tuc/" target="_blank" rel="noreferrer">Nguồn công bố doanh nghiệp ↗</a>
  </details>
  <section id="dq-history"><PlanColumnChart title="Lịch sử số đã ghi nhận" columns={history} currentLabel={label} unit={unit}/></section>
  <section id="dq-yoy"><PlanColumnChart title="So sánh cùng kỳ năm trước" columns={calendar} currentLabel={year} priorLabel={String(Number(year)-1)} unit={unit}/>
   <div className="call-table-wrap"><table className="call-table"><caption>Dung Quất · {label} · {year} · công bố chọn lọc</caption><thead><tr><th scope="col">Kỳ</th><th scope="col">Lượt</th><th scope="col">DWT đã ghi nhận</th><th scope="col">Cùng kỳ DWT</th><th scope="col">YoY DWT</th></tr></thead><tbody>{selected.map(p=>{const d=cdnPeriodDisplay(p);return <tr key={p.period}><td data-label="Kỳ">{p.period}{p.status==='partial'&&<small>Đang cập nhật · đến {p.current.through}</small>}</td><td data-label="Lượt">{number(d.rows)}</td><td data-label="DWT đã ghi nhận">{number(d.dwt)}</td><td data-label="Cùng kỳ DWT">{number(d.priorDwt)}</td><td data-label="YoY DWT"><YoyChange value={d.yoyDwt}/></td></tr>;})}</tbody><tfoot><tr className="comparison-ytd"><th scope="row">Lũy kế cùng kỳ {year} ({pairedMonthLabel(series,year,byRows?'rows':'observed_dwt')})</th><td data-label="Lượt">{number(ytd.current.observed_days?ytd.current.known_rows:null)}</td><td data-label="DWT đã ghi nhận">{number(ytd.current.observed_dwt)}</td><td data-label="Cùng kỳ DWT">{number(ytd.prior.observed_dwt)}</td><td data-label="YoY DWT"><YoyChange value={observedGrowth(ytd.current.observed_dwt,ytd.prior.observed_dwt)}/></td></tr></tfoot></table></div>
  </section>
  <section id="dq-days"><PlanColumnChart title="Hoạt động tàu 90 ngày gần nhất" columns={daily} currentLabel={label} unit={unit} daily/>
   <h3>Nhật ký {label.toLowerCase()} · {day}</h3>
   <form method="get" action="/companies/GMD#dq-days" className="call-filters">{Array.from(params()).map(([name,value])=><input type="hidden" key={name} name={name} value={value}/>)}<div><label htmlFor="dq-day">Ngày hoạt động</label><input id="dq-day" name="plan_day" type="date" min="2022-01-01" max={series.cutoff} defaultValue={day}/></div><button>Xem ngày</button></form>
   {!detail.length?<p>Chưa có sự kiện đã công bố cho ngày này; không coi là ngày không có tàu.</p>:<div className="call-table-wrap"><table className="call-table"><caption>Sự kiện doanh nghiệp đã công bố</caption><thead><tr><th scope="col">Tàu</th><th scope="col">Ngày theo nguồn</th><th scope="col">DWT</th><th scope="col">Nguồn</th></tr></thead><tbody>{detail.map(e=><tr key={e.key}><td data-label="Tàu">{e.vessel}</td><td data-label="Ngày theo nguồn">{e.day}<small>Chỉ có ngày</small></td><td data-label="DWT">{number(e.dwt)}</td><td data-label="Nguồn"><a href={e.source.url} target="_blank" rel="noreferrer">Bài công bố ↗</a><details><summary>Bằng chứng sự kiện</summary>{e.sources.map(s=><div key={s.sha256}><p>Đăng {s.published_at.slice(0,10)} · {s.field==='excerpt'?'phần dẫn':'nội dung bài'}. {s.note}</p><p style={{overflowWrap:'anywhere'}}>SHA-256: {s.sha256}</p><a href={s.api_url} target="_blank" rel="noreferrer">Bản dữ liệu nguồn ↗</a></div>)}</details></td></tr>)}</tbody></table></div>}
   {inYear.length>0&&<p>Các ngày có sự kiện trong năm: {inYear.map(e=><span key={e.key}><a href={`?${params({plan_day:e.day})}#dq-days`}>{e.day}</a>{' · '}</span>)}</p>}
  </section>
 </section>;
}
