const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName } = require('pdf-lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always' })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept(d.type() === 'prompt' ? 'Detail 5' : undefined));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  await page.click('#btnClosePanel'); await page.waitForTimeout(300);
  let bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; const at = (x, y) => [bx.x + x * sc, bx.y + (1728 - y) * sc];
  const tap = async (x, y, w = 500) => { const a = at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(w); };
  const drag = async (x0, y0, x1, y1) => { const a = at(x0, y0), c = at(x1, y1); await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(c[0], c[1], { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150); };
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  // page scale 1/8" = 1'-0"
  await page.click('#btnScale'); await page.selectOption('#scPreset', '0:2'); await page.click('#scOk'); console.log('page scale:', await page.textContent('#scaleLbl'));
  // scale area 1/2" = 1'-0" on the right part
  await page.click('#btnScale'); await page.selectOption('#scPreset', '0:6'); await page.selectOption('#scApply', 'area'); await page.click('#scOk');
  await drag(1800, 1500, 2500, 300);
  // typed length: wall tool in the main area
  await tool('wall'); await tap(300, 1200);
  console.log('typed length box visible:', await page.isVisible('#polyLen'));
  await page.fill('#pbWallH', "9'"); await page.press('#pbWallH', 'Tab');
  await page.fill('#polyLen', "20'"); await page.press('#polyLen', 'Enter');
  await page.fill('#polyLen', "10' @ 90"); await page.press('#polyLen', 'Enter');
  console.log('poly bar:', (await page.textContent('#polyInfo')).trim());
  await page.click('#polyDone'); await page.waitForTimeout(300);
  console.log('wall props:', (await page.textContent('#pMeasure')).replace(/\s+/g, ' ').trim());
  await page.click('#btnPanel'); await page.waitForTimeout(300); bx = await page.locator('.page').first().boundingBox(); sc = bx.width / 2592;
  await page.fill('#pWallH', "12'"); await page.press('#pWallH', 'Enter'); await page.waitForTimeout(200);
  console.log('wall after height 12:', (await page.textContent('#pMeasure')).replace(/\s+/g, ' ').trim().slice(0, 80));
  // length inside the scale area
  await tool('length'); await drag(1900, 1000, 2100, 1000);
  console.log('length in detail:', (await page.textContent('#pMeasure')).replace(/\s+/g, ' ').trim().slice(0, 90));
  await page.fill('#pSetLen', "5'-0\""); await page.press('#pSetLen', 'Enter'); await page.waitForTimeout(200);
  console.log('after set length:', (await page.textContent('#pMeasure')).replace(/\s+/g, ' ').trim().slice(0, 60));
  // run: every 8' with ends
  await tool('run'); await tap(300, 600);
  await page.selectOption('#pbRunMode', 'sp'); await page.fill('#pbRunV', "8'"); await page.press('#pbRunV', 'Tab');
  await page.fill('#polyLen', "40'"); await page.press('#polyLen', 'Enter'); await page.click('#polyDone'); await page.waitForTimeout(400);
  console.log('markups now:', await page.textContent('#count'), '| run props:', (await page.textContent('#pMeasure')).replace(/\s+/g, ' ').trim().slice(0, 70));
  await page.screenshot({ path: path.join(SP, 'p4.png') });
  // undo removes run and its symbols in one step
  await page.click('#btnUndo'); console.log('after undo:', await page.textContent('#count')); await page.click('#btnRedo');
  // save and reload
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveFile')]); const o = path.join(SP, 'meas.pdf'); await dl.saveAs(o);
  const od = await PDFDocument.load(fs.readFileSync(o)); const vp = od.context.lookup(od.getPages()[0].node.get(PDFName.of('VP')));
  console.log('VP entries:', vp.size(), '| names:', [0, 1].map(i => od.context.lookup(vp.get(i)).get(PDFName.of('Name')).decodeText()).join(', '));
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000); await page.setInputFiles('#file', o); await page.waitForTimeout(1500);
  console.log('reopened rows:', await page.$$eval('#rows .row[data-id] .comm b, #rows .row.g .subj', r => r.map(e => e.textContent).join(' | ')));
  await page.click('#btnScale'); console.log('scale areas listed:', (await page.textContent('#scAreas')).replace(/\s+/g, ' ').trim());
  console.log('errors:', errs); await b.close();
})();
