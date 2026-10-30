import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {swcLongbinhDaily,swcLongbinhMetadata} from '../packages/modules/port/src/swc-longbinh-history-data';
import {loadSwcLongbinhJournal} from '../packages/modules/port/src/swc-longbinh-journal-loader';
import {southPlanDays,southSeries,dongnaiSource} from '../packages/modules/port/src/south-plans';
const ledger=JSON.parse(readFileSync('docs/catalog-review/swc-longbinh-history-ledger.json','utf8'));
const now=new Date(Date.parse(swcLongbinhMetadata.through+'T08:00:00+07:00')+86400000);
it('reconciles every SWC Long Binh recorded month to direct source journals and receipts',async()=>{
 expect(swcLongbinhDaily).toHaveLength(swcLongbinhMetadata.requested_days);
 let count=0;
 for(const [month,assets] of Object.entries(ledger.monthly)){
  const rows=await loadSwcLongbinhJournal(month);count+=rows.length;
  for(const direction of ['arrival','departure'] as const){
   const selected=rows.filter(r=>r.direction===direction),weights=selected.filter(r=>r.dwt!==null);
   const expected=(assets as Record<string,Record<string,{rows:number;dwt:number;missing_dwt:number}>>).swc_long_binh[direction];
   expect(selected.length).toBe(expected?.rows??0);expect(weights.reduce((n,r)=>n+r.dwt!,0)).toBeCloseTo(expected?.dwt??0,5);
   const series=southSeries({swc_long_binh:southPlanDays(swcLongbinhDaily,'swc_long_binh')},['swc_long_binh'],direction,now);
   const p=series.months.find(p=>p.period===month)!;
   expect(p.current.known_rows).toBe(expected?.rows??0);if(expected?.dwt==null)expect(p.current.observed_dwt).toBeNull();else expect(p.current.observed_dwt).toBeCloseTo(expected.dwt,5);expect(p.current.dwt).toBeNull();
  }
  for(const r of rows){
   expect(r.harbour_code).toBe('K0005');expect(r.source_url).toBe(dongnaiSource);expect(r.raw_time).toBeTruthy();
   expect(ledger.sources.find((d:{day:string})=>d.day===r.day).responses.some((p:{sha256:string;section:string})=>p.sha256===r.sha256&&p.section===r.direction)).toBe(true);
   expect(r.dwt).toBe(r.raw_dwt&&r.raw_dwt>0?r.raw_dwt:null);
  }
 }
 expect(count).toBe(swcLongbinhMetadata.events);expect(swcLongbinhMetadata.shifting_included).toBe(false);
 expect(await loadSwcLongbinhJournal('invalid')).toEqual([]);
});
