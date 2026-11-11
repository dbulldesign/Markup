const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'qb.pdf')); await page.waitForTimeout(1500);
  await page.click('#btnChest'); await page.click('#btnSchedule'); await page.setInputFiles('#schedFile', path.join(SP, 'qb.xlsm')); await page.waitForTimeout(1500);
  const chips = () => page.$$eval('#chestSets button.chip .t', x => x.map(e => e.textContent));
  console.log('all tools:', (await chips()).length);
  for (const q of ['LT1', 'sconce low voltage', 'amerlux', 'track', 'zzz']) { await page.fill('#chestSearch', q); await page.waitForTimeout(100); const c = await chips(); console.log('chest "' + q + '":', c.length, c.slice(0, 4).join(' | ') || (await page.textContent('#chestSets')).trim()); }
  await page.fill('#chestSearch', 'LT3-B'); await page.press('#chestSearch', 'Enter'); await page.waitForTimeout(150);
  console.log('Return picks:', await page.textContent('#btnToolPick .tn'));
  await page.screenshot({ path: path.join(SP, 'p47.png'), clip: { x: 0, y: 0, width: 760, height: 420 } });
  if (await page.isVisible('#chestPop')) await page.click('#btnChest');
  await page.click('#favDD'); await page.fill('#favSearch', 'pendant'); await page.waitForTimeout(100);
  console.log('drop-down "pendant":', (await page.$$eval('#favGrid [data-fav] .lbl', x => x.map(e => e.textContent))).join(' | '));
  await page.press('#favSearch', 'Enter'); await page.waitForTimeout(150); console.log('drop-down Return picks:', await page.textContent('#btnToolPick .tn'));
  console.log('errors:', errs); await b.close();
})();
