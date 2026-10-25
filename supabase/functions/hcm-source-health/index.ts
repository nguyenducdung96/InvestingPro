// Diagnostic only: fixed public source, no database or secret access, no raw proxy.
// Retain the platform's default JWT verification when deploying this function.
const source = 'https://cangvuhanghaitphcm.gov.vn/index.aspx?page=shipschedule&cat=3146';
Deno.serve(async (request: Request) => {
  if (!['GET', 'POST'].includes(request.method)) return new Response(null, {status: 405});
  const checkedAt = new Date().toISOString();
  const started = Date.now();
  const controller = new AbortController();
  let timer: number | undefined;
  try {
    const work = async () => {
      const response = await fetch(source, {redirect: 'manual', signal: controller.signal});
      if (!response.ok) { await response.body?.cancel(); return {reachable: false, source_status: response.status}; }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('missing_body');
      let bytes = 0, html = '';
      const decoder = new TextDecoder();
      for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 4_000_000) { await reader.cancel(); throw new Error('body_too_large'); }
        html += decoder.decode(value, {stream: true});
      }
      html += decoder.decode();
      return {reachable: true, source_status: response.status, bytes, schedule_tables_present: ['ctl22_GridView_TauDen', 'ctl22_GridView_TauRoi', 'ctl22_GridView_TauDiChuyen'].every(id => html.includes(`id="${id}"`))};
    };
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('source_timeout')); }, 15000); });
    const result = await Promise.race([work(), timeout]);
    return Response.json({checked_at: checkedAt, source_url: source, region: Deno.env.get('SB_REGION'), elapsed_ms: Date.now() - started, ...result, refresh_verified: false});
  } catch (error) {
    return Response.json({checked_at: checkedAt, source_url: source, region: Deno.env.get('SB_REGION'), elapsed_ms: Date.now() - started, reachable: false, reason: controller.signal.aborted ? 'source_timeout' : 'source_fetch_failed', detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown', refresh_verified: false});
  } finally { clearTimeout(timer); }
});
