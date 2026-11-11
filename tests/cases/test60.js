const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const bx = await page.locator('.page').first().boundingBox();
  await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="symbol"]'); await page.mouse.click(bx.x + 200, bx.y + 200); await page.waitForTimeout(200);
  const dl = async (fn) => { const [d] = await Promise.all([page.waitForEvent('download'), fn()]); const o = path.join(SP, 'stamp-' + d.suggestedFilename()); await d.saveAs(o); return d.suggestedFilename(); };
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])');
  console.log('save bar name:', await page.inputValue('#saveName'));
  const n1 = await dl(() => page.click('#btnSaveFile')); console.log('saved:', n1);
  // reopen the stamped file and save again: one stamp only
  await page.setInputFiles('#file', path.join(SP, 'stamp-' + n1)); await page.waitForTimeout(1500);
  await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="symbol"]'); const bx2 = await page.locator('.page').first().boundingBox(); await page.mouse.click(bx2.x + 300, bx2.y + 200); await page.waitForTimeout(200);
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])'); console.log('second save name:', await page.inputValue('#saveName'));
  await page.selectOption('#saveMode', 'flat'); console.log('flattened:', await dl(() => page.click('#btnSaveFile')));
  await page.click('#btnExport');
  console.log('exports:', await dl(() => page.click('[data-ex="counts"]')), '|', await dl(() => page.click('[data-ex="xlsx"]')), '|', await dl(() => page.click('[data-ex="summary"]')));
  await page.click('#exClose');
  await page.click('#btnSettings'); await page.evaluate(() => document.querySelectorAll('#setBody .setsec').forEach(x => x.hidden = false)); await page.uncheck('#setBody [data-set="nameStamp"]'); await page.click('#setClose');
  await page.click('#btnExport'); console.log('with the setting off:', await dl(() => page.click('[data-ex="counts"]')));
  console.log('errors:', errs); await b.close();
})();
