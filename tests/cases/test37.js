const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName } = require('pdf-lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always' })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  const tapPdf = async (x, y) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; await page.mouse.click(bx.x + x * sc, bx.y + (1728 - y) * sc); await page.waitForTimeout(250); };
  const dl = async (fn, name) => { const [d] = await Promise.all([page.waitForEvent('download'), fn()]); const o = path.join(SP, name); await d.saveAs(o); return o; };
  await tool('symbol'); for (const x of [400, 600, 800]) await tapPdf(x, 1200);
  // first symbol: 4'-0" x 3 (picked in the list)
  await page.click('#rows .row[data-id] >> nth=0');
  await page.fill('#pLenV', "4'"); await page.press('#pLenV', 'Enter'); await page.fill('#pLenQ', '3'); await page.press('#pLenQ', 'Enter'); await page.waitForTimeout(150);
  console.log('total shown:', await page.textContent('#pLenTot'), '| row:', await page.textContent('#rows .row[data-id] >> nth=0 >> .comm'));
  // second symbol: 8'-6"
  await page.click('#rows .row[data-id] >> nth=1'); await page.fill('#pLenV', "8'-6\""); await page.press('#pLenV', 'Enter'); await page.waitForTimeout(150);
  console.log('counts chip:', (await page.textContent('#counts')).replace(/\s+/g, ' '));
  await page.click('#btnExport'); const csvp = await dl(() => page.click('[data-ex="counts"]'), 'len-counts.csv'); await page.click('#exClose');
  console.log('counts CSV:', fs.readFileSync(csvp, 'utf8').replace(/^﻿/, '').trim().split('\n').map(l => l.split(',').filter((_, i) => [0, 2, 7, 8].includes(i)).join(' | ')).join(' // '));
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])'); const o = await dl(() => page.click('#btnSaveFile'), 'len.pdf');
  const od = await PDFDocument.load(fs.readFileSync(o)); const an = od.getPages()[0].node.Annots();
  for (let i = 0; i < an.size(); i++) { const d = od.context.lookup(an.get(i)); console.log('Revu Comments:', JSON.stringify(d.get(PDFName.of('Contents')).decodeText())); }
  await page.evaluate(() => { localStorage.removeItem('pencil-markup-ui'); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000); await page.setInputFiles('#file', o); await page.waitForTimeout(1500);
  console.log('after reopen rows:', await page.$$eval('#rows .row[data-id] .comm', r => r.map(e => e.textContent).join(' | ')));
  await page.click('#rows .row[data-id] >> nth=0'); console.log('reopened comment box (no Length line):', JSON.stringify(await page.inputValue('#pContents')), '| field:', await page.inputValue('#pLenV'), 'x', await page.inputValue('#pLenQ'));
  // schedule with lengths
  await page.click('#btnChest'); await page.click('#btnSchedule'); await page.setInputFiles('#schedFile', path.join(SP, 'sched2.xlsx')); await page.waitForTimeout(400);
  await page.locator('#chestSets button.chip').nth(3).click(); if (await page.isVisible('#chestPop')) await page.click('#btnChest');
  await tapPdf(1200, 600); await page.click('#rows .row[data-id] >> text=Type C'); await page.waitForTimeout(150);
  console.log('Type C from schedule:', await page.inputValue('#pLenV'), 'x', await page.inputValue('#pLenQ'), '|', await page.textContent('#pLenTot'));
  await page.screenshot({ path: path.join(SP, 'p19.png') });
  console.log('errors:', errs); await b.close();
})();
