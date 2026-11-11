const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  // make the page scrollable the way the iPad keyboard does (taller document), then scroll it like iOS would
  const shift = () => page.evaluate(() => { document.documentElement.style.height = '200vh'; document.documentElement.style.overflow = 'visible'; document.body.style.position = 'static'; window.scrollTo(0, 120); return window.scrollY; });
  const unshiftCss = () => page.evaluate(() => { document.documentElement.style.height = ''; document.documentElement.style.overflow = ''; document.body.style.position = ''; });
  await page.click('#btnChest'); await page.click('text=+ Tool'); await page.waitForTimeout(200);
  await page.click('#tName'); await page.fill('#tName', 'My new tool');
  console.log('scrolled while typing:', await shift());
  await page.waitForTimeout(600); console.log('still scrolled while typing (not fought):', await page.evaluate(() => window.scrollY));
  await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  await page.waitForTimeout(1200); console.log('after saving the tool, scrollY:', await page.evaluate(() => window.scrollY), '| modal open:', await page.isVisible('#toolModal'));
  await unshiftCss();
  // last resort: next tap
  await shift(); await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await page.waitForTimeout(3000);
  console.log('left alone, settles to:', await page.evaluate(() => window.scrollY));
  console.log('errors:', errs); await b.close();
})();
