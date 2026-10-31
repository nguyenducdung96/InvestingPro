import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {southDaily,southHistoryMetadata} from '../packages/modules/port/src/south-history-data';
import {loadSouthJournal} from '../packages/modules/port/src/south-journal-loader';
import {southAssets,southScopes,southTargets,southPlanDays,southSeries,type SouthAsset} from '../packages/modules/port/src/south-plans';
const ledger=JSON.parse(readFileSync('docs/catalog-review/south-history-ledger.json','utf8'));
const now=new Date(Date.parse(southHistoryMetadata.through+'T08:00:00+07:00')+86400000);
it('reconciles every asset/month/direction to a separate journal ledger',()=>{
 expect(southDaily.length).toBe(southHistoryMetadata.requested_days);
 expect(new Set(southDaily.map(d=>d.day)).size).toBe(southDaily.length);
 expect(southDaily.every(d=>!d.sha256||/^[a-f0-9]{64}$/.test(d.sha256))).toBe(true);
 for(const asset of (Object.keys(southAssets) as SouthAsset[]).filter(a=>a!=='gmd_binh_duong'&&a!=='swc_long_binh'))for(const direction of ['arrival','departure'] as const){
  const series=southSeries({[asset]:southPlanDays(southDaily,asset)},[asset],direction,now);
  for(const p of series.months){
   const expected=ledger.monthly[p.period][asset][direction];
   expect(p.current.observed_days?p.current.known_rows:null,`${asset}/${p.period}/${direction} rows`).toBe(expected.rows);
   expect(p.current.observed_dwt,`${asset}/${p.period}/${direction} DWT`).toBe(expected.dwt);
   expect(p.current.missing_dwt).toBe(expected.missing_dwt);expect(p.current.dwt).toBeNull();
  }
 }
});
it('retains exact aliases, source hashes and raw DWT in the lazy journal',async()=>{
 const days=new Map(southDaily.map(d=>[d.day,d]));let rows=0;
 for(const month of Object.keys(ledger.monthly))for(const e of await loadSouthJournal(month)){
  const label=(e.direction==='arrival'?e.to:e.from)!;
  if(e.scope_review){expect(e.asset).toBe('sg_tan_thuan');expect(label).toBe('K12');expect(e.scope_review.actual_verified).toBe(false);}
  else expect((southAssets[e.asset].aliases as readonly string[]).includes(label)).toBe(true);
  expect(e.sha256).toBe(days.get(e.day)?.sha256);expect(e.raw[4]).toBeDefined();expect(['arrival','departure']).toContain(e.direction);rows++;
 }
 expect(rows).toBe(Object.values(southHistoryMetadata.assets).reduce((n,a)=>n+a.rows,0));
 expect(await loadSouthJournal('invalid')).toEqual([]);
});
it('selects K12 by immutable reviewed rows, never by a global homonym alias',async()=>{
 const manifest=JSON.parse(readFileSync('docs/catalog-review/sgp-k12-reviewed-rows.json','utf8'));
 const approved=new Map(manifest.reviewed_rows.map((r:{row_id:string})=>[r.row_id,r]));
 const selected=(await Promise.all(Object.keys(ledger.monthly).map(loadSouthJournal))).flat().filter(e=>e.scope_review);
 expect(selected).toHaveLength(approved.size);
 expect(new Set(selected.map(e=>e.scope_review!.row_id)).size).toBe(approved.size);
 for(const event of selected){
  const row=approved.get(event.scope_review!.row_id) as {day:string;event:{section:string;raw:string[];dwt:number|null};evidence_sha256:string;evidence_record_index:number};
  expect(row).toBeDefined();expect(event.raw).toEqual(row.event.raw);expect(event.day).toBe(row.day);
  expect(event.direction).toBe(row.event.section);expect(event.dwt).toBe(row.event.dwt);
  expect(event.scope_review!.sha256).toBe(row.evidence_sha256);expect(event.scope_review!.record_index).toBe(row.evidence_record_index);
  expect(event.scope_review!.facility_id).toBe(52);expect(event.scope_review!.semantics).toBe('registered_facility_corroboration_only');
 }
 expect(southAssets.sg_tan_thuan.aliases as readonly string[]).not.toContain('K12');
 expect(manifest.internal_excluded).toBe(43);expect(manifest.actual_verified).toBe(false);
});
it('adds only direct TAN.T.2 authority rows once to SGP and its southern overview',async()=>{
 const events=(await Promise.all(Object.keys(ledger.monthly).map(loadSouthJournal))).flat();
 const tt2=events.filter(e=>e.asset==='sg_tan_thuan_2'&&e.day<='2026-10-28');
 for(const [direction,count,dwt] of [['arrival',168,2691676],['departure',180,3113233]] as const){
  const rows=tt2.filter(e=>e.direction===direction);
  expect(rows).toHaveLength(count);expect(rows.reduce((n,e)=>n+(e.dwt??0),0)).toBe(dwt);
  expect(rows.every(e=>(direction==='arrival'?e.to:e.from)==='TAN.T.2'&&e.dwt!==null)).toBe(true);
 }
 const ids=events.map(e=>JSON.stringify([e.sha256,e.direction,e.raw]));
 expect(new Set(ids).size).toBe(ids.length);
 expect(tt2.find(e=>e.day==='2025-01-04')?.time).toBe('00:01');
 expect(southScopes.SGP.sgp.assets).toContain('sg_tan_thuan_2');
 expect(southTargets.filter(t=>t.ticker==='SGP')).toHaveLength(1);
 expect(southTargets.find(t=>t.ticker==='SGP')?.assets).toEqual(southScopes.SGP.sgp.assets);
 expect(Object.values(southAssets).flatMap(a=>[...a.aliases])).not.toContain('K12');
});
