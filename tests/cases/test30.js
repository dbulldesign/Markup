const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName } = require('pdf-lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always' })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  await page.click('#btnClosePanel');
  const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592, at = (x, y) => [bx.x + x * sc, bx.y + (1728 - y) * sc];
  const drag = async (x0, y0, x1, y1) => { const a = at(x0, y0), c = at(x1, y1); await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(c[0], c[1], { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(100); };
  const tap = async (x, y) => { const a = at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(150); };
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  await tool('text'); await drag(300, 1500, 1300, 1380);
  await page.keyboard.type('Освещение Ελληνικά עברית — Luz ✓'); await page.keyboard.press('Escape');
  await tool('symbol'); await page.click('#btnStyle'); await page.fill('#symNew [data-s="label"]', 'Ж1'); await page.click('#btnStyle');
  await tap(600, 1000);
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveFile')]); const o = path.join(SP, 'uni.pdf'); await dl.saveAs(o);
  const od = await PDFDocument.load(fs.readFileSync(o)); const an = od.getPages()[0].node.Annots();
  for (let i = 0; i < an.size(); i++) { const d = od.context.lookup(an.get(i)); const ap = od.context.lookup(od.context.lookup(d.get(PDFName.of('AP'))).get(PDFName.of('N'))); const res = ap.dict.get(PDFName.of('Resources')); console.log(String(d.get(PDFName.of('Subtype'))), '| contents:', d.get(PDFName.of('Contents')) ? d.get(PDFName.of('Contents')).decodeText() : '-', '| XObject in AP:', !!(res && od.context.lookup(res).get(PDFName.of('XObject')))); }
  // reopen the saved file in a fresh state to see the appearance as Revu would
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  const p2 = await ctx.newPage(); await p2.goto(process.env.PM_URL + 'vendor/../index.html'); await p2.waitForTimeout(800);
  await p2.evaluate(async (b64) => {}, '');
  console.log('errors:', errs); await b.close();
})();
