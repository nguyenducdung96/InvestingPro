// Pin the reviewed importer and its dependency graph; redeploy with an updated pin after parser changes.
import {createCallIngestionHandler} from 'https://raw.githubusercontent.com/nguyenducdung96/InvestingPro/9c1e2be3570e75deb99db7d2d37cf147db2be9b9/packages/modules/port/src/call-ingestion.ts';
const handler=createCallIngestionHandler({url:Deno.env.get('SUPABASE_URL')!,anonKey:Deno.env.get('SUPABASE_ANON_KEY')!});
Deno.serve(handler);
