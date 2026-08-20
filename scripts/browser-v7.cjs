const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const FILE = 'file:///home/ubuntu/.openclaw/workspace/filtering-options/index.html';
let pass=0, fail=0;
const ok=(n,c,x)=>{if(c){pass++;console.log('  ok   '+n)}else{fail++;console.log('  FAIL '+n+(x!==undefined?'  → '+x:''))}};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto(FILE);
  const rows = t => p.locator('#'+t+' tbody tr').count();

  await p.click('.nav-tab[data-variant="sheetbtn"]');
  ok('toolbar search visible', await p.locator('#sheetbtnSearch').isVisible());
  ok('Filters button visible', await p.locator('#sheetbtnFiltersBtn').isVisible());
  ok('chips bar hidden initially', !(await p.locator('#sheetbtnChips').isVisible()));
  ok('sheet hidden and inert initially', !(await p.locator('#sheetbtnSheet').isVisible()));
  ok('closed sheet controls are NOT focusable',
     !(await p.evaluate(() => { const b=document.querySelector('#sheetbtnSheet .sheet-close'); b.focus(); return document.activeElement===b; })));

  await p.click('#sheetbtnFiltersBtn');
  await p.waitForTimeout(400);
  ok('sheet slides in and is visible', await p.locator('#sheetbtnSheet').isVisible());
  ok('overlay visible', await p.locator('#sheetbtnOverlay').isVisible());
  const box = await p.locator('#sheetbtnSheet').boundingBox();
  ok('sheet is anchored to the right edge', Math.abs((box.x + box.width) - 1440) < 2, JSON.stringify(box));
  ok('Apply + Reset both visible in footer',
     (await p.locator('#sheetbtnApplyBtn').isVisible()) && (await p.locator('#sheetbtnResetBtn').isVisible()));
  // Reworked 2026-08-20: the sheet owns every filter, status included.
  ok('all 6 filters in the sheet',
     await p.locator('#sheetbtnContent [data-field-key]').count() === 6,
     await p.locator('#sheetbtnContent [data-field-key]').count());
  ok('status IS a field in the sheet, with all 8 statuses',
     await p.locator('#sheetbtnContent [data-field-key="status"] [data-check-value]').count() === 8);
  ok('no segments row anywhere in variant 7',
     await p.locator('#sheetbtnSegments').count() === 0);
  ok('no count line in variant 7', await p.locator('#sheetbtnCount').count() === 0);

  // nested dropdown inside the sheet must not close the sheet
  await p.click('#sheetbtnContent [data-field-key="platform"] [data-field-trigger]');
  ok('sheet survives opening a dropdown', await p.locator('#sheetbtnSheet').isVisible());
  await p.click('#sheetbtnContent [data-field-key="platform"] label:has([data-check-value="Stripe"])');
  await p.click('#sheetbtnContent [data-field-key="platform"] label:has([data-check-value="Shopify"])');
  ok('panel stays open across toggles',
     await p.locator('#sheetbtnContent [data-field-key="platform"] [data-field-panel]').evaluate(e=>e.classList.contains('active')));
  ok('table untouched while composing', await rows('sheetbtnTable') === 26, await rows('sheetbtnTable'));
  await p.screenshot({ path: '/tmp/v7-sheet.png' });

  await p.click('#sheetbtnApplyBtn');
  await p.waitForTimeout(450);
  ok('Apply closes the sheet', !(await p.locator('#sheetbtnSheet').isVisible()));
  ok('Apply commits', await rows('sheetbtnTable') === 16, await rows('sheetbtnTable'));
  ok('chips bar now visible', await p.locator('#sheetbtnChips').isVisible());
  ok('badge visible on the button', await p.locator('#sheetbtnBadge').isVisible());
  ok('chip is not clickable as a control',
     await p.locator('#sheetbtnChips [data-field-trigger]').count() === 0);
  await p.screenshot({ path: '/tmp/v7-applied.png' });

  // overlay click closes without applying
  await p.click('#sheetbtnFiltersBtn');
  await p.waitForTimeout(350);
  await p.click('#sheetbtnOverlay', { position: { x: 100, y: 400 } });
  await p.waitForTimeout(400);
  ok('clicking the overlay closes the sheet', !(await p.locator('#sheetbtnSheet').isVisible()));
  ok('nothing changed', await rows('sheetbtnTable') === 16, await rows('sheetbtnTable'));

  await p.click('#sheetbtnChips [data-drop="platform"]');
  ok('chip removal applies immediately', await rows('sheetbtnTable') === 26, await rows('sheetbtnTable'));
  ok('chips bar hides when empty', !(await p.locator('#sheetbtnChips').isVisible()));

  console.log('\n— Regression: other variants still render —');
  for (const t of ['current','popular','chips','button','quick','rec']) {
    await p.click('.nav-tab[data-variant="'+t+'"]');
    ok(t+' section visible', await p.locator('#variant-'+t).isVisible());
  }
  ok('no page errors', errs.length===0, errs.join('; '));
  await b.close();
  console.log('\n'+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})();
