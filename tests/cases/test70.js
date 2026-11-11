const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'set30.pdf')); await page.waitForTimeout(4000);
  const baseW = (i) => page.evaluate(i => { const c = document.querySelectorAll('.page')[i].querySelector('canvas.base'); return c ? c.width : 0; }, i);
  console.log('page 1 canvas width after open:', await baseW(0));
  // ---- page cache: go far away, come back
  await page.evaluate(() => { const v = document.querySelector('#viewer'); v.scrollTop = v.scrollHeight; }); await page.waitForTimeout(2500);
  console.log('page 1 freed while far away:', await baseW(0) <= 1, '| last page drawn:', await baseW(29) > 1);
  await page.evaluate(() => { const v = document.querySelector('#viewer'); v.scrollTop = 0; });
  await page.waitForTimeout(60);
  console.log('page 1 back after 60 ms (cache):', await baseW(0) > 1);
  // ---- dark drawings
  await page.click('#btnSettings'); await page.click('[data-stab="Appearance"]'); await page.selectOption('[data-set="darkPages"]', 'on'); await page.click('#setClose');
  console.log('dark drawings:', await page.evaluate(() => getComputedStyle(document.querySelector('.page canvas.base')).filter));
  console.log('markup overlay not inverted:', await page.evaluate(() => getComputedStyle(document.querySelector('.page svg')).filter));
  await page.screenshot({ path: path.join(SP, 'p56-dark.png') });
  await page.click('#btnSettings'); await page.selectOption('[data-set="darkPages"]', 'theme'); await page.selectOption('[data-set="theme"]', 'light'); await page.click('#setClose');
  console.log('theme light + "with dark theme":', await page.evaluate(() => document.body.classList.contains('dark-pages')));
  await page.click('#btnSettings'); await page.selectOption('[data-set="theme"]', 'dark'); await page.click('#setClose');
  console.log('theme dark + "with dark theme":', await page.evaluate(() => document.body.classList.contains('dark-pages')));
  // ---- last tool
  const tool = async () => (await page.textContent('#btnToolPick .tn')).trim();
  await page.keyboard.press('c'); await page.keyboard.press('r'); await page.keyboard.press('`'); console.log('` after C, R:', await tool());
  await page.keyboard.press('`'); console.log('` again:', await tool());
  // ---- quick menu has recent tools
  await page.keyboard.press('l'); await page.keyboard.press('v');
  const bx = await page.locator('.page').first().boundingBox();
  await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); el.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'pen', pointerId: 3, clientX: x, clientY: y, bubbles: true, buttons: 1, isPrimary: true })); }, [bx.x + 300, bx.y + 200]);
  await page.waitForTimeout(900);
  console.log('quick menu open:', await page.isVisible('#ring'), '| items:', await page.$$eval('#ring [data-ring]', x => x.map(e => e.dataset.label).join(', ')));
  await page.evaluate(([x, y]) => { document.elementFromPoint(x, y).dispatchEvent(new PointerEvent('pointerup', { pointerType: 'pen', pointerId: 3, clientX: x, clientY: y, bubbles: true })); }, [bx.x + 300, bx.y + 200]);
  await page.keyboard.press('Escape');
  // ---- settings rows exist
  await page.click('#btnSettings'); await page.click('[data-stab="Apple Pencil and touch"]');
  console.log('pencil options:', await page.$$eval('[data-set="pencilTap"] option', x => x.map(e => e.value).join(',')));
  console.log('errors:', errs); await b.close();
})();
