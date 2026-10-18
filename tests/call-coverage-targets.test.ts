import {expect,it} from 'vitest';
import {nationwideCallCoverage,SEAPORT_COVERAGE_TARGETS} from '../packages/modules/port/src/call-coverage-targets';
import {CALL_SOURCES} from '../packages/modules/port/src/calls';
import type {PortCall} from '@invest/domain';
it('retains all 34 document targets even when sources have no data',()=>{
 const matrix=nationwideCallCoverage([],[],[]);
 expect(matrix.targets).toHaveLength(34);expect(new Set(matrix.targets.map(t=>t.name)).size).toBe(34);
 expect(matrix.targets.every(t=>!t.complete&&t.status==='missing'&&!t.canonicalMappingVerified)).toBe(true);
 for(const [,sources]of SEAPORT_COVERAGE_TARGETS)for(const source of sources)expect(CALL_SOURCES.some(s=>s.id===source)).toBe(true);
});
it('does not count a regional snapshot as reported events or assert port mapping',()=>{
 const snapshot={source_area:'hcm-in-port',fetched_at:'2026-10-17T15:00:00Z'} as PortCall;
 const matrix=nationwideCallCoverage([],[],[snapshot]);
 expect(matrix.targets.find(t=>t.name==='TP. Hồ Chí Minh')?.status).toBe('snapshot_only');
 expect(matrix.targets.find(t=>t.name==='Bà Rịa - Vũng Tàu')?.status).toBe('snapshot_only');
 expect(matrix.complete).toBe(false);
 expect(matrix.targets.find(t=>t.name==='Quảng Ngãi')?.status).toBe('missing');
});
it('requires the explicit local berth label before extending shared HCM coverage',()=>{
 const row=(berth:string,fetched_at='2026-10-17T15:00:00Z')=>({source_area:'hcm-in-port',berth,fetched_at}) as PortCall;
 const target=(snapshots:PortCall[],name:string)=>nationwideCallCoverage([],[],snapshots).targets.find(t=>t.name===name)!;
 const unrelated=row('BẾN CẢNG CÁT LÁI (TÂN CẢNG) · C.LAI 1');
 expect(target([unrelated],'Long An').status).toBe('missing');
 expect(target([unrelated],'Tiền Giang').candidateSources[0].asOf).toBeNull();
 const local=row('BẾN CẢNG QUỐC TẾ LONG AN · CẦU CẢNG SỐ 2 - QT LONG AN','2026-10-16T15:00:00Z');
 expect(target([unrelated,local],'Long An').status).toBe('snapshot_only');
 expect(target([unrelated,local],'Long An').candidateSources[0].asOf).toBe(local.fetched_at);
 expect(target([row('KHU VUC BIEN TIEN GIANG · KHU VUC BIEN TIEN GIANG')],'Tiền Giang').status).toBe('snapshot_only');
 expect(target([row('KHU VUC BIEN TIEN GIANG KHAC · X')],'Tiền Giang').status).toBe('missing');
 expect(target([local],'Long An').complete).toBe(false);
});
it('does not attribute a Ky Ha snapshot to Da Nang city',()=>{
 const row={source_area:'danang-open-anchorage',berth:'BẾN CẢNG KỲ HÀ · CẦU 1',fetched_at:'2026-10-17T15:00:00Z'} as PortCall;
 const matrix=nationwideCallCoverage([],[],[row]);
 expect(matrix.targets.find(t=>t.name==='Quảng Nam')?.status).toBe('snapshot_only');
 expect(matrix.targets.find(t=>t.name==='Đà Nẵng')?.status).toBe('missing');
});
it('exposes berth activity without certifying reported port arrivals',()=>{
 const row={source_area:'danang-berth-reported',time_basis:'berth_movement',fetched_at:'2026-10-18T03:00:00Z'} as PortCall;
 const target=nationwideCallCoverage([],[],[],[row]).targets.find(t=>t.name==='Đà Nẵng')!;
 expect(target.status).toBe('partial_berth');expect(target.complete).toBe(false);
 expect(target.candidateSources.some(s=>s.hasEventsInRange)).toBe(false);
});
