// Runs the browser tests in parallel against a local copy of the app.
//   node run.mjs            all tests
//   node run.mjs 63 64      only test63 and test64
// Each test gets its own folder (out/<test>/) holding a copy of the fixtures, and is told where the app is
// (PM_URL) and where its files are (PM_DIR). A test passes when it finishes, prints "errors: []" (no errors on
// the page) and prints no exception. Tests that need a private file (fixtures/private, not in the repo) are skipped
// when it is missing. Set PM_JOBS to change how many run at once.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, mkdirSync, rmSync, cpSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, extname, normalize, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url)), app = join(here, '..');
const cases = join(here, 'cases'), fixtures = join(here, 'fixtures'), priv = join(fixtures, 'private'), out = join(here, 'out');
const PRIVATE = ['qb.xlsm', 'qb-rev2.xlsm'];
const TIMEOUT = 180000, JOBS = +process.env.PM_JOBS || Math.max(2, Math.min(6, cpus().length));

await import('./gen-fixtures.mjs');

// A plain static server for the app folder (what GitHub Pages does).
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.csv': 'text/csv' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = normalize(join(app, p));
  if (!f.startsWith(app) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const only = process.argv.slice(2).map((a) => 'test' + a.replace(/^test|\.js$/g, '') + '.js');
const list = readdirSync(cases).filter((f) => /^test\d+\.js$/.test(f) && (!only.length || only.includes(f)))
  .sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4)));
mkdirSync(out, { recursive: true });

const results = [];
async function runOne(name) {
  const src = readFileSync(join(cases, name), 'utf8');
  const missing = PRIVATE.filter((f) => src.includes(`'${f}'`) && !existsSync(join(priv, f)));
  if (missing.length) return { name, status: 'skip', note: 'needs ' + missing.join(', ') + ' in tests/fixtures/private' };
  const dir = join(out, name.replace('.js', ''));
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(fixtures)) if (f !== 'private') cpSync(join(fixtures, f), join(dir, f));
  if (existsSync(priv)) for (const f of readdirSync(priv)) cpSync(join(priv, f), join(dir, f));
  const env = { ...process.env, PM_URL: url, PM_DIR: dir, NODE_PATH: [join(here, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(delimiter) };
  const t0 = Date.now();
  const text = await new Promise((resolve) => {
    const ch = spawn(process.execPath, [join(cases, name)], { env, cwd: dir });
    let buf = ''; ch.stdout.on('data', (d) => (buf += d)); ch.stderr.on('data', (d) => (buf += d));
    const timer = setTimeout(() => { buf += '\nTimeoutError: the test took longer than ' + TIMEOUT / 1000 + ' s'; ch.kill('SIGKILL'); }, TIMEOUT);
    ch.on('close', () => { clearTimeout(timer); resolve(buf); });
  });
  writeFileSync(join(dir, 'output.txt'), text);
  const failed = /TimeoutError|Error:|TypeError|ReferenceError/.test(text) || !/^errors: \[\]/m.test(text);
  return { name, status: failed ? 'FAIL' : 'ok', secs: ((Date.now() - t0) / 1000).toFixed(0), tail: failed ? text.split('\n').filter((l) => l.trim() && !/^\s+at |waiting|retrying|attempting|^\s*-/.test(l)).slice(-8).join('\n') : '' };
}

const queue = list.slice(), t0 = Date.now();
await Promise.all(Array.from({ length: JOBS }, async () => {
  while (queue.length) {
    const r = await runOne(queue.shift()); results.push(r);
    console.log(`${r.status.padEnd(4)} ${r.name}${r.secs ? ' (' + r.secs + ' s)' : ''}${r.note ? ' - ' + r.note : ''}`);
    if (r.tail) console.log(r.tail.replace(/^/gm, '     '));
  }
}));
server.close();
const n = (s) => results.filter((r) => r.status === s).length;
const summary = `${n('ok')} passed, ${n('FAIL')} failed, ${n('skip')} skipped, in ${((Date.now() - t0) / 1000).toFixed(0)} s`;
console.log('\n' + summary);
writeFileSync(join(out, 'summary.txt'), results.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((r) => `${r.status} ${r.name}${r.note ? ' - ' + r.note : ''}`).join('\n') + '\n' + summary + '\n');
process.exit(n('FAIL') ? 1 : 0);
