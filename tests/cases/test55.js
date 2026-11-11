const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const SP = process.env.PM_DIR; const { PDFDocument } = require('pdf-lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  const tapPdf = async (x, y, w = 150) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; await page.mouse.click(bx.x + x * sc, bx.y + (1728 - y) * sc); await page.waitForTimeout(w); };
  const dragPdf = async (x0, y0, x1, y1) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; await page.mouse.move(bx.x + x0 * sc, bx.y + (1728 - y0) * sc); await page.mouse.down(); await page.mouse.move(bx.x + x1 * sc, bx.y + (1728 - y1) * sc, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200); };
  await tool('numbered'); for (const x of [300, 450, 600]) await tapPdf(x, 1300);
  await tool('select'); await dragPdf(200, 1450, 700, 1150); await page.click('#btnGroup');
  // multi-edit: open properties for the 3, set subject + status + a field + length
  await page.click('#btnSelProps');
  console.log('title:', await page.textContent('#propsTitle'), '| note shown:', await page.isVisible('.multi-note'));
  await page.fill('#pSubject', 'Downlight'); await page.selectOption('#pStatus', 'accepted');
  await page.fill('#pLenV', "2'"); await page.press('#pLenV', 'Enter');
  await page.click('#pmHide');
  console.log('after multi-edit, rows:', await page.$$eval('#rows .row.g .subj', x => x.map(e => e.textContent).join(' | ')), '| counts:', (await page.textContent('#counts')).replace(/\s+/g, ' '));
  // copy, go to page 2, paste here
  await page.click('#btnCopy'); console.log('paste bar:', await page.textContent('#pasteN'));
  await page.click('#btnPages'); await page.waitForTimeout(200); await page.fill('#gotoIn', '2'); await page.press('#gotoIn', 'Enter'); await page.waitForTimeout(500);
  await page.click('#btnPasteHere'); await page.waitForTimeout(200);
  console.log('after paste: markups', await page.textContent('#count'), '| on pages', await page.$$eval('#rows .row.g .pg', x => x.map(e => e.textContent).join(',')), '| numbers', await page.$$eval('#rows .row.g .comm b', x => x.map(e => e.textContent).join(' / ')));
  // paste in place on page 1 again (nudged)
  await page.fill('#gotoIn', '1'); await page.press('#gotoIn', 'Enter'); await page.waitForTimeout(400); await page.click('#btnPasteInPlace');
  console.log('after paste in place: markups', await page.textContent('#count'));
  // into another open file
  await page.setInputFiles('#file', path.join(SP, 'text.pdf')); await page.waitForTimeout(1500);
  console.log('other file: paste bar visible', await page.isVisible('#pasteBar')); await page.click('#btnPasteHere'); await page.waitForTimeout(200);
  console.log('pasted in other file:', await page.textContent('#count'), '| subjects', await page.$$eval('#rows .row.g .subj', x => x.map(e => e.textContent).join(' | ')));
  await page.click('#btnUndo'); console.log('undo paste:', await page.textContent('#count'));
  await page.reload(); await page.waitForTimeout(1500); console.log('copy kept after reload:', await page.isVisible('#pasteBar') ? await page.textContent('#pasteN') : 'no');
  console.log('errors:', errs); await b.close();
})();
