const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, rgb } = require('pdf-lib');
(async () => {
  const mk = async (rev) => { const d = await PDFDocument.create(); for (let i = 0; i < 2; i++) { const pg = d.addPage([2592, 1728]); pg.drawRectangle({ x: 72, y: 72, width: 2448, height: 1584, borderWidth: 4, borderColor: rgb(0, 0, 0) });
    pg.drawRectangle({ x: 400, y: 400, width: 600, height: 400, borderWidth: 6, borderColor: rgb(0, 0, 0) });
    if (rev === 'B' && i === 0) { pg.drawRectangle({ x: 1500, y: 900, width: 300, height: 300, borderWidth: 6, borderColor: rgb(0, 0, 0) }); }
    if (rev === 'A' && i === 0) { pg.drawLine({ start: { x: 400, y: 1300 }, end: { x: 1100, y: 1300 }, thickness: 6 }); } }
    return d.save(); };
  fs.writeFileSync(path.join(SP, 'revA.pdf'), await mk('A')); fs.writeFileSync(path.join(SP, 'revB.pdf'), await mk('B'));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always' })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'revB.pdf')); await page.waitForTimeout(1500); await page.click('#btnClosePanel');
  await page.click('#btnPages'); await page.waitForTimeout(300);
  await page.setInputFiles('#cmpFile', path.join(SP, 'revA.pdf')); await page.waitForFunction(() => !document.querySelector('#cmpBar').hidden && document.querySelector('#busy').hidden, null, { timeout: 30000 });
  console.log('compare bar:', (await page.textContent('#cmpInfo')).trim());
  await page.screenshot({ path: path.join(SP, 'p6-compare.png') });
  await page.click('#cmpCloud'); await page.waitForTimeout(400); console.log('markups after cloud:', await page.textContent('#count'));
  await page.click('#cmpAll'); await page.waitForFunction(() => document.querySelector('#busy').hidden, null, { timeout: 60000 }); await page.waitForTimeout(300);
  console.log('markups after all pages:', await page.textContent('#count'));
  await page.click('#btnUndo'); console.log('after undo:', await page.textContent('#count'));
  await page.click('#cmpDone'); console.log('overlays left:', await page.$$eval('canvas.cmp', x => x.length));
  console.log('errors:', errs); await b.close();
})();
