const { chromium } = require('playwright'); const path = require('path');
const SP = process.env.PM_DIR;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  let answer = null; page.on('dialog', d => d.accept(answer == null ? undefined : answer));
  await page.goto(process.env.PM_URL); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('pencil-markup'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.reload(); await page.waitForTimeout(800);
  await page.setInputFiles('#file', path.join(SP, 'sheet.pdf')); await page.waitForTimeout(1500);
  // ---------- schedule compare
  await page.click('#btnChest'); await page.click('#btnSchedule'); await page.setInputFiles('#schedFile', path.join(SP, 'qb.xlsm')); await page.waitForTimeout(1500);
  await page.fill('#chestSearch', 'LT1-A'); await page.press('#chestSearch', 'Enter'); await page.waitForTimeout(150);
  if (await page.isVisible('#chestPop')) await page.click('#btnChest');
  const bx = await page.locator('.page').first().boundingBox();
  await page.mouse.click(bx.x + 200, bx.y + 150); await page.mouse.click(bx.x + 260, bx.y + 150); await page.waitForTimeout(100);
  await page.keyboard.press('v');
  await page.click('#btnChest'); await page.click('#btnSchedule');
  await page.click('#schedCompare'); await page.waitForTimeout(100);
  // the click opens a file chooser; feed the revision
  await page.setInputFiles('#schedCmpFile', path.join(SP, 'qb-rev2.xlsm')); await page.waitForTimeout(1500);
  console.log('compare open:', await page.isVisible('#csModal'), '|', await page.textContent('#csTitle'));
  console.log('chips:', (await page.$$eval('#csChips .cschip', x => x.map(e => e.textContent))).join(' | '));
  console.log('rows:', (await page.$$eval('#csList .csrow', x => x.map(e => e.textContent.replace(/\s+/g, ' ').slice(0, 110)))).join('\n      '));
  await page.screenshot({ path: path.join(SP, 'p55-cs.png') });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#csCsv')]); console.log('csv:', dl.suggestedFilename());
  await page.click('#csApply'); await page.waitForTimeout(200); console.log('applied:', (await page.textContent('#toast')).trim());
  console.log('placed fixture comment now:', await page.$$eval('#rows .row[data-id]', x => x.map(e => e.textContent.replace(/\s+/g, ' ')).join(' || ').slice(0, 200)));
  await page.click('#btnChest'); await page.fill('#chestSearch', 'LT1-A'); await page.waitForTimeout(100); console.log('palette tool:', await page.$$eval('#chestSets button.chip .t', x => x.map(e => e.textContent)));
  await page.click('#btnChest');
  // ---------- templates
  await page.click('#btnScale'); await page.selectOption('#scPreset', '0:4'); await page.click('#scOk'); await page.waitForTimeout(200);
  answer = 'Emergency'; await page.click('#btnVis').catch(() => {});
  await page.keyboard.press('Meta+Shift+h'); await page.waitForTimeout(100); await page.click('#visNewLayer'); await page.waitForTimeout(100); await page.keyboard.press('Escape');
  answer = 'EM'; await page.click('#seqNew').catch(e => console.log('seqNew hidden'));
  answer = 'QB 360 job';
  await page.click('#btnSettings'); await page.click('[data-stab="Project templates"]');
  await page.click('[data-tpl="save"]'); await page.waitForTimeout(200);
  console.log('templates:', await page.$$eval('#tplList .tplrow', x => x.map(e => e.textContent.replace(/\s+/g, ' ').trim())));
  await page.selectOption('[data-set="autoTemplate"]', { label: 'QB 360 job' });
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('[data-tplexport]')]); const tf = path.join(SP, 'tpl-export.json'); await dl2.saveAs(tf);
  const tj = require(tf); console.log('export: kind', tj.kind, '| palettes', tj.template.sets.length, '| layers', tj.template.layers, '| series', tj.template.series, '| scale', JSON.stringify(tj.template.scale));
  await page.click('#setClose');
  // new file: template applied automatically
  await page.setInputFiles('#file', path.join(SP, 'lines.pdf')); await page.waitForTimeout(2500);
  console.log('auto on new file:', (await page.textContent('#toast')).trim());
  console.log('scale button now:', (await page.textContent('#btnScale')).trim().replace(/\s+/g, ' '));
  // delete + import
  answer = null;
  await page.click('#btnSettings'); await page.click('[data-stab="Project templates"]'); await page.click('[data-tpldel]'); await page.waitForTimeout(100);
  console.log('after delete:', await page.textContent('#tplList'));
  await page.setInputFiles('#tplFile', tf); await page.waitForTimeout(300);
  console.log('after import:', await page.$$eval('#tplList .tplrow b', x => x.map(e => e.textContent)));
  await page.click('[data-tplapply]'); await page.waitForTimeout(200); console.log('apply on a file with a scale:', (await page.textContent('#toast')).trim());
  console.log('errors:', errs); await b.close();
})();
