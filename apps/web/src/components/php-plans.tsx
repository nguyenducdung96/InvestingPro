import {loadIssuerPlans,loadIssuerPlanEvents} from '@/lib/issuer-plans';
import {loadPhpPlans,loadPhpPlanEvents} from '@/lib/php-plans';
import {YoyChange} from './yoy-change';
import {publicRepository} from '@/lib/server';
import {phpPlanSeries,phpPlanScopes,isPhpPlanScope,dvpPlanSeries,dvpPlanScopes,isDvpPlanScope,isIssuerPlanTicker,issuerPlanScopes,issuerPlanSeries,type IssuerPlanTicker,validPlanDate} from '@invest/port';
import {PlanColumnChart,type PlanColumn} from './plan-column-chart';
const number=(n:number|null)=>n===null?'Chưa đủ dữ liệu':n.toLocaleString('vi-VN',{maximumFractionDigits:2});
export async function PhpPlans({query,ticker='PHP'}:{query:Record<string,string>;ticker?:'PHP'|'DVP'|IssuerPlanTicker}){
 const requestedAsset=query.plan_asset??'';
 const extraScopes=isIssuerPlanTicker(ticker)?issuerPlanScopes[ticker]:null;
 const asset=extraScopes?(Object.hasOwn(extraScopes,requestedAsset)?requestedAsset:ticker.toLowerCase()):ticker==='DVP'?(isDvpPlanScope(requestedAsset)?requestedAsset:'dvp'):isPhpPlanScope(requestedAsset)?requestedAsset:'php';
 const scopes:Record<string,{name:string;start:string;note:string}>=extraScopes??(ticker==='DVP'?dvpPlanScopes:phpPlanScopes);
 const berth=scopes[asset];
 const seriesFor=(days:Parameters<typeof phpPlanSeries>[0],direction:Parameters<typeof phpPlanSeries>[2],now=new Date(),run:Parameters<typeof phpPlanSeries>[4]=null)=>isIssuerPlanTicker(ticker)?issuerPlanSeries(days,ticker,asset,direction,now,run):isDvpPlanScope(asset)?dvpPlanSeries(days,asset,direction,now,run):phpPlanSeries(days,asset as keyof typeof phpPlanScopes,direction,now,run);
 const direction=query.plan_direction==='arrival'?'arrival':'departure';
 const quarterly=query.plan_period==='quarter';
 const repo=publicRepository();
 let stored;
 try{stored=await (isIssuerPlanTicker(ticker)?loadIssuerPlans(repo,ticker,asset):isDvpPlanScope(asset)?repo.phpPlans('dinh_vu'):loadPhpPlans(repo,asset as keyof typeof phpPlanScopes));}catch{return <section id="vessel-plans" className="panel"><h2>Lịch điều động {ticker}</h2><p role="status">Chưa kết nối được dữ liệu lịch điều động. Vui lòng thử lại.</p></section>;}
 const series=seriesFor(stored.days,direction,new Date(),stored.run);
 const latest=series.months.at(-1);
 const average=latest?.current.rows&&latest.current.dwt!==null?latest.current.dwt/latest.current.rows:null;
 const priorAverage=latest?.prior.rows&&latest.prior.dwt!==null?latest.prior.dwt/latest.prior.rows:null;
 const availableYears=[...new Set(series.months.map(m=>m.period.slice(0,4)))].reverse();
 const year=availableYears.includes(query.plan_year)?query.plan_year:query.plan_year==='all'?'all':series.cutoff.slice(0,4);
 const rows=(quarterly?series.quarters:series.months).filter(r=>year==='all'||r.period.startsWith(year));
 const comparisonYear=year==='all'?series.cutoff.slice(0,4):year;
 const comparisonYtd=comparisonYear===series.cutoff.slice(0,4)?series.ytd:seriesFor(stored.days,direction,new Date(`${Number(comparisonYear)+1}-01-01T00:00:00+07:00`)).ytd;
 const periods=quarterly?series.quarters:series.months;
 const calendar:PlanColumn[]=Array.from({length:quarterly?4:12},(_,i)=>{
  const suffix=quarterly?`Q${i+1}`:String(i+1).padStart(2,'0');
  const current=periods.find(r=>r.period===`${comparisonYear}-${suffix}`);
  const previous=periods.find(r=>r.period===`${Number(comparisonYear)-1}-${suffix}`);
  return {key:`${comparisonYear}-${suffix}`,label:`${quarterly?'Q':'T'}${i+1}`,current:current?.current.dwt??null,prior:current?current.prior.dwt:previous?.current.dwt??null,partial:current?.status==='partial',note:current?`Phạm vi ${current.current.from} → ${current.current.through}; cùng kỳ ${current.prior.from} → ${current.prior.through}`:'Kỳ theo dõi chưa có dữ liệu; cột năm trước là toàn kỳ'};
 });
 const selectedDay=validPlanDate(query.plan_day??'')?query.plan_day:series.cutoff;
 let detail=null;let detailError=false;
 if(latest)try{detail=await (isIssuerPlanTicker(ticker)?loadIssuerPlanEvents(repo,ticker,asset,selectedDay):isDvpPlanScope(asset)?repo.phpPlanEvents('dinh_vu',selectedDay):loadPhpPlanEvents(repo,asset as keyof typeof phpPlanScopes,selectedDay));}catch{detailError=true;}
 const label=direction==='arrival'?'Tàu vào':'Tàu rời';
 const dayMap=new Map(stored.days.map(d=>[d.report_day,d]));
 const daily:PlanColumn[]=Array.from({length:90},(_,i)=>{
  const date=new Date(Date.parse(series.cutoff)-(89-i)*86400000).toISOString().slice(0,10),d=dayMap.get(date);
  const value=d?.version_id&&!d.ambiguous_groups&&d[`${direction}_dwt_missing`]===0?d[`${direction}_dwt`]:null;
  const params=new URLSearchParams({plan_asset:asset,plan_direction:direction,plan_period:quarterly?'quarter':'month',plan_year:year,plan_day:date});
  return {key:date,label:`${date.slice(8)}/${date.slice(5,7)}`,current:value??null,note:d?.version_id?`${d[`${direction}_rows`]??'—'} lượt theo lịch${value===null?'; thiếu DWT hoặc cần đối chiếu':''}`:'Chưa có bản lịch ngày',href:`/companies/${ticker}?${params}#plan-days`};
 });
 return <section id="vessel-plans" aria-label={`Lịch điều động ${ticker}`} className="panel throughput-panel">
  <p className="eyebrow">{ticker} · {berth.name.toLocaleUpperCase('vi-VN')} · LỊCH ĐIỀU ĐỘNG CẢNG VỤ</p><h2>Lượt tàu và trọng tải theo lịch công bố</h2><p className="notice">{berth.note}</p>
  <p>DWT là trọng tải thiết kế tàu, không phải tấn hàng bốc xếp. Lịch điều động chưa xác nhận đã thực hiện; vào/rời được tính riêng, không cộng thành lượt ghé.</p>
  <form method="get" action={`/companies/${ticker}#vessel-plans`} className="call-filters"><div><label htmlFor="plan-asset">Bến theo dõi</label><select id="plan-asset" name="plan_asset" defaultValue={asset}>{Object.entries(scopes).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></div>{Object.entries(query).filter(([k])=>k.startsWith("plan_")&&k!=="plan_asset"&&k!=="plan_day").map(([k,v])=><input key={k} type="hidden" name={k} value={v}/>)}<button>Xem bến</button></form>
  {!latest?<p role="status">Chưa có lịch được thu thập. Không coi ngày chưa có dữ liệu là 0.</p>:<>
   <div className="stats-strip"><div className="stat"><span>{label} · {latest.period} · 01–{series.cutoff.slice(8)} · {latest.status==='partial'?'đang tích lũy':'tháng đã qua'}</span><strong>{number(latest.current.dwt)} DWT</strong><span>{number(latest.current.rows)} lượt theo lịch · <YoyChange value={latest.yoy.dwt}/> YoY</span></div>
    <div className="stat"><span>Lũy kế {series.cutoff.slice(0,4)} đến {series.cutoff}</span><strong>{number(series.ytd.current.dwt)} DWT</strong><span>{number(series.ytd.current.rows)} lượt · <YoyChange value={series.ytd.yoy.dwt}/> YoY</span></div><div className="stat"><span>DWT bình quân / lượt · {latest.period}</span><strong>{number(average)}</strong><span>DWT/lượt theo lịch · <YoyChange value={average!==null&&priorAverage!==null&&priorAverage>0?(average/priorAverage-1)*100:null}/> YoY</span></div></div>
   {(series.coverage.stale||series.coverage.errors>0||series.run?.status==='failed')&&<p className="notice" role="status">{series.coverage.stale?'Dữ liệu chưa theo kịp ngày chốt hoặc quá hạn cập nhật. ':''}{series.coverage.errors>0||series.run?.status==='failed'?'Một phần dữ liệu chưa được cập nhật.':''}</p>}
   {latest.current.missing_days.length>0&&<p className="notice">Thiếu {latest.current.missing_days.length} ngày trong tháng. Đã quan sát {number(latest.current.known_rows)} dòng / {number(latest.current.known_dwt)} DWT; chưa dùng làm tổng kỳ đầy đủ.</p>}
   <form method="get" action={`/companies/${ticker}#vessel-plans`} className="call-filters"><input type="hidden" name="plan_asset" value={asset}/><div><label htmlFor="plan-direction">Chiều tàu</label><select id="plan-direction" name="plan_direction" defaultValue={direction}><option value="departure">Tàu rời</option><option value="arrival">Tàu vào</option></select></div><div><label htmlFor="plan-period">Kỳ</label><select id="plan-period" name="plan_period" defaultValue={quarterly?'quarter':'month'}><option value="month">Tháng</option><option value="quarter">Quý</option></select></div><div><label htmlFor="plan-year">Năm</label><select id="plan-year" name="plan_year" defaultValue={year}><option value="all">Toàn bộ lịch sử</option>{availableYears.map(y=><option key={y} value={y}>{y}</option>)}</select></div><button>Xem lịch</button></form>
   <nav className="section-tabs" aria-label={`Biểu đồ bến ${ticker}`}><a href="#plan-history">Lưu lượng DWT</a><a href="#plan-yoy">So sánh cùng kỳ</a><a href="#plan-days">Lịch 90 ngày</a></nav>
   <section id="plan-history" aria-label="Lưu lượng DWT theo kỳ">
    <PlanColumnChart title={`Lưu lượng DWT ${label.toLowerCase()} theo ${quarterly?'quý':'tháng'}`} currentLabel="Kỳ theo dõi" priorLabel="Cùng kỳ năm trước" columns={rows.map(r=>({key:r.period,label:r.period,current:r.current.dwt,prior:r.prior.dwt,partial:r.status==='partial',note:`${r.current.from} → ${r.current.through}; ${r.current.reported_days}/${r.current.expected_days} ngày nguồn`}))}/>
   </section>
   <section id="plan-yoy" aria-label="So sánh cùng kỳ năm trước">
    <PlanColumnChart title={`So sánh cùng kỳ ${comparisonYear} với ${Number(comparisonYear)-1}`} currentLabel={comparisonYear} priorLabel={String(Number(comparisonYear)-1)} columns={calendar}/>
    <p className="meta">Cột xanh: năm theo dõi; cột vàng: năm trước. Kỳ có dấu * đang tích lũy, hai cột so đúng khoảng ngày đã qua. Kỳ tương lai chỉ hiện dữ liệu năm trước nếu có; không coi năm nay là 0.</p>
   <div className="call-table-wrap"><table className="call-table"><caption>{label} · theo lịch điều động Cảng vụ · DWT thiết kế · giờ Việt Nam</caption><thead><tr><th>Kỳ</th><th>Lượt</th><th>DWT</th><th>Cùng kỳ DWT</th><th>YoY DWT</th><th>Phạm vi / độ phủ</th></tr></thead><tbody>{rows.map(r=><tr key={r.period}><td data-label="Kỳ">{r.period}{r.status==='partial'&&<small> Đang tích lũy</small>}</td><td data-label="Lượt">{number(r.current.rows)}</td><td data-label="DWT">{number(r.current.dwt)}</td><td data-label="Cùng kỳ DWT">{number(r.prior.dwt)}</td><td data-label="YoY DWT"><YoyChange value={r.yoy.dwt}/></td><td data-label="Phạm vi / độ phủ"><details><summary>{r.current.from} → {r.current.through} · {r.current.reported_days}/{r.current.expected_days} ngày</summary><p>Cùng kỳ: {r.prior.from} → {r.prior.through} · {r.prior.reported_days}/{r.prior.expected_days} ngày.</p>{r.current.missing_days.length>0&&<p>Ngày thiếu: {r.current.missing_days.join(', ')}.</p>}{r.current.missing_dwt>0&&<p>{r.current.missing_dwt} dòng thiếu DWT; không thay bằng GT.</p>}{r.current.ambiguous_groups>0&&<p>{r.current.ambiguous_groups} nhóm cùng tàu/tuyến khác giờ cần đối chiếu.</p>}{r.current.error_days.length>0&&<p>Còn lỗi nguồn: {r.current.error_days.join(', ')}.</p>}</details></td></tr>)}</tbody><tfoot><tr className="comparison-ytd"><th scope="row">Lũy kế {comparisonYear} (T1–T{Number(comparisonYtd.current.through.slice(5,7))})</th><td data-label="Lượt">{number(comparisonYtd.current.rows)}</td><td data-label="DWT">{number(comparisonYtd.current.dwt)}</td><td data-label="Cùng kỳ DWT">{number(comparisonYtd.prior.dwt)}</td><td data-label="YoY DWT"><YoyChange value={comparisonYtd.yoy.dwt}/></td><td data-label="Phạm vi">{comparisonYtd.current.from} → {comparisonYtd.current.through}<small>Cùng kỳ: {comparisonYtd.prior.from} → {comparisonYtd.prior.through}</small>{comparisonYtd.yoy.dwt===null&&<small>Chưa đủ dữ liệu để tính tăng/giảm lũy kế.</small>}</td></tr></tfoot></table></div>
   </section>
   <div id="plan-days"><h3>Đối chiếu lịch từng ngày</h3>
    <PlanColumnChart title={`DWT ${label.toLowerCase()} · 90 ngày gần nhất`} currentLabel={label} columns={daily} daily/>
    <form method="get" action={`/companies/${ticker}#plan-days`} className="call-filters"><input type="hidden" name="plan_asset" value={asset}/><input type="hidden" name="plan_direction" value={direction}/><input type="hidden" name="plan_period" value={quarterly?'quarter':'month'}/><input type="hidden" name="plan_year" value={year}/><div><label htmlFor="plan-day">Ngày lịch nguồn</label><input id="plan-day" name="plan_day" type="date" min={series.coverage.first_day??undefined} max={series.cutoff} defaultValue={selectedDay}/></div><button>Tra cứu ngày</button></form>
    {detail?<><p>Ngày {detail.report_day} · Lịch điều động công bố</p><div className="call-table-wrap"><table className="call-table"><caption>{label} ngày {detail.report_day} · kế hoạch công bố</caption><thead><tr><th>Giờ dự kiến</th><th>Tàu</th><th>DWT</th><th>Từ</th><th>Đến</th></tr></thead><tbody>{detail.events.filter(e=>e.direction===direction).map((e,i)=><tr key={i}><td data-label="Giờ dự kiến">{e.planned_time}</td><td data-label="Tàu">{e.vessel_name}</td><td data-label="DWT">{number(e.dwt)}</td><td data-label="Từ">{e.from_berth}</td><td data-label="Đến">{e.to_berth}</td></tr>)}</tbody></table></div>{!detail.events.some(e=>e.direction===direction)&&<p>Không có dòng {label.toLowerCase()} {berth.name} trong lịch nguồn đã lấy; không xác nhận số tàu thực tế bằng 0.</p>}</>:<p role="status">{detailError?'Chưa tải được chi tiết ngày.':'Chưa có bản lịch ngày này.'}</p>}
   </div>
  </>}
 </section>;
}
