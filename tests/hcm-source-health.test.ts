import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('@opennextjs/cloudflare',()=>({getCloudflareContext:()=>({cf:{colo:'TEST'}})}));
beforeEach(()=>vi.resetModules());
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
const request=(target:string)=>new Request('https://example.test/api/source-health?target='+encodeURIComponent(target));
describe('fixed public HCM diagnostics',()=>{
 it('rejects arbitrary destinations and inherited object keys without fetching',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  const {GET}=await import('../apps/web/src/app/api/v1/industries/ports/south/source-health/route');
  for(const target of ['https://127.0.0.1','constructor','__proto__'])expect((await GET(request(target))).status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
 });
 it('keeps map snapshots distinct from schedule tables and caches results',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({data:[{source_type:'NEO'},{source_type:'NEO'}]})));
  vi.stubGlobal('fetch',fetcher);
  const {GET}=await import('../apps/web/src/app/api/v1/industries/ports/south/source-health/route');
  const data=await (await GET(request('map_history'))).json();
  expect(data).toMatchObject({reachable:true,source_types:{NEO:2},schedule_tables_present:false,refresh_verified:false});
  await GET(request('map_history'));expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][1]).toMatchObject({redirect:'manual'});
 });
 it('does not follow a redirect to another server',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response('',{status:302,headers:{Location:'https://example.test/private'}}));vi.stubGlobal('fetch',fetcher);
  const {GET}=await import('../apps/web/src/app/api/v1/industries/ports/south/source-health/route');
  expect(await (await GET(request('main'))).json()).toMatchObject({reachable:false,source_status:302});
  expect(fetcher).toHaveBeenCalledTimes(1);
 });
});
