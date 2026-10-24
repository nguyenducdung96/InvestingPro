import {tanvuPlanSeries,type TanVuPlanDay,type TanVuPlanRun,type PlanDirection} from './tanvu-plans';
export const phpBerths={
 tan_vu:{name:'Tân Vũ',alias:'TAN VU',start:'2025-01-01',note:'Chi nhánh Cảng Hải Phòng. Không bao gồm Đình Vũ/DVP.'},
 chua_ve:{name:'Chùa Vẽ',alias:'CHUA VE',start:'2025-01-01',note:'Tách lịch bến vật lý Chùa Vẽ. Sản lượng doanh nghiệp công bố theo nhóm Hoàng Diệu–Chùa Vẽ không được chia cho từng bến.'},
 hoang_dieu:{name:'Hoàng Diệu',alias:'HOANG DIEU',start:'2025-01-01',note:'Chỉ gồm dòng nguồn ghi đúng HOANG DIEU; không tự chuyển lịch sang vị trí khác hoặc suy số liệu sau di dời.'},
 htit:{name:'HTIT (Lạch Huyện 3–4)',alias:'HTIT',start:'2025-05-01',note:'Bến mới khai thác từ tháng 4/2025. Chuỗi so sánh bắt đầu 05/2025, không dùng tháng khởi động chưa trọn kỳ làm nền; tăng trưởng có hiệu ứng nền thấp. Không gồm HICT/HHIT.'},
} as const;
export type PhpBerth=keyof typeof phpBerths;
export const phpPlanScopes={php:{name:'Tổng quan PHP · 4 bến',start:'2025-01-01',note:'Tổng lượt tại Tân Vũ, Chùa Vẽ, Hoàng Diệu và HTIT theo lịch công bố; không phải tổng toàn vùng Cảng vụ Hải Phòng. Không gồm Đình Vũ/DVP. HTIT là bến mới, ảnh hưởng nền so sánh.'},...phpBerths} as const;
export type PhpPlanScope=keyof typeof phpPlanScopes;
export const isPhpPlanScope=(value:string):value is PhpPlanScope=>Object.hasOwn(phpPlanScopes,value);
// Each arrival belongs to one destination berth; each departure to one origin berth.
// The collector excludes the separate internal-movement section. Totals count berth
// schedule rows, not unique vessels or confirmed port calls. Keep all four heads
// on the same source revision; a missing berth must never become a silent zero.
export function aggregatePhpPlanDays(groups:Partial<Record<PhpBerth,TanVuPlanDay[]>>):TanVuPlanDay[]{
 return aggregateBerthPlanDays(groups,Object.keys(phpBerths),'PHP');
}
export function aggregateBerthPlanDays(groups:Record<string,TanVuPlanDay[]|undefined>,assets:string[],scope:string):TanVuPlanDay[]{
 const maps=assets.map(asset=>{
  const entries=groups[asset]??[];
  const map=new Map(entries.map(d=>[d.report_day,d]));
  if(map.size!==entries.length)throw new Error(`Duplicate ${scope} berth/day`);
  return map;
 });
 const dates=[...new Set(maps.flatMap(m=>[...m.keys()]))].sort();
 return dates.map(report_day=>{
  const members=maps.map(m=>m.get(report_day));
  const present=members.filter((d):d is TanVuPlanDay=>!!d);
  const hashes=new Set(present.map(d=>d.source_sha256));
  const complete=members.every(d=>d?.version_id)&&hashes.size===1&&!!present[0]?.source_sha256;
  const sum=(key:'arrival_rows'|'departure_rows'|'arrival_dwt'|'departure_dwt'|'arrival_dwt_missing'|'departure_dwt_missing'|'ambiguous_groups')=>complete&&present.every(d=>d[key]!==null)?present.reduce((n,d)=>n+d[key]!,0):null;
  return {report_day,version_id:complete?present.map(d=>d.version_id).join(':'):null,source_sha256:complete?present[0].source_sha256:null,source_url:null,parser_version:null,
   last_attempt:present.map(d=>d.last_attempt).sort()[0],last_success:complete?present.map(d=>d.last_success).filter((s):s is string=>!!s).sort()[0]??null:null,
   source_error:!complete?`Incomplete ${scope} daily coverage`:present.find(d=>d.source_error)?.source_error??null,
   arrival_rows:sum('arrival_rows'),departure_rows:sum('departure_rows'),arrival_dwt:sum('arrival_dwt'),departure_dwt:sum('departure_dwt'),arrival_dwt_missing:sum('arrival_dwt_missing'),departure_dwt_missing:sum('departure_dwt_missing'),ambiguous_groups:sum('ambiguous_groups'),source_empty_sections:[]};
 });
}

export const phpThroughputScopes={
 tan_vu:{name:'Tân Vũ',note:'Sản lượng riêng Tân Vũ do doanh nghiệp công bố; độc lập với lượt tàu và DWT.'},
 chua_ve:{name:'Chùa Vẽ (riêng)',note:'Nguồn đã kiểm tra chỉ tách Chùa Vẽ ở 05–07/2025. Từ 08/2025 bản tin chuyển sang nhóm Hoàng Diệu–Chùa Vẽ; không nối số nhóm vào chuỗi bến riêng.'},
 hoang_dieu:{name:'Hoàng Diệu (riêng)',note:'Nguồn đã kiểm tra chỉ tách tấn hàng Hoàng Diệu ở 05–07/2025. Không có TEU riêng được công bố ở những kỳ này; giữ null, không coi là 0.'},
 hoang_dieu_chua_ve:{name:'Hoàng Diệu–Chùa Vẽ (gộp)',note:'Sản lượng nhóm công bố từ 08/2025. Đây là tổng nhóm, không phải sản lượng riêng Chùa Vẽ hoặc Hoàng Diệu. Không cộng chuỗi riêng và chuỗi gộp với nhau.'},
} as const;
export type PhpThroughputScope=keyof typeof phpThroughputScopes;
export const isPhpThroughputScope=(value:string):value is PhpThroughputScope=>Object.hasOwn(phpThroughputScopes,value);
export const isPhpBerth=(value:string):value is PhpBerth=>Object.hasOwn(phpBerths,value);
export function phpPlanSeries(days:TanVuPlanDay[],asset:PhpPlanScope,direction:PlanDirection='departure',now=new Date(),run:TanVuPlanRun|null=null){
 return {...tanvuPlanSeries(days.filter(d=>d.report_day>=phpPlanScopes[asset].start),direction,now,run),asset,name:phpPlanScopes[asset].name,scope_note:phpPlanScopes[asset].note};
}
