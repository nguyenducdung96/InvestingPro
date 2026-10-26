import {tanvuPlanSeries,type TanVuPlanDay,type PlanDirection} from './tanvu-plans';
import {aggregateBerthPlanDays} from './php-berths';
export const southSource='https://cangvuhanghaitphcm.gov.vn/index.aspx?page=shipschedule&cat=3146';
export const dongnaiSource='http://123.25.204.166/web/guest/public-kh#/tra-cuu/ke_hoach/0/0/KeHoachDieuDongTau2';
export const southAssets={
 gemalink:{name:'Gemalink',ticker:'GMD',aliases:['CAI MEP GEMADEPT-TERMINAL LINK']},
 sg_hiep_phuoc:{name:'Sài Gòn–Hiệp Phước',ticker:'SGP',aliases:['CAU CANG SO 1 SG-HP','CAU CANG SO 2 SG-HP','CAU CANG SO 3 SG-HP']},
 cmit:{name:'CMIT',ticker:'SGP',aliases:['CẢNG QUỐC TẾ CAI MÉP (CMIT)']},
 sp_psa:{name:'SP-PSA',ticker:'SGP',aliases:['CẦU CẢNG SỐ 1 - SP-PSA','CẦU CẢNG SỐ 2 - SP-PSA']},
 ssit:{name:'SSIT',ticker:'SGP',aliases:['CẦU CẢNG SỐ 1 - SSIT','CẦU CẢNG SỐ 2 (BẾN SÀ LAN) - SSIT','CẦU CẢNG SỐ 3 (BẾN SÀ LAN) - SSIT']},
 sg_tan_thuan:{name:'Tân Thuận · cầu đã đối chiếu',ticker:'SGP',aliases:['K12A','K12B','K12C','K12C1']},
 cll_berth7:{name:'CLL · cầu số 7',ticker:'CLL',aliases:['C.LAI 7']},
 cll_b7:{name:'CLL · bến 2.200 DWT',ticker:'CLL',aliases:['CAU CANG 2.200 DWT']},
 swc_buoys:{name:'SWC · phao ĐT1/ĐT2/ĐT3/TL9',ticker:'SWC',aliases:['SOWATCO-ĐT1','SOWATCO-ĐT2','SOWATCO-ĐT3','SOWATCO-TL9']},
 vgp_k16:{name:'VGP · cầu K16',ticker:'VGP',aliases:['K16']},
 gmd_binh_duong:{name:'Cảng Bình Dương · dòng vào/rời trực tiếp',ticker:'GMD',aliases:[]},
} as const;
export type SouthAsset=keyof typeof southAssets;
export function southAssetSource(asset:string){return asset==='gmd_binh_duong'?dongnaiSource:southSource;}
export interface SouthEvent {asset:SouthAsset;day:string;direction:PlanDirection;vessel:string;time:string;dwt:number|null;from:string|null;to:string|null;raw:string[];sha256:string;checked_at:string;source_url?:string;source_id?:string;harbour_code?:string;wharf_code?:string;raw_time?:string;raw_dwt?:number|null}
export interface SouthDay {day:string;sha256:string|null;checked_at:string|null;last_attempt:string;error:string|null;assets:Partial<Record<SouthAsset,{arrival:[number,number|null,number];departure:[number,number|null,number]}>>;rejected:number;internal:number}
export const southScopes={
 GMD:{gemalink:{name:'Gemalink · Cái Mép',assets:['gemalink'],note:'Chỉ các dòng đến/rời có nhãn CAI MEP GEMADEPT-TERMINAL LINK; không gồm điều chuyển nội cảng, khu neo hoặc tổng Cái Mép.'},gmd_all:{name:'GMD · Nam Đình Vũ + Gemalink + Bình Dương',assets:['nam_dinh_vu','gemalink','gmd_binh_duong'],note:'Ba cảng có chuỗi theo dõi từ các nguồn riêng. Bình Dương chỉ gồm dòng vào/rời trực tiếp trong lịch Đồng Nai, chưa ghép điều chuyển. Chưa phải toàn bộ GMD; Dung Quất để ngỏ, Phước Long và các ICD chưa tích hợp. Không nhân DWT theo tỷ lệ vốn.'},gmd_south:{name:'GMD · Gemalink + Bình Dương',assets:['gemalink','gmd_binh_duong'],note:'Hai phạm vi miền Nam có dữ liệu từ lịch TP.HCM và Đồng Nai. Bình Dương chỉ dòng vào/rời trực tiếp; chưa ghép điều chuyển. Phước Long chưa có chuỗi.'},gmd_binh_duong:{name:'Cảng Bình Dương',assets:['gmd_binh_duong'],note:'Lịch Đồng Nai: mã BC198 và nhãn Cảng Bình Dương. Chỉ dòng vào/rời trực tiếp; chưa ghép điều chuyển hoặc chứng nhận toàn bộ bến. Không phải phao Gemadept hay ICD Phước Long.'}},
 SGP:{sgp:{name:'SGP · 5 phạm vi theo dõi',assets:['sg_hiep_phuoc','cmit','sp_psa','ssit','sg_tan_thuan'],note:'Hiệp Phước, CMIT, SP-PSA, SSIT và phần Tân Thuận đã đối chiếu. Không phải hoạt động hợp nhất, không điều chỉnh theo vốn. Tân Thuận hiện chỉ K12A/B/C/C1; chưa gán nhãn K12 trùng tên khu neo, TT2 hoặc Tân Thuận Đông.'},...Object.fromEntries(Object.entries(southAssets).filter(([,a])=>a.ticker==='SGP').map(([key,a])=>[key,{name:a.name,assets:[key],note:key==='sg_tan_thuan'?'Chỉ K12A, K12B, K12C, K12C1. Giữ phần ghi nhận; chưa gồm K12 trùng tên khu neo và các bến khác.':'Phạm vi cầu được ghép chính xác theo danh mục công khai của Cảng vụ. Quan hệ doanh nghiệp theo báo cáo 2025; không xác nhận lịch sử hiệu lực sở hữu.'}]))},
 CLL:{cll:{name:'CLL · cầu số 7 và bến 2.200 DWT',assets:['cll_berth7','cll_b7'],note:'Phạm vi CLL theo báo cáo 2025, không phải toàn bộ Cát Lái. Bến 2.200 DWT được báo cáo là hợp tác với TCL; không cộng thêm một lần cho TCL.'},cll_berth7:{name:'Cầu số 7',assets:['cll_berth7'],note:'Chỉ nhãn C.LAI 7 trong lịch Cảng vụ.'},cll_b7:{name:'Bến 2.200 DWT · hợp tác TCL',assets:['cll_b7'],note:'Chỉ nhãn CAU CANG 2.200 DWT. Không dùng nhãn B7 đơn lẻ hoặc B7 - CSG để thay thế.'}},
 SWC:{swc_buoys:{name:'Bốn bến phao SWC',assets:['swc_buoys'],note:'Phao ĐT1, ĐT2, ĐT3 và ĐT9 tại Thiềng Liềng (nhãn nguồn TL9). Đây là phần bến phao của SWC; chưa có chuỗi Long Bình, ICD Sotrans hoặc Mekong – Cần Thơ. Không lấy tàu được SWC lai dắt tại cảng khác làm hoạt động bến SWC.'}},
 VGP:{vgp_k16:{name:'Cảng Rau Quả · cầu K16',assets:['vgp_k16'],note:'Hoạt động theo lịch tại cầu K16, không phải sản lượng hay doanh thu VGP. Báo cáo 2025 mô tả cho thuê kho/bãi, cầu cảng trong thời gian chuyển đổi công năng; không suy VGP trực tiếp xếp dỡ mọi tàu.'}},
} satisfies Record<string,Record<string,{name:string;assets:string[];note:string}>>;
export type SouthIssuer=keyof typeof southScopes;
export function southPlanDays(input:SouthDay[],asset:SouthAsset):TanVuPlanDay[]{return input.map(d=>{
 const a=d.assets[asset];
 return {report_day:d.day,version_id:null,source_sha256:d.sha256,source_url:southAssetSource(asset),parser_version:asset==='gmd_binh_duong'?'binhduong-direct-plan/1.0.0':'hcm-authority-schedule/1.0.0',last_success:d.checked_at,last_attempt:d.last_attempt,source_error:d.error,
 observed_available:!!a,arrival_rows:null,departure_rows:null,arrival_dwt:null,departure_dwt:null,arrival_known_rows:a?.arrival[0]??null,departure_known_rows:a?.departure[0]??null,arrival_known_dwt:a?.arrival[1]??null,departure_known_dwt:a?.departure[1]??null,arrival_dwt_missing:a?.arrival[2]??null,departure_dwt_missing:a?.departure[2]??null,ambiguous_groups:null,source_empty_sections:[]};
 });}
export function southSeries(groups:Record<string,TanVuPlanDay[]|undefined>,assets:string[],direction:PlanDirection='departure',now=new Date()){
 // A successfully retrieved regional board does not certify absence at a terminal.
 const eligible=Object.fromEntries(assets.map(asset=>[asset,(groups[asset]??[]).map(d=>({...d,version_id:(d[`${direction}_known_rows`]??d[`${direction}_rows`]??0)>0?d.version_id:null,observed_available:(d[`${direction}_known_rows`]??d[`${direction}_rows`]??0)>0}))]));
 const days=assets.length===1?eligible[assets[0]]:aggregateBerthPlanDays(eligible,assets,'selected terminals').map(d=>({...d,arrival_dwt_missing:assets.reduce((n,a)=>n+(eligible[a].find(x=>x.report_day===d.report_day)?.arrival_dwt_missing??0),0),departure_dwt_missing:assets.reduce((n,a)=>n+(eligible[a].find(x=>x.report_day===d.report_day)?.departure_dwt_missing??0),0)}));
 return {...tanvuPlanSeries(days,direction,now),days,semantics:'authority_published_plan' as const,actual_verified:false,full_scope_certified:false};
}
export const southTargets=[
 {ticker:'GMD',name:'Gemalink · Cái Mép',assets:['gemalink'],status:'integrated',note:'Gemalink theo lịch Cảng vụ TP.HCM; theo dõi riêng với Bình Dương. Lịch sử đầu năm 2025 còn thiếu trong chuỗi này.',asset:'gemalink'},
 {ticker:'GMD',name:'Cảng Bình Dương',assets:['gmd_binh_duong'],status:'integrated',note:'Dòng vào/rời trực tiếp từ lịch Đồng Nai; theo dõi riêng với Gemalink. Sau tháng 6/2026 thưa quan sát, chưa chứng nhận hoạt động giảm tương ứng.',asset:'gmd_binh_duong'},
 {ticker:'SGP',name:'Hiệp Phước · CMIT · SP-PSA · SSIT · Tân Thuận',assets:['sg_hiep_phuoc','cmit','sp_psa','ssit','sg_tan_thuan'],status:'integrated',note:'Năm phạm vi; Tân Thuận chỉ K12A/B/C/C1, chưa gồm K12 và TT2.',asset:'sgp'},
 {ticker:'PDN',name:'Long Bình Tân · Gò Dầu A/B',assets:[],status:'integrated',note:'Lịch công bố Đồng Nai; gồm tuyến giữa khu neo và cầu đã ghép. Chuyển giữa các bến PDN giữ riêng. Chưa chứng nhận toàn bộ hoạt động.',asset:'pdn'},
 {ticker:'CLL',name:'Cầu số 7 · bến 2.200 DWT',assets:['cll_berth7','cll_b7'],status:'integrated',note:'Chỉ phạm vi CLL; bến 2.200 DWT hợp tác TCL được ghi một lần tại CLL.',asset:'cll'},
 {ticker:'TCL',name:'Xếp dỡ Cát Lái · ICD Nhơn Trạch',assets:[],status:'pending',note:'Đã rà phạm vi báo cáo 2025. Chưa có chuỗi riêng ICD Nhơn Trạch; không gán toàn Cát Lái hoặc cộng lại bến hợp tác CLL.',asset:''},
 {ticker:'SWC',name:'Bốn bến phao SWC',assets:['swc_buoys'],status:'integrated',note:'Chỉ ĐT1/ĐT2/ĐT3/TL9. Long Bình, ICD Sotrans và Mekong – Cần Thơ còn thiếu chuỗi riêng.',asset:'swc_buoys'},
 {ticker:'TCW',name:'Kho · bãi · depot Tân Cảng',assets:[],status:'pending',note:'Báo cáo 2025 xác nhận hoạt động kho/bãi, cảng mở và depot. Chưa có cầu riêng để gán lịch tàu; cần chỉ tiêu dịch vụ phù hợp.',asset:''},
 {ticker:'VGP',name:'Cảng Rau Quả · K16',assets:['vgp_k16'],status:'integrated',note:'Lịch tại cầu K16; VGP công bố cho thuê kho/bãi, cầu cảng. Không coi DWT là doanh thu hoặc sản lượng VGP.',asset:'vgp_k16'},
] as const;
