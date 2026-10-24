import {tanvuPlanSeries,type TanVuPlanDay,type TanVuPlanRun,type PlanDirection} from './tanvu-plans';
export const vscBerths={
 green_port:{name:'Greenport',start:'2025-01-01',note:'Lịch nguồn GREEN PORT; qua Công ty TNHH MTV Dịch vụ Cảng Xanh. Không gộp VIP Greenport.'},
 vip_green_port:{name:'VIP Greenport',start:'2025-01-01',note:'Lịch nguồn VIP GREEN PORT. Dùng chung dữ liệu bến cho VGR và VSC; không phải hai tập sự kiện khác nhau.'},
 nam_hai_dinh_vu:{name:'Nam Hải Đình Vũ',start:'2025-01-01',note:'Lịch nguồn NAM HAI DINH VU; không gồm Nam Hải, Nam Đình Vũ hoặc Đình Vũ/DVP.'},
 vimc_dinh_vu:{name:'VIMC Đình Vũ',start:'2025-01-01',note:'Lịch nguồn VIMC. Cảng công bố Viconship là cổ đông lớn; không suy tỷ lệ sở hữu hoặc phạm vi hợp nhất.'},
} as const;
export const haiPhongBerths={
 nam_dinh_vu:{name:'Nam Đình Vũ',start:'2025-01-01',note:'Lịch NAM DINH VU tại Hải Phòng. Không gồm Nam Hải Đình Vũ hoặc Đình Vũ/DVP; nguồn không tách các giai đoạn và cầu bến.'},
 hai_an:{name:'Hải An',start:'2025-01-01',note:'Lịch tại Cảng Hải An theo nhãn HAI AN, tách khỏi hoạt động đội tàu vận tải của HAH.'},
 doan_xa:{name:'Đoạn Xá',start:'2025-01-01',note:'Lịch tại Cảng Đoạn Xá theo nhãn DOAN XA. DWT thiết kế tàu không phải sản lượng hàng hoặc doanh thu DXP.'},
 ptsc_dinh_vu:{name:'PTSC Đình Vũ',start:'2025-01-01',note:'Lịch PTSC DINH VU; không gộp Đình Vũ/DVP, Nam Đình Vũ, Nam Hải Đình Vũ hoặc VIMC.'},
} as const;
export const issuerPlanScopes={
 GMD:{gmd:{...haiPhongBerths.nam_dinh_vu,name:'Tổng quan GMD · Hải Phòng · 1 cảng',note:'Phạm vi Hải Phòng: chỉ Cảng Nam Đình Vũ. Chưa phải tổng hoạt động GMD toàn quốc, không gồm Gemalink, Dung Quất hoặc các ICD. Không quy đổi DWT thành hàng hóa, doanh thu hoặc nhân theo tỷ lệ sở hữu.'},nam_dinh_vu:haiPhongBerths.nam_dinh_vu},
 HAH:{hah:{...haiPhongBerths.hai_an,name:'Tổng quan HAH · 1 cảng'},hai_an:haiPhongBerths.hai_an},
 DXP:{dxp:{...haiPhongBerths.doan_xa,name:'Tổng quan DXP · 1 cảng'},doan_xa:haiPhongBerths.doan_xa},
 PSP:{psp:{...haiPhongBerths.ptsc_dinh_vu,name:'Tổng quan PSP · 1 cảng'},ptsc_dinh_vu:haiPhongBerths.ptsc_dinh_vu},
 VGR:{vgr:{...vscBerths.vip_green_port,name:'Tổng quan VGR · 1 cảng'},vip_green_port:vscBerths.vip_green_port},
 VSC:{vsc:{name:'Tổng quan VSC · 4 cảng',start:'2025-01-01',note:'Tổng lịch tại Greenport, VIP Greenport, Nam Hải Đình Vũ và VIMC Đình Vũ theo phạm vi quan hệ đã đối chiếu. Không phải sản lượng hay doanh thu hợp nhất; không điều chỉnh theo tỷ lệ vốn. Quan hệ được đối chiếu hiện tại, chưa xác nhận lịch sử hiệu lực sở hữu.'},...vscBerths},
} as const;
export type IssuerPlanTicker=keyof typeof issuerPlanScopes;
export type VscTicker=IssuerPlanTicker;
export const isIssuerPlanTicker=(value:string):value is IssuerPlanTicker=>Object.hasOwn(issuerPlanScopes,value);
export const isVscTicker=isIssuerPlanTicker;
export function issuerPlanSeries(days:TanVuPlanDay[],ticker:VscTicker,asset:string,direction:PlanDirection='departure',now=new Date(),run:TanVuPlanRun|null=null){
 const scopes:Record<string,{name:string;start:string;note:string}>=issuerPlanScopes[ticker];
 const scope=scopes[asset];if(!scope)throw new Error('Unknown issuer scope');
 return {...tanvuPlanSeries(days.filter(d=>d.report_day>=scope.start),direction,now,run),asset,ticker,name:scope.name,scope_note:scope.note};
}
export function issuerPlanAssets(ticker:VscTicker,asset:string):string[]{
 if(!Object.hasOwn(issuerPlanScopes[ticker],asset))throw new Error('Unknown issuer scope');
 const members:Record<IssuerPlanTicker,string[]>={VSC:Object.keys(vscBerths),VGR:['vip_green_port'],GMD:['nam_dinh_vu'],HAH:['hai_an'],DXP:['doan_xa'],PSP:['ptsc_dinh_vu']};
 return asset===ticker.toLowerCase()?members[ticker]:[asset];
}
