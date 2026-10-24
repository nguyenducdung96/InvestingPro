import {aggregateBerthPlanDays,phpBerths,phpPlanSeries} from './php-berths';
import {dvpPlanSeries} from './dvp-plans';
import {issuerPlanAssets,issuerPlanSeries} from './vsc-plans';
import type {TanVuPlanDay} from './tanvu-plans';

export const northTickers=['PHP','DVP','VGR','VSC','GMD','HAH','DXP','PSP','CQN'] as const;
export type NorthTicker=typeof northTickers[number];
export const northScopes:Record<NorthTicker,{assets:string[];label:string;note:string}>={
 PHP:{assets:Object.keys(phpBerths),label:'Tân Vũ, Chùa Vẽ, Hoàng Diệu, HTIT',note:'Bốn bến theo dõi; HTIT có hiệu ứng nền bến mới. Không gồm Đình Vũ/DVP.'},
 DVP:{assets:['dinh_vu'],label:'Đình Vũ',note:'Phạm vi hai cầu Đình Vũ; nguồn chưa tách từng cầu.'},
 VGR:{assets:issuerPlanAssets('VGR','vgr'),label:'VIP Greenport',note:'Dùng chung dữ liệu bến VIP Greenport với VSC; không cộng hai dòng mã.'},
 VSC:{assets:issuerPlanAssets('VSC','vsc'),label:'Greenport, VIP Greenport, Nam Hải Đình Vũ, VIMC Đình Vũ',note:'Phạm vi quan hệ đã đối chiếu, không phải doanh thu hợp nhất hoặc điều chỉnh theo tỷ lệ vốn. VIP Greenport dùng chung với VGR.'},
 GMD:{assets:issuerPlanAssets('GMD','gmd'),label:'Nam Đình Vũ · Hải Phòng',note:'Chỉ Nam Đình Vũ tại Hải Phòng, chưa phải tổng hoạt động GMD toàn quốc.'},
 HAH:{assets:issuerPlanAssets('HAH','hah'),label:'Hải An',note:'Lịch tại cảng, không gồm hoạt động đội tàu HAH.'},
 DXP:{assets:issuerPlanAssets('DXP','dxp'),label:'Đoạn Xá',note:'Lịch tại cảng Đoạn Xá.'},
 PSP:{assets:issuerPlanAssets('PSP','psp'),label:'PTSC Đình Vũ',note:'Không gộp với Đình Vũ/DVP hoặc các cảng có tên gần giống.'},
 CQN:{assets:issuerPlanAssets('CQN','cqn'),label:'Cái Lân · cầu 1, 5, 6, 7',note:'Kế hoạch cập/rời cầu, gồm điều chuyển nội cảng. Chưa gồm bến tạm/khu neo; loại CICT cầu 2–3–4.'},
};
export const northAssets=[...new Set(northTickers.flatMap(t=>northScopes[t].assets))];
const iso=(time:number)=>new Date(time).toISOString().slice(0,10);
export function northSelection(query:Record<string,string|undefined>={},now=new Date()){
 const cutoff=iso(Date.parse(iso(now.getTime()+7*3600000))-86400000),frequency=query.frequency==='quarter'?'quarter':'month';
 const periods:string[]=[];
 for(let n=2025*12;n<=Number(cutoff.slice(0,4))*12+Number(cutoff.slice(5,7))-1;n++){
  const y=Math.floor(n/12),m=n%12+1,value=frequency==='quarter'?`${y}-Q${Math.ceil(m/3)}`:`${y}-${String(m).padStart(2,'0')}`;
  if(periods.at(-1)!==value)periods.push(value);
 }
 const requested=query.period??'',converted=frequency==='quarter'&&/^\d{4}-\d{2}$/.test(requested)?`${requested.slice(0,4)}-Q${Math.ceil(Number(requested.slice(5))/3)}`:frequency==='month'&&/^\d{4}-Q[1-4]$/.test(requested)?`${requested.slice(0,4)}-${String((Number(requested.at(-1))-1)*3+1).padStart(2,'0')}`:requested;
 const period=periods.includes(converted)?converted:periods.at(-1)!;
 const year=Number(period.slice(0,4)),month=frequency==='quarter'?(Number(period.at(-1))-1)*3+1:Number(period.slice(5,7));
 const from=`${year}-${String(month).padStart(2,'0')}-01`,end=iso(Date.UTC(year,month+(frequency==='quarter'?2:0),0)),through=end<cutoff?end:cutoff;
 const priorFrom=`${year-1}${from.slice(4)}`,lastPriorMonthDay=iso(Date.UTC(year-1,Number(through.slice(5,7)),0));
 const priorThrough=through===end?iso(Date.UTC(year-1,month+(frequency==='quarter'?2:0),0)):`${year-1}${through.slice(4,8)}${String(Math.min(Number(through.slice(8)),Number(lastPriorMonthDay.slice(8)))).padStart(2,'0')}`;
 return {frequency,period,periods:periods.reverse(),direction:query.direction==='arrival'?'arrival' as const:'departure' as const,sort:query.sort==='dwt'||query.sort==='yoy'?query.sort:'ticker' as const,cutoff,from,through,priorFrom,priorThrough,partial:end>cutoff,prior_expected_days:Math.round((Date.parse(priorThrough)-Date.parse(priorFrom))/86400000)+1,expected_days:Math.round((Date.parse(through)-Date.parse(from))/86400000)+1};
}
export function northOverview(groups:Record<string,TanVuPlanDay[]|undefined>,query:Record<string,string|undefined>={},now=new Date()){
 const selection=northSelection(query,now);
 const rows=northTickers.map(ticker=>{
  const scope=northScopes[ticker],days=scope.assets.length===1?groups[scope.assets[0]]??[]:aggregateBerthPlanDays(groups,scope.assets,ticker);
  const series=ticker==='PHP'?phpPlanSeries(days,'php',selection.direction,now):ticker==='DVP'?dvpPlanSeries(days,'dvp',selection.direction,now):issuerPlanSeries(days,ticker,ticker.toLowerCase(),selection.direction,now);
  const metric=(selection.frequency==='quarter'?series.quarters:series.months).find(p=>p.period===selection.period)??null;
  const latest=days.find(d=>d.report_day===selection.cutoff),updated_at=latest?.last_success??null;
  const stale=!latest?.version_id||!updated_at||now.getTime()-Date.parse(updated_at)>36*3600000;
  const flags:string[]=[];
  if(!metric?.current.complete)flags.push('Thiếu ngày hoặc cần đối chiếu');
  if(metric?.current.missing_dwt)flags.push('Thiếu DWT');
  if(metric?.current.ambiguous_groups)flags.push('Có nhóm tàu/tuyến khác giờ');
  if(metric?.current.error_days.length||latest?.source_error)flags.push('Có ngày nguồn cần kiểm tra');
  if(metric?.yoy.dwt==null)flags.push(metric?.prior.complete&&metric.prior.dwt===0?'Nền cùng kỳ bằng 0':'Chưa đủ nền so sánh');
  if(stale)flags.push('Chưa theo kịp ngày chốt');
  const params=new URLSearchParams({plan_asset:ticker.toLowerCase(),plan_direction:selection.direction,plan_period:selection.frequency,plan_year:selection.period.slice(0,4)});
  return {ticker,scope:scope.label,scope_note:scope.note,assets:scope.assets,group:ticker==='CQN'?'quang_ninh' as const:'hai_phong' as const,
   semantics:ticker==='CQN'?'authority_published_berth_plan':'authority_published_plan',includes_internal_transfers:ticker==='CQN',actual_verified:false,
   metric,updated_at,refresh_error:!!latest?.source_error,latest_source_day:latest?.version_id?selection.cutoff:null,stale,flags,href:`/companies/${ticker}?${params}#vessel-plans`};
 });
 rows.sort((a,b)=>{
  if(a.group!==b.group)return a.group==='hai_phong'?-1:1;
  if(selection.sort==='ticker')return northTickers.indexOf(a.ticker)-northTickers.indexOf(b.ticker);
  const value=(r:typeof a)=>selection.sort==='dwt'?r.metric?.current.observed_dwt:(r.metric?.current.observed_dwt!=null&&r.metric.prior.observed_dwt!=null&&r.metric.prior.observed_dwt>0?(r.metric.current.observed_dwt/r.metric.prior.observed_dwt-1)*100:null);
  const av=value(a),bv=value(b);return av==null?(bv==null?0:1):bv==null?-1:bv-av;
 });
 return {selection,rows,scope:{tickers:northTickers.length,unique_assets:northAssets.length,shared_assets:[{asset:'vip_green_port',tickers:['VGR','VSC']}],regional_total:null,nationwide_complete:false},ready_rows:rows.filter(r=>r.metric?.current.dwt!=null).length};
}
