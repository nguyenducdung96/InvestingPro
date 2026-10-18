// Pin the reviewed importer and its dependency graph; redeploy with an updated pin after parser changes.
import {createCallIngestionHandler} from 'https://raw.githubusercontent.com/nguyenducdung96/InvestingPro/48c9129fde78e7fc0bc7812387a1c4ddc98d80ec/packages/modules/port/src/call-ingestion.ts';
const handler=createCallIngestionHandler({url:Deno.env.get('SUPABASE_URL')!,anonKey:Deno.env.get('SUPABASE_ANON_KEY')!});
Deno.serve(handler);
