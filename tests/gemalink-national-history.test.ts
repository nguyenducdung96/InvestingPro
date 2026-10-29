import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {gemalinkNationalDaily,gemalinkNationalMetadata} from '../packages/modules/port/src/gemalink-national-data';
import {loadGemalinkNationalJournal} from '../packages/modules/port/src/gemalink-national-loader';
import {mergeGemalinkPlanDays} from '../packages/modules/port/src/gemalink-national';
import {southPlanDays,southSeries} from '../packages/modules/port/src/south-plans';
import {southDaily,southHistoryMetadata} from '../packages/modules/port/src/south-history-data';
const ledger=JSON.parse(readFileSync('docs/catalog-review/gemalink-national-ledger.json','utf8'));
const board=JSON.parse(readFileSync('docs/catalog-review/south-history-ledger.json','utf8'));
it('reconciles every backfilled month and direction to PDF evidence without board overlaps',async()=>{
 expect(gemalinkNationalMetadata.events).toBeGreaterThan(0);expect(gemalinkNationalMetadata.actual_verified).toBe(false);expect(gemalinkNationalMetadata.full_scope_certified).toBe(false);
 // Several official URLs can contain the same PDF bytes.
 const evidence=new Set<string>(ledger.documents.map((d:{sha256:string;source_url:string})=>JSON.stringify([d.sha256,d.source_url])));
 const seen=new Set<string>();let count=0;
 for(const [month,directions] of Object.entries(ledger.monthly)){
  const events=await loadGemalinkNationalJournal(month);count+=events.length;
  for(const direction of ['arrival','departure'] as const){
   const rows=events.filter(e=>e.direction===direction),weights=rows.filter(e=>e.dwt!==null);
   const expected=(directions as Record<string,{rows:number|null;dwt:number|null;missing_dwt:number}>)[direction];
   expect(rows.length||null).toBe(expected.rows);expect(weights.length?weights.reduce((n,e)=>n+e.dwt!,0):null).toBe(expected.dwt);
   expect(rows.length-weights.length).toBe(expected.missing_dwt);
  }
  for(const e of events){
   expect(evidence.has(JSON.stringify([e.sha256,e.source_url]))).toBe(true);expect(e.national_document).toBeTruthy();expect(e.page).toBeGreaterThan(0);
   const [,d,m,y]=e.raw[0].match(/(\d{2})\/(\d{2})\/(\d{4})/)!;expect(e.day).toBe(`${y}-${m}-${d}`);
   const key=[e.day,e.time,e.vessel.replace(/\W/g,'').toUpperCase(),e.direction].join('/');expect(seen.has(key)).toBe(false);seen.add(key);
   expect(e.day>='2025-01-01'&&e.day<='2025-07-31').toBe(true);
  }
 }
 expect(count).toBe(gemalinkNationalMetadata.events);
 expect(await loadGemalinkNationalJournal('invalid')).toEqual([]);
});
it('adds PDF historical totals to only Gemalink and preserves the current board cutoff',()=>{
 const days=mergeGemalinkPlanDays(southPlanDays(southDaily,'gemalink'),southPlanDays(gemalinkNationalDaily,'gemalink'));
 const now=new Date(Date.parse(southHistoryMetadata.through+'T08:00:00+07:00')+86400000);
 for(const direction of ['arrival','departure'] as const){
  const series=southSeries({gemalink:days},['gemalink'],direction,now);expect(series.cutoff).toBe(southHistoryMetadata.through);
  for(const p of series.months){
   const a=board.monthly[p.period].gemalink[direction],b=ledger.monthly[p.period]?.[direction];
   expect(p.current.known_rows).toBe((a.rows??0)+(b?.rows??0));
   const weights=[a.dwt,b?.dwt].filter((n):n is number=>n!=null);
   if(weights.length)expect(p.current.observed_dwt).toBeCloseTo(weights.reduce((n,v)=>n+v,0),5);else expect(p.current.observed_dwt).toBeNull();
   expect(p.current.dwt).toBeNull();
  }
 }
});
