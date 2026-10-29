import {expect,it} from 'vitest';
import {tclActivity,tclBerthSeries,isTclScope,southTargets} from '@invest/port';
import {tclBerthData} from '../packages/modules/port/src/tcl-berth-data';
import {pairedYtd} from '../apps/web/src/lib/paired-ytd';
it('keeps reported averages out of observed month, cargo and comparison totals',()=>{
 const reference=tclActivity().reference_figures[0];expect(reference).toMatchObject({value:200000,approximate:true,additive:false,measurement_kind:'reported_average',observation_month:null});
 expect(tclActivity('tcl_nhon_trach').reference_figures).toEqual([]);expect(tclActivity('tcl_cat_lai').reference_figures).toEqual([]);
 expect(isTclScope('sgp')).toBe(false);expect(southTargets.find(t=>t.ticker==='TCL')?.assets).toEqual([]);
});
it('counts only operator-reported TNT berth times with provenance and no fabricated DWT',()=>{
 const events=tclBerthData.events;expect(events.length).toBeGreaterThan(0);
 expect(new Set(events.map(e=>e.key)).size).toBe(events.length);
 const counts={arrival:0,departure:0};
 for(const e of events){expect(e.site_id).toBe('TNT');expect(e.raw.SITE_ID.trim()).toBe('TNT');expect(e.raw_time).not.toContain('EST:');expect(e.dwt).toBeNull();expect(e.sha256).toMatch(/^[a-f0-9]{64}$/);expect(e.source_url).toBe('https://eport.tcis.co/Ships');counts[e.direction]++;}
 for(const direction of ['arrival','departure'] as const){
  const s=tclBerthSeries(events,direction,new Date(Date.parse(tclBerthData.events.map(e=>e.day).sort().at(-1)!+'T12:00:00+07:00')+86400000));
  expect(s.ytd.current.known_rows).toBe(counts[direction]);expect(s.ytd.current.observed_dwt).toBeNull();expect(s.ytd.current.dwt).toBeNull();expect(s.movement_scope).toBe('berth');expect(s.actual_verified).toBe(false);
 }
});
it('does not turn missing prior observations or days into zero-growth comparisons',()=>{
 const series=tclBerthSeries(tclBerthData.events,'departure',new Date(Date.parse(tclBerthData.events.map(e=>e.day).sort().at(-1)!+'T12:00:00+07:00')+86400000));
 const pair=pairedYtd(series,'2026','rows');expect(pair.current.observed_days).toBe(0);expect(pair.yoy.rows).toBeNull();
 const before=tclBerthSeries(tclBerthData.events,'arrival',new Date('2026-01-01T01:00:00+07:00'));expect(before.ytd.current.observed_days).toBe(0);expect(before.ytd.current.observed_dwt).toBeNull();
});
