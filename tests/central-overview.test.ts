import {cdnCompletedComparison,observedGrowth,cdnPeriodDisplay} from '../apps/web/src/lib/cdn-comparison';
import {expect,it} from 'vitest';
import {centralOverview,issuerPlanAssets,issuerPlanSeries,type TanVuPlanDay} from '@invest/port';
const now=new Date('2026-10-24T00:00:00Z');
const rows=[2025,2026].flatMap(y=>Array.from({length:23},(_,i):TanVuPlanDay=>({report_day:`${y}-10-${String(i+1).padStart(2,'0')}`,version_id:'test',source_sha256:'a'.repeat(64),source_url:null,parser_version:null,last_success:now.toISOString(),last_attempt:now.toISOString(),source_error:null,arrival_rows:2,departure_rows:1,arrival_dwt:200,departure_dwt:100,arrival_dwt_missing:0,departure_dwt_missing:0,ambiguous_groups:0,source_empty_sections:[]})));
it('CDN overview and terminal use one Tien Sa dataset, with five central targets retained',()=>{
 expect(issuerPlanAssets('CDN','cdn')).toEqual(['tien_sa']);expect(()=>issuerPlanAssets('CDN','hai_an')).toThrow();
 const data=centralOverview(rows,{},now);expect(data.rows.map(r=>r.ticker)).toEqual(['CDN','QNP','CMP','NAP','GMD']);expect(data.scope.connected_issuers).toBe(1);expect(data.scope.regional_total).toBeNull();
 expect(data.rows[0].metric).toEqual(issuerPlanSeries(rows,'CDN','tien_sa','departure',now).months.at(-1));expect(data.rows.slice(1).every(r=>r.metric===null)).toBe(true);expect(data.rows.at(-1)?.href).toContain('central_asset=gemadept_dung_quat');
});
it('missing DWT preserves observed counts and count YoY without turning plans into actuals',()=>{
 const missing=rows.map(d=>({...d,departure_dwt:null,departure_dwt_missing:1}));const data=centralOverview(missing,{},now);
 expect(data.rows[0].metric?.current.rows).toBe(23);expect(data.rows[0].metric?.current.dwt).toBeNull();expect(data.rows[0].metric?.yoy.rows).toBe(0);expect(data.actual_verified).toBe(false);
 expect(centralOverview([],{},now).rows.every(r=>r.metric===null)).toBe(true);
});
it('sums known row weights on incomplete days without certifying totals or inventing DWT for unknown rows',()=>{
 const days=rows.map(d=>({...d,departure_rows:2,departure_dwt:null,departure_dwt_missing:1,departure_known_dwt:100}));
 const period=centralOverview(days,{},now).rows[0].metric!;
 expect(period.current.known_dwt).toBe(2300);expect(period.current.observed_dwt).toBe(2300);
 expect(period.current.dwt).toBeNull();expect(period.yoy.dwt).toBeNull();expect(period.current.rows).toBe(46);
 const unknown=rows.map(d=>({...d,departure_dwt:null,departure_dwt_missing:1,departure_known_dwt:0}));
 expect(centralOverview(unknown,{},now).rows[0].metric?.current.observed_dwt).toBeNull();
});
it('CDN arrival conflicts do not suppress the independently valid departure series',()=>{
 const days=rows.map(d=>({...d,ambiguous_groups:1,arrival_ambiguous_groups:1,departure_ambiguous_groups:0}));
 const departure=centralOverview(days,{},now).rows[0].metric!;
 expect(departure.current.rows).toBe(23);expect(departure.current.dwt).toBe(2300);
 const arrival=centralOverview(days,{direction:'arrival'},now).rows[0].metric!;
 expect(arrival.current.rows).toBeNull();expect(arrival.current.dwt).toBeNull();expect(arrival.current.observed_dwt).toBe(4600);
});
it('CDN recorded YTD equals monthly subtotals even when weights or prior report days are missing',()=>{
 const cutoff='2026-10-23',start=Date.parse('2026-01-01'),end=Date.parse(cutoff);
 const current=Array.from({length:(end-start)/86400000+1},(_,i)=>({...rows[0],report_day:new Date(start+i*86400000).toISOString().slice(0,10),departure_rows:2,departure_dwt:i<10?null:100,departure_dwt_missing:i<10?1:0,departure_known_dwt:100}));
 const prior=current.filter(d=>!d.report_day.endsWith('10-22')).map(d=>({...d,report_day:'2025'+d.report_day.slice(4),departure_dwt_missing:0,departure_dwt:100}));
 const series=issuerPlanSeries([...prior,...current],'CDN','cdn','departure',now);
 const months=series.months.filter(m=>m.period.startsWith('2026'));
 expect(series.ytd.current.observed_dwt).toBe(months.reduce((n,m)=>n+(m.current.observed_dwt??0),0));
 expect(series.ytd.current.missing_days).toHaveLength(0);expect(series.ytd.current.missing_dwt).toBe(10);
 expect(series.ytd.current.dwt).toBeNull();expect(series.ytd.prior.missing_days).toEqual(['2025-10-22']);expect(series.ytd.yoy.dwt).toBeNull();
});

it('CDN investment comparison uses recorded weights in finished paired months and excludes the updating month',()=>{
 const seed=issuerPlanSeries(rows,'CDN','cdn','departure',now).months.at(-1)!;
 const month=(period:string,current:number|null,prior:number|null,partial=false)=>({...seed,period,status:partial?'partial' as const:'closed' as const,current:{...seed.current,observed_dwt:current,known_rows:10},prior:{...seed.prior,observed_dwt:prior,known_rows:8}});
 const result=cdnCompletedComparison([month('2026-01',120,100),month('2026-02',180,100),month('2026-03',null,90),month('2026-04',90,null),month('2026-10',1000,100,true)],'2026');
 expect(result.months).toEqual([1,2]);expect(result.current).toBe(300);expect(result.prior).toBe(200);expect(result.growth).toBe(50);
 expect(cdnCompletedComparison([month('2026-01',100,90,true)],'2026').current).toBeNull();
 expect(observedGrowth(0,100)).toBe(-100);expect(observedGrowth(100,0)).toBeNull();expect(observedGrowth(null,100)).toBeNull();
});

it('central CDN presentation shows observed DWT and growth despite missing days or row weights',()=>{
 const base=issuerPlanSeries(rows,'CDN','cdn','departure',now).months.at(-1)!;
 const metric={...base,current:{...base.current,rows:null,dwt:null,known_rows:114,observed_dwt:1981502.67},prior:{...base.prior,rows:null,dwt:null,known_rows:98,observed_dwt:1788726.18}};
 const display=cdnPeriodDisplay(metric);
 expect(display.rows).toBe(114);expect(display.dwt).toBe(1981502.67);expect(display.priorDwt).toBe(1788726.18);expect(display.yoyDwt).toBeCloseTo(10.78,2);expect(display.yoyRows).toBeCloseTo(16.33,2);
 expect(cdnPeriodDisplay(null)).toEqual({rows:null,dwt:null,priorDwt:null,yoyRows:null,yoyDwt:null});expect(metric.current.dwt).toBeNull();
});
