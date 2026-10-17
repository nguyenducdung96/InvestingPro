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
