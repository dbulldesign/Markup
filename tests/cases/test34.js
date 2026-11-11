const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName, PDFString, PDFHexString } = require('pdf-lib');
(async () => {
  // a 2-page drawing with a drawing layer "E-LIGHTING" (a filled box on it)
  const d = await PDFDocument.create(); const ctx = d.context;
  const ocg = ctx.register(ctx.obj({ Type: 'OCG', Name: PDFString.of('E-LIGHTING') }));
  d.catalog.set(PDFName.of('OCProperties'), ctx.obj({ OCGs: [ocg], D: { Order: [ocg], ON: [ocg] } }));
  for (let i = 0; i < 2; i++) {
    const pg = d.addPage([2592, 1728]);
    pg.node.set(PDFName.of('Resources'), ctx.obj({ Properties: { oc1: ocg } }));
    pg.node.set(PDFName.of('Contents'), ctx.register(ctx.stream('0 0 0 RG 4 w 72 72 2448 1584 re S /OC /oc1 BDC 0 0.6 0 rg 1200 700 300 300 re f EMC')));
  }
  fs.writeFileSync(path.join(SP, 'layers.pdf'), await d.save());
  const b = await chromium.launch(); const bctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true });
  const page = await bctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always' })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  let answers = []; page.on('dialog', dg => dg.accept(dg.type() === 'prompt' ? (answers.shift() || '') : undefined));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'layers.pdf')); await page.waitForTimeout(1500);
  await page.click('#btnClosePanel'); await page.waitForTimeout(300);
  let bx, sc; const at = (x, y) => [bx.x + x * sc, bx.y + (1728 - y) * sc];
  const fresh = async () => { bx = await page.locator('.page').first().boundingBox(); sc = bx.width / 2592; };
  const tap = async (x, y, w = 300) => { await fresh(); const a = at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(w); };
  const drag = async (x0, y0, x1, y1) => { await fresh(); const a = at(x0, y0), c = at(x1, y1); await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(c[0], c[1], { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(300); };
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  const green = async () => page.evaluate(() => { const c = document.querySelector('.page canvas.base'), g = c.getContext('2d'), w = c.width, h = c.height; const px = g.getImageData(Math.round(w * 1350 / 2592), Math.round(h * (1728 - 850) / 1728), 1, 1).data; return px[1] > 120 && px[0] < 80; });
  // drawing layer toggle
  console.log('drawing layer visible:', await green());
  await page.click('#btnPanel'); await page.click('#btnVis'); console.log('drawing layers listed:', await page.$$eval('#visDraw [data-ocg]', x => x.length));
  await page.uncheck('#visDraw [data-ocg]'); await page.waitForTimeout(1200); console.log('after hiding drawing layer, green shown:', await green());
  await page.check('#visDraw [data-ocg]'); await page.click('#visClose'); await page.click('#btnClosePanel'); await page.waitForTimeout(800);
  // links
  await tool('link'); answers.push('www.example.com/spec'); await drag(200, 1500, 600, 1400);
  await tool('link'); answers.push('page 2'); await drag(200, 1300, 600, 1200);
  // signature: first tap opens the pad
  await tool('signature'); await tap(1800, 400, 500);
  console.log('signature pad open:', await page.isVisible('#sigModal'));
  const cb = await page.locator('#sigCanvas').boundingBox();
  await page.mouse.move(cb.x + 40, cb.y + 140); await page.mouse.down(); for (let i = 1; i <= 12; i++) await page.mouse.move(cb.x + 40 + i * 30, cb.y + 140 - Math.sin(i) * 40); await page.mouse.up();
  await page.click('#sigSave'); await tap(1800, 400, 400);
  console.log('markups:', await page.textContent('#count'));
  // layer: put the signature on "Field notes" and hide it
  await page.click('#btnPanel'); await page.waitForTimeout(300); await tool('select'); await tap(1800, 400);
  console.log('selected:', await page.textContent('#propsTitle'));
  await page.fill('#pLayer', 'Field notes'); await page.press('#pLayer', 'Enter'); await page.waitForTimeout(200);
  await page.click('#btnVis'); await page.uncheck('#visLayers [data-layer="Field notes"]'); await page.click('#visClose');
  console.log('hidden markers on list:', await page.$$eval('#rows .row .muted[title="Hidden"]', x => x.length));
  await page.click('#btnVis'); await page.check('#visLayers [data-layer="Field notes"]'); await page.click('#visClose');
  // follow the page link with select
  await page.click('#btnClosePanel'); await page.waitForTimeout(300);
  await tap(400, 1450); console.log('tapped link selects it:', await page.isVisible('#pLinkRow') || 'panel closed');
  // save + reopen
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveFile')]); const o = path.join(SP, 'p6.pdf'); await dl.saveAs(o);
  const od = await PDFDocument.load(fs.readFileSync(o)); const an = od.getPages()[0].node.Annots(); const info = [];
  for (let i = 0; i < an.size(); i++) { const x = od.context.lookup(an.get(i)); const A = x.get(PDFName.of('A')); info.push(String(x.get(PDFName.of('Subtype'))) + (A ? ' ' + String(od.context.lookup(A).get(PDFName.of('URI'))) : '') + (x.get(PDFName.of('Dest')) ? ' Dest' : '') + (x.get(PDFName.of('OC')) ? ' OC' : '')); }
  console.log('saved:', info.join(' | '));
  const ocgs = od.context.lookup(od.context.lookup(od.catalog.get(PDFName.of('OCProperties'))).get(PDFName.of('OCGs')));
  console.log('OCGs:', ocgs.asArray().map(r => od.context.lookup(r).get(PDFName.of('Name')).decodeText()).join(', '));
  await page.evaluate(() => { localStorage.removeItem('pencil-markup-ui'); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000); await page.setInputFiles('#file', o); await page.waitForTimeout(1800);
  console.log('reopened rows:', await page.$$eval('#rows .row', r => r.map(e => e.querySelector('.subj').textContent).join(' | ')));
  await page.click('#btnClosePanel'); await page.waitForTimeout(300);
  await tool('select'); await page.click('#btnPanel'); await page.waitForTimeout(300); await tap(400, 1250); console.log('link props after reopen:', await page.textContent('#pLinkTo'));
  await page.click('#pLinkGo'); await page.waitForTimeout(700); console.log('page after following link:', await page.textContent('#pageInd'));
  await page.screenshot({ path: path.join(SP, 'p6.png') });
  console.log('errors:', errs); await b.close();
})();
