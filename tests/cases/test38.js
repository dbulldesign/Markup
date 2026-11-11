const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always' })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  await page.click('#btnChest'); await page.click('#btnSchedule'); await page.setInputFiles('#schedFile', path.join(SP, 'sched2.xlsx')); await page.waitForTimeout(400);
  for (let i = 0; i < 6; i++) { await page.locator('#chestSets [data-set] button.star').nth(i).click(); await page.waitForTimeout(80); }
  await page.click('#btnChest');
  console.log('favourites in toolbar:', await page.$$eval('#favBar > *', x => x.length), '| toolbar height:', Math.round((await page.locator('.topbar').boundingBox()).height));
  await page.screenshot({ path: path.join(SP, 'p20-top.png'), clip: { x: 0, y: 0, width: 1180, height: 140 } });
  // pretend a newer version is out, then come back to the app
  await page.route('**/version.json*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: '9.9.9', notes: 'test' }) }));
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.evaluate(() => { const t = Date.now(); Date.now = () => t + 60000; Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForURL(/\?v=9\.9\.9/, { timeout: 15000 }).then(() => console.log('auto-updated: reloaded to', page.url().replace(/^.*\//, ''))).catch(() => console.log('auto-update did not run'));
  await page.waitForTimeout(2500);
  console.log('file reopened after update:', await page.$$eval('.page', x => x.length) > 0, '| favourites kept:', await page.$$eval('#favBar > *', x => x.length));
  console.log('errors:', errs); await b.close();
})();
