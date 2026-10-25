import {describe,it,expect} from 'vitest';
import {pdnPlanSeries,pdnIncludes,type PdnDay} from '../packages/modules/port/src/pdn-plans';
const day=(day:string,rows=2,dwt:number|null=100,missing=0):PdnDay=>({day,sha256:'a'.repeat(64),checked_at:'2026-10-25T00:00:00Z',source_errors:[],assets:{pdn_long_binh_tan:{arrival:[rows,dwt,missing],departure:[rows,dwt,missing]}}});
const now=new Date('2026-10-25T10:00:00+07:00');
describe('PDN recorded berth plans',()=>{
 it('keeps partial recorded totals and prior comparison with strict totals unavailable',()=>{
  const s=pdnPlanSeries([day('2025-10-01',1,50),day('2026-10-02',2,100,1)],'arrival',now),p=s.months.at(-1)!;
  expect(p.current.observed_dwt).toBe(100);expect(p.prior.observed_dwt).toBe(50);expect(p.current.known_rows).toBe(2);expect(p.current.missing_dwt).toBe(1);expect(p.current.dwt).toBeNull();expect(p.current.rows).toBeNull();expect(p.status).toBe('partial');expect(p.current.through).toBe('2026-10-24');
 });
 it('does not turn an empty terminal or all unknown DWT into zero',()=>{
  const s=pdnPlanSeries([day('2026-09-01',2,null,2),day('2026-10-01',0,null)],'departure',now);
  expect(s.months.at(-1)!.current.observed_days).toBe(0);expect(s.months.at(-1)!.current.observed_dwt).toBeNull();expect(s.months.at(-2)!.current.observed_dwt).toBeNull();
 });
 it('sums available disjoint terminals but keeps missing parts unavailable',()=>{
  const d=day('2026-10-01');d.assets.pdn_go_dau_a={arrival:[1,50,0],departure:[0,null,0]};
  expect(pdnPlanSeries([d],'arrival',now).ytd.current.observed_dwt).toBe(150);
  expect(pdnPlanSeries([d],'arrival',now,'pdn_go_dau').ytd.current.known_rows).toBe(1);
  expect(pdnPlanSeries([d],'departure',now,'pdn_go_dau_b').ytd.current.observed_dwt).toBeNull();
 });
 it('keeps directions, cutoff, and Gò Dầu children distinct',()=>{
  const d=day('2026-10-24');d.assets.pdn_long_binh_tan!.arrival=[0,null,0];
  expect(pdnPlanSeries([d,day('2026-10-25')],'arrival',now).ytd.current.observed_days).toBe(0);
  expect(pdnIncludes('pdn_go_dau','pdn_long_binh_tan')).toBe(false);expect(pdnIncludes('pdn_go_dau','pdn_go_dau_b')).toBe(true);
  expect(pdnPlanSeries([d],'departure',now)).toMatchObject({actual_verified:false,full_scope_certified:false,movement_scope:'berth'});
 });
});
