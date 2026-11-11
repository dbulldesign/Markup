const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName } = require('pdf-lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always' })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592, at = (x, y) => [bx.x + x * sc, bx.y + (1728 - y) * sc];
  const drag = async (x0, y0, x1, y1) => { const a = at(x0, y0), c = at(x1, y1); await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(c[0], c[1], { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(100); };
  await page.mouse.click(5, 300); // focus page body
  await page.keyboard.press('r'); await drag(200, 1500, 400, 1350);
  await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="numbered"]');
  await page.mouse.click(...at(600, 1400)); await page.mouse.click(...at(700, 1400));
  await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="arrow"]'); await drag(800, 1500, 1000, 1350);
  await page.keyboard.press('Control+z'); await page.keyboard.press('Control+Shift+z');
  console.log('markups:', await page.textContent('#count'), '| tool button:', await page.textContent('#btnToolPick .tn'));
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveFile')]); const out = path.join(SP, 'p6.pdf'); await dl.saveAs(out);
  const od = await PDFDocument.load(fs.readFileSync(out)); const an = od.getPages()[0].node.Annots();
  const subs = []; for (let i = 0; i < an.size(); i++) subs.push(String(od.context.lookup(an.get(i)).get(PDFName.of('Subtype'))));
  console.log('saved:', subs.join(' ')); console.log('errors:', errs);
  await b.close();
})();
