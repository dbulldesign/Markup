// Makes the large test drawings that are too big to keep in the repo (they are regenerated the same every time).
// set30.pdf: 30 sheets of 15,000 random line segments each, used by the page-cache test.
import { writeFileSync, existsSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

// A small repeatable random generator, so the drawing is the same on every machine.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function pdf(pages) {
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', null], kids = [];
  const add = (o) => { objs.push(o); return objs.length; };
  pages.forEach((content) => {
    const c = deflateSync(Buffer.from(content));
    const cid = add(Buffer.concat([Buffer.from(`<< /Length ${c.length} /Filter /FlateDecode >>\nstream\n`), c, Buffer.from('\nendstream')]));
    kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 2592 1728] /Contents ${cid} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>`));
  });
  objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const parts = [Buffer.from('%PDF-1.4\n')], offs = []; let len = parts[0].length;
  objs.forEach((o, i) => { const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), Buffer.isBuffer(o) ? o : Buffer.from(o), Buffer.from('\nendobj\n')]); offs.push(len); parts.push(b); len += b.length; });
  const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('') +
    `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${len}\n%%EOF\n`;
  parts.push(Buffer.from(xref));
  return Buffer.concat(parts);
}

const out = join(here, 'set30.pdf');
if (!existsSync(out)) {
  const r = rng(2), pages = [];
  for (let p = 0; p < 30; p++) {
    const ops = ['q 0.4 w'];
    for (let i = 0; i < 15000; i++) {
      const x = r() * 2592, y = r() * 1728, l = 2 + r() * 58;
      ops.push(`${x.toFixed(1)} ${y.toFixed(1)} m ${(x + l).toFixed(1)} ${(y + (i % 3 === 0 ? l : 0)).toFixed(1)} l S`);
    }
    ops.push(`Q BT /F1 96 Tf 200 1500 Td (SHEET ${p + 1}) Tj ET`);
    pages.push(ops.join('\n'));
  }
  writeFileSync(out, pdf(pages));
  console.log('made', out);
}
