import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export async function triggerBinhduongDeploy(value,fetchImpl=fetch){
 let url;
 try{url=new URL(value);}catch{throw new Error('Missing or invalid CLOUDFLARE_STAGING_DEPLOY_HOOK');}
 assert.ok(url.protocol==='https:'&&url.hostname==='api.cloudflare.com'&&!url.port&&!url.username&&!url.password&&!url.search&&!url.hash&&/^\/client\/v4\/workers\/builds\/deploy_hooks\/[A-Za-z0-9_-]+$/.test(url.pathname),'Invalid Cloudflare staging deploy hook');
 const response=await fetchImpl(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000)});
 // Never print the hook or response body: both may expose the credential.
 if(!response.ok)throw new Error(`Cloudflare staging build request failed: HTTP ${response.status}`);
 return {requested_at:new Date().toISOString(),http_status:response.status,published_commit:process.env.PUBLISHED_COMMIT??null};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const receipt=await triggerBinhduongDeploy(process.env.CLOUDFLARE_STAGING_DEPLOY_HOOK);
  await mkdir('.local/binhduong',{recursive:true});
  await writeFile('.local/binhduong/deploy-receipt.json',JSON.stringify(receipt,null,2)+'\n');
  console.log('Requested the Cloudflare staging build; edition readback is required next.');
 }catch(error){console.error(error.message);process.exitCode=1;}
}
