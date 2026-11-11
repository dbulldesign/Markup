const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const ptr = (type, kind, id, x, y) => page.evaluate(([type, kind, id, x, y]) => { (document.elementFromPoint(x, y) || document.querySelector('#viewer')).dispatchEvent(new PointerEvent(type, { pointerType: kind, pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true, buttons: type === 'pointerup' ? 0 : 1 })); }, [type, kind, id, x, y]);
  const at = async (x, y) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; return [bx.x + x * sc, bx.y + (1728 - y) * sc]; };
  let pid = 50;
  const finger = async (x, y) => { const a = await at(x, y); pid++; await ptr('pointerdown', 'touch', pid, a[0], a[1]); await page.waitForTimeout(60); await ptr('pointerup', 'touch', pid, a[0], a[1]); await page.waitForTimeout(200); };
  const pen = async (x, y) => { const a = await at(x, y); pid++; await ptr('pointerdown', 'pen', pid, a[0], a[1]); await ptr('pointerup', 'pen', pid, a[0], a[1]); await page.waitForTimeout(200); };
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  await tool('symbol'); for (const x of [300, 450, 600, 1200, 1350]) await pen(x, 1300);
  await tool('select'); await page.waitForTimeout(1200);
  // finger taps on the drawing
  await finger(300, 1300); console.log('finger tap selects:', await page.isVisible('#selBar') ? await page.textContent('#selN') : 'nothing');
  await finger(2200, 300); console.log('finger tap on paper deselects:', await page.isHidden('#selBar'));
  // finger scroll does not select
  const a = await at(450, 1300); pid++; await ptr('pointerdown', 'touch', pid, a[0], a[1]); for (let i = 1; i < 6; i++) await ptr('pointermove', 'touch', pid, a[0], a[1] - i * 20); await ptr('pointerup', 'touch', pid, a[0], a[1] - 100);
  console.log('finger drag (scroll) selects nothing:', await page.isHidden('#selBar'));
  // make a group of 2 (list select), then Add to group with finger taps
  await page.click('#btnListSelect'); await page.locator('#rows .row[data-id] .sw').nth(3).click(); await page.locator('#rows .row[data-id] .sw').nth(4).click(); await page.click('#btnGroup'); await page.click('#btnListSelect'); if (await page.isVisible('#btnSelClear')) await page.click('#btnSelClear'); else await page.keyboard.press('Escape');
  await finger(300, 1300); console.log('single selected, bar:', (await page.$$eval('#selBar .sbb:not([hidden]) span', x => x.map(e => e.textContent))).join(', '));
  await page.click('#btnCombine'); await finger(1200, 1300);
  console.log('Add to group by finger:', await page.$$eval('#rows .row.g .subj', r => r.map(x => x.textContent).join(' | ')));
  // group + a single selected -> Group button reads Add to group and works
  if (await page.isVisible('#btnSelClear')) await page.click('#btnSelClear'); else await page.keyboard.press('Escape'); await finger(450, 1300); await page.click('#btnListSelect'); await page.locator('#rows .row.g .sw').first().click(); 
  console.log('group + single:', await page.textContent('#selN'), '| button:', await page.textContent('#btnGroup span')); await page.click('#btnGroup');
  console.log('after Add to group:', await page.$$eval('#rows .row.g .subj', r => r.map(x => x.textContent).join(' | ')));
  console.log('errors:', errs); await b.close();
})();
