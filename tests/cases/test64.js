const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const tool = async () => (await page.textContent('#btnToolPick .tn')).trim();
  await page.keyboard.press('c'); console.log('default C ->', await tool());
  console.log('tooltip before:', await page.getAttribute('.topbar [data-tool="circle"]', 'title'));
  // open settings, reassign Circle to Shift+Q
  await page.keyboard.press('Meta+,'); await page.waitForTimeout(200); await page.click('[data-stab="Keyboard shortcuts"]');
  console.log('rows:', await page.$$eval('#keyList .krow', x => x.length));
  await page.click('[data-kset="tool:circle"]'); console.log('waiting label:', (await page.textContent('[data-kset="tool:circle"]')).trim());
  await page.keyboard.press('Shift+Q'); await page.waitForTimeout(100);
  console.log('circle now:', (await page.textContent('[data-kset="tool:circle"]')).trim(), '| settings still open:', await page.isVisible('#setModal'));
  // conflict: give Rect the key V (Select)
  await page.click('[data-kset="tool:rect"]'); await page.keyboard.press('v'); await page.waitForTimeout(100);
  console.log('rect:', (await page.textContent('[data-kset="tool:rect"]')).trim(), '| select:', (await page.textContent('[data-kset="tool:select"]')).trim(), '| toast:', (await page.textContent('#toast')).trim());
  // Escape cancels capture without closing settings
  await page.click('[data-kset="save"]'); await page.keyboard.press('Escape'); console.log('esc cancel: save =', (await page.textContent('[data-kset="save"]')).trim(), '| open', await page.isVisible('#setModal'));
  // clear Undo
  await page.click('[data-kclear="undo"]'); console.log('undo cleared:', (await page.textContent('[data-kset="undo"]')).trim());
  await page.screenshot({ path: path.join(SP, 'p50-set.png') });
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  console.log('settings closed:', await page.isHidden('#setModal'));
  await page.keyboard.press('Escape');
  await page.keyboard.press('Shift+Q'); console.log('Shift+Q ->', await tool());
  await page.keyboard.press('v'); console.log('V ->', await tool());
  await page.keyboard.press('t'); await page.keyboard.press('c'); console.log('C (now free) ->', await tool());
  console.log('tooltip after:', await page.getAttribute('.topbar [data-tool="circle"]', 'title'));
  await page.keyboard.press('Meta+/'); const sheet = await page.$$eval('#kbBody dt', x => x.map(e => e.textContent)); console.log('sheet has none:', sheet.filter(t => t === 'none').length); await page.keyboard.press('Escape');
  // persist after reload
  await page.reload(); await page.waitForTimeout(1200);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  await page.keyboard.press('Shift+Q'); console.log('after reload Shift+Q ->', await tool());
  // typing in search must not switch tools
  await page.click('#filter'); await page.keyboard.type('vq'); console.log('typed in filter, tool still', await tool(), '| value', await page.inputValue('#filter'));
  await page.keyboard.press('Escape');
  // reset one, reset all
  await page.keyboard.press('Meta+,'); await page.waitForTimeout(200); await page.click('[data-stab="Keyboard shortcuts"]');
  await page.click('[data-kreset="tool:rect"]'); console.log('rect reset:', (await page.textContent('[data-kset="tool:rect"]')).trim());
  await page.click('[data-kresetall]'); console.log('reset all: circle', (await page.textContent('[data-kset="tool:circle"]')).trim(), 'select', (await page.textContent('[data-kset="tool:select"]')).trim(), 'undo', (await page.textContent('[data-kset="undo"]')).trim());
  await page.keyboard.press('Escape');
  await page.keyboard.press('r'); console.log('R ->', await tool());
  console.log('errors:', errs); await b.close();
})();
