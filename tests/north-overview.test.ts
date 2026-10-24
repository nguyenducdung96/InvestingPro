import {cdnPeriodDisplay} from '../apps/web/src/lib/cdn-comparison';
import {expect,it} from 'vitest';
import {northAssets,northSelection,northOverview,type TanVuPlanDay} from '@invest/port';
const now=new Date('2026-10-24T01:00:00Z');
const day=(date:string,value:number):TanVuPlanDay=>({report_day:date,version_id:'test',source_sha256:'a'.repeat(64),source_url:null,parser_version:null,last_success:now.toISOString(),last_attempt:now.toISOString(),source_error:null,arrival_rows:1,departure_rows:1,arrival_dwt:value*2,departure_dwt:value,arrival_dwt_missing:0,departure_dwt_missing:0,ambiguous_groups:0,source_empty_sections:[]});
function groups(){return Object.fromEntries(northAssets.map((asset,i)=>[asset,[2025,2026].flatMap(y=>Array.from({length:23},(_,n)=>day(`${y}-10-${String(n+1).padStart(2,'0')}`,(i+1)*(y===2025?1:2))))]));}
it('compares the exact elapsed month/quarter and converts period selection without losing the year',()=>{
 expect(northSelection({},now)).toMatchObject({from:'2026-10-01',through:'2026-10-23',priorFrom:'2025-10-01',priorThrough:'2025-10-23',partial:true});
 expect(northSelection({frequency:'quarter',period:'2025-03',direction:'arrival'},now)).toMatchObject({period:'2025-Q1',from:'2025-01-01',through:'2025-03-31',direction:'arrival'});
 expect(northSelection({frequency:'month',period:'2025-Q3'},now).period).toBe('2025-07');
 expect(northSelection({period:'2025-02'},now)).toMatchObject({expected_days:28,prior_expected_days:29,priorThrough:'2024-02-29'});
 expect(northSelection({period:'2099-01',direction:'garbage',sort:'bad'},now)).toMatchObject({period:'2026-10',direction:'departure',sort:'ticker'});
});
it('retains nine issuers, reuses VIP Green once, separates CQN and never publishes a regional sum',()=>{
 const data=northOverview(groups(),{},now);
 expect(data.rows).toHaveLength(9);expect(data.scope.unique_assets).toBe(14);expect(northAssets.filter(a=>a==='vip_green_port')).toHaveLength(1);expect(data.scope.regional_total).toBeNull();expect(data.ready_rows).toBe(9);
 expect(data.rows.find(r=>r.ticker==='VGR')?.assets).toEqual(['vip_green_port']);expect(data.rows.find(r=>r.ticker==='VSC')?.assets).toContain('vip_green_port');
 const cqn=data.rows.at(-1)!;expect(cqn.group).toBe('quang_ninh');expect(cqn.includes_internal_transfers).toBe(true);expect(cqn.actual_verified).toBe(false);
 expect(data.rows.every(r=>r.metric?.yoy.dwt===100)).toBe(true);
});
it('keeps missing days, null DWT, ambiguous revisions and zero baselines distinct',()=>{
 const g=groups();g.dinh_vu=g.dinh_vu.filter(d=>d.report_day!=='2026-10-01');g.doan_xa[23].departure_dwt=null;g.doan_xa[23].departure_dwt_missing=1;g.hai_an[23].ambiguous_groups=1;g.ptsc_dinh_vu.forEach(d=>{if(d.report_day.startsWith('2025'))d.departure_dwt=0;});g.green_port[23].source_sha256='b'.repeat(64);
 const rows=northOverview(g,{},now).rows;
 expect(rows.find(r=>r.ticker==='DVP')?.metric?.current.rows).toBeNull();expect(rows.find(r=>r.ticker==='DXP')?.metric?.current.dwt).toBeNull();expect(rows.find(r=>r.ticker==='DXP')?.metric?.current.rows).toBe(23);
 expect(rows.find(r=>r.ticker==='HAH')?.metric?.current.dwt).toBeNull();expect(rows.find(r=>r.ticker==='PSP')?.metric?.yoy.dwt).toBeNull();expect(rows.find(r=>r.ticker==='PSP')?.flags).toContain('Nền cùng kỳ bằng 0');expect(rows.find(r=>r.ticker==='VSC')?.metric?.current.dwt).toBeNull();
});
it('keeps unavailable issuers visible, isolates late refresh and sorts unknowns last within their group',()=>{
 const g=groups();g.dinh_vu=[];g.doan_xa.at(-1)!.source_error='Source failed; prior version retained';g.hai_an=g.hai_an.map(d=>({...d,last_success:'2026-10-01T00:00:00Z'}));
 const rows=northOverview(g,{sort:'dwt'},now).rows;
 expect(rows).toHaveLength(9);expect(rows[7].ticker).toBe('DVP');expect(rows.at(-1)?.ticker).toBe('CQN');expect(rows.find(r=>r.ticker==='DVP')?.metric).toBeNull();
 expect(rows.find(r=>r.ticker==='DXP')?.refresh_error).toBe(true);expect(rows.find(r=>r.ticker==='DXP')?.metric?.current.dwt).not.toBeNull();
 const hah=rows.find(r=>r.ticker==='HAH')!;expect(hah.stale).toBe(true);expect(hah.metric?.current.dwt).not.toBeNull();
 expect(northOverview({}, {},now).rows.every(r=>r.metric===null&&r.stale)).toBe(true);
 const arrival=northOverview(groups(),{direction:'arrival'},now).rows.find(r=>r.ticker==='DVP')!;
 const departure=northOverview(groups(),{},now).rows.find(r=>r.ticker==='DVP')!;
 expect(arrival.metric!.current.dwt).toBe(departure.metric!.current.dwt!*2);expect(arrival.href).toContain('plan_direction=arrival');
});

it('all nine northern issuers retain recorded period and YTD values when the last day is missing',()=>{
 const g=groups();for(const asset of northAssets)g[asset]=g[asset].filter(d=>d.report_day!=='2026-10-23');
 const result=northOverview(g,{},now);
 for(const row of result.rows){
  const display=cdnPeriodDisplay(row.metric);expect(display.rows).toBeGreaterThan(0);expect(display.dwt).toBeGreaterThan(0);expect(display.yoyDwt).not.toBeNull();expect(row.metric?.current.dwt).toBeNull();
 }
 // A missing member must not erase the other berths' contributions on that day.
 const partial=groups();partial.chua_ve=partial.chua_ve.filter(d=>d.report_day!=='2026-10-23');
 const php=northOverview(partial,{},now).rows.find(r=>r.ticker==='PHP')!.metric!;
 expect(php.current.known_rows).toBe(23*4-1);expect(php.current.observed_days).toBe(23);expect(php.current.observed_dwt).toBeGreaterThan(0);expect(php.current.dwt).toBeNull();
});
