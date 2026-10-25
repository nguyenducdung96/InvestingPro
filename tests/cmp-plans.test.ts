import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {cmpBulletins,cmpHistoryMetadata,cmpEvents,cmpPlanSeries,cmpKind,cmpBerthScope,centralOverview,qnpAuthorityBulletins,qnpPlanSeries,type CmpBulletin} from '@invest/port';
const now=new Date('2026-10-25T03:00:00Z');
const seed=cmpBulletins.find(b=>b.day==='2026-10-24'&&!b.supplement)!;
const ledger=JSON.parse(readFileSync('docs/catalog-review/cmp-history-ledger.json','utf8'));
it('matches the independent Python ledger in every month and both directions',()=>{
 for(const direction of ['arrival','departure'] as const){
  const series=cmpPlanSeries(cmpBulletins,direction,now);
  for(const period of series.months){const expected=ledger.monthly[period.period+'/'+direction];expect(period.current.known_rows,period.period+direction).toBe(expected.rows);expect(period.current.observed_dwt).toBeCloseTo(expected.known_dwt,5);expect(period.current.missing_dwt).toBe(expected.missing_dwt);}
 }
});
it('maps only reviewed CMP berths, excludes alongside labels and separates transfers',()=>{
 for(const label of ['Bến số 1','Cầu cảng số 1-Tuyến mép bến phía biển','Cầu cảng số 1 - Tuyến mép bến phía bờ'])expect(cmpBerthScope(label)).toBe('cmp_cau1');
 expect(cmpBerthScope('Cầu cảng số 2')).toBe('cmp_cau2');
 for(const label of ['Cầu cảng số 3','Cầu cảng số 12','Cập mạn tàu TEST (Cầu cảng số 2)','Cầu 120M'])expect(cmpBerthScope(label)).toBeNull();
 const r=seed.rows[0];expect(cmpKind({...r,from:'Cầu cảng số 1',to:'Cầu cảng số 2'})).toBe('internal');
 expect(cmpKind({...r,from:'Cập mạn tàu TEST (Cầu cảng số 2)',to:'Cầu cảng số 1'})).toBe('unmapped');
});
it('retains regular and supplementary movements, collapses exact repeats and quarantines DWT conflicts',()=>{
 const regular={...seed,rows:[seed.rows[0]]};
 expect(cmpEvents([regular,{...regular,supplement:true}])).toHaveLength(1);
 const conflict=cmpEvents([regular,{...regular,rows:[{...regular.rows[0],dwt:1}]}]);
 expect(conflict[0].dwt).toBeNull();expect(conflict[0].conflicting_dwt).toBe(true);
 const day=cmpEvents(cmpBulletins).filter(e=>e.time.startsWith('2026-10-24'));
 expect(day.filter(e=>e.kind==='arrival').map(e=>e.vessel)).toEqual(['WORLD SWAN II','ĐÔNG BẮC 22-08']);
 expect(day.filter(e=>e.kind==='departure').map(e=>e.dwt)).toEqual([24260,3215]);
 expect(day.find(e=>e.time.includes('21:30'))?.kind).toBe('unmapped');
});
it('shows recorded monthly/quarterly/YTD values with strict totals left unavailable',()=>{
 const series=cmpPlanSeries(cmpBulletins,'departure',now);
 expect(cmpHistoryMetadata.documents).toBeGreaterThan(600);expect(series.months).toHaveLength(22);
 expect(series.months.every(m=>(m.current.known_rows??0)>0)).toBe(true);
 expect(series.months.every(m=>m.current.dwt===null&&m.current.rows===null)).toBe(true);
 expect(series.ytd.current.observed_dwt).toBeCloseTo(series.months.filter(m=>m.period.startsWith('2026')).reduce((n,m)=>n+(m.current.observed_dwt??0),0),6);
 expect(series.quarters.at(-1)?.current.observed_dwt).toBe(series.months.at(-1)?.current.observed_dwt);
 expect(series.actual_verified).toBe(false);expect(series.history_complete).toBe(false);
});
it('keeps no observations and missing weights unavailable, and validates provenance',()=>{
 const document:CmpBulletin={...seed,rows:[{...seed.rows[0],dwt:null}]};
 const series=cmpPlanSeries([document],'departure',now);
 expect(series.months.at(-1)?.current.known_rows).toBe(1);expect(series.months.at(-1)?.current.observed_dwt).toBeNull();expect(series.months.at(-1)?.current.missing_dwt).toBe(1);
 expect(cmpPlanSeries([document],'arrival',now).ytd.current.observed_dwt).toBeNull();
 for(const b of [{...document,sha256:'bad'},{...document,url:'https://other.example/'},{...document,rows:[{...document.rows[0],time:'2026-02-30T00:00:00+07:00'}]}])expect(()=>cmpEvents([b])).toThrow();
});
it('uses the same CMP series in the regional overview without overlapping regional totals',()=>{
 const result=centralOverview([],{period:'2026-10'},now,null,[],cmpBulletins,cmpHistoryMetadata.collected_at);
 expect(result.scope.connected_issuers).toBe(2);expect(result.scope.regional_total).toBeNull();
 expect(result.rows.find(r=>r.ticker==='CMP')?.metric).toEqual(cmpPlanSeries(cmpBulletins,'departure',now).months.at(-1));
 expect(cmpBulletins.filter(b=>b.source_error).every(b=>b.rows.length===0)).toBe(true);
});
it('preserves complete issuer comparison cells when the region evaluates only the selected windows',()=>{
 for(const direction of ['arrival','departure'] as const){
  const cmp=cmpPlanSeries(cmpBulletins,direction,now),qnp=qnpPlanSeries(qnpAuthorityBulletins,direction,now);
  for(const [frequency,period] of [['month','2025-01'],['month','2025-06'],['month','2026-10'],['quarter','2025-Q4'],['quarter','2026-Q4']] as const){
   const overview=centralOverview([],{direction,frequency,period},now,null,qnpAuthorityBulletins,cmpBulletins,cmpHistoryMetadata.collected_at);
   for(const [ticker,series] of [['CMP',cmp],['QNP',qnp]] as const)expect(overview.rows.find(r=>r.ticker===ticker)?.metric).toEqual((frequency==='month'?series.months:series.quarters).find(p=>p.period===period));
  }
 }
});
