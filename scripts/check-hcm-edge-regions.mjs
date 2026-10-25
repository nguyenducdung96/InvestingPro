// Repeatable authenticated diagnostic; never log project keys or install new ones.
import {writeFile,mkdir} from 'node:fs/promises';
process.loadEnvFile('apps/web/.env.local');
const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY;
if(base!=='https://loapslojajawgzekozfv.supabase.co'||!key)throw Error('Expected project configuration is unavailable');
const results=await Promise.all(['ap-southeast-1','ap-northeast-1','ap-south-1'].map(async region=>{
 const started=Date.now();
 try{
  const response=await fetch(`${base}/functions/v1/hcm-source-health?forceFunctionRegion=${region}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'x-region':region},redirect:'error',signal:AbortSignal.timeout(45000)});
  return {region,status:response.status,edge_region:response.headers.get('x-sb-edge-region'),result:await response.json(),elapsed_ms:Date.now()-started};
 }catch(error){return {region,client_error:error.message,elapsed_ms:Date.now()-started};}
}));
await mkdir('.local/ops',{recursive:true});
await writeFile('.local/ops/supabase-hcm-regions.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.result?.reachable!==true||r.result?.schedule_tables_present!==true))process.exitCode=1;
