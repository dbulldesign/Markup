const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept(d.type() === 'prompt' ? 'Site walk' : undefined));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  console.log('no tools yet, button hidden:', await page.isHidden('#favBar'));
  // a fixture schedule palette (no favourites) + a Revu tool set
  await page.click('#btnChest'); await page.click('#btnSchedule'); await page.setInputFiles('#schedFile', path.join(SP, 'sched2.xlsx')); await page.waitForTimeout(400);
  await page.click('#btnChest'); await page.waitForTimeout(100);
  console.log('palette only, button shown:', await page.isVisible('#favDD'), (await page.textContent('#favDD')).trim());
  await page.tap('#favDD'); await page.waitForTimeout(200);
  console.log('sections:', await page.$$eval('#favGrid .fp-sh .t', x => x.map(e => e.textContent).join(' | ')), '| tools:', await page.$$eval('#favGrid [data-fav]', x => x.length));
  // star two, reopen: favourites section first
  await page.tap('#favDD'); await page.click('#btnChest'); await page.locator('#chestSets [data-set] button.star').nth(0).click(); await page.locator('#chestSets [data-set] button.star').nth(3).click(); await page.click('#btnChest');
  await page.tap('#favDD'); await page.waitForTimeout(200);
  console.log('sections now:', await page.$$eval('#favGrid .fp-sh', x => x.map(e => e.textContent).join(' | ')));
  await page.screenshot({ path: path.join(SP, 'p37.png'), clip: { x: 0, y: 0, width: 1180, height: 700 } });
  // fold the palette section
  await page.tap('#favGrid [data-fpsec]:not([data-fpsec="__fav"])'); await page.waitForTimeout(150);
  console.log('folded: tools visible', await page.$$eval('#favGrid [data-fav]', x => x.length));
  // pick a tool from favourites
  await page.tap('#favGrid [data-fav] >> nth=1'); await page.waitForTimeout(200);
  console.log('picked:', await page.textContent('#btnToolPick .tn'), '| pop closed:', await page.isHidden('#favPop'));
  await page.reload(); await page.waitForTimeout(1500); await page.tap('#favDD'); await page.waitForTimeout(200);
  console.log('fold remembered:', await page.$$eval('#favGrid .fp-sec.shut', x => x.length));
  console.log('errors:', errs); await b.close();
})();
