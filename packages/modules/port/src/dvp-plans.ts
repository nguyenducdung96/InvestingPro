import {tanvuPlanSeries,type TanVuPlanDay,type TanVuPlanRun,type PlanDirection} from './tanvu-plans';
const dinhVuScope={name:'Đình Vũ',start:'2025-01-01',note:'Lịch Bến cảng Đình Vũ (DVP), gồm phạm vi hai cầu cảng. Nguồn không tách từng cầu; không gồm Nam Đình Vũ, Nam Hải Đình Vũ, PTSC hay Euro Đình Vũ.'} as const;
export const dvpPlanScopes={dvp:{...dinhVuScope,name:'Tổng quan DVP · 1 cảng'},dinh_vu:dinhVuScope} as const;
export type DvpPlanScope=keyof typeof dvpPlanScopes;
export const isDvpPlanScope=(value:string):value is DvpPlanScope=>Object.hasOwn(dvpPlanScopes,value);
export function dvpPlanSeries(days:TanVuPlanDay[],asset:DvpPlanScope='dvp',direction:PlanDirection='departure',now=new Date(),run:TanVuPlanRun|null=null){
 return {...tanvuPlanSeries(days.filter(d=>d.report_day>=dvpPlanScopes[asset].start),direction,now,run),asset,ticker:'DVP',name:dvpPlanScopes[asset].name,scope_note:dvpPlanScopes[asset].note};
}
