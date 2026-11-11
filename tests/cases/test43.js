const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  const tapPdf = async (x, y) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; await page.mouse.click(bx.x + x * sc, bx.y + (1728 - y) * sc); await page.waitForTimeout(200); };
  const dragPdf = async (x0, y0, x1, y1) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; await page.mouse.move(bx.x + x0 * sc, bx.y + (1728 - y0) * sc); await page.mouse.down(); await page.mouse.move(bx.x + x1 * sc, bx.y + (1728 - y1) * sc, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200); };
  await tool('symbol'); for (const x of [300, 450, 600]) await tapPdf(x, 1300);
  await tool('select'); await dragPdf(200, 1450, 700, 1150); await page.click('#btnGroup');
  // comment on the group + a length
  await page.click('#btnSelProps'); await page.fill('#pContents', 'Verify mounting height with GC'); await page.fill('#pLenV', "4'"); await page.press('#pLenV', 'Enter');
  // drag the pop-up by its title
  const t = await page.locator('#propsPop .title').boundingBox();
  await page.mouse.move(t.x + 120, t.y + 12); await page.mouse.down(); await page.mouse.move(t.x + 120 - 250, t.y + 12 + 120, { steps: 8 }); await page.mouse.up();
  const after = await page.locator('#propsPop').boundingBox(); console.log('pop-up moved by', Math.round(after.x - (t.x - 16)), Math.round(after.y - (t.y)), '(asked -250, +120 approx)');
  await page.click('#pmHide'); await page.click('#btnSelProps'); const again = await page.locator('#propsPop').boundingBox();
  console.log('re-opens where it was left:', Math.abs(again.x - after.x) < 2 && Math.abs(again.y - after.y) < 2);
  await page.screenshot({ path: path.join(SP, 'p29.png') });
  const t2 = await page.locator('#propsPop .title').boundingBox(); await page.mouse.click(t2.x + 100, t2.y + 10); await page.mouse.click(t2.x + 100, t2.y + 10); await page.waitForTimeout(100);
  const c = await page.locator('#propsPop').boundingBox(); console.log('double-tap recentres:', Math.round(c.x));
  await page.click('#pmHide');
  console.log('group row 2nd line:', await page.textContent('#rows .row.g .comm'), '| meta:', await page.textContent('#rows .row.g .meta'));
  console.log('errors:', errs); await b.close();
})();
