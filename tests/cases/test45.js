const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  const tapPdf = async (x, y) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; await page.mouse.click(bx.x + x * sc, bx.y + (1728 - y) * sc); await page.waitForTimeout(250); };
  await tool('symbol');
  for (let i = 0; i < 30; i++) await tapPdf(200 + (i % 10) * 200, 1500 - Math.floor(i / 10) * 300);
  await tool('select');
  const scrollOf = () => page.evaluate(() => document.querySelector('#rows').scrollTop);
  console.log('list scroll before:', await scrollOf());
  await tapPdf(2000, 900); // the last one, far down the list
  const vis = await page.evaluate(() => { const r = document.querySelector('#rows .row.sel'), l = document.querySelector('#rows').getBoundingClientRect(), rr = r.getBoundingClientRect(); return rr.top >= l.top && rr.bottom <= l.bottom; });
  console.log('after tapping on the drawing: scroll', await scrollOf(), '| selected row visible:', vis, '| flash:', await page.evaluate(() => document.querySelector('#rows .row.sel').classList.contains('flash')));
  await page.screenshot({ path: path.join(SP, 'p31.png') });
  // palette
  await page.click('#btnPalette'); await page.waitForTimeout(200);
  const g = await page.locator('#qgrip').boundingBox();
  await page.mouse.move(g.x + 5, g.y + 10); await page.mouse.down(); await page.mouse.move(200, 300, { steps: 8 }); await page.mouse.up();
  const p1 = await page.locator('#qpal').boundingBox();
  await page.reload(); await page.waitForTimeout(1500);
  const p2 = await page.locator('#qpal').boundingBox(); console.log('palette after reload at same spot:', Math.abs(p1.x - p2.x) < 2 && Math.abs(p1.y - p2.y) < 2, Math.round(p2.x), Math.round(p2.y));
  await page.setViewportSize({ width: 820, height: 1180 }); await page.waitForTimeout(400);
  const p3 = await page.locator('#qpal').boundingBox(); console.log('after rotating, same relative spot:', Math.round(p3.x), Math.round(p3.y), '(expected about', Math.round(p1.x / 1180 * 820), Math.round(p1.y / 820 * 1180) + ')');
  console.log('errors:', errs); await b.close();
})();
