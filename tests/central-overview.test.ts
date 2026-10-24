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
