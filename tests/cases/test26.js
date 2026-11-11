const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always' })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1200);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'text.pdf')); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SP, 'p6-compact.png'), clip: { x: 0, y: 0, width: 1180, height: 130 } });
  const tb = await page.locator('.topbar').boundingBox(); console.log('compact toolbar height:', Math.round(tb.height));
  // tool picker
  await page.click('#btnToolPick'); await page.waitForTimeout(200);
  console.log('picker tools:', await page.$$eval('#toolGrid [data-pick]', x => x.length));
  await page.screenshot({ path: path.join(SP, 'p6-picker.png'), clip: { x: 0, y: 0, width: 700, height: 560 } });
  await page.click('#toolGrid [data-pick="symbol"]'); console.log('picked:', await page.textContent('#btnToolPick .tn'));
  // hover ghost (mouse with no buttons)
  const bx = await page.locator('.page').first().boundingBox();
  await page.mouse.move(bx.x + 300, bx.y + 200); await page.waitForTimeout(150);
  console.log('hover ghost drawn:', await page.$$eval('.page svg .ghost', g => g.length));
  // press and hold: ring; slide onto a tool and lift
  await page.mouse.move(bx.x + 500, bx.y + 300); await page.mouse.down(); await page.waitForTimeout(700);
  console.log('ring open:', await page.evaluate(() => !document.querySelector('#ring').hidden), '| items:', await page.$$eval('#ring .rb', r => r.length));
  await page.screenshot({ path: path.join(SP, 'p6-ring.png'), clip: { x: bx.x + 350, y: bx.y + 150, width: 300, height: 300 } });
  const pen = await page.locator('#ring [data-ring="tool:pen"]').boundingBox();
  await page.mouse.move(pen.x + pen.width / 2, pen.y + pen.height / 2, { steps: 5 }); await page.mouse.up();
  console.log('after slide-and-lift tool:', await page.textContent('#btnToolPick .tn'), '| markups (nothing drawn):', await page.textContent('#count'));
  // hold then lift in place: ring stays; tap a tool
  await page.mouse.move(bx.x + 520, bx.y + 320); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
  console.log('ring stays after lift:', await page.evaluate(() => !document.querySelector('#ring').hidden));
  await page.click('#ring [data-ring="tool:text"]'); console.log('tapped ring tool:', await page.textContent('#btnToolPick .tn'));
  // settings: dark theme, full toolbar, hide + reorder tools
  await page.click('#btnSettings'); await page.evaluate(() => document.querySelectorAll('#setBody .setsec').forEach(x => x.hidden = false));
  await page.selectOption('#setBody [data-set="theme"]', 'dark');
  console.log('theme attr:', await page.evaluate(() => document.documentElement.dataset.theme));
  await page.uncheck('#setBody [data-set="compact"]');
  await page.uncheck('#tlist [data-tshow="perimeter"]'); await page.uncheck('#tlist [data-tshow="cloud"]');
  await page.click('#tlist [data-tmv="1|-1"]'); // circle above select
  await page.locator('#setModal .sheet').screenshot({ path: path.join(SP, 'p6-settings.png') });
  await page.click('#setClose');
  console.log('full toolbar first tools:', await page.$$eval('#tools [data-tool]:not([hidden])', x => x.slice(0, 4).map(e => e.dataset.tool).join(',')), '| perimeter hidden:', await page.isHidden('#tools [data-tool="perimeter"]'));
  const tb2 = await page.locator('.topbar').boundingBox(); console.log('full toolbar height:', Math.round(tb2.height));
  await page.screenshot({ path: path.join(SP, 'p6-full-dark.png'), clip: { x: 0, y: 0, width: 1180, height: 200 } });
  // palette
  await page.click('#btnPalette'); console.log('palette visible:', await page.isVisible('#qpal'), '| buttons:', await page.$$eval('#qbtns button', x => x.length));
  await page.click('#qbtns [data-qt="highlighter"]'); console.log('palette picks:', await page.evaluate(() => document.querySelector('#qbtns [data-qt="highlighter"]').classList.contains('on')));
  // help
  await page.keyboard.press('?'); console.log('help open:', await page.isVisible('#helpModal'));
  await page.keyboard.press('Escape');
  // persistence
  await page.reload(); await page.waitForTimeout(1500);
  console.log('after reload: theme', await page.evaluate(() => document.documentElement.dataset.theme), '| compact', await page.evaluate(() => document.body.classList.contains('compact')), '| palette', await page.isVisible('#qpal'));
  console.log('errors:', errs); await b.close();
})();
