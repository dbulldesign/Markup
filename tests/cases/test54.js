const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept(d.type() === 'prompt' ? '101 Office' : undefined));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  const tapPdf = async (x, y, w = 150) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; await page.mouse.click(bx.x + x * sc, bx.y + (1728 - y) * sc); await page.waitForTimeout(w); };
  // schedule + place A x3, B x1, plus a plain symbol not on the schedule
  await page.click('#btnChest'); await page.click('#btnSchedule'); await page.setInputFiles('#schedFile', path.join(SP, 'sched2.xlsx')); await page.waitForTimeout(400);
  const chip = async (i) => { if (await page.isHidden('#chestPop')) await page.click('#btnChest'); await page.locator('#chestSets button.chip').nth(i).click(); await page.waitForTimeout(150); if (await page.isVisible('#chestPop')) await page.click('#btnChest'); };
  await chip(0); await tapPdf(500, 1200); await tapPdf(700, 1200); await tapPdf(900, 400);
  await chip(2); await tapPdf(600, 1000);
  await tool('symbol'); await tapPdf(2000, 1500);
  await tool('room'); for (const [x, y] of [[400, 1400], [800, 1400], [800, 900], [400, 900]]) await tapPdf(x, y, 450); await tapPdf(400, 1400, 600);
  await tool('select'); await page.click('#btnSelClear').catch(() => {});
  await page.click('#ctToggle'); await page.waitForTimeout(200);
  const rows = async () => (await page.$$eval('#ctable .crow, #ctable .chead', x => x.map(e => e.textContent.replace(/[◀▶]/g, '').replace(/\s+/g, ' ').trim()))).join(' / ');
  console.log('BY TYPE:', await rows());
  await page.click('[data-ctab="page"]'); console.log('BY PAGE:', await rows());
  await page.click('[data-ctab="room"]'); console.log('BY ROOM:', await rows());
  await page.click('[data-ctab="sched"]'); console.log('SCHEDULE:', await rows());
  await page.screenshot({ path: path.join(SP, 'p40.png') });
  await page.click('[data-ctab="type"]');
  // find next through Type A (3 of them)
  for (let i = 0; i < 4; i++) { await page.click('#ctable [data-find$="|1"] >> nth=1'); await page.waitForTimeout(250); console.log('find next ->', await page.textContent('#toast'), '| selected', await page.textContent('#selN')); }
  console.log('errors:', errs); await b.close();
})();
