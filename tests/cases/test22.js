const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName } = require('pdf-lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always', compact: false })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1200);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  await page.click('#btnClosePanel');
  const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592;
  const at = (x, y) => [bx.x + x * sc, bx.y + (1728 - y) * sc];
  const drag = async (x0, y0, x1, y1) => { const a = at(x0, y0), c = at(x1, y1); await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(c[0], c[1], { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(100); };
  const tap = async (x, y) => { const a = at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(150); };
  const tool = async (t) => { await page.click('[data-tool="' + t + '"]'); };
  await tool('line'); await drag(100, 1650, 400, 1500);
  await tool('arrow'); await drag(100, 1450, 400, 1300);
  await tool('text'); await drag(500, 1650, 820, 1600);
  console.log('text editor open:', await page.isVisible('#textEdit'));
  await page.keyboard.type('Verify fixture type in field with electrical contractor');
  await page.keyboard.press('Escape');
  await tool('callout'); await drag(560, 1380, 700, 1460);
  await page.keyboard.type('EM on this circuit');
  await tap(1400, 400); // tap elsewhere closes the editor
  await tool('cloud'); for (const [x, y] of [[950, 1000], [1250, 1000], [1250, 800], [950, 800]]) { await tap(x, y); await page.waitForTimeout(500); console.log('  cloud bar:', await page.textContent('#polyInfo'), '| editing:', await page.evaluate(() => !document.querySelector('#textEdit').hidden)); }
  await page.click('#polyDone');
  await tool('highlighter'); await drag(100, 1200, 500, 1200);
  await tool('stamp'); await page.click('#btnStyle'); await page.fill('#symNew [data-s="stampText"]', 'verify in field'); await page.keyboard.press('Escape'); await page.click('#btnStyle').catch(() => {});
  if (await page.isVisible('#stylePop')) await page.click('#btnStyle');
  await tap(1100, 1300);
  await tool('pen'); await drag(100, 1050, 300, 1000); await drag(100, 950, 300, 900);
  await tool('eraser'); await drag(200, 1080, 200, 1020);
  await page.click('#btnPanel');
  console.log('list:', await page.$$eval('#rows .row[data-id] .subj', r => r.map(e => e.textContent).join(' | ')));
  await page.screenshot({ path: path.join(SP, 'p2-live.png'), clip: { x: 0, y: 120, width: 800, height: 420 } });
  // save and inspect
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveFile')]);
  const out = path.join(SP, 'p2.pdf'); await dl.saveAs(out);
  const od = await PDFDocument.load(fs.readFileSync(out)); const an = od.getPages()[0].node.Annots();
  for (let i = 0; i < an.size(); i++) {
    const d = od.context.lookup(an.get(i)), g = k => d.get(PDFName.of(k)) ? String(d.get(PDFName.of(k))).replace(/\s+/g, ' ').slice(0, 70) : '-';
    console.log(g('Subtype').padEnd(10), 'IT', g('IT').padEnd(17), 'LE', g('LE').padEnd(18), 'BE', g('BE').padEnd(16), 'DA', g('DA').padEnd(28), 'Contents', (d.get(PDFName.of('Contents')) ? d.get(PDFName.of('Contents')).decodeText() : '-').slice(0, 40));
  }
  // reopened (after save): edit the text box by tapping it twice with Select
  await page.click('#btnClosePanel');
  await tool('select'); await tap(600, 1625); await tap(600, 1625);
  console.log('edit saved text box opens editor:', await page.isVisible('#textEdit'), '| text:', (await page.inputValue('#textEdit')).slice(0, 30));
  await page.keyboard.press('End'); await page.keyboard.type(' (urgent)'); await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(SP, 'p2-saved.png'), clip: { x: 0, y: 120, width: 800, height: 420 } });
  console.log('unsaved after edit:', await page.evaluate(() => document.querySelector('#btnSave').classList.contains('unsaved')));
  console.log('errors:', errs); await b.close();
})();
