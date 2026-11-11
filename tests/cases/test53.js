const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  // speed up time: make setInterval callbacks see minutes pass
  await page.addInitScript(() => { let off = 0; const n = Date.now.bind(Date); Date.now = () => n() + off; window.__skip = (ms) => { off += ms; }; });
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  const tapPdf = async (x, y) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; await page.mouse.click(bx.x + x * sc, bx.y + (1728 - y) * sc); await page.waitForTimeout(150); };
  await tool('symbol'); for (const x of [300, 450, 600]) await tapPdf(x, 1300);
  // 6 minutes pass -> a recovery point
  await page.evaluate(() => window.__skip(6 * 60000)); await page.waitForTimeout(31000);
  await tapPdf(900, 1300); await tapPdf(1100, 1300); // 5 markups now
  // 31 more minutes -> another point + the save reminder
  await page.evaluate(() => window.__skip(31 * 60000)); await page.waitForTimeout(31000);
  console.log('reminder bar:', await page.isVisible('#warnBar') ? (await page.textContent('#warnText')).slice(0, 60) : 'none');
  await page.click('#btnSettings'); await page.evaluate(() => document.querySelectorAll('#setBody .setsec').forEach(x => x.hidden = false)); await page.waitForTimeout(600);
  console.log('recovery points:', (await page.$$eval('#rpList .setrow span:first-child', x => x.map(e => e.textContent.replace(/\s+/g, ' ')))).join(' | '));
  // restore the older one (3 markups)
  const n = await page.$$eval('#rpList [data-rp]', x => x.length); await page.locator('#rpList [data-rp]').nth(n - 1).click(); await page.waitForTimeout(400);
  console.log('after restore, markups:', await page.textContent('#count')); await page.click('#btnUndo'); console.log('after undo:', await page.textContent('#count'));
  // saving clears the reminder
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])'); await page.waitForTimeout(500);
  console.log('reminder after save:', await page.isVisible('#warnBar'));
  console.log('errors:', errs); await b.close();
})();
