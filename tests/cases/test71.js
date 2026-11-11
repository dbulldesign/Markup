// Offline: after one visit the service worker keeps every app file, so the app opens with no network.
const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(500);
  await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
  await page.waitForTimeout(1500);
  const cached = await page.evaluate(async () => { const ks = await caches.keys(); const c = await caches.open(ks.find(k => k.startsWith('pencil-markup-'))); return (await c.keys()).map(r => new URL(r.url).pathname + new URL(r.url).search); });
  console.log('cached:', cached.filter(u => /css|js\//.test(u)).join(' '));
  await ctx.setOffline(true);
  await page.reload(); await page.waitForTimeout(1500);
  console.log('offline reload: toolbar', await page.isVisible('#btnSettings'), '| styled', await page.evaluate(() => getComputedStyle(document.querySelector('.topbar')).display !== 'block' || getComputedStyle(document.body).margin === '0px'));
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  console.log('offline open PDF:', await page.$$eval('.page', x => x.length), 'pages');
  console.log('errors:', errs); await b.close();
})();
