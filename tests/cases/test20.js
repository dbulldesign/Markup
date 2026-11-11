const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument, PDFName, degrees } = require('pdf-lib');
(async () => {
  // rotated two-page sheet (24x36 portrait page rotated 90 so it shows landscape)
  const d = await PDFDocument.create(); const p1 = d.addPage([1728, 2592]); p1.setRotation(degrees(90)); const p2 = d.addPage([1728, 2592]); p2.setRotation(degrees(90));
  fs.writeFileSync(path.join(SP, 'rot.pdf'), await d.save());
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { if (!localStorage.getItem('pencil-markup-ui')) localStorage.setItem('pencil-markup-ui', JSON.stringify({ propsMode: 'always', compact: false })); } catch (e) {} }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(1200);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(1000);
  const pageBox = async (i) => page.locator('.page').nth(i).boundingBox();
  // ---- 1. shown twice: rr.pdf has saved symbols; move one and delete one
  await page.setInputFiles('#file', path.join(SP, 'rr.pdf')); await page.waitForTimeout(1800);
  await page.click('#btnClosePanel');
  for (let i = 0; i < 5; i++) await page.click('#zoomIn');
  await page.evaluate(() => { const v = document.querySelector('#viewer'), p = document.querySelector('.page'); const s = p.offsetWidth / 2592; v.scrollLeft = p.offsetLeft + 150 * s; v.scrollTop = p.offsetTop + (1728 - 1660) * s; });
  await page.waitForTimeout(1500);
  const bx = await pageBox(0), sc = bx.width / 2592, at = (x, y) => [bx.x + x * sc, bx.y + (1728 - y) * sc];
  await page.click('[data-tool="select"]');
  { const a = at(200, 1600), c = at(200, 1530); await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(c[0], c[1], { steps: 6 }); await page.mouse.up(); }
  { const a = at(300, 1600); await page.mouse.click(a[0], a[1]); await page.click('#btnPanel'); await page.click('#btnDelete'); await page.click('#btnClosePanel'); }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SP, 'p1-moved.png'), clip: { x: 0, y: 120, width: 700, height: 300 } });
  // ---- 2. Escape while typing in Label
  await page.click('[data-tool="symbol"]'); await page.click('#btnStyle'); await page.click('#symNew [data-s="label"]');
  await page.keyboard.press('Escape'); console.log('Escape in Label closes style menu:', await page.isHidden('#stylePop'));
  // ---- 3. rotated page
  await page.setInputFiles('#file', path.join(SP, 'rot.pdf')); await page.waitForTimeout(1800);
  let rb = await pageBox(0); console.log('rotated page shows landscape:', rb.width > rb.height);
  const rs = rb.width / 2592, rat = (vx, vy) => [rb.x + vx * rs, rb.y + vy * rs]; // view coords (unrotated screen space at zoom 1)
  await page.click('#btnStyle'); await page.selectOption('#symNew [data-s="shape"]', 'rect');
  const setR = (sel, v) => page.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  await setR('#symNew [data-s="size"]', 60); await setR('#symNew [data-s="height"]', 20); await page.fill('#symNew [data-s="label"]', 'L1'); await page.click('#btnStyle');
  { const a = rat(300, 300); await page.mouse.click(a[0], a[1]); }
  await page.click('[data-tool="length"]');
  await page.click('#btnScale'); await page.click('#scOk');
  { const a = rat(300, 500), c = rat(700, 500); await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(c[0], c[1], { steps: 5 }); await page.mouse.up(); }
  await page.click('#btnSave'); await page.waitForSelector('#saveBar:not([hidden])'); await page.click('#btnSaveBarClose');
  await page.click('#btnClosePanel').catch(() => {});
  for (let i = 0; i < 3; i++) await page.click('#zoomIn');
  await page.evaluate(() => { const v = document.querySelector('#viewer'), p = document.querySelector('.page'); const s = p.offsetWidth / 2592; v.scrollLeft = p.offsetLeft + 200 * s; v.scrollTop = p.offsetTop + 220 * s; });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SP, 'p1-rot.png'), clip: { x: 0, y: 120, width: 800, height: 420 } });
  // ---- 4. box across two pages
  await page.click('#zoomFit'); await page.waitForTimeout(400);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  await page.click('[data-tool="numbered"]');
  let b0 = await pageBox(0), s0 = b0.width / 2592; await page.mouse.click(b0.x + 300 * s0, b0.y + b0.height - 40 * s0);
  await page.evaluate(() => { document.querySelector('#viewer').scrollTop += 300; }); await page.waitForTimeout(300);
  b0 = await pageBox(0); let b1 = await pageBox(1);
  await page.mouse.click(b1.x + 300 * s0, b1.y + 40 * s0);
  await page.click('[data-tool="select"]');
  { const yA = b0.y + b0.height - 80 * s0, yB = b1.y + 80 * s0; await page.mouse.move(b0.x + 200 * s0, yA); await page.mouse.down(); await page.mouse.move(b0.x + 420 * s0, yB, { steps: 6 }); await page.mouse.up(); }
  console.log('box across two pages selected:', await page.$$eval('#rows .row.sel', r => r.length), '| pages:', await page.$$eval('#rows .row.sel .pg', r => r.map(e => e.textContent).join(',')));
  // start a box in the gap between pages
  { b0 = await pageBox(0); b1 = await pageBox(1); const gapY = (b0.y + b0.height + b1.y) / 2; await page.mouse.move(b0.x + 420 * s0, gapY); await page.mouse.down(); await page.mouse.move(b0.x + 200 * s0, b1.y + 80 * s0, { steps: 6 }); await page.mouse.up(); }
  console.log('box started in the gap (right to left):', await page.$$eval('#rows .row.sel', r => r.length));
  // ---- 5. undo after reload
  await page.waitForTimeout(1500); await page.reload(); await page.waitForTimeout(2500);
  console.log('after reload markups:', await page.textContent('#count'), '| undo enabled:', await page.isEnabled('#btnUndo'));
  await page.click('#btnUndo'); console.log('after undo markups:', await page.textContent('#count'));
  console.log('errors:', errs); await b.close();
})();
