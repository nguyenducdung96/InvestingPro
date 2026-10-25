import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {napDaily,napHistoryMetadata,napActivitySeries,napVisitEvents,loadNapJournal,centralOverview,type NapDay} from '@invest/port';
const ledger=JSON.parse(readFileSync('docs/catalog-review/nap-history-ledger.json','utf8'));
const now=new Date(Date.parse(ledger.cutoff+'T00:00:00Z')+86400000),fixtureNow=new Date('2026-10-25T04:00:00Z');
it('matches the independent recorded ledger for both terminals and the issuer, in both directions',()=>{
 for(const asset of ['nap','nap_cua_lo','nap_ben_thuy'] as const)for(const direction of ['arrival','departure'] as const){
  const series=napActivitySeries(napDaily,direction,now,asset);expect(series.months.length).toBeGreaterThanOrEqual(22);
  for(const p of series.months){const expected=ledger.monthly[p.period+'/'+asset+'/'+direction];expect(p.current.known_rows).toBe(expected?.rows??0);if(expected?.dwt!=null)expect(p.current.observed_dwt).toBeCloseTo(expected.dwt,5);else expect(p.current.observed_dwt).toBeNull();expect(p.current.rows).toBeNull();expect(p.current.dwt).toBeNull();expect(p.current.missing_dwt).toBe(expected?.missing_dwt??0);}
  const ytd=series.months.filter(p=>p.period.startsWith(series.cutoff.slice(0,4)));expect(series.ytd.current.observed_dwt).toBeCloseTo(ytd.reduce((n,p)=>n+(p.current.observed_dwt??0),0),5);
  expect(series.semantics).toBe('authority_reported_terminal_activity');expect(series.actual_verified).toBe(false);
 }
});
it('keeps daily source precision and links to the actual workbook rather than a planned timetable',async()=>{
 const visits=await loadNapJournal('2026-10');expect(visits.length).toBeGreaterThan(20);
 const events=napVisitEvents(visits,'2026-10-23');expect(events.length).toBeGreaterThan(0);
 expect(events.every(e=>e.time===null&&e.precision==='day')).toBe(true);
 const known=events.find(e=>e.vessel==='SHUO LONG 19'&&e.kind==='departure');expect(known?.dwt).toBe(12834.7);expect(known?.gt).toBe(7877);
 expect(known?.source.attachment_url).toMatch(/^https:\/\/cangvuhanghainghean\.gov\.vn\/images\/uploads\/attach\/.+\.xlsx$/);
 expect(known?.source.sha256).toMatch(/^[a-f0-9]{64}$/);expect(known?.raw.G.value).toBe(12834.7);
 expect(await loadNapJournal('not-a-month')).toEqual([]);
 const july=await loadNapJournal('2026-07'),persisted=napVisitEvents(july,'2026-07-10').find(e=>e.vessel==='VTT 36'&&e.kind==='departure');
 expect(persisted?.source.id).toBe(5802);expect(persisted?.dwt).toBe(3570.6);expect(persisted?.source.report_day).toBe('2026-07-10');
 const visit=july.find(v=>v.vessel==='VTT 36'&&v.departure?.day==='2026-07-10');expect(visit?.reported_departure).toBeNull();expect(visit?.raw.I).toBeUndefined();
});
it('sums terminal contributions without double-counting vessel persistence in daily reports',()=>{
 expect(napHistoryMetadata.repeated_visit_rows).toBeGreaterThan(2000);expect(napHistoryMetadata.unique_visits).toBeLessThan(napHistoryMetadata.source_rows);
 for(const direction of ['arrival','departure'] as const){
  const a=napActivitySeries(napDaily,direction,now,'nap_cua_lo'),b=napActivitySeries(napDaily,direction,now,'nap_ben_thuy'),all=napActivitySeries(napDaily,direction,now);
  expect(all.ytd.current.known_rows).toBe(a.ytd.current.known_rows+b.ytd.current.known_rows);expect(all.ytd.current.observed_dwt).toBeCloseTo((a.ytd.current.observed_dwt??0)+(b.ytd.current.observed_dwt??0),5);
 }
});
it('keeps absent directions, missing weights and periods unavailable without certifying scope completeness',()=>{
 const row:NapDay={day:'2026-10-03',asset:'nap_cua_lo',arrival_rows:1,departure_rows:null,arrival_dwt:null,departure_dwt:null,arrival_missing:1,departure_missing:0};
 const arrival=napActivitySeries([row],'arrival',fixtureNow);expect(arrival.ytd.current.known_rows).toBe(1);expect(arrival.ytd.current.observed_dwt).toBeNull();expect(arrival.ytd.current.missing_dwt).toBe(1);
 const departure=napActivitySeries([row],'departure',fixtureNow);expect(departure.ytd.current.observed_days).toBe(0);expect(departure.ytd.current.observed_dwt).toBeNull();
 expect(()=>napActivitySeries([row,row],'arrival',now)).toThrow('Duplicate');expect(()=>napActivitySeries([{...row,arrival_dwt:100}],'arrival',now)).toThrow();
});
it('keeps regional NAP cells equal to full issuer month/quarter comparisons without a regional total',()=>{
 for(const direction of ['arrival','departure'] as const){
  const full=napActivitySeries(napDaily,direction,now);
  for(const [frequency,period] of [['month','2025-02'],['month','2026-10'],['quarter','2025-Q4'],['quarter','2026-Q4']] as const){
   const data=centralOverview([],{frequency,period,direction},now,null,[],[],null,napDaily,napHistoryMetadata.checked_at);
   expect(data.scope.connected_issuers).toBe(2);expect(data.scope.regional_total).toBeNull();expect(data.rows.find(r=>r.ticker==='NAP')?.metric).toEqual((frequency==='month'?full.months:full.quarters).find(p=>p.period===period));
  }
 }
});
