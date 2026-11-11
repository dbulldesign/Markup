const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, StandardFonts } = require('pdf-lib');
(async () => {
  const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica);
  for (const sh of ['LD-101', 'LD-201']) { const pg = d.addPage([2592, 1728]); pg.drawRectangle({ x: 72, y: 72, width: 2448, height: 1584, borderWidth: 3 }); pg.drawText('SHEET', { x: 2300, y: 160, size: 14, font: f }); pg.drawText(sh, { x: 2300, y: 120, size: 32, font: f }); pg.drawText('SEE ' + (sh === 'LD-101' ? 'LD-201' : 'LD-101') + ' FOR CONTINUATION', { x: 200, y: 120, size: 12, font: f }); }
  fs.writeFileSync(path.join(SP, 'qb.pdf'), await d.save());
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'qb.pdf')); await page.waitForTimeout(1500);
  await page.click('#btnChest'); await page.click('#btnSchedule'); await page.setInputFiles('#schedFile', path.join(SP, 'qb.xlsm')); await page.waitForTimeout(1500);
  console.log('toast:', await page.textContent('#toast'));
  console.log('first tools:', (await page.$$eval('#chestSets button.chip .t', x => x.slice(0, 6).map(e => e.textContent))).join(' | '));
  // place LT1-A x 3 on LD-101 (page 1), LA (linear) x 2 on page 1, AA x 2 on page 2
  const chipBy = async (prefix) => { if (await page.isHidden('#chestPop')) await page.click('#btnChest'); const i = await page.$$eval('#chestSets button.chip', (x, p) => x.findIndex(e => e.querySelector('.t').textContent.startsWith(p + ' ')), prefix); await page.locator('#chestSets button.chip').nth(i).click(); await page.waitForTimeout(150); if (await page.isVisible('#chestPop')) await page.click('#btnChest'); };
  const tapOn = async (pi, x, y) => { const bx = await page.locator('.page').nth(pi).boundingBox(), sc = bx.width / 2592; await page.mouse.click(bx.x + x * sc, bx.y + (1728 - y) * sc); await page.waitForTimeout(150); };
  await chipBy('LT1-A'); for (const x of [400, 600, 800]) await tapOn(0, x, 1300);
  await chipBy('LA'); for (const x of [400, 700]) await tapOn(0, x, 900);
  await page.evaluate(() => document.querySelector('#viewer').scrollTop = document.querySelectorAll('.page')[1].offsetTop); await page.waitForTimeout(500);
  await chipBy('AA'); for (const x of [400, 600]) await tapOn(1, x, 1300);
  // give the LA fixtures a length of 15' each via multi-select in the list... select LA rows
  await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="select"]');
  if (await page.isVisible('#btnSelClear')) await page.click('#btnSelClear'); await page.fill('#filter', 'Type LA'); await page.waitForTimeout(200);
  await page.click('#btnListSelect'); for (let i = 0; i < 2; i++) await page.locator('#rows .row[data-id] .sw').nth(i).click(); await page.click('#btnListSelect');
  await page.click('#btnSelProps'); await page.fill('#pLenV', "15'"); await page.press('#pLenV', 'Enter'); await page.click('#pmHide'); await page.fill('#filter', '');
  // channel for AA: pick 101
  if (await page.isVisible('#btnSelClear')) await page.click('#btnSelClear'); await page.fill('#filter', 'Type AA'); await page.waitForTimeout(200);
  await page.click('#btnListSelect'); for (let i = 0; i < 2; i++) await page.locator('#rows .row[data-id] .sw').nth(i).click(); await page.click('#btnListSelect');
  await page.click('#btnSelProps'); console.log('channel options for AA:', (await page.$$eval('#pChanSel option', x => x.map(o => o.textContent))).join(' | '));
  await page.selectOption('#pChanSel', '0'); await page.waitForTimeout(200); console.log('channel info:', await page.textContent('#pChanInfo'), '| fields:', (await page.$$eval('#pFieldRows input', x => x.map(i => i.dataset.field + '=' + i.value).filter(t => /Channel|Circuit|Location/.test(t)))).join('; '));
  await page.click('#pmHide'); await page.fill('#filter', ''); await page.click('#btnSelClear').catch(() => {});
  await page.click('#ctToggle'); await page.click('[data-ctab="sched"]'); await page.waitForTimeout(300);
  const rows = async (n) => (await page.$$eval('#ctable .crow, #ctable .chead', x => x.map(e => e.textContent.replace(/[◀▶]/g, '').replace(/\s+/g, ' ').trim()))).slice(0, n).join(' / ');
  console.log('TYPES LA:', (await page.$$eval('#ctable .crow', x => x.map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(t => /^LA |^LA-X/.test(t)))).join(' / '));
  await page.screenshot({ path: path.join(SP, 'p45-types.png') });
  await page.click('[data-schtab="sheets"]'); await page.waitForTimeout(1500);
  console.log('SHEETS:', await rows(12)); console.log('LD-101 + LA:', (await page.$$eval('#ctable .crow, #ctable .chead', x => x.map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(t => /LD-101|^LA |^LT1-A/.test(t)))).join(' / '));
  await page.click('[data-schtab="channels"]'); await page.waitForTimeout(200);
  console.log('CHANNELS:', await rows(8));
  await page.screenshot({ path: path.join(SP, 'p45-ch.png') });
  console.log('errors:', errs); await b.close();
})();
