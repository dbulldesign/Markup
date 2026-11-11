const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName } = require('pdf-lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always' })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept(d.type() === 'prompt' ? '101 Office' : undefined));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  await page.click('#btnClosePanel'); await page.waitForTimeout(300);
  let bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; const at = (x, y) => [bx.x + x * sc, bx.y + (1728 - y) * sc];
  const tap = async (x, y, w = 450) => { bx = await page.locator('.page').first().boundingBox(); sc = bx.width / 2592; const a = at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(w); };
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  const dl = async (fn, name) => { const [d] = await Promise.all([page.waitForEvent('download'), fn()]); const o = path.join(SP, name); await d.saveAs(o); return o; };
  // template + xlsx import
  await page.click('#btnChest'); await page.click('#btnSchedule');
  const tpl = await dl(() => page.click('#schedTemplate'), 'tpl.csv'); console.log('template header:', fs.readFileSync(tpl, 'utf8').split('\n')[0].replace(/^﻿/, ''));
  await page.setInputFiles('#schedFile', path.join(SP, 'sched.xlsx')); await page.waitForTimeout(500);
  console.log('palette chips:', await page.$$eval('#chestSets [data-set] .chips > *', c => c.length), '| title:', await page.textContent('#chestSets [data-set] .set-title span'));
  await page.screenshot({ path: path.join(SP, 'p5-chest.png') });
  // place 2 A and 1 B inside the room, 1 A outside
  const chip = async (i) => { if (await page.isHidden('#chestPop')) await page.click('#btnChest'); await page.locator('#chestSets button.chip').nth(i).click(); await page.waitForTimeout(200); if (await page.isVisible('#chestPop')) await page.click('#btnChest'); };
  await chip(0); await tap(500, 1200, 150); await tap(700, 1200, 150); await tap(500, 300, 150);
  await chip(2); await tap(600, 1000, 150);
  // room around the first three
  await tool('room'); for (const [x, y] of [[400, 1400], [900, 1400], [900, 900], [400, 900]]) await tap(x, y); await tap(400, 1400, 600);
  await page.click('#btnPanel'); await page.waitForTimeout(300); bx = await page.locator('.page').first().boundingBox(); sc = bx.width / 2592;
  console.log('room props:', (await page.textContent('#pMeasure')).replace(/\s+/g, ' ').trim());
  // photo on the B symbol
  await page.click('[data-tool="select"]').catch(async () => { await tool('select'); });
  await tool('select'); await tap(600, 1000, 300);
  console.log('selected:', await page.textContent('#propsTitle'), '| fields:', await page.$$eval('#pFieldRows input', i => i.map(x => x.dataset.field + '=' + x.value).slice(0, 4).join('; ')));
  await page.setInputFiles('#photoFile', path.join(SP, 'site.jpg')); await page.waitForTimeout(1200);
  console.log('photo thumbs:', await page.$$eval('#pPhotoGrid img', i => i.filter(x => x.src).length));
  // exports
  await page.click('#btnExport');
  const rc = await dl(() => page.click('[data-ex="rooms"]'), 'rooms.csv'); console.log('by room CSV:\n' + fs.readFileSync(rc, 'utf8').replace(/^﻿/, '').trim());
  const sp = await dl(() => page.click('[data-ex="summary"]'), 'summary.pdf'); const sd = await PDFDocument.load(fs.readFileSync(sp)); console.log('summary pages:', sd.getPageCount());
  await page.click('#exClose');
  // save and reopen: photo survives
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])');
  const o = await dl(() => page.click('#btnSaveFile'), 'p5.pdf');
  const od = await PDFDocument.load(fs.readFileSync(o)); const an = od.getPages()[0].node.Annots(); const subs = []; for (let i = 0; i < an.size(); i++) subs.push(String(od.context.lookup(an.get(i)).get(PDFName.of('Subtype'))));
  console.log('saved subtypes:', subs.join(' '));
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000); await page.setInputFiles('#file', o); await page.waitForTimeout(1800);
  bx = await page.locator('.page').first().boundingBox(); sc = bx.width / 2592;
  await tool('select'); await tap(600, 1000, 400);
  console.log('after reopen photos:', await page.$$eval('#pPhotoGrid img', i => i.filter(x => x.src).length), '| room rows:', await page.$$eval('#rows .row[data-id] .comm b', r => r.map(e => e.textContent).filter(t => /Office/.test(t)).join(',')));
  // save again: photos not duplicated
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])'); const o2 = await dl(() => page.click('#btnSaveFile'), 'p5b.pdf');
  const od2 = await PDFDocument.load(fs.readFileSync(o2)); const an2 = od2.getPages()[0].node.Annots(); let fa = 0; for (let i = 0; i < an2.size(); i++) if (String(od2.context.lookup(an2.get(i)).get(PDFName.of('Subtype'))) === '/FileAttachment') fa++;
  console.log('attachments after second save:', fa);
  console.log('errors:', errs); await b.close();
})();
