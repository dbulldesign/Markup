const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName, StandardFonts, rgb } = require('pdf-lib');
(async () => {
  const d = await PDFDocument.create(), font = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 3; i++) { const pg = d.addPage([2592, 1728]); pg.drawRectangle({ x: 100, y: 100, width: 2392, height: 1528, borderWidth: 4, borderColor: rgb(0, 0, 0) });
    pg.drawText('SHEET E-10' + (i + 1), { x: 2200, y: 150, size: 30, font }); pg.drawText('ROOM 1' + (i + 1) + '0 OPEN OFFICE', { x: 500, y: 900, size: 24, font }); if (i === 2) pg.drawText('TYPE L1 FIXTURE', { x: 900, y: 600, size: 24, font }); }
  fs.writeFileSync(path.join(SP, 'text.pdf'), await d.save());
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always', compact: false })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', dg => dg.accept());
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1200);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'text.pdf')); await page.waitForTimeout(1500);
  const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592, at = (x, y) => [bx.x + x * sc, bx.y + (1728 - y) * sc];
  const tap = async (x, y) => { const a = at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(100); };
  await page.click('[data-tool="numbered"]'); await tap(400, 1300); await tap(600, 1300);
  await page.click('[data-tool="circle"]'); { const a = at(900, 1350), c = at(1100, 1250); await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(c[0], c[1], { steps: 4 }); await page.mouse.up(); }
  await page.click('[data-tool="select"]'); await tap(400, 1300);
  await page.selectOption('#pStatus', 'accepted');
  console.log('row with status:', await page.$$eval('#rows .row[data-id] .subj', r => r.map(e => e.textContent).join(' | ')));
  // save -> status reply
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveFile')]); const out = path.join(SP, 'p5.pdf'); await dl.saveAs(out);
  const od = await PDFDocument.load(fs.readFileSync(out)); const an = od.getPages()[0].node.Annots();
  for (let i = 0; i < an.size(); i++) { const dd = od.context.lookup(an.get(i)); if (String(dd.get(PDFName.of('Subtype'))) === '/Text') console.log('reply:', ['IRT', 'StateModel', 'State', 'F', 'Contents'].map(k => k + '=' + String(dd.get(PDFName.of(k)))).join(' ')); }
  console.log('after reload status:', await page.$$eval('#rows .row[data-id] .st', r => r.map(e => e.textContent).join(',')));
  // hide subject Count
  await page.click('#btnVis'); await page.uncheck('#visList [data-vis="Count"]'); await page.click('#visClose');
  await page.waitForTimeout(800);
  await tap(400, 1300); console.log('hidden markup not selectable:', (await page.$$eval('#rows .row.sel', r => r.length)) === 0);
  const pix = await page.evaluate(() => { const c = document.querySelector('.page canvas.base'); return c.width; });
  await page.screenshot({ path: path.join(SP, 'p5-hidden.png'), clip: { x: bx.x, y: bx.y, width: 500, height: 200 } });
  await page.click('#btnVis'); await page.click('#visShowAll'); await page.click('#visClose');
  // drawer
  await page.click('#btnPages'); await page.waitForTimeout(1500);
  console.log('thumbs:', await page.$$eval('#thumbs .thumb', t => t.length), '| indicator:', await page.textContent('#pageInd'));
  await page.fill('#gotoIn', '3'); await page.press('#gotoIn', 'Enter'); await page.waitForTimeout(500);
  console.log('after go to 3:', await page.textContent('#pageInd'));
  await page.screenshot({ path: path.join(SP, 'p5-drawer.png') });
  // search
  await page.click('#drawerTabs [data-dt="search"]'); await page.fill('#searchIn', 'room'); await page.waitForTimeout(1200);
  console.log('search room:', await page.textContent('#txtHead'), '|', await page.$$eval('#txtRes .sres', r => r.map(e => e.textContent).join(' / ')));
  await page.fill('#searchIn', 'L1 fix'); await page.waitForTimeout(1000);
  await page.click('#txtRes .sres'); await page.waitForTimeout(900);
  console.log('after clicking hit:', await page.textContent('#pageInd'));
  await page.screenshot({ path: path.join(SP, 'p5-search.png') });
  await page.fill('#searchIn', 'accepted'); await page.waitForTimeout(600);
  console.log('markup search:', await page.$$eval('#searchRes h4', r => r.map(e => e.textContent).join(' / ')));
  await page.click('#drawerClose');
  // tabs
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1800);
  console.log('tabs:', await page.$$eval('#tabs .tab .nm', t => t.map(e => e.textContent).join(', ')), '| markups:', await page.textContent('#count'));
  await page.click('#tabs .tab:has-text("text")'); await page.waitForTimeout(2000);
  console.log('switched back: markups', await page.textContent('#count'), '| active:', await page.textContent('#tabs .tab.on .nm'));
  await page.reload(); await page.waitForTimeout(2500);
  console.log('after reload tabs:', await page.$$eval('#tabs .tab .nm', t => t.map(e => e.textContent).join(', ')), '| active:', await page.textContent('#tabs .tab.on .nm'), '| markups', await page.textContent('#count'));
  await page.click('#tabs .tab:has-text("sheet") .x'); await page.waitForTimeout(500);
  console.log('after closing sheet tab:', await page.$$eval('#tabs .tab .nm', t => t.map(e => e.textContent).join(', ')));
  console.log('errors:', errs); await b.close();
})();
