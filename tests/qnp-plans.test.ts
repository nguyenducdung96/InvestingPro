import {expect,it} from 'vitest';
import {qnpBulletins,qnpReviewedEvents,qnpPlanSeries,qnpKind,centralOverview,type QnpBulletin} from '@invest/port';
const now=new Date('2026-10-25T03:00:00Z');
it('keeps TCQN, roadsteads, unknown labels and transfers out of QNP arrival/departure counts',()=>{
 const row={time:'2026-10-05T16:00:00+07:00',vessel:'TEST',dwt:100,from:'P0',to:'C3N'};
 expect(qnpKind(row)).toBe('arrival');expect(qnpKind({...row,from:'C3',to:'P0'})).toBe('departure');
 expect(qnpKind({...row,to:'TCQN'})).toBe('unmapped');expect(qnpKind({...row,to:'TC TL'})).toBe('unmapped');expect(qnpKind({...row,from:'P16'})).toBe('unmapped');
 expect(qnpKind({...row,from:'1A TL'})).toBe('internal');
});
it('uses the image issue date and replaces overlapping plan editions including shifted/deleted rows',()=>{
 const rows=qnpReviewedEvents(qnpBulletins),maersk=rows.filter(r=>r.vessel==='MAERSK XIAMEN');
 expect(maersk.some(r=>r.time==='2025-10-24T20:30:00+07:00')).toBe(false);
 expect(maersk.some(r=>r.time==='2025-10-24T22:30:00+07:00')).toBe(true);
 expect(rows.some(r=>r.vessel==='CNC PLUTO')).toBe(false);
 expect(rows[0].source).not.toHaveProperty('rows');
 expect(rows.find(r=>r.source.issued_on==='2026-10-07')?.source.published_at).toMatch(/^2026-10-12/);
});
it('sums recorded rows and DWT without certifying full coverage; YTD includes the partial month',()=>{
 const series=qnpPlanSeries(qnpBulletins,'departure',now),oct=series.months.find(m=>m.period==='2026-10')!;
 expect(oct.current.known_rows).toBe(8);expect(oct.current.observed_dwt).toBe(88452);
 expect(oct.current.rows).toBeNull();expect(oct.current.dwt).toBeNull();expect(oct.current.complete).toBe(false);
 expect(series.ytd.current.observed_dwt).toBe(oct.current.observed_dwt);expect(series.actual_verified).toBe(false);expect(series.history_complete).toBe(false);
 expect(series.months.find(m=>m.period==='2026-09')?.current.observed_dwt).toBeNull();
});
it('preserves missing DWT and does not invent a zero for an absent direction or period',()=>{
 const seed=qnpBulletins.find(b=>b.issued_on==='2026-10-11')!;
 const bulletin:QnpBulletin={...seed,rows:[{...seed.rows[0],dwt:null}]};
 const arrivals=qnpPlanSeries([bulletin],'arrival',now).months.at(-1)!;
 expect(arrivals.current.known_rows).toBe(1);expect(arrivals.current.observed_dwt).toBeNull();expect(arrivals.current.missing_dwt).toBe(1);
 const departure=qnpPlanSeries([bulletin],'departure',now).months.at(-1)!;
 expect(departure.current.observed_days).toBe(0);expect(departure.current.observed_dwt).toBeNull();
});
it('adds QNP to central selection without mixing CDN or certifying a regional total',()=>{
 const overview=centralOverview([],{period:'2026-10'},now,null,qnpBulletins);
 expect(overview.scope.connected_issuers).toBe(2);expect(overview.scope.regional_total).toBeNull();
 expect(overview.rows[0].metric).toBeNull();expect(overview.rows[1].metric?.current.observed_dwt).toBe(qnpPlanSeries(qnpBulletins,'departure',now).months.at(-1)?.current.observed_dwt);
 expect(overview.rows[1].status).toBe('reviewed_subset');expect(overview.rows.slice(2).every(r=>r.metric===null)).toBe(true);
});
it('rejects invalid dates, out-of-window rows, duplicated keys and altered provenance',()=>{
 const seed=qnpBulletins[0];
 for(const b of [{...seed,sha256:'bad'},{...seed,rows:[seed.rows[0],seed.rows[0]]},{...seed,rows:[{...seed.rows[0],time:'2026-10-01T16:00:00+07:00'}]},{...seed,rows:[{...seed.rows[0],dwt:0}]}])expect(()=>qnpReviewedEvents([b])).toThrow();
});
