const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const tool = async () => (await page.textContent('#btnToolPick .tn')).trim();
  await page.keyboard.press('Meta+,'); await page.waitForTimeout(200); await page.click('[data-stab="Keyboard shortcuts"]');
  const rows = async () => page.$$eval('#keyList .krow .kl', x => x.map(e => e.textContent));
  const search = async q => { await page.fill('#keySearch', q); await page.waitForTimeout(60); return rows(); };
  console.log('all:', (await rows()).length);
  console.log('group:', await search('group'));
  console.log('undo:', await search('undo'));
  console.log('cmd g:', await search('cmd g'));
  console.log('ctrl+shift+g:', await search('ctrl+shift+g'));
  console.log('page:', await search('page'));
  console.log('tools shift:', await search('tools shift'));
  console.log('zzz:', await search('zzz'), (await page.textContent('#keyList')).trim());
  // typing letters into search must not switch tools or capture
  await search('circle'); console.log('circle rows:', await rows(), '| settings open', await page.isVisible('#setModal'));
  // Return with one match starts capture
  await page.press('#keySearch', 'Enter'); console.log('capture:', (await page.textContent('[data-kset="tool:circle"]')).trim());
  await page.keyboard.press('Shift+Q'); console.log('circle now:', (await page.textContent('[data-kset="tool:circle"]')).trim());
  // change while filtered keeps the filter
  console.log('filter kept:', await page.inputValue('#keySearch'), (await rows()).length);
  // Escape clears the search, settings stays open
  await page.focus('#keySearch'); await page.keyboard.press('Escape');
  console.log('esc: query', JSON.stringify(await page.inputValue('#keySearch')), 'rows', (await rows()).length, 'open', await page.isVisible('#setModal'));
  await page.fill('#keySearch', 'none'); console.log('none:', await rows());
  await page.screenshot({ path: path.join(SP, 'p51-search.png') });
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  console.log('closed:', await page.isHidden('#setModal'));
  await page.keyboard.press('Escape');
  await page.keyboard.press('Shift+Q'); console.log('Shift+Q ->', await tool());
  // reopen: search is cleared
  await page.keyboard.press('Meta+,'); await page.waitForTimeout(200); await page.click('[data-stab="Keyboard shortcuts"]'); console.log('reopen query:', JSON.stringify(await page.inputValue('#keySearch')), (await rows()).length);
  console.log('errors:', errs); await b.close();
})();
