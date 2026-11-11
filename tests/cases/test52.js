const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  console.log('author row in list visible:', await page.isVisible('.author-row'));
  for (const w of [260, 300, 360, 540]) {
    await page.evaluate(w => { const u = JSON.parse(localStorage.getItem('pencil-markup-ui') || '{}'); u.panelW = w; localStorage.setItem('pencil-markup-ui', JSON.stringify(u)); }, w);
    await page.reload(); await page.waitForTimeout(700);
    const pn = await page.locator('#panel').boundingBox();
    const over = await page.evaluate(() => { const p = document.querySelector('#panel').getBoundingClientRect(); return Array.from(document.querySelectorAll('.panel-head .btn')).filter(b => { const r = b.getBoundingClientRect(); return r.right > p.right + 1 || r.left < p.left - 1; }).map(b => b.id); });
    console.log('width', w, '-> panel', Math.round(pn.width), '| header height', Math.round((await page.locator('.panel-head').boundingBox()).height), '| buttons outside:', over.join(',') || 'none');
    await page.locator('#panel').screenshot({ path: path.join(SP, 'p38-' + w + '.png'), clip: undefined });
  }
  console.log('errors:', errs); await b.close();
})();
