import {tanvuPlanSeries,type TanVuPlanDay,type TanVuPlanRun,type PlanDirection} from './tanvu-plans';
export const dvpPlanScopes={dinh_vu:{name:'Đình Vũ',start:'2025-01-01',note:'Lịch Bến cảng Đình Vũ (DVP), gồm phạm vi hai cầu cảng. Nguồn không tách từng cầu; không gồm Nam Đình Vũ, Nam Hải Đình Vũ, PTSC hay Euro Đình Vũ.'}} as const;
export function dvpPlanSeries(days:TanVuPlanDay[],asset:'dinh_vu'='dinh_vu',direction:PlanDirection='departure',now=new Date(),run:TanVuPlanRun|null=null){
 return {...tanvuPlanSeries(days.filter(d=>d.report_day>=dvpPlanScopes[asset].start),direction,now,run),asset,ticker:'DVP',name:dvpPlanScopes[asset].name,scope_note:dvpPlanScopes[asset].note};
}
