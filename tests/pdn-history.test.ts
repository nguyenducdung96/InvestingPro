import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {pdnDaily,pdnHistoryMetadata} from '../packages/modules/port/src/pdn-history-data';
import {loadPdnJournal} from '../packages/modules/port/src/pdn-journal-loader';
import {pdnPlanSeries,pdnScopes,pdnIncludes,pdnSource,type PdnScope,type PdnEvent} from '../packages/modules/port/src/pdn-plans';
const ledger=JSON.parse(readFileSync('docs/catalog-review/pdn-history-ledger.json','utf8'));
const now=new Date(Date.parse(pdnHistoryMetadata.through+'T08:00:00+07:00')+86400000);
it('reconciles every terminal/month/direction and aggregate to the published journal',async()=>{
 expect(pdnDaily.length).toBe(pdnHistoryMetadata.days);expect(new Set(pdnDaily.map(d=>d.day)).size).toBe(pdnDaily.length);
 const all:PdnEvent[]=[];for(const month of Object.keys(ledger.monthly))all.push(...await loadPdnJournal(month));
 expect(all.length).toBe(pdnHistoryMetadata.events);expect(all.filter(e=>e.kind==='internal').length).toBe(pdnHistoryMetadata.internal);
 expect(new Set(all.map(e=>JSON.stringify([e.time,e.vessel.toUpperCase(),e.from,e.to]))).size).toBe(all.length);
 const proof=new Map<string,string[]> (ledger.sources.map((s:{day:string;responses:{sha256:string}[]})=>[s.day,s.responses.map(r=>r.sha256)]));
 for(const e of all){expect(proof.get(e.day)).toContain(e.sha256);expect(e.time.startsWith(e.day+'T')).toBe(true);expect(e.time.endsWith('+07:00')).toBe(true);expect(e.dwt===null||e.dwt>0).toBe(true);expect(e.harbour_code).toMatch(/^BC18[567]$/);}
 for(const asset of Object.keys(pdnScopes) as PdnScope[])for(const direction of ['arrival','departure'] as const){
  const series=pdnPlanSeries(pdnDaily,direction,now,asset);
  for(const p of series.months){
   const expected=all.filter(e=>e.day>=p.current.from&&e.day<=p.current.through&&e.kind===direction&&pdnIncludes(asset,e.asset));
   const weights=expected.filter(e=>e.dwt!==null);
   expect(p.current.known_rows,`${asset}/${p.period}/${direction}`).toBe(expected.length);
   if(weights.length)expect(p.current.observed_dwt).toBeCloseTo(weights.reduce((n,e)=>n+e.dwt!,0),5);else expect(p.current.observed_dwt).toBeNull();
   expect(p.current.missing_dwt).toBe(expected.length-weights.length);expect(p.current.dwt).toBeNull();expect(p.current.rows).toBeNull();
  }
 }
 expect(pdnHistoryMetadata.source_url).toBe(pdnSource);expect(await loadPdnJournal('invalid')).toEqual([]);
});
