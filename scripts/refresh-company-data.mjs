import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const python = path.join(root, '.local/company-refresh-venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const args = process.argv.slice(2).filter(a => a !== '--');
const scope = JSON.parse(readFileSync(path.join(root, 'docs/catalog-review/reported-catalog-manifest.json'), 'utf8')).items;
if (args.length === 1 && args[0] === '--status') {
  const missing = [];
  const stale = [];
  let available = 0;
  for (const { ticker } of scope) {
    const snapshot = path.join(root, '.local/company-refresh/by-ticker', ticker, 'vnstock-vci/organizations/latest.json');
    if (!existsSync(snapshot)) { missing.push(ticker); continue; }
    const value = JSON.parse(readFileSync(snapshot, 'utf8'));
    available++;
    if (Date.now() - Date.parse(value.fetched_at) >= 86400000) stale.push(ticker);
  }
  process.stdout.write(`VCI company profile snapshots: ${available}/${scope.length}\n`);
  process.stdout.write(`Missing: ${missing.join(', ') || 'none'}\nOlder than 24h: ${stale.join(', ') || 'none'}\n`);
  process.stdout.write('Local research snapshots; no database publication performed.\n');
  process.exit(0);
}
const allowed = new Set(['--tickers', '--web', '--install', '--force']);
let tickers;
let web = false;
let install = false;
let force = false;
for (let i = 0; i < args.length; i++) {
  if (!allowed.has(args[i])) throw new Error('Use --tickers GMD,PHP,MVN, --web, --force or --install');
  if (args[i] === '--tickers') {
    tickers = args[++i];
    if (!tickers || tickers.startsWith('--')) throw new Error('--tickers requires comma-separated ticker codes');
  }
  else if (args[i] === '--web') web = true;
  else if (args[i] === '--force') force = true;
  else install = true;
}
function run(command, parameters) {
  const result = spawnSync(command, parameters, { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) throw new Error('Cannot start refresh runtime; check Python installation');
  return result.status ?? 1;
}
if (install) {
  if (!existsSync(python) && run('python', ['-m', 'venv', '.local/company-refresh-venv'])) process.exit(1);
  if (run(python, ['-m', 'pip', 'install', '-r', 'config/requirements-company-refresh.txt'])) process.exit(1);
}
if (!existsSync(python)) throw new Error('Run pnpm data:refresh --install once with Python 3.12+ installed');
tickers ??= scope.map(r => r.ticker).join(',');
let code = run(python, ['scripts/refresh-vnstock.py', '--source', 'vci', '--datasets', 'all', '--tickers', tickers, ...(force ? ['--force'] : [])]);
if (run(python, ['scripts/export-reference-bundle.py'])) code = 1;
if (web && run(python, ['scripts/refresh-company-web-sources.py'])) code = 1;
if (code) process.stderr.write('Refresh incomplete. Inspect .local/company-refresh/*last-run.json; prior snapshots retained.\n');
process.exitCode = code;
