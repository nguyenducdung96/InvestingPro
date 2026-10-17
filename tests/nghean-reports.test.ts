import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {parseCallSource} from '../packages/modules/port/src/calls';
import {parseNgheAnReports,fetchNgheAnReports,NGHEAN_REPORT_URL} from '../packages/modules/port/src/nghean-reports';
const raw=readFileSync('tests/fixtures/nghean-report-excerpt.json','utf8');
const fetched='2026-10-17T14:00:00Z';
it('reads source-saved Excel dates as day precision and keeps DWT separate from GT',async()=>{
 const result=await parseCallSource(raw,'nghean-reported',fetched);
 expect(result.reported_days).toEqual(['2026-10-14']);
 expect(result.rows).toHaveLength(5);
 expect(result.rows[0]).toMatchObject({vessel_name:'JI HANG 15',direction:'arrival',occurred_at:null,time_day:'2026-10-09',dwt:16493.7,gt:9936,quarantine_reason:null});
 expect(result.rows[1]).toMatchObject({direction:'departure',time_day:'2026-10-13',occurred_at:null});
 expect(result.rows.every(r=>'berth' in r&&String(r.berth).includes('CỬA LÒ'))).toBe(true);
});
it('rejects inconsistent source dates, future reports, unlinked reports and external attachments',async()=>{
 await expect(parseNgheAnReports(raw.replace('14/10/2026','15/10/2026'),fetched)).rejects.toThrow('differs');
 await expect(parseNgheAnReports(raw,'2026-10-13T14:00:00Z')).rejects.toThrow('Future');
 const envelope=JSON.parse(raw);envelope.index_html='';
 await expect(parseNgheAnReports(JSON.stringify(envelope),fetched)).rejects.toThrow('not linked');
 envelope.index_html=JSON.parse(raw).index_html;envelope.reports[0].attachment_url='https://example.com/file.xlsx';
 await expect(parseNgheAnReports(JSON.stringify(envelope),fetched)).rejects.toThrow();
});
it('uses fixed public index and corroborates detail links before fetching bounded attachments',async()=>{
 const fixture=JSON.parse(raw);const request=vi.fn<typeof fetch>();
 request.mockResolvedValueOnce(new Response(fixture.index_html));
 request.mockResolvedValueOnce(new Response(fixture.reports[0].detail_html));
 request.mockResolvedValueOnce(new Response(Buffer.from(fixture.reports[0].base64,'base64')));
 const envelope=await fetchNgheAnReports(request);
 expect(request.mock.calls[0][0]).toBe(NGHEAN_REPORT_URL);
 expect(request.mock.calls.every(c=>c[1]?.redirect==='error')).toBe(true);
 expect((await parseNgheAnReports(envelope,fetched)).rows).toHaveLength(5);
});
