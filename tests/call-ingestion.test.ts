import {expect,it,vi} from 'vitest';
import {createCallIngestionHandler} from '../packages/modules/port/src/call-ingestion';
import {CALL_SOURCE,sha256} from '../packages/modules/port/src/calls';
import {readFileSync} from 'node:fs';
const config={url:'https://example.supabase.co',anonKey:'sb_publishable_test_only'};
function input(body:object,authenticated=true){return new Request('https://example.supabase.co/functions/v1/port-call-refresh',{method:'POST',headers:authenticated?{Authorization:'Bearer fixture-admin','Content-Type':'application/json'}:{},body:JSON.stringify(body)});}
it('verifies admin app metadata before reading source data or writing database',async()=>{
 const request=vi.fn<typeof fetch>();const handle=createCallIngestionHandler({...config,fetcher:request});
 expect((await handle(input({},false))).status).toBe(401);expect(request).not.toHaveBeenCalled();
 request.mockResolvedValueOnce(Response.json({id:'fixture',user_metadata:{role:'admin'}}));
 expect((await handle(input({action:'refresh',source_id:'quangtri-cua-viet'}))).status).toBe(403);expect(request).toHaveBeenCalledTimes(1);
});
it('reparses original evidence and forwards the verified user identity with RLS',async()=>{
 const raw=readFileSync('tests/fixtures/quangtri-notice-excerpt.html','utf8');
 const request=vi.fn<typeof fetch>();request.mockResolvedValueOnce(Response.json({id:'fixture',app_metadata:{role:'admin'}}));request.mockResolvedValueOnce(Response.json({inserted:2,replayed:false}));
 const handle=createCallIngestionHandler({...config,fetcher:request});
 const response=await handle(input({source_url:CALL_SOURCE,raw_text:raw,raw_sha256:await sha256(raw),fetched_at:'2026-10-17T14:00:00Z'}));
 expect(response.status).toBe(200);expect(request.mock.calls[1][0]).toBe('https://example.supabase.co/rest/v1/rpc/import_port_calls');
 const options=request.mock.calls[1][1]!;expect(options.headers).toMatchObject({apikey:'sb_publishable_test_only',Authorization:'Bearer fixture-admin','Content-Profile':'port'});
 const parsed=JSON.parse(String(options.body));expect(parsed.p_rows.some((r:{vessel_name:string})=>r.vessel_name==='THANH THÀNH ĐẠT 69')).toBe(true);
});
it('rejects URL injection and checksum tampering without invoking the importer',async()=>{
 const request=vi.fn<typeof fetch>();const handle=createCallIngestionHandler({...config,fetcher:request});
 for(const body of [{action:'refresh',source_id:'https://internal.invalid'}, {source_url:CALL_SOURCE,raw_text:'tampered',raw_sha256:'a'.repeat(64),fetched_at:'2026-10-17T14:00:00Z'}]){
  request.mockResolvedValueOnce(Response.json({id:'fixture',app_metadata:{role:'admin'}}));expect((await handle(input(body))).status).toBe(400);
 }
 expect(request).toHaveBeenCalledTimes(2);
});
