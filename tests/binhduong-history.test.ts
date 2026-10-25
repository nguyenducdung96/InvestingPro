import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {binhduongDaily,binhduongMetadata} from '../packages/modules/port/src/binhduong-history-data';
import {loadBinhduongJournal} from '../packages/modules/port/src/binhduong-journal-loader';
import {southPlanDays,southSeries,dongnaiSource} from '../packages/modules/port/src/south-plans';
import {southDaily} from '../packages/modules/port/src/south-history-data';
const ledger=JSON.parse(readFileSync('docs/catalog-review/binhduong-history-ledger.json','utf8'));
const hcmLedger=JSON.parse(readFileSync('docs/catalog-review/south-history-ledger.json','utf8'));
const now=new Date(Date.parse(binhduongMetadata.through+'T08:00:00+07:00')+86400000);
it('reconciles every Binh Duong recorded month to direct source journals and receipts',async()=>{
 expect(binhduongDaily).toHaveLength(binhduongMetadata.requested_days);
 let count=0;
 for(const [month,assets] of Object.entries(ledger.monthly)){
  const rows=await loadBinhduongJournal(month);count+=rows.length;
  for(const direction of ['arrival','departure'] as const){
   const selected=rows.filter(r=>r.direction===direction),weights=selected.filter(r=>r.dwt!==null);
   const expected=(assets as Record<string,Record<string,{rows:number;dwt:number;missing_dwt:number}>>).gmd_binh_duong[direction];
   expect(selected.length).toBe(expected?.rows??0);expect(weights.reduce((n,r)=>n+r.dwt!,0)).toBeCloseTo(expected?.dwt??0,5);
   const series=southSeries({gmd_binh_duong:southPlanDays(binhduongDaily,'gmd_binh_duong')},['gmd_binh_duong'],direction,now);
   const p=series.months.find(p=>p.period===month)!;
   expect(p.current.known_rows).toBe(expected?.rows??0);if(expected?.dwt==null)expect(p.current.observed_dwt).toBeNull();else expect(p.current.observed_dwt).toBeCloseTo(expected.dwt,5);expect(p.current.dwt).toBeNull();
  }
  for(const r of rows){
   expect(r.harbour_code).toBe('BC198');expect(r.source_url).toBe(dongnaiSource);expect(r.raw_time).toBeTruthy();
   expect(ledger.sources.find((d:{day:string})=>d.day===r.day).responses.some((p:{sha256:string;section:string})=>p.sha256===r.sha256&&p.section===r.direction)).toBe(true);
   expect(r.dwt).toBe(r.raw_dwt&&r.raw_dwt>0?r.raw_dwt:null);
  }
 }
 expect(count).toBe(binhduongMetadata.events);expect(binhduongMetadata.shifting_included).toBe(false);
 for(const direction of ['arrival','departure'] as const){
  const s=southSeries({gmd_binh_duong:southPlanDays(binhduongDaily,'gmd_binh_duong')},['gmd_binh_duong'],direction,now);
  for(const month of ['2026-09','2026-10']){const p=s.months.find(p=>p.period===month)!;expect(p.current.observed_days).toBe(0);expect(p.current.observed_dwt).toBeNull();}
 }
 expect(await loadBinhduongJournal('invalid')).toEqual([]);
});
it('adds the two GMD southern sources without blanking available months or inventing Binh Duong observations',()=>{
 const groups={gemalink:southPlanDays(southDaily,'gemalink'),gmd_binh_duong:southPlanDays(binhduongDaily,'gmd_binh_duong')};
 for(const direction of ['arrival','departure'] as const){
  const combined=southSeries(groups,['gemalink','gmd_binh_duong'],direction,now);
  for(const p of combined.months){
   const a=hcmLedger.monthly[p.period].gemalink[direction],b=ledger.monthly[p.period]?.gmd_binh_duong?.[direction];
   const weights=[a?.dwt,b?.dwt].filter((n):n is number=>n!=null);
   expect(p.current.known_rows).toBe((a?.rows??0)+(b?.rows??0));
   if(weights.length)expect(p.current.observed_dwt).toBeCloseTo(weights.reduce((n,v)=>n+v,0),5);else expect(p.current.observed_dwt).toBeNull();
   expect(p.current.dwt).toBeNull();
  }
 }
});
