const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1180, height: 820 } }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  console.log('fresh start tool:', (await page.textContent('#btnToolPick .tn')).trim(), '| chip:', (await page.textContent('#toolChip')).trim());
  await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="pen"]');
  await page.reload(); await page.waitForTimeout(2000);
  console.log('after reopening:', (await page.textContent('#btnToolPick .tn')).trim());
  // tapping a markup works straight away with Select: draw one with the pen first
  console.log('errors:', errs); await b.close();
})();
