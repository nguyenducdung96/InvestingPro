import {tanvuPlanSeries,type TanVuPlanDay,type TanVuPlanRun,type PlanDirection} from './tanvu-plans';
export const vscBerths={
 green_port:{name:'Greenport',start:'2025-01-01',note:'Lịch nguồn GREEN PORT; qua Công ty TNHH MTV Dịch vụ Cảng Xanh. Không gộp VIP Greenport.'},
 vip_green_port:{name:'VIP Greenport',start:'2025-01-01',note:'Lịch nguồn VIP GREEN PORT. Dùng chung dữ liệu bến cho VGR và VSC; không phải hai tập sự kiện khác nhau.'},
 nam_hai_dinh_vu:{name:'Nam Hải Đình Vũ',start:'2025-01-01',note:'Lịch nguồn NAM HAI DINH VU; không gồm Nam Hải, Nam Đình Vũ hoặc Đình Vũ/DVP.'},
 vimc_dinh_vu:{name:'VIMC Đình Vũ',start:'2025-01-01',note:'Lịch nguồn VIMC. Cảng công bố Viconship là cổ đông lớn; không suy tỷ lệ sở hữu hoặc phạm vi hợp nhất.'},
} as const;
export const issuerPlanScopes={
 VGR:{vgr:{...vscBerths.vip_green_port,name:'Tổng quan VGR · 1 cảng'},vip_green_port:vscBerths.vip_green_port},
 VSC:{vsc:{name:'Tổng quan VSC · 4 cảng',start:'2025-01-01',note:'Tổng lịch tại Greenport, VIP Greenport, Nam Hải Đình Vũ và VIMC Đình Vũ theo phạm vi quan hệ đã đối chiếu. Không phải sản lượng hay doanh thu hợp nhất; không điều chỉnh theo tỷ lệ vốn. Quan hệ được đối chiếu hiện tại, chưa xác nhận lịch sử hiệu lực sở hữu.'},...vscBerths},
} as const;
export type VscTicker=keyof typeof issuerPlanScopes;
export const isVscTicker=(value:string):value is VscTicker=>Object.hasOwn(issuerPlanScopes,value);
export function issuerPlanSeries(days:TanVuPlanDay[],ticker:VscTicker,asset:string,direction:PlanDirection='departure',now=new Date(),run:TanVuPlanRun|null=null){
 const scopes:Record<string,{name:string;start:string;note:string}>=issuerPlanScopes[ticker];
 const scope=scopes[asset];if(!scope)throw new Error('Unknown issuer scope');
 return {...tanvuPlanSeries(days.filter(d=>d.report_day>=scope.start),direction,now,run),asset,ticker,name:scope.name,scope_note:scope.note};
}
export function issuerPlanAssets(ticker:VscTicker,asset:string):string[]{
 if(!Object.hasOwn(issuerPlanScopes[ticker],asset))throw new Error('Unknown issuer scope');
 return asset==='vsc'?Object.keys(vscBerths):asset==='vgr'?['vip_green_port']:[asset];
}
