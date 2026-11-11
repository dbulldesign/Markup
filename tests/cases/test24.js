const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName } = require('pdf-lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always', compact: false })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1200);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  await page.click('#btnScale'); await page.selectOption('#scPreset', '0:4'); await page.click('#scOk');
  const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592;
  const at = (x, y) => [bx.x + x * sc, bx.y + (1728 - y) * sc];
  const tap = async (x, y) => { const a = at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(550); };
  const drag = async (x0, y0, x1, y1) => { const a = at(x0, y0), c = at(x1, y1); await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(c[0], c[1], { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150); };
  const labels = () => page.$$eval('#rows .row[data-id] .comm b', r => r.map(e => e.textContent).join(' | '));
  await page.click('[data-tool="angle"]'); await tap(300, 1200); await tap(300, 1000); await tap(500, 1000);
  await page.click('[data-tool="radius"]'); await drag(800, 1100, 872, 1100);
  await page.click('[data-tool="diameter"]'); await drag(1100, 1100, 1172, 1100);
  await page.click('[data-tool="area"]'); for (const [x, y] of [[300, 700], [444, 700], [444, 556], [300, 556]]) await tap(x, y); await tap(300, 700);
  console.log('labels:', await labels());
  // cut-out
  await page.click('[data-tool="select"]'); await tap(372, 690);
  await page.click('#pCutout'); for (const [x, y] of [[336, 664], [408, 664], [408, 592], [336, 592]]) await tap(x, y); await tap(336, 664);
  console.log('after cut-out:', await labels(), '| props:', await page.textContent('#pMeasure'));
  // display settings
  await page.click('#btnScale'); await page.selectOption('#msArea', 'sy'); await page.selectOption('#msDec', '1'); await page.click('#scCancel');
  console.log('square yards, 1 decimal:', await labels());
  await page.click('#btnScale'); await page.selectOption('#msArea', 'auto'); await page.selectOption('#msDec', '2'); await page.click('#scCancel');
  // snapping: line from 3px off the area corner; near-level length
  await page.click('[data-tool="line"]'); await drag(300 + 3 / sc / 0.9 * 0.3, 700 + 2 / sc / 0.9 * 0.3, 200, 450);
  await page.click('[data-tool="length"]'); await drag(600, 500, 900, 507);
  const st = await page.evaluate(() => { const L = []; document.querySelectorAll('#rows .row[data-id]').forEach(() => {}); return null; });
  // save and inspect
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveFile')]);
  const out = path.join(SP, 'p4.pdf'); await dl.saveAs(out);
  const od = await PDFDocument.load(fs.readFileSync(out)); const an = od.getPages()[0].node.Annots();
  for (let i = 0; i < an.size(); i++) {
    const d = od.context.lookup(an.get(i)), g = k => d.get(PDFName.of(k)) ? String(d.get(PDFName.of(k))).replace(/\s+/g, ' ').slice(0, 110) : '-';
    console.log(g('Subtype').padEnd(10), 'Contents', JSON.stringify(d.get(PDFName.of('Contents')) ? d.get(PDFName.of('Contents')).decodeText() : '').padEnd(14), 'PMMeasure', g('PMMeasure').padEnd(60), 'L/V', (g('L') !== '-' ? g('L') : g('Vertices')).slice(0, 60));
  }
  console.log('after reopen labels:', await labels());
  await page.click('#btnClosePanel');
  for (let i = 0; i < 3; i++) await page.click('#zoomIn');
  await page.evaluate(() => { const v = document.querySelector('#viewer'), p = document.querySelector('.page'); const s = p.offsetWidth / 2592; v.scrollLeft = p.offsetLeft + 150 * s; v.scrollTop = p.offsetTop + (1728 - 1260) * s; });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SP, 'p4-page.png'), clip: { x: 0, y: 120, width: 1180, height: 620 } });
  console.log('errors:', errs); await b.close();
})();
