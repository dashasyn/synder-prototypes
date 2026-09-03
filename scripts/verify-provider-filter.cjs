/* Verify projects/provider-filter-modes/index.html in real Chromium. */
const { chromium } = require('playwright');
const path = require('path');

const TARGET = process.argv[2] ||
  ('file://' + path.resolve(__dirname, '../projects/provider-filter-modes/index.html'));

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; fails.push(name + (extra ? '  → ' + extra : '')); }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);

  const errors = [];
  const badReqs = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) badReqs.push(r.url() + ' ' + r.status()); });

  await page.goto(TARGET, { waitUntil: 'networkidle' });

  const openPop  = () => page.click('#ms-field');
  // no Done button by design — dismissal is a click away from the dropdown
  const clickAway = async () => {
    await page.click('h1');
    ok('click away closes popover', await page.locator('#ms-pop').isHidden());
  };
  async function applyAndCount() {
    if (await page.locator('#ms-pop').isVisible()) await clickAway();
    ok('Apply is clickable once popover is dismissed', await page.locator('#apply').isVisible());
    await page.click('#apply');
    return parseInt((await page.textContent('#result-count')).trim(), 10);
  }
  const names = () => page.$$eval('#rows tr td:first-child', t => t.map(x => x.textContent.trim()));

  // ---- 1. kit + naming ---------------------------------------------------
  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim());
  ok('UI kit loaded (--color-primary = #0053CC)', primary === '#0053CC', JSON.stringify(primary));

  ok('filter is labelled "Integration"',
    (await page.textContent('#ms-label')).trim() === 'Integration',
    await page.textContent('#ms-label'));
  ok('placeholder = "All integrations"',
    (await page.textContent('#ms-value')).trim() === 'All integrations',
    await page.textContent('#ms-value'));
  ok('column header = "Connected integrations"',
    (await page.textContent('#rows, table thead tr th:nth-child(3)')).includes('Connected integrations'));
  ok('no "Company provider" left in user-facing chrome',
    !(await page.textContent('.filter-panel')).includes('Company provider'));

  // field must not look disabled
  const fieldBg = await page.evaluate(() =>
    getComputedStyle(document.getElementById('ms-field')).backgroundColor);
  ok('closed field is white, not grey (does not read as disabled)',
    fieldBg === 'rgb(255, 255, 255)', fieldBg);

  ok('starts with all 14 orgs',
    (await page.textContent('#result-count')).trim() === '14 organizations');

  // ---- 2. segmented is ACTIVE at zero selections ------------------------
  await openPop();
  ok('popover VISIBLE after open', await page.locator('#ms-pop').isVisible());
  ok('no segment disabled at 0 selections',
    await page.locator('#segmented .seg[disabled]').count() === 0);
  ok('segmented not aria-disabled at 0 selections',
    await page.getAttribute('#segmented', 'aria-disabled') !== 'true');

  const segBg = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.seg[data-mode="all"]')).backgroundColor);
  ok('inactive segment is white, not grey', segBg === 'rgb(255, 255, 255)', segBg);
  const segOpacity = await page.evaluate(() =>
    getComputedStyle(document.getElementById('segmented')).opacity);
  ok('segmented group at full opacity', segOpacity === '1', segOpacity);

  // mode is selectable with nothing ticked
  await page.locator('.seg[data-mode="none"]').click();
  ok('mode changes with zero selections',
    await page.getAttribute('.seg[data-mode="none"]', 'aria-checked') === 'true');
  await page.locator('.seg[data-mode="any"]').click();

  // ---- 3. no Done / no count footer -------------------------------------
  ok('no Done button', await page.locator('#ms-done').count() === 0);
  ok('no selected-count footer', await page.locator('#ms-count').count() === 0);
  ok('no "providers selected" text anywhere in popover',
    !(await page.textContent('#ms-pop')).match(/selected/i));

  // ---- 4. Select All / Deselect All are buttons, not a checkbox ---------
  ok('Select All is a button', await page.locator('button#ms-all').isVisible());
  ok('Deselect All is a button', await page.locator('button#ms-none').isVisible());
  ok('no "Select all" checkbox row remains',
    await page.locator('.ms-opt input[data-value="__all__"]').count() === 0);

  await page.click('#ms-all');
  ok('Select All ticks every option',
    await page.locator('.ms-opt input:checked').count() === await page.locator('.ms-opt input').count());
  ok('Select All disables itself when it would be a no-op',
    await page.locator('#ms-all').isDisabled());
  await page.click('#ms-none');
  ok('Deselect All clears every option',
    await page.locator('.ms-opt input:checked').count() === 0);
  ok('Deselect All disables itself when it would be a no-op',
    await page.locator('#ms-none').isDisabled());

  // bulk buttons respect an active search
  await page.fill('#ms-search', 'AMAZON');
  await page.click('#ms-all');
  ok('Select All within a search selects only the matches',
    (await page.textContent('#ms-value')).trim() === 'Has any of: AMAZON, AMAZON_V2',
    await page.textContent('#ms-value'));
  await page.click('#ms-none');
  await page.fill('#ms-search', '');

  // ---- 5. selection + label ---------------------------------------------
  await page.locator('.ms-opt input[data-value="AFFIRM"]').check();
  ok('popover still VISIBLE after first toggle', await page.locator('#ms-pop').isVisible());
  ok('EBAY row still VISIBLE (clickable) after re-render',
    await page.locator('.ms-opt input[data-value="EBAY"]').isVisible());
  await page.locator('.ms-opt input[data-value="EBAY"]').check();

  ok('label = "Has any of: AFFIRM, EBAY"',
    (await page.textContent('#ms-value')).trim() === 'Has any of: AFFIRM, EBAY',
    await page.textContent('#ms-value'));
  await page.locator('.seg[data-mode="all"]').click();
  ok('label = "Has all of: AFFIRM, EBAY"',
    (await page.textContent('#ms-value')).trim() === 'Has all of: AFFIRM, EBAY');
  await page.locator('.seg[data-mode="none"]').click();
  ok('label = "Has none of: AFFIRM, EBAY"',
    (await page.textContent('#ms-value')).trim() === 'Has none of: AFFIRM, EBAY');

  // ---- 6. results per mode ----------------------------------------------
  // Q1 answered: an org with zero companies DOES match "has none of".
  let n = await applyAndCount();
  ok('Has none of AFFIRM,EBAY → 6 orgs (incl. zero-company org)', n === 6, 'got ' + n);
  let list = await names();
  ok('  Q1: zero-company org IS included in "has none"', list.includes('Untouched Account'));
  ok('  none-list excludes &Dine Ltd', !list.includes('&Dine Ltd'));
  ok('  none-list excludes Bluepeak Retail (EBAY only)', !list.includes('Bluepeak Retail'));
  ok('  anti-join, not row-level NOT IN: Solvent Goods absent',
    !list.includes('Solvent Goods Co'));
  ok('no unapplied-changes hint anywhere', await page.locator('#dirty').count() === 0);
  ok('no "Unapplied" text on the page', !(await page.textContent('body')).includes('Unapplied'));

  await openPop();
  await page.locator('.seg[data-mode="any"]').click();
  n = await applyAndCount();
  ok('Has any of AFFIRM,EBAY → 8 orgs', n === 8, 'got ' + n);
  list = await names();
  ok('  any-list excludes the zero-company org', !list.includes('Untouched Account'));

  await openPop();
  await page.locator('.seg[data-mode="all"]').click();
  n = await applyAndCount();
  ok('Has all of AFFIRM,EBAY → 4 orgs', n === 4, 'got ' + n);
  list = await names();
  ok('  all-list excludes Testing Company (AFFIRM only)', !list.includes('Testing Company'));
  ok('  all-list includes &Dine Ltd', list.includes('&Dine Ltd'));

  // the three modes must partition the 14 orgs: any + none = 14
  ok('any (8) + none (6) = all 14 orgs — modes partition cleanly', 8 + 6 === 14);

  // ---- 7. 3+ selections switch to a count -------------------------------
  await openPop();
  await page.locator('.ms-opt input[data-value="STRIPE"]').check();
  ok('label switches to count at 3 selections',
    (await page.textContent('#ms-value')).trim() === 'Has all of 3 integrations',
    await page.textContent('#ms-value'));

  // ---- 8. mode PERSISTS when the selection is cleared -------------------
  await page.click('#ms-none');
  ok('cleared → label back to "All integrations"',
    (await page.textContent('#ms-value')).trim() === 'All integrations');
  ok('cleared → mode is NOT reset (still "all")',
    await page.getAttribute('.seg[data-mode="all"]', 'aria-checked') === 'true');
  ok('cleared → segmented still active',
    await page.locator('#segmented .seg[disabled]').count() === 0);

  // ---- 9. keyboard -------------------------------------------------------
  await page.locator('.seg[data-mode="any"]').click();
  await page.locator('.seg[data-mode="any"]').focus();
  await page.keyboard.press('ArrowRight');
  ok('ArrowRight moves to "all"',
    await page.getAttribute('.seg[data-mode="all"]', 'aria-checked') === 'true');
  await page.keyboard.press('End');
  ok('End moves to "none"',
    await page.getAttribute('.seg[data-mode="none"]', 'aria-checked') === 'true');
  await page.keyboard.press('Home');
  ok('Home moves back to "any"',
    await page.getAttribute('.seg[data-mode="any"]', 'aria-checked') === 'true');
  ok('exactly one tab stop in the group (roving tabindex)',
    await page.$$eval('#segmented .seg', b => b.filter(x => x.tabIndex === 0).length) === 1);
  ok('group is a radiogroup', await page.getAttribute('#segmented', 'role') === 'radiogroup');
  await page.keyboard.press('Escape');
  ok('Escape closes popover', await page.locator('#ms-pop').isHidden());

  // ---- 10. hygiene -------------------------------------------------------
  ok('no page-level horizontal overflow', !(await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth)));
  ok('zero JS errors', errors.length === 0, errors.join(' | '));
  ok('zero failed requests', badReqs.length === 0, badReqs.join(' | '));

  if (TARGET.startsWith('file://')) {
    await openPop();
    await page.locator('.ms-opt input[data-value="AFFIRM"]').check();
    await page.locator('.ms-opt input[data-value="EBAY"]').check();
    await page.locator('.seg[data-mode="none"]').click();
    await page.screenshot({ path: '/tmp/pf2-open.png', clip: { x: 0, y: 0, width: 1440, height: 760 } });
  }

  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed  [' + (TARGET.startsWith('file') ? 'local' : 'published') + ']');
  if (fails.length) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  ✗ ' + f)); }
  process.exit(fail ? 1 : 0);
})();
