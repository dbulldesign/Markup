const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always' })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  const tapPdf = async (x, y) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; await page.mouse.click(bx.x + x * sc, bx.y + (1728 - y) * sc); await page.waitForTimeout(200); };
  const dragPdf = async (x0, y0, x1, y1) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; await page.mouse.move(bx.x + x0 * sc, bx.y + (1728 - y0) * sc); await page.mouse.down(); await page.mouse.move(bx.x + x1 * sc, bx.y + (1728 - y1) * sc, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200); };
  await tool('symbol'); for (const x of [300, 450, 600]) await tapPdf(x, 1300); for (const x of [1200, 1350]) await tapPdf(x, 600); await tapPdf(2000, 1000);
  await tool('select');
  // group A: box-select three, Group from the mini bar
  await dragPdf(200, 1450, 700, 1150); console.log('mini bar group button:', await page.textContent('#btnGroup'), await page.isVisible('#btnGroup')); await page.click('#btnGroup');
  await dragPdf(1100, 750, 1450, 450); await page.click('#btnGroup');
  console.log('groups in list:', await page.$$eval('#rows .row.g .subj', r => r.map(e => e.textContent).join(' | ')));
  // combine: tap group A on the drawing, Combine with..., tap group B on the drawing
  await tapPdf(300, 1300); console.log('combine button:', await page.textContent('#btnCombine'));
  await page.click('#btnCombine'); console.log('combine bar:', (await page.textContent('#combineInfo')).trim());
  await tapPdf(1350, 600); await page.click('#combineGo');
  console.log('after combine:', await page.$$eval('#rows .row.g .subj', r => r.map(e => e.textContent).join(' | ')), '| bar hidden:', await page.isHidden('#combineBar'));
  // add the lone symbol via the list
  await tapPdf(2000, 1000); await page.click('#btnCombine'); await page.click('#rows .row.g'); await page.click('#combineGo'); 
  console.log('after adding single from list:', await page.$$eval('#rows .row.g .subj', r => r.map(e => e.textContent).join(' | ')));
  await page.click('#btnUndo'); console.log('undo:', await page.$$eval('#rows .row.g .subj', r => r.map(e => e.textContent).join(' | ')));
  await page.screenshot({ path: path.join(SP, 'p22.png') });
  console.log('errors:', errs); await b.close();
})();
