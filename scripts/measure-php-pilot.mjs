// Slice 2A: inspect captured official data with the existing parser, never import it.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseCallSource} from '../packages/modules/port/src/calls.ts';

const root = new URL('../', import.meta.url);
const receipt = JSON.parse(await readFile(new URL('.local/php-slice2a/receipt.json', root), 'utf8'));
const source = receipt.sources.find(s => s.id === 'authority-position');
if (!source || source.curl_exit !== 0 || source.http_status !== '200') throw new Error('No successful authority snapshot');
const bytes = await readFile(new URL(source.local_raw.replaceAll('\\', '/'), root));
if (createHash('sha256').update(bytes).digest('hex') !== source.sha256) throw new Error('Capture hash mismatch');
const parsed = await parseCallSource(bytes.toString('utf8'), 'haiphong-in-port', source.fetched_at);
const terminals = [['TAN VU', 52], ['CHUA VE', 38], ['HOANG DIEU', 28], ['HTIT', 62]].map(([alias, number]) => {
  const matched = parsed.rows.filter(r => r.berth === alias);
  const valid = matched.filter(r => !r.quarantine_reason);
  return {
    source_alias: alias, catalog_505_number: number,
    observed_snapshot_rows: matched.length, valid_snapshot_rows: valid.length,
    rows_with_dwt: valid.filter(r => r.dwt !== null).length,
    // No observations is not proof of zero calls or zero DWT.
    actual_call_count: null, actual_monthly_dwt: null, historical_coverage: 'unverified',
    eligible_for_actual_yoy: false,
  };
});
const result = {
  scope: 'PHP Slice 2A local source measurement; not production data',
  fetched_at: source.fetched_at, raw_sha256: source.sha256,
  parser_version: parsed.parser_version, source_url: source.url,
  all_snapshot_rows: parsed.rows.length, terminals,
  decision: 'actual_history_gate_not_met',
  reasons: ['Current positions do not establish historical calls',
    'Authority movement page is explicitly a plan',
    'Actual terminal event history and complete comparison periods are not verified'],
};
await writeFile(new URL('.local/php-slice2a/measurement.json', root), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
