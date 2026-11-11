const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName, PDFString, PDFHexString } = require('pdf-lib');
const subs = async (file, pg = 0) => { const od = await PDFDocument.load(fs.readFileSync(file)); const an = od.getPages()[pg].node.Annots(); const r = []; for (let i = 0; an && i < an.size(); i++) { const d = od.context.lookup(an.get(i)); r.push({ sub: String(d.get(PDFName.of('Subtype'))), d, ctx: od.context }); } return r; };
(async () => {
  // A "Revu" PDF: line with ClosedArrow/Circle ends, a FreeText without PMText
  const doc = await PDFDocument.create(); const pg = doc.addPage([2592, 1728]); const ctx = doc.context;
  const line = ctx.obj({ Type: 'Annot', Subtype: 'Line', Rect: [200, 1200, 700, 1400], L: [250, 1250, 650, 1350], LE: ['ClosedArrow', 'Circle'], C: [0, 0, 1], BS: { W: 2 }, Subj: PDFString.of('Revu arrow') });
  const ft = ctx.obj({ Type: 'Annot', Subtype: 'FreeText', Rect: [900, 1200, 1200, 1260], DA: PDFString.of('/Helv 14 Tf 0 0.5 0 rg'), Contents: PDFHexString.fromText('Revu note'), C: [0, 0, 0] });
  pg.node.addAnnot(ctx.register(line)); pg.node.addAnnot(ctx.register(ft));
  fs.writeFileSync(path.join(SP, 'revu.pdf'), await doc.save());
  const b = await chromium.launch(); const bctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true });
  const page = await bctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always' })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.evaluate(() => { const u = JSON.parse(localStorage.getItem('pencil-markup-ui') || '{}'); u.compact = false; localStorage.setItem('pencil-markup-ui', JSON.stringify(u)); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'revu.pdf')); await page.waitForTimeout(1500);
  const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592, at = (x, y) => [bx.x + x * sc, bx.y + (1728 - y) * sc];
  const tap = async (x, y, w = 120) => { const a = at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(w); };
  const drag = async (x0, y0, x1, y1) => { const a = at(x0, y0), c = at(x1, y1); await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(c[0], c[1], { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(120); };
  const save = async (name) => { await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])'); const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveFile')]); const o = path.join(SP, name); await dl.saveAs(o); await page.waitForTimeout(500); return o; };
  // Revu items: move the line, edit the Revu text box
  await page.click('[data-tool="select"]'); await drag(450, 1300, 450, 1100);
  await tap(1050, 1230); await tap(1050, 1230);
  console.log('Revu text box opens editor:', await page.isVisible('#textEdit'), JSON.stringify(await page.inputValue('#textEdit')));
  await page.keyboard.press('End'); await page.keyboard.type(' (checked)'); await page.keyboard.press('Escape');
  // 20: text size + bold on that box
  await tap(1050, 1230); await page.$eval('#pTextSize', el => { el.value = 20; el.dispatchEvent(new Event('input', { bubbles: true })); }); await page.check('#pBold');
  // 2: separate settings
  await page.click('[data-tool="symbol"]'); await page.click('#btnStyle'); await page.selectOption('#symNew [data-s="shape"]', 'rect'); await page.click('#btnStyle');
  await page.click('[data-tool="numbered"]'); await page.click('#btnStyle'); console.log('numbered shape (should be circle):', await page.inputValue('#symNew [data-s="shape"]')); await page.click('#btnStyle');
  await tap(300, 700); await tap(400, 700);
  // 13: legend then add a third number
  await page.click('#btnExport'); await page.click('[data-legend="all"]'); await page.waitForTimeout(200);
  await page.click('[data-tool="numbered"]'); await tap(500, 700);
  console.log('legend rows:', await page.evaluate(() => Array.from(document.querySelectorAll('.page svg text')).map(t => t.textContent).filter(t => /×/.test(t)).join(' | ')));
  // 1 + 3: area: hold still on a corner -> no ring; bar at bottom
  await page.click('[data-tool="area"]'); await tap(1400, 900, 500);
  { const a = at(1700, 900); await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up(); await page.waitForTimeout(400); }
  console.log('ring during area points:', await page.evaluate(() => !document.querySelector('#ring').hidden));
  const pb = await page.locator('#polyBar').boundingBox(), wk = await page.locator('.work').boundingBox();
  console.log('polybar at bottom:', pb.y > wk.y + wk.height / 2);
  await tap(1700, 600, 500); await tap(1400, 600, 500); await tap(1400, 900, 600);
  // 7: set scale then undo removes it
  if (await page.isHidden('#scaleModal')) await page.click('#btnScale');
  await page.selectOption('#scPreset', '0:4'); await page.click('#scOk');
  console.log('scale set:', await page.textContent('#scaleLbl'));
  await page.click('#btnUndo'); console.log('after undo scale:', await page.textContent('#scaleLbl'));
  await page.click('#btnRedo'); console.log('after redo scale:', await page.textContent('#scaleLbl'));
  // 5: cut-out in the middle; label not inside it
  await page.click('[data-tool="select"]'); await tap(1450, 880);
  await page.click('#pCutout'); for (const [x, y] of [[1500, 800], [1600, 800], [1600, 700], [1500, 700]]) await tap(x, y, 500); await tap(1500, 800, 600);
  const lp = await page.evaluate(() => { const a = [...document.querySelectorAll('#rows .row[data-id]')].length; return a; });
  // 9: symbols as stamps + 10/11 status
  await page.click('#btnSettings'); await page.evaluate(() => document.querySelectorAll('#setBody .setsec').forEach(x => x.hidden = false)); await page.check('#setBody [data-set="symStamp"]'); await page.click('#setClose');
  await tap(300, 700); await page.selectOption('#pStatus', 'accepted');
  let o1 = await save('fix1.pdf');
  await page.click('[data-tool="select"]'); await tap(300, 700); await page.selectOption('#pStatus', 'rejected');
  let o2 = await save('fix2.pdf');
  const r2 = await subs(o2);
  console.log('subtypes:', r2.map(x => x.sub).join(' '));
  console.log('status replies after 2 changes:', r2.filter(x => x.sub === '/Text').length, '| state:', r2.filter(x => x.sub === '/Text').map(x => String(x.d.get(PDFName.of('State')))).join(','));
  const ln = r2.find(x => x.sub === '/Line'); const ap = ln.ctx.lookup(ln.ctx.lookup(ln.d.get(PDFName.of('AP'))).get(PDFName.of('N')));
  const apText = Buffer.from(ap.getContents()).toString('latin1');
  console.log('moved Revu line AP has filled arrow (b):', /\nb\n/.test(apText), '| LE kept:', String(ln.d.get(PDFName.of('LE'))));
  const ftR = r2.find(x => x.sub === '/FreeText' && /checked/.test(x.d.get(PDFName.of('Contents')).decodeText()));
  console.log('Revu text box edited:', ftR ? ftR.d.get(PDFName.of('Contents')).decodeText() + ' DA ' + String(ftR.d.get(PDFName.of('DA'))) : 'missing');
  console.log('area label text:', await page.evaluate(() => [...document.querySelectorAll('#rows .row[data-id] .comm b')].map(e => e.textContent).filter(t => /sf/.test(t)).join(',')));
  // after reload: numbers still numbers with stamps; legend still updates
  console.log('rows after reload:', await page.$$eval('#rows .row[data-id] .subj', r => r.map(e => e.textContent).join(' | ')));
  await page.click('[data-tool="select"]'); await tap(300, 700); await page.click('#btnDelete');
  const o3 = await save('fix3.pdf'); const r3 = await subs(o3);
  console.log('after deleting the markup: status replies', r3.filter(x => x.sub === '/Text').length);
  console.log('legend after delete (on page):', await page.evaluate(() => Array.from(document.querySelectorAll('.page svg text')).map(t => t.textContent).filter(t => /×/.test(t)).join(' | ')));
  await page.click('#rows .row.g [data-twist]'); console.log('legend group rows:', await page.$$eval('#rows .row.member .comm', r => r.map(e => e.textContent).filter(t => /×/.test(t)).join(' | ')));
  await page.screenshot({ path: path.join(SP, 'fix-page.png') });
  console.log('errors:', errs); await b.close();
})();
