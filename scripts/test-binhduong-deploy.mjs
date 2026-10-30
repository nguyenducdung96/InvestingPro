import {test} from 'node:test';
import assert from 'node:assert/strict';
import {triggerBinhduongDeploy} from './trigger-binhduong-deploy.mjs';

test('rejects missing hooks, unexpected origins and credential-bearing URL variants before network',async()=>{
 for(const value of [undefined,'http://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/test','https://other.example/client/v4/workers/builds/deploy_hooks/test','https://api.cloudflare.com/other','https://user:secret@api.cloudflare.com/client/v4/workers/builds/deploy_hooks/test','https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/test?secret=value']){
  await assert.rejects(triggerBinhduongDeploy(value,()=>{assert.fail('Invalid hook reached network');}));
 }
});
test('requests one build without redirects and emits a receipt without the hook',async()=>{
 let calls=0;
 const hook='https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/test-hook';
 const receipt=await triggerBinhduongDeploy(hook,async(url,options)=>{
  calls++;assert.equal(url.href,hook);assert.equal(options.method,'POST');assert.equal(options.redirect,'error');
  return {ok:true,status:200};
 });
 assert.equal(calls,1);assert.equal(receipt.http_status,200);assert.ok(!JSON.stringify(receipt).includes('test-hook'));
});
test('HTTP errors cannot be reported as a deployed edition or disclose the hook',async()=>{
 await assert.rejects(triggerBinhduongDeploy('https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/test-hook',async()=>({ok:false,status:403})),/^Error: Cloudflare staging build request failed: HTTP 403$/);
});
