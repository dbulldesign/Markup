const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName } = require('pdf-lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, colorScheme: 'dark', acceptDownloads: true });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always', compact: false })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1200);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592;
  const at = (x, y) => [bx.x + x * sc, bx.y + (1728 - y) * sc];
  const tap = async (x, y) => { const a = at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(80); };
  const tabs = (root) => page.$$eval(root + ' .ctab', t => t.map(x => (x.hidden ? '(hidden)' : '') + x.textContent + (x.classList.contains('on') ? '*' : '')).join(' '));

  // Rectangle: line orange, fill yellow (popover)
  await page.click('[data-tool="rect"]'); await page.click('#btnStyle');
  console.log('rect tool tabs:', await tabs('#styleNew'));
  await page.click('#styleNew [data-v="#FB8C00"]');
  await page.click('#styleNew [data-target="fill"]'); await page.click('#styleNew [data-v="#FDD835"]');
  await page.locator('#stylePop').screenshot({ path: path.join(SP, 'cp-pop-rect.png') });
  await page.click('#btnStyle');
  { const a = at(200, 1600), c = at(500, 1400); await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(c[0], c[1], { steps: 4 }); await page.mouse.up(); }
  // Symbol tool: text tab appears; text white, fill green
  await page.click('[data-tool="symbol"]'); await page.click('#btnStyle');
  console.log('symbol tool tabs:', await tabs('#styleNew'));
  await page.click('#styleNew [data-target="text"]'); await page.click('#styleNew [data-v="#FFFFFF"]');
  await page.click('#styleNew [data-target="fill"]'); await page.click('#styleNew [data-v="#43A047"]');
  await page.$eval('#styleNew [data-k="fillOpacity"]', el => { el.value = 1; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#stylePop').screenshot({ path: path.join(SP, 'cp-pop-sym.png') });
  await page.click('#btnStyle'); await tap(700, 1500);
  // Select the symbol: props panel; change text to black, fill to none
  await page.click('[data-tool="select"]'); await tap(700, 1500);
  console.log('props tabs (symbol):', await tabs('#styleSel'));
  await page.click('#styleSel [data-target="text"]'); await page.click('#styleSel [data-v="#212121"]');
  await page.locator('#props').screenshot({ path: path.join(SP, 'cp-props.png') });
  // Select the rectangle: no Text tab; fill None
  await tap(350, 1400 + 1);
  console.log('props tabs (rect):', await tabs('#styleSel'));
  await page.click('#styleSel [data-target="fill"]'); await page.click('#styleSel [data-v="none"]');
  // tool editor
  await page.click('[data-tool="symbol"]'); await page.click('#btnStyle'); await page.click('#btnSaveTool');
  console.log('editor tabs (symbol):', await tabs('#styleTool'));
  await page.selectOption('#tType', 'circle'); await page.waitForTimeout(50);
  console.log('editor tabs after switching to Circle:', await tabs('#styleTool'));
  await page.selectOption('#tType', 'symbol');
  await page.locator('#toolModal .sheet').screenshot({ path: path.join(SP, 'cp-editor.png') });
  await page.click('#tCancel');
  // save and inspect
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveFile')]);
  const out = path.join(SP, 'cp.pdf'); await dl.saveAs(out);
  const od = await PDFDocument.load(fs.readFileSync(out)); const an = od.getPages()[0].node.Annots();
  for (let i = 0; i < an.size(); i++) { const d = od.context.lookup(an.get(i)); const pm = d.get(PDFName.of('PMSymbol')); console.log(d.get(PDFName.of('Subtype')).toString(), 'C', String(d.get(PDFName.of('C'))), 'IC', String(d.get(PDFName.of('IC'))), pm ? 'TextColor ' + String(od.context.lookup(pm).get(PDFName.of('TextColor'))) : ''); }
  console.log('errors:', errs); await b.close();
})();
