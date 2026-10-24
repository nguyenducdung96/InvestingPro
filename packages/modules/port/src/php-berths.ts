import {tanvuPlanSeries,type TanVuPlanDay,type TanVuPlanRun,type PlanDirection} from './tanvu-plans';
export const phpBerths={
 tan_vu:{name:'Tân Vũ',alias:'TAN VU',start:'2025-01-01',note:'Chi nhánh Cảng Hải Phòng. Không bao gồm Đình Vũ/DVP.'},
 chua_ve:{name:'Chùa Vẽ',alias:'CHUA VE',start:'2025-01-01',note:'Tách lịch bến vật lý Chùa Vẽ. Sản lượng doanh nghiệp công bố theo nhóm Hoàng Diệu–Chùa Vẽ không được chia cho từng bến.'},
 hoang_dieu:{name:'Hoàng Diệu',alias:'HOANG DIEU',start:'2025-01-01',note:'Chỉ gồm dòng nguồn ghi đúng HOANG DIEU; không tự chuyển lịch sang vị trí khác hoặc suy số liệu sau di dời.'},
 htit:{name:'HTIT (Lạch Huyện 3–4)',alias:'HTIT',start:'2025-05-01',note:'Bến mới khai thác từ tháng 4/2025. Chuỗi so sánh bắt đầu 05/2025, không dùng tháng khởi động chưa trọn kỳ làm nền; tăng trưởng có hiệu ứng nền thấp. Không gồm HICT/HHIT.'},
} as const;
export type PhpBerth=keyof typeof phpBerths;
export const phpThroughputScopes={
 tan_vu:{name:'Tân Vũ',note:'Sản lượng riêng Tân Vũ do doanh nghiệp công bố; độc lập với lượt tàu và DWT.'},
 chua_ve:{name:'Chùa Vẽ (riêng)',note:'Nguồn đã kiểm tra chỉ tách Chùa Vẽ ở 05–07/2025. Từ 08/2025 bản tin chuyển sang nhóm Hoàng Diệu–Chùa Vẽ; không nối số nhóm vào chuỗi bến riêng.'},
 hoang_dieu:{name:'Hoàng Diệu (riêng)',note:'Nguồn đã kiểm tra chỉ tách tấn hàng Hoàng Diệu ở 05–07/2025. Không có TEU riêng được công bố ở những kỳ này; giữ null, không coi là 0.'},
 hoang_dieu_chua_ve:{name:'Hoàng Diệu–Chùa Vẽ (gộp)',note:'Sản lượng nhóm công bố từ 08/2025. Đây là tổng nhóm, không phải sản lượng riêng Chùa Vẽ hoặc Hoàng Diệu. Không cộng chuỗi riêng và chuỗi gộp với nhau.'},
} as const;
export type PhpThroughputScope=keyof typeof phpThroughputScopes;
export const isPhpThroughputScope=(value:string):value is PhpThroughputScope=>Object.hasOwn(phpThroughputScopes,value);
export const isPhpBerth=(value:string):value is PhpBerth=>Object.hasOwn(phpBerths,value);
export function phpPlanSeries(days:TanVuPlanDay[],asset:PhpBerth,direction:PlanDirection='departure',now=new Date(),run:TanVuPlanRun|null=null){
 return {...tanvuPlanSeries(days.filter(d=>d.report_day>=phpBerths[asset].start),direction,now,run),asset,name:phpBerths[asset].name,scope_note:phpBerths[asset].note};
}
