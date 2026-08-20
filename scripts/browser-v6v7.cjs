const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
let pass=0, fail=0;
const ok=(n,c,x)=>{if(c){pass++;console.log('  ok   '+n)}else{fail++;console.log('  FAIL '+n+(x!==undefined?'  → '+x:''))}};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto('file:///home/ubuntu/.openclaw/workspace/filtering-options/index.html');
  const rows = t => p.locator('#'+t+' tbody tr').count();

  console.log('\n— V6 panel-scoped Apply in a real browser —');
  await p.click('.nav-tab[data-variant="rec"]');
  ok('no bar-level Apply visible', await p.locator('#recFilterBar [data-rec-apply]').count() === 0);
  ok('no Reset to default', await p.locator('#recFilterBar [data-rec-reset]').count() === 0);
  ok('no dirty hint element', await p.locator('#recDirtyHint').count() === 0);

  await p.click('#recFilterBar [data-rec-add]');
  await p.click('#recFilterBar [data-rec-add-key="platform"]');
  await p.waitForTimeout(200);
  ok('Apply is visible inside the panel',
     await p.locator('#recFilterBar [data-field-key="platform"] [data-panel-apply]').isVisible());
  await p.click('#recFilterBar [data-field-key="platform"] label:has([data-check-value="Stripe"])');
  ok('panel stays open after checking', await p.locator('#recFilterBar [data-field-key="platform"] [data-field-panel]').evaluate(e=>e.classList.contains('active')));
  ok('table untouched while staged', await rows('recTable') === 26, await rows('recTable'));
  await p.click('#recFilterBar [data-field-key="platform"] [data-panel-apply]');
  await p.waitForTimeout(300);
  ok('panel Apply commits', await rows('recTable') === 10, await rows('recTable'));
  ok('panel closed after Apply',
     await p.locator('#recFilterBar [data-field-key="platform"] [data-field-panel]').count() === 0
     || !(await p.locator('#recFilterBar [data-field-key="platform"] [data-field-panel]').evaluate(e=>e.classList.contains('active'))));
  // discard path
  await p.click('#recFilterBar [data-field-key="platform"] [data-field-trigger]');
  await p.click('#recFilterBar [data-field-key="platform"] label:has([data-check-value="Amazon"])');
  await p.click('h1');   // click outside = close without Apply
  await p.waitForTimeout(300);
  ok('clicking away discards the edit', await rows('recTable') === 10, await rows('recTable'));
  ok('discarded value does not linger on the chip label',
     (await p.locator('#recFilterBar [data-field-key="platform"] .chip-label-text').innerText()) === 'Platform: Stripe',
     await p.locator('#recFilterBar [data-field-key="platform"] .chip-label-text').innerText());
  await p.click('#recFilterBar [data-field-key="platform"] [data-field-trigger]');
  ok('reopened panel shows only the committed value',
     !(await p.locator('#recFilterBar [data-field-key="platform"] [data-check-value="Amazon"]').isChecked()));
  await p.keyboard.press('Escape');
  await p.screenshot({ path: '/tmp/v6-panel.png', clip: { x: 0, y: 330, width: 1440, height: 520 } });

  console.log('\n— V7 chip collapse —');
  await p.click('.nav-tab[data-variant="sheetbtn"]');
  await p.click('#sheetbtnFiltersBtn');
  await p.waitForTimeout(350);
  await p.click('#sheetbtnContent [data-field-key="platform"] [data-field-trigger]');
  for (const v of ['Stripe','Shopify','PayPal']) {
    await p.click('#sheetbtnContent [data-field-key="platform"] label:has([data-check-value="'+v+'"])');
  }
  await p.click('#sheetbtnApplyBtn');
  await p.waitForTimeout(400);
  const chip = (await p.locator('#sheetbtnChips .applied-chip').first().innerText()).replace('close','').trim();
  ok('chip collapses at 3 values', chip === 'Platform: Stripe + 2 more', chip);
  ok('rows still reflect all three', await rows('sheetbtnTable') === 21, await rows('sheetbtnTable'));

  console.log('\n— V7 status now lives in the sheet (reworked 2026-08-20) —');
  ok('no segments row', await p.locator('#sheetbtnSegments').count() === 0);
  const chipBox = await p.locator('#sheetbtnChips').boundingBox();
  const tblBox  = await p.locator('#sheetbtnTable').boundingBox();
  ok('chips bar sits directly above the table', chipBox.y < tblBox.y, JSON.stringify({chipBox, tblBox}));
  await p.click('#sheetbtnFiltersBtn');
  await p.waitForTimeout(400);
  ok('status field visible in the sheet',
     await p.locator('#sheetbtnContent [data-field-key="status"]').isVisible());
  await p.click('#sheetbtnContent [data-field-key="status"] [data-field-trigger]');
  ok('status panel visible with checkboxes',
     await p.locator('#sheetbtnContent [data-field-key="status"] [data-check-value="Failed"]').isVisible());
  await p.click('#sheetbtnContent [data-field-key="status"] label:has([data-check-value="Failed"])');
  ok('status panel STILL visible after a toggle',
     await p.locator('#sheetbtnContent [data-field-key="status"] [data-field-panel]').isVisible());
  await p.click('#sheetbtnApplyBtn');
  await p.waitForTimeout(400);
  ok('status now produces a chip',
     await p.locator('#sheetbtnChips [data-drop="status"]').isVisible());
  await p.screenshot({ path: '/tmp/v7-chip.png', clip: { x: 0, y: 330, width: 1440, height: 400 } });

  console.log('\n— Regression across the other variants —');
  for (const t of ['current','popular','chips','button','quick']) {
    await p.click('.nav-tab[data-variant="'+t+'"]');
    ok(t+' still renders', await p.locator('#variant-'+t).isVisible());
  }
  ok('no page errors', errs.length===0, errs.join('; '));
  await b.close();
  console.log('\n'+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})();
