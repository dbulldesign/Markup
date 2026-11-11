const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const at = async (x, y) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; return [bx.x + x * sc, bx.y + (1728 - y) * sc]; };
  const tapPdf = async (x, y) => { const a = await at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(120); };
  const tool = async () => (await page.textContent('#btnToolPick .tn')).trim();
  await page.keyboard.press('s'); console.log('S ->', await tool());
  for (const x of [300, 450, 600, 900, 1050, 1500, 1700]) await tapPdf(x, 1300);
  await page.keyboard.press('Shift+W'); console.log('Shift+W ->', await tool());
  await page.keyboard.press('b'); console.log('B ->', await tool());
  await page.keyboard.press('v'); console.log('V ->', await tool());
  await page.keyboard.press('Meta+a'); console.log('Cmd+A ->', await page.textContent('#selN'));
  await page.keyboard.press('Escape'); console.log('Esc -> bar hidden', await page.isHidden('#selBar'));
  // make 3 groups: (300,450) (900,1050) (1500,1700) via shift-click + Cmd+G
  const grp = async (x1, x2) => { await page.keyboard.press('Escape'); const a = await at(x1, 1300), c = await at(x2, 1300); await page.mouse.click(a[0], a[1]); await page.keyboard.down('Shift'); await page.mouse.click(c[0], c[1]); await page.keyboard.up('Shift'); await page.keyboard.press('Meta+g'); await page.waitForTimeout(100); };
  await grp(300, 450); await grp(900, 1050); await grp(1500, 1700);
  console.log('groups:', await page.$$eval('#rows .row.g', x => x.length));
  // combine group 1 with groups 2 and 3 and the single at 600, via the bar
  await page.keyboard.press('Escape'); await tapPdf(300, 1300); await page.keyboard.press('Meta+Shift+c');
  console.log('combine bar:', (await page.textContent('#combineInfo')).replace(/\s+/g, ' '));
  await tapPdf(900, 1300); await tapPdf(1500, 1300); await tapPdf(600, 1300);
  console.log('picked:', (await page.textContent('#combineInfo')).replace(/\s+/g, ' ').replace(/^.*then Combine\. /, ''), '| Combine enabled:', await page.isEnabled('#combineGo'));
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  console.log('after combine:', await page.$$eval('#rows .row.g .subj', x => x.map(e => e.textContent).join(' | ')));
  await page.keyboard.press('Meta+z'); console.log('Cmd+Z:', await page.$$eval('#rows .row.g', x => x.length), 'groups');
  // cancel restores
  await page.keyboard.press('Escape'); await tapPdf(300, 1300); await page.click('#btnCombine'); await tapPdf(900, 1300); await page.keyboard.press('Escape'); console.log('cancel ->', await page.textContent('#selN'));
  // nudge + rotate + pages + zoom + panel
  await page.keyboard.press('Escape'); await tapPdf(600, 1300);
  const r0 = await page.evaluate(() => document.querySelector('.page svg').innerHTML.length);
  await page.keyboard.press('Shift+ArrowRight'); await page.keyboard.press('.'); console.log('nudge/rotate: unsaved', await page.evaluate(() => document.querySelector('#btnSave').classList.contains('unsaved')));
  await page.keyboard.press(']'); await page.waitForTimeout(400); console.log('] ->', await page.textContent('#pageInd'));
  const z0 = await page.textContent('#zoomVal'); await page.keyboard.press('Meta+='); console.log('Cmd+= :', z0, '->', await page.textContent('#zoomVal')); await page.keyboard.press('Meta+0');
  await page.keyboard.press('Meta+1'); console.log('Cmd+1 list hidden:', await page.isHidden('#panel')); await page.keyboard.press('Meta+1');
  await page.keyboard.press('Meta+k'); await page.waitForTimeout(150); console.log('Cmd+K tool search focused:', await page.evaluate(() => document.activeElement && document.activeElement.id));
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.keyboard.press('Meta+/'); console.log('Cmd+/ sheet:', await page.isVisible('#kbModal'), '| rows', await page.$$eval('#kbBody dt', x => x.length));
  await page.screenshot({ path: path.join(SP, 'p49-kb.png') });
  await page.keyboard.press('Escape'); console.log('closed:', await page.isHidden('#kbModal'));
  console.log('tooltip:', await page.getAttribute('[data-tool="lasso"]', 'title'));
  console.log('errors:', errs); await b.close();
})();
