// Verify the "New reconciliation" setup prototype in real Chromium.
// Rule from AGENTS.md: assert isVisible()/clickability, never element state alone.
const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.resolve('projects/recon-setup/index.html');
let pass = 0, fail = 0;
const errs = [];
const ok = (n, c) => c ? (pass++, console.log('  ✓ ' + n)) : (fail++, console.log('  ✗ ' + n));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL);

  const text = () => page.locator('body').innerText();

  console.log('\nDefault state (Stripe — fully automatic)');
  ok('three groups visible', await page.locator('.grp').count() === 3);
  ok('integration prefilled to Stripe', await page.locator('#f-int').inputValue() === 'stripe-mzkt');
  ok('account prefilled', (await page.locator('#f-acc').inputValue()).includes('Stripe mzkt.by'));
  ok('period prefilled to August', await page.locator('#f-per').inputValue() === 'aug');
  ok('no "Select..." placeholder anywhere', !(await text()).includes('Select...'));
  ok('all-automatic line visible', await page.locator('#allauto').isVisible());
  ok('no source blocks when fully automatic', await page.locator('.src').count() === 0);
  ok('no upload areas when fully automatic', await page.locator('.drop').count() === 0);
  ok('run enabled', await page.locator('#run').isEnabled());
  ok('custom date inputs hidden', !(await page.locator('#dates').isVisible()));
  await page.screenshot({ path: '/tmp/synder/b2-default.png' });

  console.log('\nNon-clearing account is called out, not silently accepted');
  await page.selectOption('#f-acc', 'Stripe fees');
  ok('warning replaces the clearing-account hint',
    (await page.locator('#h-acc').innerText()).includes("can\u2019t tell Synder which one"));
  ok('warning is visible', await page.locator('#h-acc').isVisible());
  ok('account select still usable', await page.locator('#f-acc').isEnabled());
  await page.selectOption('#f-acc', 'Stripe mzkt.by (required for Synder)');
  ok('clearing-account hint restored',
    (await page.locator('#h-acc').innerText()).includes('clearing account linked'));

  console.log('\nCustom range reveals from/to inputs');
  await page.selectOption('#f-per', 'custom');
  ok('date inputs visible', await page.locator('#dates').isVisible());
  ok('start date clickable', await page.locator('#d-from').isVisible() && await page.locator('#d-from').isEnabled());
  ok('end date clickable', await page.locator('#d-to').isVisible() && await page.locator('#d-to').isEnabled());
  ok('period default-hint dropped', (await page.locator('#h-per').innerText()).trim() === '');
  await page.selectOption('#f-per', 'jul');
  ok('date inputs hidden again for a preset', !(await page.locator('#dates').isVisible()));
  ok('preset updated the underlying dates', await page.locator('#d-from').inputValue() === '2026-07-01');
  await page.selectOption('#f-per', 'aug');
  ok('period default-hint restored', (await page.locator('#h-per').innerText()).includes('last full month'));

  console.log('\nPayPal — no automatic retrieval offered');
  await page.selectOption('#f-int', 'paypal');
  const methodSelects = page.locator('.src select[data-side]');
  ok('two source blocks appear', await page.locator('.src').count() === 2);
  ok('both method selects visible',
    await methodSelects.nth(0).isVisible() && await methodSelects.nth(1).isVisible());
  const intOpts = await methodSelects.nth(1).locator('option').allInnerTexts();
  ok('integration offers only Assisted/Manual — Automated absent',
    !intOpts.some(o => /Automated/.test(o)) && intOpts.length === 2);
  const bookOpts = await methodSelects.nth(0).locator('option').allInnerTexts();
  ok('books side still offers Automated (2 options, no Assisted)',
    bookOpts.length === 2 && bookOpts.some(o => /Automated/.test(o)) && !bookOpts.some(o => /Assisted/.test(o)));
  ok('explains why there is no automatic option', await page.locator('.noauto').isVisible());
  ok('integration default-hint dropped', (await page.locator('#h-int').innerText()).trim() === '');

  console.log('\nAssisted — one drop area per named file, each with instructions');
  ok('two upload areas for PayPal Assisted', await page.locator('.drop').count() === 2);
  ok('required-file count stated', (await page.locator('#reqsum').innerText()).includes('2 files'));
  ok('run blocked until files provided', !(await page.locator('#run').isEnabled()));
  ok('disabled run explains itself', (await page.locator('#blocked').innerText()).includes('Add 2 files'));
  const names = await page.locator('.need .nn').allInnerTexts();
  ok('files are named, not generic', names.some(n => /Activity download/.test(n)) && names.some(n => /Settlement report/.test(n)));
  ok('every file has a how-to link', await page.locator('[data-steps]').count() === 2);

  const firstSteps = page.locator('[data-steps]').first();
  await firstSteps.click();
  ok('instructions visible after click', await page.locator('.steps.on').first().isVisible());
  ok('instructions have numbered steps', await page.locator('.steps.on li').count() === 5);
  ok('how-to link still clickable after opening', await firstSteps.isVisible() && await firstSteps.isEnabled());
  await firstSteps.click();
  ok('instructions hidden after second click', await page.locator('.steps.on').count() === 0);
  ok('how-to link survives two toggles', await firstSteps.isVisible());
  await page.screenshot({ path: '/tmp/synder/b2-paypal-assisted.png', fullPage: true });

  console.log('\nAttaching files unblocks Run');
  await page.locator('[data-pick]').first().click();
  ok('one file chip visible', await page.locator('.chip').count() === 1);
  ok('one drop area left', await page.locator('.drop').count() === 1);
  ok('run still blocked with one file missing', !(await page.locator('#run').isEnabled()));
  await page.locator('[data-pick]').first().click();
  ok('both files attached', await page.locator('.chip').count() === 2);
  ok('run now enabled', await page.locator('#run').isEnabled());
  ok('explanation cleared once runnable', (await page.locator('#blocked').innerText()).trim() === '');
  ok('remove link clickable', await page.locator('[data-rm]').first().isVisible());
  await page.locator('[data-rm]').first().click();
  ok('removing a file re-blocks run', !(await page.locator('#run').isEnabled()));
  ok('drop area returns after remove', await page.locator('.drop').count() === 1);

  console.log('\nOpt-in: fully automatic still lets you reach the controls');
  await page.selectOption('#f-int', 'stripe-mzkt');
  ok('collapsed back to one line for Stripe', await page.locator('#allauto').isVisible());
  ok('opt-in link visible and clickable',
    await page.locator('#opt-in').isVisible() && await page.locator('#opt-in').isEnabled());
  await page.locator('#opt-in').click();
  ok('source blocks revealed by opt-in', await page.locator('.src').count() === 2);
  ok('books method select now reachable', await page.locator('.src select[data-side="books"]').isVisible());
  ok('integration method select now reachable', await page.locator('.src select[data-side="integration"]').isVisible());
  ok('run still enabled — nothing required yet', await page.locator('#run').isEnabled());

  console.log('\nBooks side switched to Manual adds its own file');
  await page.selectOption('.src select[data-side="books"]', 'Manual');
  ok('books Manual adds an upload', await page.locator('.drop').count() >= 1);
  const booksNames = await page.locator('.src').first().locator('.need .nn').allInnerTexts();
  ok('books file is named', booksNames.some(n => /General ledger/.test(n)));
  ok('books side select still visible after change',
    await page.locator('.src select[data-side="books"]').isVisible());

  console.log('\nWorst case: books Manual + integration Assisted = 3 files');
  await page.selectOption('.src select[data-side="integration"]', 'Assisted');
  ok('three upload areas', await page.locator('.drop').count() === 3);
  ok('count says 3 files', (await page.locator('#reqsum').innerText()).includes('3 files'));
  ok('all three drop areas visible', await page.locator('.drop').first().isVisible()
    && await page.locator('.drop').nth(1).isVisible() && await page.locator('.drop').nth(2).isVisible());
  await page.screenshot({ path: '/tmp/synder/b2-worst-case.png', fullPage: true });

  console.log('\nBack to automatic on both sides clears the uploads');
  await page.selectOption('.src select[data-side="integration"]', 'Automated');
  await page.selectOption('.src select[data-side="books"]', 'Automated');
  ok('no upload areas left', await page.locator('.drop').count() === 0);
  ok('required-file count cleared', (await page.locator('#reqsum').innerText()).trim() === '');
  ok('controls stay visible once opted in', await page.locator('.src').count() === 2);
  ok('run enabled again', await page.locator('#run').isEnabled());

  console.log('\nRun');
  await page.locator('#run').click();
  ok('running block visible', await page.locator('#running').isVisible());
  ok('run disabled after click', !(await page.locator('#run').isEnabled()));

  console.log('\nShared / regression');
  await page.goto(URL);
  const t = await text();
  ok('no "Start matching"', !t.includes('Start matching'));
  ok('no "Run audit"', !t.includes('Run audit'));
  ok('no "Reconciliation details"', !t.includes('Reconciliation details'));
  ok('no "Automation mode" (renamed to Import method in prod)', !t.includes('Automation mode'));
  ok('no footer bleed', !t.includes('All Rights Reserved'));
  ok('no nested buttons', await page.evaluate(() => !document.querySelector('button button')));
  const kit = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim());
  ok('UI kit loaded (--color-primary=' + kit + ')', kit.toLowerCase() === '#0053cc');
  ok('no horizontal overflow',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  console.log(errs.length ? 'PAGE ERRORS:\n  ' + errs.join('\n  ') : 'zero page errors');
  process.exit(fail || errs.length ? 1 : 0);
})();
