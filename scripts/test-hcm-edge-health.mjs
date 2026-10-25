import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source=await readFile(new URL('../supabase/functions/hcm-source-health/index.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
function load(fetcher){
 let handler,deadline;
 vm.runInNewContext(code,{Deno:{serve:fn=>{handler=fn;},env:{get:key=>{assert.equal(key,'SB_REGION');return 'test-region';}}},Request,Response,AbortController,TextDecoder,Date,Promise,Error,fetch:fetcher,setTimeout:fn=>{deadline=fn;return 1;},clearTimeout:()=>{}});
 return {invoke:request=>handler(request),timeout:()=>deadline()};
}
test('caller-controlled URLs never change the fixed upstream or enable redirects',async()=>{
 let called;
 const app=load(async(url,options)=>{called={url,options};return new Response('public page');});
 const response=await app.invoke(new Request('https://example.test/?url=http://127.0.0.1'));
 assert.equal(called.url,'https://cangvuhanghaitphcm.gov.vn/index.aspx?page=shipschedule&cat=3146');
 assert.equal(called.options.redirect,'manual');
 const body=await response.json();assert.equal(body.refresh_verified,false);assert.equal(body.schedule_tables_present,false);
});
test('upstream errors are not reported as reachable',async()=>{
 const app=load(async()=>new Response(null,{status:503}));
 const body=await(await app.invoke(new Request('https://example.test/'))).json();
 assert.equal(body.reachable,false);assert.equal(body.source_status,503);
});
test('oversized responses fail without exposing the source body',async()=>{
 const app=load(async()=>new Response(new Uint8Array(4_000_001)));
 const body=await(await app.invoke(new Request('https://example.test/'))).json();
 assert.equal(body.reachable,false);assert.equal(body.detail,'body_too_large');assert.equal(body.html,undefined);
});
test('deadline returns a failure even when the upstream ignores abort',async()=>{
 let signal;
 const app=load(async(_url,options)=>{signal=options.signal;return new Promise(()=>{});});
 const result=app.invoke(new Request('https://example.test/'));app.timeout();
 const body=await(await result).json();assert.equal(body.reason,'source_timeout');assert.equal(signal.aborted,true);assert.equal(body.refresh_verified,false);
});
