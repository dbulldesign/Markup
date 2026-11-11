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
  const chipBy = async (prefix) => { if (await page.isHidden('#chestPop')) await page.click('#btnChest'); await page.fill('#chestSearch', prefix); await page.press('#chestSearch', 'Enter'); await page.waitForTimeout(150); if (await page.isVisible('#chestPop')) await page.click('#btnChest'); };
  const tapOn = async (x, y) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; await page.mouse.click(bx.x + x * sc, bx.y + (1728 - y) * sc); await page.waitForTimeout(120); };
  await chipBy('LT1-A'); await tapOn(400, 1300); await tapOn(600, 1300);
  await chipBy('AA'); await tapOn(800, 1000);
  await chipBy('LT3-B'); await tapOn(1200, 600);
  await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="length"]'); 
  // search
  const rows = () => page.$$eval('#rows .row[data-id] .subj', x => x.map(e => e.textContent.trim()));
  for (const q of ['sconce', 'type aa', 'amerlux', 'p1 pendant', 'open', 'zzz']) { await page.fill('#filter', q); await page.waitForTimeout(100); console.log('search "' + q + '":', (await rows()).join(', ') || '(none)', '|', await page.textContent('#filterCount')); }
  await page.fill('#filter', 'sconce'); await page.press('#filter', 'Enter'); await page.waitForTimeout(150); console.log('Return ->', await page.textContent('#toast'));
  await page.press('#filter', 'Enter'); await page.waitForTimeout(150); console.log('Return again ->', await page.textContent('#toast'));
  await page.click('#filterClear'); console.log('cleared:', (await rows()).length, 'rows, count text "' + await page.textContent('#filterCount') + '"');
  // sorting
  for (const k of ['label', 'subject', 'position', 'type']) { await page.selectOption('#sortSel', k); await page.waitForTimeout(100); console.log('sort ' + k + ':', (await page.$$eval('#rows .row[data-id] .comm b', x => x.map(e => e.textContent))).join(', ')); }
  await page.click('#sortDir'); console.log('reversed:', (await page.$$eval('#rows .row[data-id] .comm b', x => x.map(e => e.textContent))).join(', '));
  await page.screenshot({ path: path.join(SP, 'p48.png'), clip: { x: 790, y: 90, width: 390, height: 600 } });
  await page.reload(); await page.waitForTimeout(1800); console.log('sort remembered:', await page.inputValue('#sortSel'));
  console.log('errors:', errs); await b.close();
})();
