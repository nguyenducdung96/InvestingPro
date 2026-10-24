import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {qnpAuthorityBulletins,qnpHistoryMetadata,qnpPlanSeries,qnpReviewedEvents,qnpScopes,qnpBerthScope,type QnpScope} from '@invest/port';
type Metric={rows:number|null;dwt:number|null;missing_dwt:number};
const ledger=JSON.parse(readFileSync('docs/catalog-review/qnp-history-ledger.json','utf8')) as {cutoff:string;directions:Record<'arrival'|'departure',{months:Record<string,Metric>;ytd:Metric;prior_ytd:Metric;scopes:Record<QnpScope,Metric>}>};
const now=new Date(Date.parse(ledger.cutoff)+86400000);
const close=(actual:number|null,expected:number|null)=>expected===null?expect(actual).toBeNull():expect(actual).toBeCloseTo(expected,4);
it('has recorded arrivals and departures in every elapsed project month, with a source-backed ledger',()=>{
 expect(qnpAuthorityBulletins.length).toBeGreaterThan(500);expect(qnpHistoryMetadata.parsed_documents).toBe(qnpAuthorityBulletins.length);
 const expectedMonths=(Number(ledger.cutoff.slice(0,4))-2025)*12+Number(ledger.cutoff.slice(5,7));
 for(const direction of ['arrival','departure'] as const){
  const series=qnpPlanSeries(qnpAuthorityBulletins,direction,now);
  expect(series.months).toHaveLength(expectedMonths);
  for(const month of series.months){
   const expected=ledger.directions[direction].months[month.period];
   expect(expected.rows).toBeGreaterThan(0);expect(month.current.known_rows).toBe(expected.rows);close(month.current.observed_dwt,expected.dwt);
   expect(month.current.missing_dwt).toBe(expected.missing_dwt);expect(month.current.rows).toBeNull();expect(month.current.dwt).toBeNull();
  }
  close(series.ytd.current.observed_dwt,ledger.directions[direction].ytd.dwt);close(series.ytd.prior.observed_dwt,ledger.directions[direction].prior_ytd.dwt);
  expect(series.ytd.current.known_rows).toBe(ledger.directions[direction].ytd.rows);expect(series.ytd.prior.known_rows).toBe(ledger.directions[direction].prior_ytd.rows);
  expect(series.actual_verified).toBe(false);expect(series.history_complete).toBe(false);expect(series.semantics).toBe('authority_published_berth_plan');
 }
});
it('reconciles disjoint berth contributions with the issuer overview without filling absent berths',()=>{
 for(const direction of ['arrival','departure'] as const){
  let counted=0;
  for(const asset of Object.keys(qnpScopes).filter(s=>s!=='qnp') as QnpScope[]){
   const series=qnpPlanSeries(qnpAuthorityBulletins,direction,now,asset),expected=ledger.directions[direction].scopes[asset];
   const rows=series.months.reduce((n,m)=>n+m.current.known_rows,0);expect(rows).toBe(expected.rows??0);counted+=rows;
   const known=series.months.flatMap(m=>m.current.observed_dwt===null?[]:[m.current.observed_dwt]);close(known.length?known.reduce((a,b)=>a+b,0):null,expected.dwt);
   if(!rows)expect(series.ytd.current.observed_dwt).toBeNull();
  }
  expect(counted).toBe(qnpPlanSeries(qnpAuthorityBulletins,direction,now).months.reduce((n,m)=>n+m.current.known_rows,0));
 }
});
it('keeps a verifiable source cell for every observation and excludes other-port or unknown labels from counts',()=>{
 const events=qnpReviewedEvents(qnpAuthorityBulletins),keys=new Set<string>();
 for(const event of events){
  const key=JSON.stringify([event.time,event.vessel.replace(/\s/g,''),event.from,event.to]);expect(keys.has(key)).toBe(false);keys.add(key);
  expect(event.source.source_kind).toBe('authority');expect(event.source.url).toMatch(/^https:\/\/cangvuhanghaiquynhon\.gov\.vn\//);
  expect(event.source.images?.some(i=>i.sha256===event.image_sha256)).toBe(true);expect(event.raw).toBeDefined();expect(event.dwt_crosscheck).toBeDefined();
  if(event.kind==='arrival')expect(qnpBerthScope(event.to)).not.toBeNull();
  if(event.kind==='departure')expect(qnpBerthScope(event.from)).not.toBeNull();
  if(event.from==='TCQN'||event.to==='TCQN')expect(event.kind).toBe('unmapped');
 }
 expect(events.some(e=>e.kind==='unmapped')).toBe(true);expect(events.some(e=>e.kind==='internal')).toBe(true);
});
