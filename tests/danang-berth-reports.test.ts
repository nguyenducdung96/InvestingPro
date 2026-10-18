import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseDaNangBerthReports,fetchDaNangBerthReports,DANANG_BERTH_URL} from '../packages/modules/port/src/danang-berth-reports';
const html=readFileSync('tests/fixtures/danang-berth-excerpt.html','utf8');
const archive=(content=html)=>JSON.stringify({format:'danang-berth-reports-v1',reports:[{month:'2026-09',html:content}]});
it('reads actual berth times with missing DWT, never substitutes containers or TEU',async()=>{
 const p=await parseDaNangBerthReports(archive(),'2026-10-18T03:00:00Z');
 expect(p.rows).toHaveLength(4);expect(p.rows[0]).toMatchObject({vessel_name:'HAIAN BELL',direction:'arrival',occurred_at:'2026-09-29T23:05:00+07:00',time_basis:'berth_movement',dwt:null,gt:null,berth:null});
 expect(p.rows[1]).toMatchObject({direction:'departure',occurred_at:'2026-09-30T09:40:00+07:00'});
 expect(p.rows[0].reported_day).toBe('2026-09-30');
 expect(p.reported_days).toHaveLength(30);expect(p.reported_days[0]).toBe('2026-09-01');
 expect(new Set(p.rows.map(r=>r.key)).size).toBe(4);
});
it('fails closed on changed month, columns, row gaps, reversed times and foreign links',async()=>{
 for(const bad of [html.replace('tháng 09','tháng 08'),html.replace('>ATD<','>ETD<'),html.replace('>2</td>','>3</td>'),html.replace('2026-09-30 09:40','2026-09-01 09:40'),html.replaceAll('https://danangport.com/tra-cuu-tau-container/chi-tiet','https://invalid.example/tra-cuu-tau-container/chi-tiet')]){
  await expect(parseDaNangBerthReports(archive(bad),'2026-10-18T03:00:00Z')).rejects.toThrow();
 }
});
it('submits the public departure-month form with a bounded month window',async()=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(html));
 await fetchDaNangBerthReports(request,1,new Date('2026-10-01T00:00:00Z'));
 expect(request.mock.calls[0][0]).toBe(DANANG_BERTH_URL);
 expect(String(request.mock.calls[0][1]?.body)).toBe('thang=10&nam=2026');
 expect(request.mock.calls[0][1]?.redirect).toBe('error');
 await expect(fetchDaNangBerthReports(request,4)).rejects.toThrow('at most three');
});
