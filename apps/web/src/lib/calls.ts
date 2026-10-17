import {date,InputError,callSource} from '@invest/port';
import {publicRepository} from './server';
export function callRange(p:Record<string,string|undefined>){
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
 const to=date(p.to??today),from=date(p.from??`${to.slice(0,7)}-01`);
 if(from>to||Date.parse(to)-Date.parse(from)>92*86400000)throw new InputError('Chọn khoảng tối đa 93 ngày, ngày bắt đầu trước ngày kết thúc.');
 return {from,to};
}
export async function callReport(from:string,to:string,area?:string){
 if(area&&!callSource(area))throw new InputError('Khu vực chưa được hỗ trợ.');
 const [[rows,coverage],snapshots]=await Promise.all([publicRepository().callFacts(from,to,area),publicRepository().callSnapshots()]);
 const months=new Map<string,{month:string;arrivals:number;departures:number;reportedDays:number;quarantined:number}>();
 const calendarDays=new Set<string>();
 for(const d of coverage.filter(d=>d.event_kind!=='in_port')){const m=d.reported_day.slice(0,7);const bucket=months.get(m)??{month:m,arrivals:0,departures:0,reportedDays:0,quarantined:0};if(!calendarDays.has(d.reported_day))bucket.reportedDays++;calendarDays.add(d.reported_day);bucket.quarantined+=d.quarantined;months.set(m,bucket);}
 for(const r of rows){const m=r.occurred_at?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).format(new Date(r.occurred_at)):r.reported_day.slice(0,7);const b=months.get(m)??{month:m,arrivals:0,departures:0,reportedDays:0,quarantined:0};b[r.direction==='arrival'?'arrivals':'departures']++;months.set(m,b);}
 return {data:rows,snapshots:snapshots.filter(r=>!area||r.source_area===area),monthly:[...months.values()].sort((a,b)=>a.month.localeCompare(b.month)),coverage,meta:{from,to,asOf:coverage.map(d=>d.fetched_at).sort().at(-1)??null,unit:'reported_vessel_arrival',methodologyVersion:'free-public-sources-v2',sourceArea:area||'multiple',complete:false,truncated:rows.length>=1000||snapshots.length>=1000,warnings:['Nhật ký đếm thông báo đến/rời; bảng tàu đang tại cảng là ảnh chụp nguồn mới nhất và không cộng vào số lượt. Chưa bao phủ tất cả cảng Việt Nam.','Không có IMO: nhận dạng theo từng quan sát; không gộp tàu chỉ theo tên.','Ngày không có thông báo là thiếu dữ liệu, không phải 0 lượt.']}};
}
