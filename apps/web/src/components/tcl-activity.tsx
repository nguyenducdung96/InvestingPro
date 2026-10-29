import Link from 'next/link';
import {isTclScope,tclActivity,tclScopes,tclBerthSeries,validPlanDate} from '@invest/port';
import {tclBerthData} from '@/lib/tcl-data';
import {pairedYtd,pairedMonthLabel} from '@/lib/paired-ytd';
import {observedGrowth} from '@/lib/cdn-comparison';
import {PlanColumnChart} from './plan-column-chart';
import {YoyChange} from './yoy-change';

export function TclActivity({query}:{query:Record<string,string>}){
 const asset=isTclScope(query.plan_asset??'')?query.plan_asset as keyof typeof tclScopes:'tcl';
 const data=tclActivity(asset),reference=data.reference_figures[0];
 const direction=query.plan_direction==='arrival'?'arrival':'departure',label=direction==='arrival'?'Cập cầu':'Rời cầu';
 const series=tclBerthSeries(tclBerthData.events,direction),years=[...new Set(series.months.map(p=>p.period.slice(0,4)))];
 const year=years.includes(query.plan_year)?query.plan_year:series.cutoff.slice(0,4),quarter=query.plan_period==='quarter';
 const periods=(quarter?series.quarters:series.months).filter(p=>p.period.startsWith(year));
 const paired=pairedYtd(series,year,'rows'),count=(r:typeof paired.current)=>r.observed_days?r.known_rows:null;
 const number=(n:number|null)=>n===null?'—':n.toLocaleString('vi-VN');
 const day=validPlanDate(query.plan_day??'')&&query.plan_day<=series.cutoff?query.plan_day:series.cutoff;
 const journal=tclBerthData.events.filter(e=>e.day===day&&e.direction===direction);
 const included=asset==='tcl'||asset==='tcl_nhon_trach';
 return <section id="tcl-activity" className="panel throughput-panel" aria-label="Dịch vụ và dữ liệu TCL">
  <p className="eyebrow">TCL · DỊCH VỤ DOANH NGHIỆP CÔNG BỐ</p>
  <h2>Hoạt động xếp dỡ, ICD và depot</h2>
  <form method="get" action="/companies/TCL#tcl-activity" className="call-filters"><div><label htmlFor="tcl-scope">Phạm vi TCL</label><select id="tcl-scope" name="plan_asset" defaultValue={asset}>{Object.entries(tclScopes).map(([key,scope])=><option key={key} value={key}>{scope.name}</option>)}</select></div><button>Xem phạm vi</button></form>
  <p>{data.scope.note}</p>
  {reference&&<><div className="stats-strip"><div className="stat"><span>Xếp dỡ container · bình quân công bố</span><strong>Khoảng {reference.value.toLocaleString('vi-VN')} TEU/tháng</strong><span>Báo cáo thường niên {reference.report_year} · phạm vi dịch vụ TCL</span></div></div>
   <p>Số bình quân trong báo cáo, không phải quan sát của từng tháng và không phải số riêng ICD Nhơn Trạch. Không nhân thành tổng năm hoặc dùng làm nền YoY.</p>
   <p className="meta"><a href={`${reference.source.url}#page=${reference.source.pdf_page}`} target="_blank" rel="noreferrer">Báo cáo TCL 2025 · trang PDF {reference.source.pdf_page} ↗</a></p></>}
  <p>Chưa có chuỗi sản lượng thực hiện tấn/TEU riêng theo tháng. Chỉ tiêu bình quân và lượt cập/rời cầu bên dưới được theo dõi riêng.</p>
  {included?<section aria-label="Lượt cập rời cầu ICD Nhơn Trạch" id="tcl-berth-history">
   <h3>ICD Tân Cảng Nhơn Trạch · giờ cập/rời cầu do ePort công bố</h3>
   <p>Chỉ mã bến TNT. Giờ có tiền tố EST là dự kiến và không tính vào lượt ghi nhận. Đây là hoạt động tại cầu, chưa được kiểm chứng độc lập; không cộng hai chiều thành lượt ghé cảng.</p>
   <form method="get" action="/companies/TCL#tcl-berth-history" className="call-filters"><input type="hidden" name="plan_asset" value={asset}/><div><label htmlFor="tcl-direction">Chiều theo dõi</label><select id="tcl-direction" name="plan_direction" defaultValue={direction}><option value="arrival">Cập cầu</option><option value="departure">Rời cầu</option></select></div><div><label htmlFor="tcl-period">Kỳ</label><select id="tcl-period" name="plan_period" defaultValue={quarter?'quarter':'month'}><option value="month">Tháng</option><option value="quarter">Quý</option></select></div><div><label htmlFor="tcl-year">Năm</label><select id="tcl-year" name="plan_year" defaultValue={year}>{years.map(y=><option key={y}>{y}</option>)}</select></div><button>Xem hoạt động</button></form>
   <p className="meta">Ghi nhận đầu tiên: {tclBerthData.metadata.first_observation}; hiển thị đến {series.cutoff} · giờ Việt Nam. Nguồn chỉ cho tra cứu cửa sổ gần hiện tại, chưa có lịch sử đủ hai năm. DWT chưa được nguồn cung cấp.</p>
   <PlanColumnChart title={`${label} theo ${quarter?'quý':'tháng'} · số đã ghi nhận tại TNT`} unit="lượt" currentLabel={year} priorLabel={String(Number(year)-1)} columns={periods.map(p=>({key:p.period,label:p.period,current:count(p.current),prior:count(p.prior),partial:p.status==='partial'}))}/>
   <div className="call-table-wrap"><table className="call-table"><caption>TNT · {label} · ePort công bố</caption><thead><tr><th>Kỳ</th><th>Lượt tại cầu</th><th>Cùng kỳ lượt</th><th>YoY lượt</th><th>DWT</th></tr></thead><tbody>{periods.map(p=><tr key={p.period}><td data-label="Kỳ">{p.period}{p.status==='partial'&&<small>Đang cập nhật</small>}</td><td data-label="Lượt tại cầu">{number(count(p.current))}</td><td data-label="Cùng kỳ lượt">{number(count(p.prior))}</td><td data-label="YoY lượt"><YoyChange value={observedGrowth(count(p.current),count(p.prior))}/></td><td data-label="DWT">—</td></tr>)}</tbody><tfoot><tr className="comparison-ytd"><th>Lũy kế cùng kỳ {year} ({pairedMonthLabel(series,year,'rows')})</th><td data-label="Lượt tại cầu">{number(count(paired.current))}</td><td data-label="Cùng kỳ lượt">{number(count(paired.prior))}</td><td data-label="YoY lượt"><YoyChange value={observedGrowth(count(paired.current),count(paired.prior))}/></td><td data-label="DWT">—</td></tr></tfoot></table></div>
   <h3>Nhật ký {label.toLowerCase()} · {day}</h3>
   <form method="get" action="/companies/TCL#tcl-berth-history" className="call-filters"><input type="hidden" name="plan_asset" value={asset}/><input type="hidden" name="plan_direction" value={direction}/><input type="hidden" name="plan_period" value={quarter?'quarter':'month'}/><input type="hidden" name="plan_year" value={year}/><div><label htmlFor="tcl-day">Ngày theo nguồn</label><input id="tcl-day" name="plan_day" type="date" max={series.cutoff} defaultValue={day}/></div><button>Xem nhật ký</button></form>
   {!journal.length?<p>Chưa có quan sát cho ngày này; không suy là không có hoạt động.</p>:<div className="call-table-wrap"><table className="call-table"><caption>Giờ do ePort ghi nhận · không gồm EST</caption><thead><tr><th>Phương tiện</th><th>Chuyến</th><th>Giờ theo nguồn</th><th>Bằng chứng</th></tr></thead><tbody>{journal.map(event=><tr key={event.key}><td data-label="Phương tiện">{event.vessel}</td><td data-label="Chuyến">{event.voyage}</td><td data-label="Giờ theo nguồn">{event.raw_time}</td><td data-label="Bằng chứng"><details><summary>Nguồn dòng</summary><p>Mã bến {event.site_id}; trường {event.raw_field}; dòng {event.source_row}. Thu thập {event.checked_at}.</p><p style={{overflowWrap:'anywhere'}}>SHA-256: {event.sha256}</p><a href={event.source_url} target="_blank" rel="noreferrer">ePort ICD Nhơn Trạch ↗</a></details></td></tr>)}</tbody></table></div>}
  </section>:<p role="status">Phạm vi này chưa có chuỗi lượt tại cầu hoặc DWT riêng; không dùng số của Nhơn Trạch hay toàn Cát Lái để thay thế.</p>}
  {asset!=='tcl'&&<p><Link href="/companies/TCL?plan_asset=tcl#tcl-activity">Xem chỉ tiêu bình quân dịch vụ TCL công bố</Link></p>}
  <details><summary>Phạm vi khai thác và phần không cộng trùng</summary>
   {Object.entries(tclScopes).filter(([key])=>key!=='tcl').map(([key,scope])=><p key={key}><strong>{scope.name}:</strong> {scope.note}</p>)}
   {data.exclusions.map(item=><p key={item.scope}><strong>{item.scope}:</strong> {item.reason}{item.href&&<> <Link href={item.href}>Xem phạm vi CLL</Link></>}</p>)}
   <p>Quan hệ và quy mô theo báo cáo 2025; không xác nhận lịch sử hiệu lực sở hữu. Không nhân DWT hoặc sản lượng theo tỷ lệ vốn.</p>
  </details>
  <details><summary>Nguồn đã rà soát và giới hạn dữ liệu</summary>{data.source_checks.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a>: {source.result}</p>)}
   <p>Diện tích, chiều dài cầu, công suất thiết kế và số bình quân giữ riêng với sản lượng thực hiện. Lịch sử đã có bằng chứng được giữ khi chuyến không còn xuất hiện trong cửa sổ tra cứu.</p>
   <p>ePort: lần lấy thành công {tclBerthData.metadata.last_success}; {tclBerthData.metadata.events} quan sát cập/rời cầu được giữ riêng theo chiều. Chưa nghiệm thu lần chạy lịch tự động.</p>
   {tclBerthData.metadata.source_error&&<p>Đang giữ bản dữ liệu gần nhất do nguồn lỗi: {String(tclBerthData.metadata.source_error)}</p>}
   <p style={{overflowWrap:'anywhere'}}>SHA-256 báo cáo 2025: {data.scope_sources[0].sha256}.</p>
  </details>
 </section>;
}
