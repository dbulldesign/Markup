const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always' })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'text.pdf')); await page.waitForTimeout(1500);
  const ptr = (type, kind, id, x, y) => page.evaluate(([type, kind, id, x, y]) => { (document.elementFromPoint(x, y) || document.querySelector('#viewer')).dispatchEvent(new PointerEvent(type, { pointerType: kind, pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: id === 1, buttons: type === 'pointerup' ? 0 : 1 })); }, [type, kind, id, x, y]);
  const bx = await page.locator('.page').first().boundingBox();
  // draw two rectangles with the "pen"
  await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="rect"]');
  for (const [x0, y0] of [[200, 200], [400, 200]]) { await ptr('pointerdown', 'pen', 7, bx.x + x0, bx.y + y0); for (let i = 1; i <= 4; i++) await ptr('pointermove', 'pen', 7, bx.x + x0 + i * 25, bx.y + y0 + i * 15); await ptr('pointerup', 'pen', 7, bx.x + x0 + 100, bx.y + y0 + 60); }
  console.log('markups after drawing:', await page.textContent('#count'));
  await page.waitForTimeout(700);
  // two-finger tap on empty paper -> undo
  const two = async (x, y) => { await ptr('pointerdown', 'touch', 21, x, y); await ptr('pointerdown', 'touch', 22, x + 60, y + 10); await ptr('pointerup', 'touch', 21, x, y); await ptr('pointerup', 'touch', 22, x + 60, y + 10); await page.waitForTimeout(150); };
  await two(bx.x + 600, bx.y + 400); console.log('after two-finger tap (undo):', await page.textContent('#count'));
  // three-finger tap -> redo
  await ptr('pointerdown', 'touch', 31, bx.x + 600, bx.y + 400); await ptr('pointerdown', 'touch', 32, bx.x + 640, bx.y + 400); await ptr('pointerdown', 'touch', 33, bx.x + 680, bx.y + 400);
  for (const id of [31, 32, 33]) await ptr('pointerup', 'touch', id, bx.x + 600, bx.y + 400);
  await page.waitForTimeout(150); console.log('after three-finger tap (redo):', await page.textContent('#count'));
  // two-finger tap on a markup -> select + properties
  await page.click('#btnClosePanel'); await page.waitForTimeout(300);
  const bxc = await page.locator('.page').first().boundingBox(), sc1 = bxc.width / bx.width;
  await two(bxc.x + 230 * sc1, bxc.y + 230 * sc1);
  console.log('two-finger tap on markup: panel open', await page.evaluate(() => [document.querySelector('#panel').hidden, getComputedStyle(document.querySelector('#panel')).display, document.body.className].join('/')), await page.isVisible('#panel'), '| selected', await page.textContent('#propsTitle'));
  // palm rejection: pen down, then a touch drag must not scroll
  const st0 = await page.evaluate(() => document.querySelector('#viewer').scrollTop);
  await ptr('pointerdown', 'pen', 8, bx.x + 700, bx.y + 300);
  await ptr('pointerdown', 'touch', 41, bx.x + 900, bx.y + 500); for (let i = 1; i <= 5; i++) await ptr('pointermove', 'touch', 41, bx.x + 900, bx.y + 500 - i * 40); await ptr('pointerup', 'touch', 41, bx.x + 900, bx.y + 300);
  await ptr('pointerup', 'pen', 8, bx.x + 700, bx.y + 300);
  console.log('palm drag while Pencil down scrolled:', (await page.evaluate(() => document.querySelector('#viewer').scrollTop)) !== st0);
  await page.waitForTimeout(700);
  await ptr('pointerdown', 'touch', 42, bx.x + 900, bx.y + 500); for (let i = 1; i <= 5; i++) await ptr('pointermove', 'touch', 42, bx.x + 900, bx.y + 500 - i * 40); await ptr('pointerup', 'touch', 42, bx.x + 900, bx.y + 300);
  console.log('finger drag later scrolls:', (await page.evaluate(() => document.querySelector('#viewer').scrollTop)) !== st0);
  // portrait
  await page.setViewportSize({ width: 820, height: 1180 }); await page.waitForTimeout(500);
  const cls = await page.evaluate(() => document.body.className); const tb = await page.locator('.topbar').boundingBox(), pn = await page.locator('#panel').boundingBox() || { width: 0, y: 0 };
  console.log('portrait classes:', cls, '| toolbar at bottom:', Math.round(tb.y + tb.height) >= 1170, '| panel is bottom sheet:', pn.width > 800 && pn.y > 400);
  await page.screenshot({ path: path.join(SP, 'p2-portrait.png') });
  const g = await page.locator('#sheetGrab').boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + 8); await page.mouse.down(); await page.mouse.move(g.x + g.width / 2, g.y - 300, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200);
  console.log('sheet after drag up:', Math.round((await page.locator('#panel').boundingBox()).height));
  await page.click('#btnStyle'); const sp = await page.locator('#stylePop').boundingBox(); console.log('style menu opens upward:', sp.y + sp.height <= tb.y + 5); await page.click('#btnStyle');
  // narrow (Split View)
  await page.setViewportSize({ width: 560, height: 900 }); await page.waitForTimeout(400);
  console.log('narrow:', await page.evaluate(() => document.body.className), '| tool picker visible:', await page.isVisible('#btnToolPick'), '| toolbar height:', Math.round((await page.locator('.topbar').boundingBox()).height));
  await page.screenshot({ path: path.join(SP, 'p2-narrow.png') });
  // landscape again, fit kept on resize
  await page.setViewportSize({ width: 1180, height: 820 }); await page.click('#zoomFit'); const z1 = await page.textContent('#zoomVal');
  await page.setViewportSize({ width: 1000, height: 820 }); await page.waitForTimeout(500); console.log('fit kept on resize:', z1, '->', await page.textContent('#zoomVal'));
  await page.setViewportSize({ width: 1180, height: 820 }); await page.waitForTimeout(400);
  // left-handed + big
  await page.click('#btnSettings'); await page.evaluate(() => document.querySelectorAll('#setBody .setsec').forEach(x => x.hidden = false)); await page.check('#setBody [data-set="lefty"]'); await page.check('#setBody [data-set="big"]'); await page.click('#setClose');
  const pn2 = await page.locator('#panel').boundingBox(), vw = await page.locator('#viewer').boundingBox();
  console.log('left-handed: panel left of drawing:', pn2.x < vw.x, '| big button height:', Math.round((await page.locator('#btnUndo').boundingBox()).height));
  await page.screenshot({ path: path.join(SP, 'p2-lefty.png') });
  console.log('errors:', errs); await b.close();
})();
