const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName, StandardFonts } = require('pdf-lib');
(async () => {
  // a 300-page set
  const big = await PDFDocument.create(); const f = await big.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 300; i++) { const pg = big.addPage([2592, 1728]); pg.drawRectangle({ x: 72, y: 72, width: 2448, height: 1584, borderWidth: 3 }); pg.drawText('SHEET E-' + (100 + i), { x: 2200, y: 120, size: 28, font: f }); }
  fs.writeFileSync(path.join(SP, 'big.pdf'), await big.save());
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always' })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  let t0 = Date.now(); await page.setInputFiles('#file', path.join(SP, 'big.pdf')); await page.waitForFunction(() => document.querySelectorAll('.page').length === 300 && document.querySelector('#busy').hidden, null, { timeout: 60000 });
  console.log('300 pages open in', Date.now() - t0, 'ms | page indicator', await page.textContent('#pageInd'));
  // 600 numbered markups via the app API is heavy; place 30 by tapping, then list paging tested with a lower limit
  await page.click('#btnClosePanel');
  const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592, at = (x, y) => [bx.x + x * sc, bx.y + (1728 - y) * sc];
  await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="symbol"]');
  let t1 = Date.now();
  for (let i = 0; i < 270; i++) { const a = at(200 + (i % 27) * 85, 1500 - Math.floor(i / 27) * 120); await page.mouse.click(a[0], a[1]); }
  console.log('270 symbols placed in', Date.now() - t1, 'ms');
  await page.click('#btnPanel').catch(() => {}); await page.waitForTimeout(300);
  console.log('rows shown (limit 250):', await page.$$eval('#rows .row[data-id]', r => r.length), '| more button:', await page.textContent('#moreRows').catch(() => 'none'));
  await page.evaluate(() => document.querySelector('#moreRows').click()); console.log('after show more:', await page.$$eval('#rows .row[data-id]', r => r.length));
  // thumbnails: scroll to the end, early thumbs released
  await page.click('#btnPages').catch(() => {}); await page.waitForTimeout(300);
  await page.evaluate(() => { const t = document.querySelector('#thumbs'); t.scrollTop = t.scrollHeight; }); await page.waitForTimeout(800);
  console.log('thumbs drawn:', await page.$$eval('#thumbs .thumb[data-done]', r => r.length), 'of', await page.$$eval('#thumbs .thumb', r => r.length));
  // save options: flattened
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])');
  await page.fill('#saveName', 'Issued set'); await page.selectOption('#saveMode', 'flat');
  await page.screenshot({ path: path.join(SP, 'p3-savebar.png'), clip: { x: 0, y: 600, width: 1180, height: 220 } });
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#btnSaveFile')]);
  console.log('download name:', dl.suggestedFilename()); const o = path.join(SP, 'flat.pdf'); await dl.saveAs(o);
  const od = await PDFDocument.load(fs.readFileSync(o)); console.log('flattened: pages', od.getPageCount(), '| annots on p1:', od.getPages()[0].node.Annots() ? od.getPages()[0].node.Annots().size() : 0);
  console.log('markups still editable in app:', await page.textContent('#count'));
  // storage
  await page.click('#btnSettings'); await page.evaluate(() => document.querySelectorAll('#setBody .setsec').forEach(x => x.hidden = false)); await page.waitForTimeout(1200);
  console.log('storage:', (await page.textContent('#storeInfo')).replace(/\s+/g, ' ').slice(0, 200));
  await page.locator('#storeInfo').screenshot({ path: path.join(SP, 'p3-storage.png') });
  console.log('errors:', errs); await b.close();
})();
