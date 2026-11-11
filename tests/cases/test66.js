const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const vis = () => page.$$eval('#setBody .setsec', x => x.filter(e => !e.hidden).map(e => e.querySelector('h3').textContent));
  await page.click('#btnSettings'); await page.waitForTimeout(200);
  console.log('tabs:', await page.$$eval('#setTabs .stab', x => x.map(e => e.textContent).join(' ')));
  console.log('shown:', await vis());
  await page.click('[data-stab="Keyboard shortcuts"]'); console.log('Keys tab:', await vis(), '| key rows', await page.$$eval('#keyList .krow', x => x.length));
  await page.screenshot({ path: path.join(SP, 'p52-keys.png') });
  const search = async q => { await page.fill('#setSearch', q); await page.waitForTimeout(60); return { secs: await vis(), rows: await page.$$eval('#setBody .setsec:not([hidden]) .setrow:not([hidden]) > span:first-child', x => x.map(e => e.textContent.split(/[A-Z][a-z]+ [a-z]/)[0].slice(0, 30))), keys: await page.$$eval('#keyList .krow .kl', x => x.map(e => e.textContent)) }; };
  console.log('snap:', JSON.stringify(await search('snap')));
  console.log('undo:', JSON.stringify(await search('undo')));
  console.log('update:', JSON.stringify(await search('update')));
  console.log('palm:', JSON.stringify(await search('palm')));
  console.log('circle:', JSON.stringify((await search('circle')).secs), await page.$$eval('#tlist .trow:not([hidden]) .nm', x => x.map(e => e.textContent)));
  console.log('backup:', JSON.stringify((await search('back up')).secs));
  console.log('zzqq:', JSON.stringify(await search('zzqq')), await page.textContent('#setNone').catch(() => '-'));
  await page.screenshot({ path: path.join(SP, 'p52-search.png') });
  await page.focus('#setSearch'); await page.keyboard.press('Escape'); console.log('esc clears:', JSON.stringify(await page.inputValue('#setSearch')), await vis(), 'open', await page.isVisible('#setModal'));
  // change a setting still works in a tab
  await page.click('[data-stab="Drawing"]'); console.log('Drawing tab:', await vis());
  await page.click('#setClose');
  await page.click('#btnSettings'); await page.waitForTimeout(150); console.log('remembers tab:', await vis());
  await page.click('#setClose');
  // recent tools
  await page.keyboard.press('c'); await page.keyboard.press('r'); await page.keyboard.press('l'); await page.keyboard.press('v'); console.log('focus', await page.evaluate(() => document.activeElement.id || document.activeElement.tagName), 'tool', await page.textContent('#btnToolPick .tn'), await page.evaluate(() => localStorage.getItem('pencil-markup-ui').match(/recentTools[^]]*/)));
  await page.click('#btnToolPick'); await page.waitForTimeout(100);
  console.log('recent in tool picker:', await page.$$eval('#toolRecent .tb .lbl', x => x.map(e => e.textContent)));
  await page.click('#toolRecent [data-pick="rect"]'); console.log('picked from recent:', (await page.textContent('#btnToolPick .tn')).trim(), '| pop hidden', await page.isHidden('#toolPop'));
  const fd = await page.isVisible('#favDD'); console.log('fav drop-down visible:', fd);
  if (fd) { await page.click('#favDD'); await page.waitForTimeout(100); console.log('recent in drop-down:', await page.$$eval('#favGrid .recent .lbl', x => x.map(e => e.textContent))); await page.click('#favGrid .recent [data-pick="length"]'); console.log('picked:', (await page.textContent('#btnToolPick .tn')).trim()); }
  await page.screenshot({ path: path.join(SP, 'p52-recent.png') });
  // palm rejection: pen down on the drawing, lifted OUTSIDE it; a finger tap 0.5 s later still selects
  await page.keyboard.press('Escape'); await page.keyboard.press('s');
  const bx = await page.locator('.page').first().boundingBox(); const X = bx.x + bx.width * 0.3, Y = bx.y + bx.height * 0.3;
  await page.mouse.click(X, Y); await page.keyboard.press('v'); await page.keyboard.press('Escape');
  await page.evaluate(([X, Y]) => {
    document.elementFromPoint(X + 200, Y + 100).dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'pen', pointerId: 7, clientX: X + 200, clientY: Y + 100, bubbles: true, buttons: 1 }));
    document.querySelector('.topbar').dispatchEvent(new PointerEvent('pointerup', { pointerType: 'pen', pointerId: 7, clientX: X, clientY: 20, bubbles: true }));
  }, [X, Y]);
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.evaluate(([X, Y]) => { const el = document.elementFromPoint(X, Y); el.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 9, clientX: X, clientY: Y, bubbles: true, buttons: 1, isPrimary: true })); el.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', pointerId: 9, clientX: X, clientY: Y, bubbles: true, isPrimary: true })); }, [X, Y]);
  await page.waitForTimeout(200); console.log('finger tap after a lost Pencil lift selects:', await page.isVisible('#selBar') ? await page.textContent('#selN') : 'nothing');
  console.log('errors:', errs); await b.close();
})();
