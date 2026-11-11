const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  await page.click('#btnChest'); await page.click('#btnSchedule'); await page.setInputFiles('#schedFile', path.join(SP, 'sched2.xlsx')); await page.waitForTimeout(400);
  for (let i = 0; i < 6; i++) { await page.locator('#chestSets [data-set] button.star').nth(i).click(); await page.waitForTimeout(60); }
  await page.click('#btnChest');
  console.log('toolbar items for favourites:', await page.$$eval('#favBar > *', x => x.length), '| label:', (await page.textContent('#favDD')).trim(), '| toolbar height:', Math.round((await page.locator('.topbar').boundingBox()).height));
  await page.screenshot({ path: path.join(SP, 'p36-bar.png'), clip: { x: 0, y: 0, width: 1180, height: 80 } });
  await page.tap('#favDD'); await page.waitForTimeout(200); console.log('drop-down open:', await page.isVisible('#favPop'), '| tools in it:', await page.$$eval('#favGrid [data-fav]', x => x.length));
  await page.screenshot({ path: path.join(SP, 'p36-pop.png'), clip: { x: 0, y: 0, width: 1180, height: 420 } });
  await page.tap('#favGrid [data-fav] >> nth=2'); await page.waitForTimeout(200);
  console.log('picked:', (await page.textContent('#favDD')).trim(), '| closed:', await page.isHidden('#favPop'), '| tool:', await page.textContent('#btnToolPick .tn'));
  await page.tap('#favDD'); const bx = await page.locator('.page').first().boundingBox(); await page.touchscreen.tap(bx.x + 300, bx.y + 300); await page.waitForTimeout(200); console.log('tap outside closes:', await page.isHidden('#favPop'));
  await page.click('#btnSettings'); await page.evaluate(() => document.querySelectorAll('#setBody .setsec').forEach(x => x.hidden = false)); await page.selectOption('#setBody [data-set="favMode"]', 'row'); await page.click('#setClose');
  console.log('row mode buttons:', await page.$$eval('#favBar > *', x => x.length));
  console.log('errors:', errs); await b.close();
})();
