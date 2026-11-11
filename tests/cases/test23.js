const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName } = require('pdf-lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always', compact: false })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  let prompts = []; page.on('dialog', d => { const v = prompts.shift(); d.accept(v != null ? v : undefined); });
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1200);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592;
  const at = (x, y) => [bx.x + x * sc, bx.y + (1728 - y) * sc];
  const tap = async (x, y) => { const a = at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(100); };
  const setR = (sel, v) => page.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);

  // A saved tool with custom fields: rectangle symbol L1 rotated 45
  await page.click('[data-tool="symbol"]'); await page.click('#btnStyle');
  await page.selectOption('#symNew [data-s="shape"]', 'rect'); await setR('#symNew [data-s="size"]', 40); await setR('#symNew [data-s="height"]', 16); await page.fill('#symNew [data-s="label"]', 'L1'); await setR('#symNew [data-s="angle"]', 45);
  await page.click('#btnSaveTool'); await page.fill('#tName', 'L1 downlight'); await page.fill('#tSubject', 'Fixture L1'); await page.fill('#tFields', 'Type = L1\nWattage = 12W');
  await page.locator('#tPreview').screenshot({ path: path.join(SP, 'p3-preview.png') });
  await page.click('#tSave');
  await tap(300, 1300); await tap(500, 1300);
  // numbered x4, delete #2, renumber
  await page.click('[data-tool="numbered"]'); for (let i = 0; i < 4; i++) await tap(300 + i * 150, 1000);
  await page.click('[data-tool="select"]'); await tap(450, 1000); await page.click('#btnDelete');
  await page.click('[data-tool="numbered"]'); console.log('next before renumber:', await page.inputValue('#seqNext'));
  prompts.push('1'); await page.click('#seqRenumber');
  console.log('after renumber, next:', await page.inputValue('#seqNext'), '| labels:', await page.$$eval('#rows .row[data-id] .comm b', r => r.map(e => e.textContent).join(',')));
  // select L1 at 300: rotate +90 more, edit a field, duplicate
  await page.click('[data-tool="select"]'); await tap(300, 1300);
  console.log('fields shown:', await page.$$eval('#pFieldRows .frow span', r => r.map(e => e.textContent).join(',')), '| angle:', await page.textContent('#pAngle'));
  await page.click('#pRotate [data-rot="90"]'); console.log('angle after +90:', await page.textContent('#pAngle'));
  await page.fill('#pFieldRows [data-field="Wattage"]', '15W');
  await page.click('#btnDuplicate'); console.log('after duplicate markups:', await page.textContent('#count'));
  // duplicate a numbered one: gets next number
  await tap(300, 1000); await page.keyboard.press('Control+d');
  console.log('numbered labels after duplicate:', await page.$$eval('#rows .row[data-id] .comm b', r => r.map(e => e.textContent).join(',')));
  // legend + export
  await page.click('#btnExport'); console.log('export summary:', await page.textContent('#exSummary'));
  await page.click('[data-legend="page"]'); await page.waitForTimeout(300);
  console.log('counts chips (legend not counted):', await page.textContent('#counts'));
  await page.click('#btnExport');
  const [x1] = await Promise.all([page.waitForEvent('download'), page.click('[data-ex="xlsx"]')]); await x1.saveAs(path.join(SP, 'p3.xlsx'));
  const [c1] = await Promise.all([page.waitForEvent('download'), page.click('[data-ex="counts"]')]); await c1.saveAs(path.join(SP, 'p3-counts.csv'));
  await page.click('#exClose');
  console.log('counts.csv:\n' + fs.readFileSync(path.join(SP, 'p3-counts.csv'), 'utf8'));
  // screenshot zoomed
  await page.click('#btnClosePanel');
  for (let i = 0; i < 4; i++) await page.click('#zoomIn');
  await page.evaluate(() => { const v = document.querySelector('#viewer'), p = document.querySelector('.page'); const s = p.offsetWidth / 2592; v.scrollLeft = p.offsetLeft + 0 * s; v.scrollTop = p.offsetTop + (1728 - 1700) * s; });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(SP, 'p3-page.png'), clip: { x: 0, y: 120, width: 1180, height: 600 } });
  // save, inspect fields + angle, reopen
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveFile')]);
  const out = path.join(SP, 'p3.pdf'); await dl.saveAs(out);
  const od = await PDFDocument.load(fs.readFileSync(out)); const an = od.getPages()[0].node.Annots();
  for (let i = 0; i < 3; i++) { const d = od.context.lookup(an.get(i)); console.log('PDF', String(d.get(PDFName.of('Subtype'))), 'Contents:', JSON.stringify(d.get(PDFName.of('Contents')).decodeText()), 'PMSymbol:', String(od.context.lookup(d.get(PDFName.of('PMSymbol')))).replace(/\s+/g, ' ').slice(0, 90), 'PMFields:', d.get(PDFName.of('PMFields')) ? 'yes' : 'no'); }
  await page.click('#btnPanel'); await page.click('[data-tool="select"]');
  const b2 = await page.locator('.page').first().boundingBox();
  console.log('after save: list first rows:', await page.$$eval('#rows .row[data-id] .comm', r => r.slice(0, 3).map(e => e.textContent).join(' | ')));
  console.log('errors:', errs); await b.close();
})();
