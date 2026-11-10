// Copies the web app (one folder up) into www/ for the native build.
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..');
const out = join(here, '..', 'www');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const item of ['index.html', 'manifest.webmanifest', 'version.json', 'vendor', 'icons', 'templates']) {
  const from = join(src, item);
  if (existsSync(from)) cpSync(from, join(out, item), { recursive: true });
}
console.log('Copied the web app into', out);
