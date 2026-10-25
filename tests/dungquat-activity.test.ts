import {expect,it} from 'vitest';
import {centralOverview,dungquatActivitySeries,dungquatEvents,dungquatHistory,type DungquatEvent} from '@invest/port';
import {cdnPeriodDisplay,observedGrowth} from '../apps/web/src/lib/cdn-comparison';

const now=new Date('2026-10-25T05:00:00Z');
const seed:DungquatEvent={...dungquatHistory.events[1]};

it('uses event date, preserves missing weight, and never adds the authority position observation',()=>{
 const series=dungquatActivitySeries(dungquatHistory.events,'arrival',now);
 const feb=series.months.find(m=>m.period==='2025-02')!;
 expect(cdnPeriodDisplay(feb)).toMatchObject({rows:1,dwt:null});
 expect(feb.current.missing_dwt).toBe(1);
 expect(series.months.find(m=>m.period==='2022-06')?.current.observed_dwt).toBe(49602);
 expect(series.days.some(d=>d.day==='2026-06-11')).toBe(false);
 expect(series.months.at(-1)?.period).toBe('2026-10');
 expect(series.months.at(-1)?.status).toBe('partial');
 expect(cdnPeriodDisplay(series.months.at(-1)!)).toMatchObject({rows:null,dwt:null});
 expect(series.months.every(m=>m.current.rows===null&&m.current.dwt===null)).toBe(true);
});

it('has no departures, and no observations remain unavailable rather than zero',()=>{
 const series=dungquatActivitySeries(dungquatHistory.events,'departure',now);
 expect(series.months.length).toBeGreaterThan(40);
 expect(series.months.every(m=>cdnPeriodDisplay(m).rows===null&&m.current.observed_dwt===null)).toBe(true);
 expect(series.ytd.current.observed_days).toBe(0);
 expect(series.days).toEqual([]);
});

it('displays partial recorded sums and YoY from positive displayed prior values',()=>{
 const rows=[{...seed,key:'prior',day:'2025-02-10',dwt:100},
  {...seed,key:'current',day:'2026-02-10',dwt:150},
  {...seed,key:'missing-weight',vessel:'ANOTHER TEST VESSEL',day:'2026-02-12',dwt:null}];
 const series=dungquatActivitySeries(rows,'arrival',now),feb=series.months.find(m=>m.period==='2026-02')!;
 expect(cdnPeriodDisplay(feb)).toMatchObject({rows:2,dwt:150,priorDwt:100,yoyDwt:50,yoyRows:100});
 expect(feb.current.dwt).toBeNull();expect(feb.current.missing_dwt).toBe(1);
 expect(series.ytd.current.observed_dwt).toBe(150);
 expect(observedGrowth(series.ytd.current.observed_dwt,series.ytd.prior.observed_dwt)).toBe(50);
 expect(series.quarters.find(q=>q.period==='2026-Q1')?.current.known_rows).toBe(2);
});

it('deduplicates the same physical event across disclosures and keeps conflicting weights unavailable',()=>{
 const input=[{...seed,dwt:100},{...seed,key:'other-article',vessel:' SPRING   BREEZE ',dwt:200}];
 const events=dungquatEvents(input,now);
 expect(events).toHaveLength(1);expect(events[0].sources).toHaveLength(2);expect(events[0].dwt).toBeNull();
 expect(dungquatActivitySeries(input,'arrival',now).months.find(m=>m.period==='2025-02')?.current.known_rows).toBe(1);
 expect(input[0].dwt).toBe(100);
});

it('rejects invalid dates, fabricated midnight times, invalid weights and wrong source scope',()=>{
 for(const event of [{...seed,day:'2025-02-30'},{...seed,dwt:0},{...seed,time:'00:00'},
  {...seed,source:{...seed.source,url:'https://other.example.com/'}}]){
  expect(()=>dungquatEvents([event as DungquatEvent],now)).toThrow();
 }
 expect(dungquatEvents([{...seed,day:'2026-10-26'}],now)).toEqual([]);
});

it('regional cells use the same disclosed values without certifying a regular series',()=>{
 const data=centralOverview([],{period:'2025-02',direction:'arrival'},now,null,[],[],null,[],null,dungquatHistory.events);
 const row=data.rows.find(r=>r.ticker==='GMD')!;
 expect(row.status).toBe('reviewed_subset');expect(row.semantics).toBe('operator_disclosed_terminal_activity');
 expect(cdnPeriodDisplay(row.metric)).toMatchObject({rows:1,dwt:null});
 expect(data.scope.connected_issuers).toBe(1);expect(data.scope.disclosed_issuers).toBe(1);expect(data.scope.regional_total).toBeNull();
 expect(row.href).toContain('central_asset=gemadept_dung_quat');
});
