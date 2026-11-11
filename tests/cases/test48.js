// Real touch input (finger taps, long-press) on an iPad-sized touch screen.
const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  const tapEl = async (sel) => { const bb = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.waitForTimeout(250); };
  const at = async (x, y) => { const bx = await page.locator('.page').first().boundingBox(), sc = bx.width / 2592; return [bx.x + x * sc, bx.y + (1728 - y) * sc]; };
  const tapPdf = async (x, y) => { const a = await at(x, y); await page.touchscreen.tap(a[0], a[1]); await page.waitForTimeout(300); };
  const pen = async (x, y) => { const a = await at(x, y); await page.mouse.click(a[0], a[1]); await page.waitForTimeout(150); };
  // place with the "pencil" (mouse), everything else with a finger
  await tapEl('#btnToolPick'); await tapEl('#toolGrid [data-pick="symbol"]');
  for (const x of [300, 450, 600, 1200, 1350]) await pen(x, 1300);
  await page.waitForTimeout(700); // palm rejection window after the Pencil
  await tapEl('#btnToolPick'); await tapEl('#toolGrid [data-pick="select"]');
  await tapPdf(300, 1300); console.log('finger tap selects:', await page.isVisible('#selBar') ? await page.textContent('#selN') : 'NO');
  await tapEl('#btnSelProps'); console.log('Properties pop-up opens:', await page.isVisible('#propsPop'));
  await tapPdf(2300, 200); console.log('tap away closes pop-up:', await page.isHidden('#propsPop'));
  // long-press a row -> select mode
  const r = await page.locator('#rows .row[data-id]').nth(3).boundingBox();
  await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); el.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 91, clientX: x, clientY: y, bubbles: true })); }, [r.x + 120, r.y + 20]);
  await page.waitForTimeout(800);
  await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); el.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', pointerId: 91, clientX: x, clientY: y, bubbles: true })); }, [r.x + 120, r.y + 20]);
  console.log('long-press starts Select mode:', await page.evaluate(() => document.body.classList.contains('list-select')), '| ticked:', await page.textContent('#selN'));
  await tapEl('#rows .row[data-id]:nth-child(5) .sw'); console.log('tap tick adds:', await page.textContent('#selN'));
  await tapEl('#btnGroup'); console.log('grouped:', await page.$$eval('#rows .row.g .subj', x => x.map(e => e.textContent).join(' | ')));
  await tapEl('#btnListSelect'); await tapEl('#btnSelClear');
  // Add to group with fingers
  await tapPdf(300, 1300); await tapEl('#btnCombine'); console.log('combine bar:', await page.isVisible('#combineBar'));
  await tapPdf(1200, 1300); await tapEl('#combineGo'); console.log('Add to group by finger:', await page.$$eval('#rows .row.g .subj', x => x.map(e => e.textContent).join(' | ')));
  // style menu not covered by the selection bar
  await tapEl('#btnStyle'); const sb = await page.locator('#selBar').boundingBox(); const st = await page.locator('#stylePop').boundingBox();
  const topEl = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && e.closest('#stylePop') ? 'menu' : (e && e.closest('#selBar') ? 'selection bar' : (e && e.className) || '?'); }, [(Math.max(sb.x, st.x) + Math.min(sb.x + sb.width, st.x + st.width)) / 2, (Math.max(sb.y, st.y) + Math.min(sb.y + sb.height, st.y + st.height)) / 2]);
  console.log('where menu and bar overlap, on top:', st && sb && st.y + st.height > sb.y && st.x < sb.x + sb.width && st.x + st.width > sb.x ? topEl : 'no overlap');
  await tapEl('#btnStyle');
  // ungroup via bar
  await tapEl('#rows .row.g'); await tapEl('#btnUngroup'); console.log('ungrouped, groups left:', await page.$$eval('#rows .row.g', x => x.length));
  // delete via bar + undo
  await tapPdf(450, 1300); const n0 = await page.textContent('#count'); await tapEl('#btnDelete'); const n1 = await page.textContent('#count'); await tapEl('#btnUndo');
  console.log('delete/undo:', n0, '->', n1, '->', await page.textContent('#count'));
  console.log('errors:', errs); await b.close();
})();
