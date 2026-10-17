import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
import {it,expect} from 'vitest';
import {parseCallNotices,parseCallSource,callSource,noticeTime,sha256,CALL_SOURCE,CALL_PARSER} from '../packages/modules/port/src/calls';
const tr=(cells:string[])=>`<tr>${cells.map(s=>`<td>${s}</td>`).join('')}</tr>`;
const html=(name='TEST VESSEL',time='23:30-16/10')=>`KHU VỰC CỬA VIỆT<li>Thông báo tàu đến và rời cảng ngày 16/10/2026</li><table>${tr(['TH&Ocirc;NG B&Aacute;O T&Agrave;U ĐẾN CẢNG'])}${tr([name,'VN','100','1.234','80','3','redacted',time,'NIL','NIL','NIL'])}</table><table>${tr(['THÔNG BÁO TÀU RỜI CẢNG'])}${tr([name,'VN','100','1234','23:45-16/10','NIL','NIL','NIL'])}</table>`;
it('uses dated notices rather than fetch year, parses both tables and quarantines bad times/compound vessels',async()=>{
 const real=await parseCallNotices(readFileSync('tests/fixtures/quangtri-notice-excerpt.html','utf8'));
 expect(real.rows[0].vessel_name).toBe('THANH THÀNH ĐẠT 69');
 expect(real.rows[0].occurred_at).toBe('2026-10-16T09:00:00+07:00');
 expect(real.rows.some(r=>r.direction==='departure')).toBe(true);
 expect(noticeTime('23:30-31/12','2026-01-01')).toBeNull();
 expect(noticeTime('80:00-16/10','2026-10-16')).toBeNull();
 expect(noticeTime('12:00-31/02','2026-03-01')).toBeNull();
 expect(noticeTime('16/10','2026-10-16')).toBeNull();
 expect(noticeTime('13/10/226 10:00','2026-10-13')).toBeNull();
 const p=await parseCallNotices(html());expect(p.rows).toHaveLength(2);expect(p.rows[0].occurred_at).toBe('2026-10-16T23:30:00+07:00');expect(p.rows[0].dwt).toBe(1234);expect(p.reported_days).toEqual(['2026-10-16']);
 expect((await parseCallNotices(html('TEST A + TEST B'))).rows[0].quarantine_reason).toBe('multiple_vessels');
 expect((await parseCallNotices(html('TEST','80:00-16/10'))).rows[0].quarantine_reason).toBe('invalid_or_missing_time');
 await expect(parseCallNotices('Login required')).rejects.toThrow('Unexpected source');
});
it('separates source areas and snapshot arrival columns, rejects wrong region, future times and changed schemas',async()=>{
 const raw=readFileSync('tests/fixtures/cantho-position-excerpt.html','utf8');
 const p=await parseCallSource(raw,'cantho-ct','2026-10-17T07:00:00Z');
 expect(p.rows).toHaveLength(2);expect(p.rows[0].occurred_at).toBe('2025-08-02T02:00:00+07:00');
 expect(p.reported_days).toEqual(['2026-10-17']);expect(p.rows[1].dwt).toBeNull();
 await expect(parseCallSource(raw,'cantho-hg','2026-10-17T07:00:00Z')).rejects.toThrow('Unexpected source area');
 await expect(parseCallSource(raw.replace('Trọng tải(DWT)','Changed'),'cantho-ct','2026-10-17T07:00:00Z')).rejects.toThrow('columns changed');
 expect((await parseCallSource(raw.replaceAll('02/08/2025','18/10/2026'),'cantho-ct','2026-10-17T07:00:00Z')).rows.every(r=>r.quarantine_reason==='invalid_or_missing_time')).toBe(true);
 const len=html().replace('KHU VỰC CỬA VIỆT','KHU VỰC LÈN BẢNG').replace('Thông báo tàu đến và rời cảng ngày','Tàu Đến và Rời Cảng Ngày');
 const l=await parseCallSource(len,'quangtri-len-bang','2026-10-17T07:00:00Z');
 expect(l.rows).toHaveLength(2);expect(l.rows[0].key).not.toBe((await parseCallNotices(html())).rows[0].key);
});
it('keeps concurrent area notices and replaces complete snapshots without manufacturing departures',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
 for(const f of readdirSync('supabase/migrations').sort())await db.exec(readFileSync(`supabase/migrations/${f}`,'utf8'));
 await db.exec(`select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000099","app_metadata":{"role":"admin"}}',false);set role authenticated`);
 async function put(raw:string,area:string,stamp='2026-10-17T07:00:00Z'){
  const p=await parseCallSource(raw,area,stamp);return db.query<{r:{inserted:number;replayed:boolean}}>('select port.import_port_calls($1,$2,$3,$4) r',[JSON.stringify({source_url:callSource(area)!.url,raw_text:raw,raw_sha256:await sha256(raw),fetched_at:stamp}),JSON.stringify(p.rows),JSON.stringify(p.reported_days),p.parser_version]);
 }
 await put(html(),'quangtri-cua-viet');await put(html().replace('KHU VỰC CỬA VIỆT','KHU VỰC LÈN BẢNG').replace('Thông báo tàu đến và rời cảng ngày','Tàu Đến và Rời Cảng Ngày'),'quangtri-len-bang');
 expect((await db.query('select * from port.published_port_calls')).rows).toHaveLength(4);
 const raw=readFileSync('tests/fixtures/cantho-position-excerpt.html','utf8');
 await put(raw,'cantho-ct');expect((await put(raw,'cantho-ct')).rows[0].r.replayed).toBe(true);
 await put(raw.replace('kv=ct','kv=hg'),'cantho-hg');
 expect((await db.query('select * from port.published_in_port_snapshots')).rows).toHaveLength(4);
 const revised=raw.replace(/<tr class="rgRow">[\s\S]*?<\/tr>/,'');
 await put(revised,'cantho-ct','2026-10-17T07:01:00Z');
 expect((await db.query('select * from port.published_in_port_snapshots')).rows).toHaveLength(3);
 expect((await db.query('select * from port.published_port_calls')).rows).toHaveLength(4);
 expect((await db.query("select * from port.port_calls where event_kind='in_port' and direction='departure'")).rows).toHaveLength(0);
 await db.exec('reset role;set role anon');expect((await db.query('select * from port.published_in_port_snapshots')).rows).toHaveLength(3);
 await expect(db.query('select raw_text from port.call_artifacts')).rejects.toThrow('permission denied');
 }finally{await db.close();}
});
it('archives atomically, prevents duplicate replay, replaces revised notices and protects raw artifacts with RLS',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
 for(const f of readdirSync('supabase/migrations').sort())await db.exec(readFileSync(`supabase/migrations/${f}`,'utf8'));
 async function importRaw(raw:string,stamp='2026-10-17T00:00:00Z') {const p=await parseCallNotices(raw);return db.query<{r:{inserted:number;replayed:boolean}}>('select port.import_port_calls($1,$2,$3,$4) r',[JSON.stringify({source_url:CALL_SOURCE,raw_text:raw,raw_sha256:await sha256(raw),fetched_at:stamp}),JSON.stringify(p.rows),JSON.stringify(p.reported_days),CALL_PARSER]);}
 await db.exec(`select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000099","user_metadata":{"role":"admin"}}',false);set role authenticated`);
 await expect(importRaw(html())).rejects.toThrow('Admin import required');
 await db.exec(`reset role;select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000099","app_metadata":{"role":"admin"}}',false);set role authenticated`);
 const duplicated=html().replace('</table>',`${tr(['TEST VESSEL','VN','100','1.234','80','3','redacted','23:30-16/10','NIL','NIL','NIL'])}</table>`);
 expect((await importRaw(duplicated)).rows[0].r.inserted).toBe(2);
 expect((await importRaw(duplicated)).rows[0].r.replayed).toBe(true);
 expect((await db.query('select * from port.published_port_calls')).rows).toHaveLength(2);
 await importRaw(html('TEST VESSEL','80:00-16/10'),'2026-10-17T00:01:00Z');
 expect((await db.query('select * from port.port_calls')).rows).toHaveLength(4);
 expect((await db.query('select * from port.published_port_calls')).rows).toHaveLength(1);
 expect((await db.query('select quarantined from port.call_coverage')).rows).toEqual([{quarantined:1}]);
 expect((await db.query('select * from port.current_quarantined_calls')).rows).toHaveLength(1);
 await db.exec(`reset role;select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000098","app_metadata":{"role":"user"}}',false);set role authenticated`);
 expect((await db.query('select * from port.current_quarantined_calls')).rows).toHaveLength(0);
 expect((await db.query('select * from port.call_artifacts')).rows).toHaveLength(0);
 await db.exec('reset role;set role anon');
 expect((await db.query('select * from port.published_port_calls')).rows).toHaveLength(1);
 await expect(db.query('select raw_text from port.call_artifacts')).rejects.toThrow('permission denied');
 await expect(db.query('select * from port.current_quarantined_calls')).rejects.toThrow('permission denied');
 await expect(importRaw(html('INJECT'))).rejects.toThrow('permission denied');
 await db.exec('reset role');await expect(db.exec('delete from port.call_artifacts')).rejects.toThrow('immutable');
 }finally{await db.close();}
});
