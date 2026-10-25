import {tanvuPlanSeries,type TanVuPlanDay,type PlanDirection} from './tanvu-plans';
import {aggregateBerthPlanDays} from './php-berths';
export const southSource='https://cangvuhanghaitphcm.gov.vn/index.aspx?page=shipschedule&cat=3146';
export const southAssets={
 gemalink:{name:'Gemalink',ticker:'GMD',aliases:['CAI MEP GEMADEPT-TERMINAL LINK']},
 sg_hiep_phuoc:{name:'Sài Gòn–Hiệp Phước',ticker:'SGP',aliases:['CAU CANG SO 1 SG-HP','CAU CANG SO 2 SG-HP','CAU CANG SO 3 SG-HP']},
 cmit:{name:'CMIT',ticker:'SGP',aliases:['CẢNG QUỐC TẾ CAI MÉP (CMIT)']},
 sp_psa:{name:'SP-PSA',ticker:'SGP',aliases:['CẦU CẢNG SỐ 1 - SP-PSA','CẦU CẢNG SỐ 2 - SP-PSA']},
 ssit:{name:'SSIT',ticker:'SGP',aliases:['CẦU CẢNG SỐ 1 - SSIT','CẦU CẢNG SỐ 2 (BẾN SÀ LAN) - SSIT','CẦU CẢNG SỐ 3 (BẾN SÀ LAN) - SSIT']},
} as const;
export type SouthAsset=keyof typeof southAssets;
export interface SouthEvent {asset:SouthAsset;day:string;direction:PlanDirection;vessel:string;time:string;dwt:number|null;from:string|null;to:string|null;raw:string[];sha256:string;checked_at:string}
export interface SouthDay {day:string;sha256:string|null;checked_at:string|null;last_attempt:string;error:string|null;assets:Partial<Record<SouthAsset,{arrival:[number,number|null,number];departure:[number,number|null,number]}>>;rejected:number;internal:number}
export const southScopes={
 GMD:{gmd_all:{name:'GMD · Nam Đình Vũ + Gemalink',assets:['nam_dinh_vu','gemalink'],note:'Hai cảng có chuỗi theo dõi. Chưa phải toàn bộ GMD; Dung Quất để ngỏ, Bình Dương và các ICD chưa tích hợp. Không nhân DWT theo tỷ lệ vốn.'},gemalink:{name:'Gemalink · Cái Mép',assets:['gemalink'],note:'Chỉ các dòng đến/rời có nhãn CAI MEP GEMADEPT-TERMINAL LINK; không gồm điều chuyển nội cảng, khu neo hoặc tổng Cái Mép.'}},
 SGP:{sgp:{name:'SGP · 4 phạm vi theo dõi',assets:['sg_hiep_phuoc','cmit','sp_psa','ssit'],note:'Sài Gòn–Hiệp Phước và ba liên doanh CMIT, SP-PSA, SSIT theo báo cáo 2025. Không phải hoạt động hợp nhất, không điều chỉnh theo vốn; chưa gồm Tân Thuận và các bến còn lại.'},...Object.fromEntries(Object.entries(southAssets).filter(([,a])=>a.ticker==='SGP').map(([key,a])=>[key,{name:a.name,assets:[key],note:'Phạm vi cầu được ghép chính xác theo danh mục công khai của Cảng vụ. Quan hệ doanh nghiệp theo báo cáo 2025; không xác nhận lịch sử hiệu lực sở hữu.'}]))},
} satisfies Record<string,Record<string,{name:string;assets:string[];note:string}>>;
export function southPlanDays(input:SouthDay[],asset:SouthAsset):TanVuPlanDay[]{return input.map(d=>{
 const a=d.assets[asset];
 return {report_day:d.day,version_id:null,source_sha256:d.sha256,source_url:southSource,parser_version:'hcm-authority-schedule/1.0.0',last_success:d.checked_at,last_attempt:d.last_attempt,source_error:d.error,
 observed_available:!!a,arrival_rows:null,departure_rows:null,arrival_dwt:null,departure_dwt:null,arrival_known_rows:a?.arrival[0]??null,departure_known_rows:a?.departure[0]??null,arrival_known_dwt:a?.arrival[1]??null,departure_known_dwt:a?.departure[1]??null,arrival_dwt_missing:a?.arrival[2]??null,departure_dwt_missing:a?.departure[2]??null,ambiguous_groups:null,source_empty_sections:[]};
 });}
export function southSeries(groups:Record<string,TanVuPlanDay[]|undefined>,assets:string[],direction:PlanDirection='departure',now=new Date()){
 // A successfully retrieved regional board does not certify absence at a terminal.
 const eligible=Object.fromEntries(assets.map(asset=>[asset,(groups[asset]??[]).map(d=>({...d,version_id:(d[`${direction}_known_rows`]??d[`${direction}_rows`]??0)>0?d.version_id:null,observed_available:(d[`${direction}_known_rows`]??d[`${direction}_rows`]??0)>0}))]));
 const days=assets.length===1?eligible[assets[0]]:aggregateBerthPlanDays(eligible,assets,'selected terminals').map(d=>({...d,arrival_dwt_missing:assets.reduce((n,a)=>n+(eligible[a].find(x=>x.report_day===d.report_day)?.arrival_dwt_missing??0),0),departure_dwt_missing:assets.reduce((n,a)=>n+(eligible[a].find(x=>x.report_day===d.report_day)?.departure_dwt_missing??0),0)}));
 return {...tanvuPlanSeries(days,direction,now),days,semantics:'authority_published_plan' as const,actual_verified:false,full_scope_certified:false};
}
export const southTargets=[
 {ticker:'GMD',name:'Gemalink',assets:['gemalink'],status:'integrated',note:'Miền Nam chỉ Gemalink. Bình Dương, Phước Long chưa có chuỗi được ghép.',asset:'gemalink'},
 {ticker:'SGP',name:'Hiệp Phước · CMIT · SP-PSA · SSIT',assets:['sg_hiep_phuoc','cmit','sp_psa','ssit'],status:'integrated',note:'Bốn phạm vi, chưa gồm Tân Thuận và các bến khác.',asset:'sgp'},
 {ticker:'PDN',name:'Long Bình Tân · Gò Dầu A/B',assets:[],status:'integrated',note:'Lịch công bố Đồng Nai; gồm tuyến giữa khu neo và cầu đã ghép. Chuyển giữa các bến PDN giữ riêng. Chưa chứng nhận toàn bộ hoạt động.',asset:'pdn'},
 {ticker:'CLL',name:'Cát Lái · phạm vi CLL',assets:[],status:'pending',note:'Không gán toàn bộ Cát Lái cho CLL.',asset:''},
 {ticker:'TCL',name:'Dịch vụ cảng Tân Cảng',assets:[],status:'pending',note:'Dịch vụ xếp dỡ không đồng nghĩa sở hữu/khai thác toàn bộ Tân Cảng.',asset:''},
 {ticker:'SWC',name:'Sowatco Long Bình',assets:[],status:'pending',note:'Cảng sông; chưa có chuỗi tàu được đối chiếu. Không lấy hoạt động VICT thay thế.',asset:''},
 {ticker:'TCW',name:'Tân Cảng Warehousing',assets:[],status:'pending',note:'Cần xác định phạm vi bến phù hợp; kho bãi/ICD không tự trở thành cảng biển.',asset:''},
 {ticker:'VGP',name:'Cảng Rau Quả',assets:[],status:'pending',note:'Cần xác minh chức năng khai thác hiện hành và nguồn hoạt động.',asset:''},
] as const;
