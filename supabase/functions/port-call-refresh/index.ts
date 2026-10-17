// Pin the reviewed importer and its dependency graph; redeploy with an updated pin after parser changes.
import {createCallIngestionHandler} from 'https://raw.githubusercontent.com/nguyenducdung96/InvestingPro/651d2c997c34562ea0b7f0bfd1b651b63dfb0c30/packages/modules/port/src/call-ingestion.ts';
const handler=createCallIngestionHandler({url:Deno.env.get('SUPABASE_URL')!,anonKey:Deno.env.get('SUPABASE_ANON_KEY')!});
Deno.serve(handler);
