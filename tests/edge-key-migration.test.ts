import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it} from 'vitest';
const source=readFileSync('supabase/functions/port-call-refresh/index.ts','utf8').replace(/^import .* from 'https:[^\n]+;\r?\n/m,'');
function runtime(values:Record<string,string>){
 let handler!:(input:Request)=>Promise<Response>;
 const configs:{url:string;anonKey:string}[]=[],reads:string[]=[],requests:Request[]=[];
 runInNewContext(source,{
  Deno:{env:{get(name:string){reads.push(name);return values[name];}},serve(fn:typeof handler){handler=fn;}},Response,
  createCallIngestionHandler(config:{url:string;anonKey:string}){configs.push(config);return async(input:Request)=>{requests.push(input);return Response.json({testOnly:true});};},
 });
 return {handle:(input:Request)=>handler(input),configs,reads,requests};
}
it('uses injected publishable keys and forwards the original user request to the pinned importer',async()=>{
 const state=runtime({SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEYS:JSON.stringify({default:'sb_publishable_test_only'}),SUPABASE_ANON_KEY:'legacy-must-not-be-used'});
 const request=new Request('https://example.supabase.co',{method:'POST',headers:{Authorization:'Bearer user-jwt-test-only'},body:'{}'});
 expect((await state.handle(request)).status).toBe(200);
 expect(state.configs).toEqual([{url:'https://example.supabase.co',anonKey:'sb_publishable_test_only'}]);
 expect(state.requests[0]).toBe(request);expect(state.reads).not.toContain('SUPABASE_ANON_KEY');
});
it('fails closed when new-key configuration is missing or malformed even if a legacy key exists',async()=>{
 for(const value of ['{}','null','[]','invalid-json',JSON.stringify({default:'legacy-invalid'})]){
  const state=runtime({SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEYS:value,SUPABASE_ANON_KEY:'legacy-must-not-be-used'});
  const response=await state.handle(new Request('https://example.supabase.co'));
  expect(response.status).toBe(503);expect(await response.json()).toEqual({error:'publishable_key_not_configured'});expect(state.configs).toHaveLength(0);
 }
});
