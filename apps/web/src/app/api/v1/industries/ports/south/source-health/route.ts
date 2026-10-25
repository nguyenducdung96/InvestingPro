import {getCloudflareContext} from '@opennextjs/cloudflare';

export const dynamic = 'force-dynamic';
const source = 'https://cangvuhanghaitphcm.gov.vn/index.aspx?page=shipschedule&cat=3146';
const targets: Record<string, string> = {
  main: source,
  www: 'https://www.cangvuhanghaitphcm.gov.vn/index.aspx?page=shipschedule&cat=3146',
  map: 'https://kehoach.cangvuhanghaitphcm.gov.vn/welcome',
  map_history: 'https://phuongdinh.name.vn/api/cangvu/getDSTau4?ngay=24/10/2026',
};
const cached = new Map<string, {expires: number; result: Promise<Record<string, unknown>>}>();

async function probe(source: string) {
  const checkedAt = new Date().toISOString();
  const started = Date.now();
  let colo: unknown = null;
  try { colo = getCloudflareContext().cf?.colo ?? null; } catch { /* Local Next runtime. */ }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(source, {signal: controller.signal, cache: 'no-store', redirect: 'manual'});
    if (!response.ok) {
      await response.body?.cancel();
      return {checked_at: checkedAt, source_url: source, colo, reachable: false, source_status: response.status, reason: 'source_http_error'};
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('missing_body');
    let bytes = 0;
    let html = '';
    const decoder = new TextDecoder();
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4 * 1024 * 1024) { await reader.cancel(); throw new Error('body_too_large'); }
      html += decoder.decode(value, {stream: true});
    }
    html += decoder.decode();
    const hasTables = ['ctl22_GridView_TauDen', 'ctl22_GridView_TauRoi', 'ctl22_GridView_TauDiChuyen'].every(id => html.includes(`id="${id}"`));
    let sourceTypes: Record<string, number> | null = null;
    if (source.includes('phuongdinh.name.vn')) {
      const json = JSON.parse(html) as {data?: {source_type?: string}[]};
      sourceTypes = {};
      for (const row of json.data ?? []) { const type = row.source_type ?? 'unknown'; sourceTypes[type] = (sourceTypes[type] ?? 0) + 1; }
    }
    return {checked_at: checkedAt, source_url: source, colo, elapsed_ms: Date.now() - started, reachable: true, source_status: response.status, bytes, schedule_tables_present: hasTables, source_types: sourceTypes, purpose: 'connectivity_only', refresh_verified: false};
  } catch (error) {
    return {checked_at: checkedAt, source_url: source, colo, reachable: false, reason: controller.signal.aborted ? 'source_timeout' : 'source_fetch_failed', detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown', refresh_verified: false};
  } finally { clearTimeout(timeout); }
}

// Fixed public source only. Collapse concurrent requests and cache failures too.
export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get('target') ?? 'main';
  if (!Object.hasOwn(targets, target)) return Response.json({error: 'Unknown fixed diagnostic target'}, {status: 400});
  let entry = cached.get(target);
  if (!entry || entry.expires <= Date.now()) {
    entry = {expires: Date.now() + 15 * 60_000, result: probe(targets[target])};
    cached.set(target, entry);
  }
  return Response.json(await entry.result, {headers: {'Cache-Control': 'public, max-age=900'}});
}
