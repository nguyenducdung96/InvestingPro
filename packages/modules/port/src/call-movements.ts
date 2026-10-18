import type {PortCall} from '@invest/domain';
export const isBerthCallSource=(id:string)=>id==='danang-berth-reported';
export function splitCallMovements(rows:PortCall[]){
 return {port:rows.filter(r=>!isBerthCallSource(r.source_area)&&r.time_basis!=='berth_movement'&&r.movement_scope!=='berth'),
  berth:rows.filter(r=>isBerthCallSource(r.source_area)||r.time_basis==='berth_movement'||r.movement_scope==='berth')};
}
