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
const intake=await response.json();
// Bundle facts are emitted only for visually reviewed, archived, current hashes.
// Unknown OCR proposals never enter this list. An explicit DB policy opts in.
let publication={published:0,enabled:false};
if(bundle.facts.length){
 const released=await fetch(new URL('/rest/v1/rpc/publish_throughput_facts',url),{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json','Content-Profile':'port'},body:JSON.stringify({p_ids:bundle.facts.map(f=>f.id),p_note:'Publisher-authorized structured numeric facts, visually checked against current official PHP newsletters; source citations retained and original PDFs remain private.'}),signal:AbortSignal.timeout(30000)});
 if(!released.ok)throw new Error(`Factual publication failed (HTTP ${released.status}); intake succeeded.`);
 publication=await released.json();
}
const receipt={at:new Date().toISOString(),...intake,publication};
await writeFile('.local/php-newsletters/last-intake.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
