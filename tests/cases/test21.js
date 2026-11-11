const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1180, height: 820 } })).newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always', compact: false })); } catch (e) {} });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(process.env.PM_DIR, 'sheet.pdf')); await page.waitForTimeout(1500);
  // bring the boundary between page 1 and 2 to the middle of the viewer
  await page.evaluate(() => { const v = document.querySelector('#viewer'), p = document.querySelectorAll('.page')[1]; v.scrollTop = p.offsetTop - v.clientHeight / 2; });
  await page.waitForTimeout(400);
  const b0 = await page.locator('.page').nth(0).boundingBox(), b1 = await page.locator('.page').nth(1).boundingBox(), s = b0.width / 2592;
  await page.click('[data-tool="numbered"]');
  await page.mouse.click(b0.x + 300 * s, b0.y + b0.height - 40 * s); await page.mouse.click(b1.x + 300 * s, b1.y + 40 * s);
  await page.mouse.click(b1.x + 900 * s, b1.y + 40 * s); // outside the box
  await page.click('[data-tool="select"]');
  await page.mouse.move(b0.x + 200 * s, b0.y + b0.height - 90 * s); await page.mouse.down(); await page.mouse.move(b0.x + 420 * s, b1.y + 90 * s, { steps: 6 }); await page.mouse.up();
  console.log('L->R box across pages:', await page.$$eval('#rows .row.sel .pg', r => r.map(e => e.textContent).join(', ')));
  const gapY = (b0.y + b0.height + b1.y) / 2;
  await page.mouse.move(b0.x + 330 * s, gapY); await page.mouse.down(); await page.mouse.move(b0.x + 250 * s, b1.y + 60 * s, { steps: 6 }); await page.mouse.up();
  console.log('R->L box from the gap:', await page.$$eval('#rows .row.sel .pg', r => r.map(e => e.textContent).join(', ')));
  console.log('errors:', errs); await b.close();
})();
