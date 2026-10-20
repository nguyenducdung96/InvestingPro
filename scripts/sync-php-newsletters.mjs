// Server/CI only. Never import this file or the service credential into the web app.
import {readFile,writeFile} from 'node:fs/promises';
const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key)throw new Error('Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the scheduler secret store.');
const url=new URL(base);
if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))throw new Error('Expected Supabase HTTPS project URL');
const bundle=JSON.parse(await readFile('.local/php-newsletters/staging-bundle.json','utf8'));
if(bundle.schema!=='php-newsletters-pending-v1')throw new Error('Invalid intake bundle');
const response=await fetch(new URL('/rest/v1/rpc/import_newsletter_intake',url),{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json','Content-Profile':'port'},body:JSON.stringify({p_documents:bundle.documents,p_records:bundle.records,p_facts:bundle.facts}),signal:AbortSignal.timeout(30000)});
if(!response.ok)throw new Error(`Pending intake failed (HTTP ${response.status}); no approval was attempted.`);
const receipt={at:new Date().toISOString(),...await response.json()};
await writeFile('.local/php-newsletters/last-intake.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
