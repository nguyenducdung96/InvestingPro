// Pin the reviewed importer and its dependency graph; keep user-JWT authorization.
import {createCallIngestionHandler} from 'https://raw.githubusercontent.com/nguyenducdung96/InvestingPro/48c9129fde78e7fc0bc7812387a1c4ddc98d80ec/packages/modules/port/src/call-ingestion.ts';
Deno.serve(async (input) => {
  // Supabase injects new keys as a name -> key dictionary. Never fall back to
  // SUPABASE_ANON_KEY: disabling legacy API keys must not break this importer.
  let keys;
  try { keys=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}'); }
  catch { keys=null; }
  const publishable=keys && !Array.isArray(keys) && typeof keys==='object'
    ? [keys.default,...Object.keys(keys).sort().map(name=>keys[name])].find(value=>typeof value==='string'&&value.startsWith('sb_publishable_'))
    : undefined;
  const url=Deno.env.get('SUPABASE_URL');
  if(!publishable||!url)return Response.json({error:'publishable_key_not_configured'},{status:503});
  return createCallIngestionHandler({url,anonKey:publishable})(input);
});
