import {expect,it,vi} from 'vitest';
import {supabaseKeyHeaders} from '../packages/db/src/api-key-headers.mjs';
import {supabaseTransport} from '../packages/db/src/index';
it('sends new API keys only as apikey and preserves actual user JWTs',()=>{
 for(const key of ['sb_publishable_test_only','sb_secret_test_only']){
  expect(supabaseKeyHeaders(key)).toEqual({apikey:key});
  expect(supabaseKeyHeaders(key,'user-jwt-test-only')).toEqual({apikey:key,Authorization:'Bearer user-jwt-test-only'});
 }
 expect(supabaseKeyHeaders('legacy-test-only')).toEqual({apikey:'legacy-test-only',Authorization:'Bearer legacy-test-only'});
});
it('uses the new-key headers for database requests and keeps session authorization',async()=>{
 const mock=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json([]));
 try{
  await supabaseTransport('https://database.example','sb_publishable_test_only').read('port','published_monthly_throughput',new URLSearchParams());
  expect(mock.mock.calls[0][1]?.headers).toMatchObject({apikey:'sb_publishable_test_only'});
  expect(mock.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization');
  await supabaseTransport('https://database.example','sb_publishable_test_only','real-user-jwt-test-only').read('port','published_monthly_throughput',new URLSearchParams());
  expect(mock.mock.calls[1][1]?.headers).toMatchObject({Authorization:'Bearer real-user-jwt-test-only'});
 }finally{mock.mockRestore();}
});
