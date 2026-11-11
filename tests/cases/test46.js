const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const tool = async (t) => { await page.click('#btnToolPick'); await page.click('#toolGrid [data-pick="' + t + '"]'); };
  const tapPdf = async (x, y) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; await page.mouse.click(bx.x + x * sc, bx.y + (1728 - y) * sc); await page.waitForTimeout(150); };
  await tool('symbol'); for (let i = 0; i < 8; i++) await tapPdf(200 + i * 200, 1300);
  await tool('select');
  // 1. resize the panel
  const w0 = (await page.locator('#panel').boundingBox()).width, e = await page.locator('#panelEdge').boundingBox();
  await page.mouse.move(e.x + e.width / 2, e.y + 200); await page.mouse.down(); await page.mouse.move(e.x - 150, e.y + 200, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
  const w1 = (await page.locator('#panel').boundingBox()).width; console.log('panel width', Math.round(w0), '->', Math.round(w1));
  await page.reload(); await page.waitForTimeout(1500); console.log('width kept after reload:', Math.round((await page.locator('#panel').boundingBox()).width));
  // 2. select mode: drag down the ticks over rows 1-3 -> group
  await page.click('#btnListSelect');
  const sws = page.locator('#rows .row[data-id] .sw');
  const a = await sws.nth(0).boundingBox(), c = await sws.nth(2).boundingBox();
  await page.mouse.move(a.x + 8, a.y + 8); await page.mouse.down(); await page.mouse.move(c.x + 8, c.y + 8, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(150);
  console.log('drag-selected:', await page.textContent('#selN')); await page.click('#btnGroup');
  // rows 4-6 by tapping ticks -> group
  await page.click('#btnSelClear');
  for (const i of [0, 1, 2]) { await page.locator('#rows .row[data-id]:not(.member) .sw').nth(i).click(); await page.waitForTimeout(80); }

  console.log('tapped 3:', await page.textContent('#selN')); await page.click('#btnGroup');
  console.log('groups:', await page.$$eval('#rows .row.g .subj', r => r.map(x => x.textContent).join(' | ')));
  await page.screenshot({ path: path.join(SP, 'p32.png') });
  // tick both group rows -> Combine
  await page.click('#btnSelClear');
  await page.locator('#rows .row.g .sw').nth(0).click(); await page.locator('#rows .row.g .sw').nth(1).click();
  console.log('two groups ticked:', await page.textContent('#selN'), '| bar button:', await page.textContent('#btnGroup span')); await page.click('#btnGroup');
  console.log('after combine:', await page.$$eval('#rows .row.g .subj', r => r.map(x => x.textContent).join(' | ')));
  // open the group, tick two members -> Remove from group
  await page.click('#btnSelClear'); await page.click('#rows .row.g [data-twist]');
  await page.locator('#rows .row.member .sw').nth(0).click(); await page.locator('#rows .row.member .sw').nth(1).click();
  console.log('members ticked:', await page.textContent('#selN'), '| buttons:', (await page.$$eval('#selBar .sbb:not([hidden]) span', x => x.map(e => e.textContent))).join(', '));
  await page.click('#btnRemoveFromGroup'); console.log('after remove:', await page.$$eval('#rows .row.g .subj', r => r.map(x => x.textContent).join(' | ')), '| rows', await page.$$eval('#rows .row[data-id]:not(.member)', r => r.length));
  await page.click('#btnSelClear'); await page.locator('#rows .row.g .sw').nth(0).click(); await page.click('#btnUngroup');
  console.log('after ungroup: groups left', await page.$$eval('#rows .row.g', r => r.length));
  await page.click('#btnListSelect'); console.log('Done leaves select mode:', !(await page.evaluate(() => document.body.classList.contains('list-select'))));
  console.log('errors:', errs); await b.close();
})();
