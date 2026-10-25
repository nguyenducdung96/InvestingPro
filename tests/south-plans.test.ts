import {describe,it,expect} from 'vitest';
import {southPlanDays,southSeries,southAssets,southTargets,type SouthDay} from '../packages/modules/port/src/south-plans';
const make=(day:string,rows=2,dwt:number|null=100,missing=0):SouthDay=>({day,sha256:'a'.repeat(64),checked_at:'2026-10-25T00:00:00Z',last_attempt:'2026-10-25T00:00:00Z',error:null,assets:{gemalink:{arrival:[rows,dwt,missing],departure:[rows,dwt,missing]}},rejected:0,internal:5});
const now=new Date('2026-10-25T08:00:00+07:00');
describe('southern authority plans',()=>{
 it('retains recorded partial totals and YoY while strict totals remain unavailable',()=>{
  const days=southPlanDays([make('2025-10-01',1,50),make('2026-10-02',2,100,1)],'gemalink');
  const s=southSeries({gemalink:days},['gemalink'],'departure',now),p=s.months.find(m=>m.period==='2026-10')!;
  expect(p.current.dwt).toBeNull();expect(p.current.known_rows).toBe(2);expect(p.current.observed_dwt).toBe(100);expect(p.prior.observed_dwt).toBe(50);expect(p.current.missing_dwt).toBe(1);expect(p.status).toBe('partial');expect(p.current.through).toBe('2026-10-24');
 });
 it('keeps no observations and all missing weights unavailable',()=>{
  const empty=make('2026-10-01');empty.assets={};
  const days=southPlanDays([empty,make('2026-09-01',1,null,1)],'gemalink');
  const s=southSeries({gemalink:days},['gemalink'],'departure',now);
  expect(s.months.find(m=>m.period==='2026-10')?.current.observed_days).toBe(0);
  expect(s.months.find(m=>m.period==='2026-10')?.current.observed_dwt).toBeNull();
  expect(s.months.find(m=>m.period==='2026-09')?.current.observed_dwt).toBeNull();
 });
 it('does not infer an arrival from a departure-only day or count internal rows',()=>{
  const day=make('2026-10-01');day.assets.gemalink!.arrival=[0,null,0];
  const groups={gemalink:southPlanDays([day],'gemalink')};
  expect(southSeries(groups,['gemalink'],'arrival',now).ytd.current.observed_days).toBe(0);
  expect(southSeries(groups,['gemalink'],'departure',now).ytd.current.known_rows).toBe(2);
 });
 it('retains available member contributions without certifying the multi-port scope',()=>{
  const s=southSeries({gemalink:southPlanDays([make('2026-10-01',2,100,1)],'gemalink')},['nam_dinh_vu','gemalink'],'departure',now);
  expect(s.ytd.current.known_rows).toBe(2);expect(s.ytd.current.observed_dwt).toBe(100);expect(s.ytd.current.missing_dwt).toBe(1);expect(s.full_scope_certified).toBe(false);expect(s.ytd.current.dwt).toBeNull();
 });
 it('has unique exact berth aliases and no regional total or pending fake observations',()=>{
  const aliases=Object.values(southAssets).flatMap(a=>[...a.aliases]);expect(new Set(aliases).size).toBe(aliases.length);
  expect(southTargets.filter(t=>t.status==='pending').every(t=>t.assets.length===0)).toBe(true);
 });
});
