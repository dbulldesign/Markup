const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'lines.pdf')); await page.waitForTimeout(1500);
  const W = 792, H = 612;
  const at = async (x, y) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / W; return [bx.x + x * sc, bx.y + (H - y) * sc]; };
  const tap = async (x, y) => { const a = await at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(80); };
  const mark = async () => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / W; return page.evaluate(([bx, sc, H]) => { const r = [...document.querySelectorAll('.page svg rect')].find(e => e.getAttribute('stroke') === '#e65100'); if (!r) return null; const q = r.getBoundingClientRect(); return [Math.round((q.x + q.width / 2 - bx.x) / sc), Math.round(H - (q.y + q.height / 2 - bx.y) / sc)]; }, [bx, sc, H]); };
  // ---- repeat in a grid (no scale: inches on paper)
  await page.keyboard.press('s'); await tap(100, 500); await page.keyboard.press('v'); await tap(100, 500);
  console.log('Repeat button:', await page.isVisible('#btnArray'));
  await page.click('#btnArray'); await page.waitForTimeout(100);
  console.log('sub:', await page.textContent('#arSub'), '| dx', await page.inputValue('#arDx'));
  await page.fill('#arCols', '4'); await page.fill('#arRows', '2'); await page.fill('#arDx', '1'); await page.fill('#arDy', '1.5'); await page.waitForTimeout(50);
  console.log('preview:', await page.textContent('#arPrev'));
  await page.click('#arGo'); await page.waitForTimeout(150);
  console.log('after grid: markups', await page.$$eval('#rows .row[data-id]', x => x.length), '| selected', await page.textContent('#selN'));
  const centres = await page.evaluate(() => [...document.querySelectorAll('.page svg g[data-id], .page svg [data-id]')].length);
  await page.screenshot({ path: path.join(SP, 'p54-grid.png') });
  await page.keyboard.press('Meta+z'); console.log('undo:', await page.$$eval('#rows .row[data-id]', x => x.length));
  // ---- along a line: 5 in all, from the line start (100,100) to its end (500,100) with snapping
  await page.keyboard.press('Escape'); await tap(100, 500);
  await page.keyboard.press('Meta+Alt+d'); await page.click('[data-armode="line"]'); await page.fill('#arN', '5'); console.log('line preview:', await page.textContent('#arPrev'), '| button', await page.textContent('#arGo'));
  await page.click('#arGo'); console.log('picking:', await page.evaluate(() => document.body.classList.contains('picking')), (await page.textContent('#toast')).trim());
  await tap(103, 102); console.log('after start tap:', (await page.textContent('#toast')).trim());
  await tap(498, 98); await page.waitForTimeout(150);
  console.log('after end tap:', (await page.textContent('#toast')).trim(), '| markups', await page.$$eval('#rows .row[data-id]', x => x.length));
  await page.screenshot({ path: path.join(SP, 'p54-line.png') });
  // Escape cancels a pick
  await tap(100, 100); await page.keyboard.press('Meta+Alt+d'); await page.click('[data-armode="line"]'); await page.click('#arGo'); await page.keyboard.press('Escape'); console.log('cancelled:', !(await page.evaluate(() => document.body.classList.contains('picking'))));
  // snapping measured through the line pick: the gap shows where the taps landed
  const pickGap = async (a, b2) => { await page.keyboard.press('Escape'); await page.keyboard.press('Meta+a'); await page.keyboard.press('Meta+Alt+d'); await page.click('[data-armode="line"]'); await page.fill('#arN', '5'); await page.click('#arGo'); await tap(a[0], a[1]); await tap(b2[0], b2[1]); await page.waitForTimeout(100); const t = (await page.textContent('#toast')).trim(); await page.keyboard.press('Meta+z'); return t; };
  console.log('corner (300,300) to line end (500,100), expect 71 pt:', await pickGap([303, 297], [497, 103]));
  console.log('on the line (250,100) to (500,100), expect 63 pt:', await pickGap([250, 102], [497, 103]));
  console.log('in empty space, expect no snap (~ 50 pt):', await pickGap([600, 450], [600, 250]));
  await page.click('#btnSettings'); await page.click('[data-stab="Drawing"]'); await page.uncheck('[data-set="snapPdf"]'); await page.click('#setClose');
  console.log('snap to drawing off, corner taps (expect ~68 pt):', await pickGap([303, 297], [497, 103]));
  console.log('errors:', errs); await b.close();
})();
