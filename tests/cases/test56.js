const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  const at = async (x, y) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; return [bx.x + x * sc, bx.y + (1728 - y) * sc]; };
  const tapPdf = async (x, y) => { const a = await at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(120); };
  console.log('tool chip:', await page.isVisible('#toolChip') ? (await page.textContent('#toolChip')).trim() : 'hidden');
  await tool('symbol'); await page.waitForTimeout(200); console.log('tool chip after picking Symbol:', (await page.textContent('#toolChip')).trim());
  for (const x of [300, 450, 600, 1500, 1650]) await tapPdf(x, 1300);
  // lasso the first three in an irregular loop
  await tool('lasso');
  const loop = [[200, 1450], [700, 1450], [750, 1300], [700, 1150], [200, 1150], [180, 1300]];
  const a0 = await at(...loop[0]); await page.mouse.move(a0[0], a0[1]); await page.mouse.down();
  for (const q of loop.slice(1).concat([loop[0]])) { const a = await at(...q); await page.mouse.move(a[0], a[1], { steps: 5 }); }
  await page.mouse.up(); await page.waitForTimeout(200);
  console.log('lasso selected:', await page.textContent('#selN'), '| bar buttons:', (await page.$$eval('#selBar .sbb:not([hidden]) span', x => x.map(e => e.textContent))).join(', '));
  // palette finger toggle
  await page.click('#btnPalette'); await page.waitForTimeout(150);
  const before = await page.isChecked('#fingerDraw'); await page.click('#qbtns [data-qa="finger"]'); console.log('finger toggle:', before, '->', await page.isChecked('#fingerDraw'));
  await page.click('#qbtns [data-qa="finger"]');
  // zoom: page image stays during re-render
  await page.click('#btnPalette');
  const blanks = await page.evaluate(async () => {
    const res = []; document.querySelector('#zoomIn').click();
    for (let i = 0; i < 8; i++) { const c = document.querySelector('.page canvas.base'); res.push(c.width > 1); await new Promise(r => setTimeout(r, 25)); }
    return res;
  });
  console.log('page image present right after zooming (8 checks):', blanks.join(','));
  await page.waitForTimeout(800); console.log('sharper image swapped in:', await page.evaluate(() => { const p = document.querySelector('.page'), c = p.querySelector('canvas.base'); return Math.round(c.width / p.getBoundingClientRect().width * 100) / 100; }));
  console.log('errors:', errs); await b.close();
})();
