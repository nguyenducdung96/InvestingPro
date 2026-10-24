import {tanvuPlanSeries,type TanVuPlanDay,type TanVuPlanRun,type PlanDirection} from './tanvu-plans';
export const phpBerths={
 tan_vu:{name:'Tân Vũ',alias:'TAN VU',start:'2025-01-01',note:'Chi nhánh Cảng Hải Phòng. Không bao gồm Đình Vũ/DVP.'},
 chua_ve:{name:'Chùa Vẽ',alias:'CHUA VE',start:'2025-01-01',note:'Tách lịch bến vật lý Chùa Vẽ. Sản lượng doanh nghiệp công bố theo nhóm Hoàng Diệu–Chùa Vẽ không được chia cho từng bến.'},
 hoang_dieu:{name:'Hoàng Diệu',alias:'HOANG DIEU',start:'2025-01-01',note:'Chỉ gồm dòng nguồn ghi đúng HOANG DIEU; không tự chuyển lịch sang vị trí khác hoặc suy số liệu sau di dời.'},
 htit:{name:'HTIT (Lạch Huyện 3–4)',alias:'HTIT',start:'2025-05-01',note:'Bến mới khai thác từ tháng 4/2025. Chuỗi so sánh bắt đầu 05/2025, không dùng tháng khởi động chưa trọn kỳ làm nền; tăng trưởng có hiệu ứng nền thấp. Không gồm HICT/HHIT.'},
} as const;
export type PhpBerth=keyof typeof phpBerths;
export const isPhpBerth=(value:string):value is PhpBerth=>Object.hasOwn(phpBerths,value);
export function phpPlanSeries(days:TanVuPlanDay[],asset:PhpBerth,direction:PlanDirection='departure',now=new Date(),run:TanVuPlanRun|null=null){
 return {...tanvuPlanSeries(days.filter(d=>d.report_day>=phpBerths[asset].start),direction,now,run),asset,name:phpBerths[asset].name,scope_note:phpBerths[asset].note};
}
