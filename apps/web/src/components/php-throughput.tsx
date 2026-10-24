import {YoyChange} from './yoy-change';
import Link from 'next/link';
import {publicRepository} from '@/lib/server';
import {throughputSeries,phpThroughputScopes,isPhpThroughputScope} from '@invest/port';
import {PlanColumnChart,type PlanColumn} from './plan-column-chart';
const number=(n:number|null)=>n===null?'Chưa đủ dữ liệu':n.toLocaleString('vi-VN');
export async function PhpThroughput({query}:{query:Record<string,string>}) {
 const selected=query.plan_asset??'tan_vu';
 const requestedScope=query.throughput_asset??'';
 const asset=isPhpThroughputScope(requestedScope)?requestedScope:selected==='chua_ve'||selected==='hoang_dieu'?'hoang_dieu_chua_ve':'tan_vu';
 const scope=phpThroughputScopes[asset];
 if(selected==='htit'&&!isPhpThroughputScope(requestedScope))return <section id="throughput" aria-label="Sản lượng HTIT" className="panel throughput-panel"><h2>Sản lượng hàng hóa HTIT công bố</h2><p>Hệ thống chưa có chuỗi tấn hàng/TEU theo tháng của HTIT. Không thay bằng số liệu bến khác hoặc suy từ DWT.</p><Link href="/companies/PHP?plan_asset=htit&throughput_asset=hoang_dieu_chua_ve#throughput">Xem sản lượng nhóm Hoàng Diệu–Chùa Vẽ</Link></section>;
 let series;
 try {series=throughputSeries(await publicRepository().monthlyThroughput(asset));}
 catch {return <section className="panel" aria-label={`Sản lượng ${scope.name}`}><h2>Sản lượng Tân Vũ</h2><p role="status">Chưa kết nối được dữ liệu sản lượng. Vui lòng thử lại.</p></section>;}
 const metric=query.metric==='container_teu'?'container_teu':'cargo_tonnes';
 const unit=metric==='cargo_tonnes'?'tấn hàng':'TEU';
 const quarterly=query.period==='quarter';
 const latest=series.months.at(-1);
 const years=[...new Set(series.months.map(r=>r.period.slice(0,4)))].reverse();
 const year=years.includes(query.throughput_year)?query.throughput_year:query.throughput_year==='all'?'all':latest?.period.slice(0,4)??'';
 const periods=quarterly?series.quarters:series.months;
 const key=(y:number,n:number)=>`${y}-${quarterly?`Q${n}`:String(n).padStart(2,'0')}`;
 const columns:PlanColumn[]=year==='all'?[]:Array.from({length:quarterly?4:12},(_,i)=>({key:key(Number(year),i+1),label:`${quarterly?'Q':'T'}${i+1}`,current:null,prior:null}));
 if(year==='all'&&periods.length){
  const count=quarterly?4:12;
  const index=(p:string)=>Number(p.slice(0,4))*count+Number(quarterly?p.at(-1):p.slice(5))-1;
  for(let n=index(periods[0].period);n<=index(periods.at(-1)!.period);n++){const period=key(Math.floor(n/count),n%count+1);columns.push({key:period,label:period,current:null,prior:null});}
 }
 for(const c of columns){const current=periods.find(r=>r.period===c.key),prior=periods.find(r=>r.period===`${Number(c.key.slice(0,4))-1}${c.key.slice(4)}`);c.current=current?.[metric]??null;c.prior=prior?.[metric]??null;c.note=quarterly?'Chỉ cộng quý khi đủ cả ba tháng và chỉ tiêu':'Số liệu tháng do doanh nghiệp công bố';}
 const errors=series.months.some(m=>m.sources.some(s=>s.source_error));
 const stale=latest?Date.now()-Date.parse(`${latest.period}-01T00:00:00Z`)>75*86400000:false;
 return <section id="throughput" aria-label={`Sản lượng ${scope.name}`} className="panel throughput-panel">
  <p className="eyebrow">PHP · {scope.name.toLocaleUpperCase('vi-VN')} · SẢN LƯỢNG CÔNG BỐ</p><h2>Sản lượng hàng hóa doanh nghiệp công bố</h2>
  <p>{scope.note}</p>
  {!latest?<p role="status">Chưa có số liệu công bố. Dữ liệu thiếu không được xem là 0.</p>:<>
   <div className="stats-strip"><div className="stat"><span>Kỳ mới nhất</span><strong>{latest.period}</strong></div><div className="stat"><span>Tấn hàng</span><strong>{number(latest.cargo_tonnes)}</strong></div><div className="stat"><span>Container (TEU)</span><strong>{number(latest.container_teu)}</strong></div></div>
   {!!series.coverage.missing_months.length&&<p className="notice">Thiếu kỳ trong khoảng dữ liệu: {series.coverage.missing_months.join(', ')}. Không nội suy tháng thiếu.</p>}
   {(errors||stale)&&<p className="notice" role="status">{errors?'Chưa tải được số liệu mới; đang hiển thị kỳ gần nhất. ':''}{stale?'Chưa cập nhật số liệu cho các tháng gần đây.':''}</p>}
   <form method="get" action="/companies/PHP#throughput" className="call-filters">{Object.entries(query).filter(([k])=>k.startsWith('plan_')).map(([k,v])=><input key={k} type="hidden" name={k} value={v}/>)}<div><label htmlFor="throughput-asset">Phạm vi sản lượng</label><select name="throughput_asset" id="throughput-asset" defaultValue={asset}>{Object.entries(phpThroughputScopes).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></div><div><label htmlFor="throughput-metric">Chỉ tiêu</label><select name="metric" id="throughput-metric" defaultValue={metric}><option value="cargo_tonnes">Tấn hàng</option><option value="container_teu">TEU</option></select></div><div><label htmlFor="throughput-period">Kỳ</label><select name="period" id="throughput-period" defaultValue={quarterly?'quarter':'month'}><option value="month">Tháng</option><option value="quarter">Quý</option></select></div><div><label htmlFor="throughput-year">Năm</label><select name="throughput_year" id="throughput-year" defaultValue={year}><option value="all">Toàn bộ lịch sử</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></div><button>Xem số liệu</button></form>
   <PlanColumnChart title={`Sản lượng ${unit} theo ${quarterly?'quý':'tháng'} · ${year==='all'?'toàn bộ lịch sử':`${year} so với ${Number(year)-1}`}`} currentLabel={year==='all'?'Kỳ theo dõi':year} priorLabel={year==='all'?'Cùng kỳ năm trước':String(Number(year)-1)} unit={unit} columns={columns}/>
   <p className="meta">Hai cột so cùng {quarterly?'quý':'tháng'} của hai năm. Dấu — là chưa đủ dữ liệu công bố; quý thiếu tháng hoặc chỉ tiêu giữ trống. Không suy sản lượng hàng hóa từ DWT.</p>
   <p>Lũy kế {latest.period.slice(0,4)} cùng kỳ: {series.ytd[metric]?<>{number(series.ytd[metric]!.current)} {unit} · đến tháng {series.ytd[metric]!.through_month} · <YoyChange value={series.ytd[metric]!.yoy_pct}/></>:'Chưa đủ dữ liệu liên tục từ tháng 1 ở cả hai năm.'}</p>
  </>}
  {!!series.conflicts.length&&<p role="status">Các kỳ có số mâu thuẫn đang chờ đối chiếu: {series.conflicts.join(', ')}.</p>}
 </section>;
}
