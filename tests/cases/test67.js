const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const at = async (x, y) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; return [bx.x + x * sc, bx.y + (1728 - y) * sc]; };
  const tap = async (x, y) => { const a = await at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(80); };
  // numbered markups placed in a scrambled order: 2 rows
  await page.keyboard.press('n');
  for (const [x, y] of [[900, 1300], [300, 1300], [600, 900], [600, 1300], [300, 900], [900, 900]]) await tap(x, y);
  // symbols with label A
  await page.keyboard.press('s'); for (const x of [1400, 1600, 1800]) await tap(x, 1300);
  await page.keyboard.press('v'); await page.keyboard.press('Escape');
  const labels = () => page.evaluate(() => Array.from(document.querySelectorAll('#rows .row[data-id] .subj')).map(e => e.textContent).join(' | '));
  console.log('list:', await labels());
  // ---- renumber: select the 6 numbered, rows order
  await page.keyboard.press('Meta+a'); await page.waitForTimeout(100);
  console.log('Renumber button with all selected:', await page.isVisible('#btnRenumber'));
  await page.keyboard.press('Escape');
  for (const [x, y] of [[900, 1300], [300, 1300], [600, 900], [600, 1300], [300, 900], [900, 900]]) { const a = await at(x, y); await page.keyboard.down('Shift'); await page.mouse.click(a[0], a[1]); await page.keyboard.up('Shift'); }
  console.log('selected:', await page.textContent('#selN'), '| renumber button:', await page.isVisible('#btnRenumber'));
  await page.keyboard.press('Meta+Shift+n'); await page.waitForTimeout(100);
  console.log('rn modal:', await page.isVisible('#rnModal'), '|', await page.textContent('#rnSub'), '| preview', await page.textContent('#rnPrev'));
  await page.fill('#rnFrom', '101'); await page.fill('#rnPrefix', 'L-'); await page.waitForTimeout(50); console.log('preview:', await page.textContent('#rnPrev'));
  await page.click('#rnGo'); await page.waitForTimeout(150);
  const textAt = async (x, y) => { const a = await at(x, y); return page.evaluate(([X, Y]) => { let best = null, bd = 1e9; document.querySelectorAll('.page svg text').forEach(t => { const r = t.getBoundingClientRect(), d = Math.hypot(r.x + r.width / 2 - X, r.y + r.height / 2 - Y); if (d < bd) { bd = d; best = t.textContent; } }); return best; }, a); };
  const g = []; for (const [x, y] of [[300, 1300], [600, 1300], [900, 1300], [300, 900], [600, 900], [900, 900]]) g.push(await textAt(x, y));
  console.log('numbers by position, top row then bottom row:', g.join(' '));
  console.log('list after renumber:', await labels());
  await page.keyboard.press('Meta+z'); await page.waitForTimeout(100); console.log('undo:', await labels());
  await page.keyboard.press('Meta+Shift+z'); await page.waitForTimeout(100);
  // ---- counts table select-all
  await page.keyboard.press('Escape'); await page.keyboard.press('Meta+4'); await page.waitForTimeout(200);
  console.log('counts rows:', await page.$$eval('#ctable .crow .cn', x => x.map(e => e.textContent)));
  await page.click('#ctable [data-selall]'); await page.waitForTimeout(200);
  console.log('select all of first type ->', await page.textContent('#selN'), '| props open:', await page.isVisible('#propsPop'));
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  // ---- find and replace
  await page.click('#btnFindReplace'); await page.waitForTimeout(100);
  await page.fill('#frFind', 'A'); await page.waitForTimeout(80); console.log('find "A":', await page.textContent('#frResult'));
  await page.check('#frWord'); await page.fill('#frFind', 'A'); await page.waitForTimeout(80); console.log('whole word "A":', await page.textContent('#frResult'), '| prev', (await page.$$eval('#frPrev div', x => x.map(e => e.textContent))).slice(0, 4));
  await page.uncheck('#frSubj'); await page.waitForTimeout(80); console.log('labels only:', await page.textContent('#frResult'));
  await page.fill('#frWith', 'LT1'); await page.waitForTimeout(50);
  await page.screenshot({ path: path.join(SP, 'p53-fr.png') });
  await page.click('#frGo'); await page.waitForTimeout(150); console.log('after replace:', await page.textContent('#frResult'));
  await page.click('#frClose');
  console.log('labels now:', await page.evaluate(() => Array.from(document.querySelectorAll('.page svg text')).map(t => t.textContent).filter(t => /LT1|^A$/.test(t)).join(',')));
  await page.keyboard.press('Meta+z'); console.log('undo replace:', await page.evaluate(() => Array.from(document.querySelectorAll('.page svg text')).map(t => t.textContent).filter(t => /LT1|^A$/.test(t)).join(',')));
  await page.keyboard.press('Meta+Shift+z');
  // Escape closes the modal
  await page.keyboard.press('Meta+Alt+f'); console.log('Option+Cmd+F opens:', await page.isVisible('#frModal')); await page.keyboard.press('Escape'); console.log('Esc closes:', await page.isHidden('#frModal'));
  // save and reopen keeps the new numbers and labels
  const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await page.keyboard.press('Meta+s'); await page.waitForSelector('#saveBar:not([hidden])'); await page.click('#btnSaveFile'); })()]);
  const out = path.join(SP, 'p53-out.pdf'); await dl.saveAs(out);
  await page.setInputFiles('#file', out); await page.waitForTimeout(1800);
  const g2 = []; for (const [x, y] of [[300, 1300], [600, 1300], [900, 1300], [300, 900], [600, 900], [900, 900], [1400, 1300]]) g2.push(await textAt(x, y)); console.log('reopened numbers + label:', g2.join(' ')); console.log('rows:', await page.$$eval('#rows .row[data-id]', x => x.map(e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)).join(' || ')));
  console.log('errors:', errs); await b.close();
})();
