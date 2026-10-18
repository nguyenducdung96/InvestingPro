// Pin the reviewed importer and its dependency graph; redeploy with an updated pin after parser changes.
import {createCallIngestionHandler} from 'https://raw.githubusercontent.com/nguyenducdung96/InvestingPro/2c3eb6003cf9cddecde7fabbef5febcd48c7b21d/packages/modules/port/src/call-ingestion.ts';
const handler=createCallIngestionHandler({url:Deno.env.get('SUPABASE_URL')!,anonKey:Deno.env.get('SUPABASE_ANON_KEY')!});
Deno.serve(handler);
