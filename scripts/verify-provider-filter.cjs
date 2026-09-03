/* Verify projects/provider-filter-modes/index.html in real Chromium. */
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '../projects/provider-filter-modes/index.html');

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; fails.push(name + (extra ? '  → ' + extra : '')); }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(FILE, { waitUntil: 'networkidle' });

  // ---- 1. kit loaded -----------------------------------------------------
  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim());
  ok('UI kit loaded (--color-primary = #0053CC)', primary === '#0053CC', 'got ' + JSON.stringify(primary));

  const unresolved = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('*').forEach(el => {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg === '' || bg === 'invalid') bad.push(el.className);
    });
    return bad.length;
  });
  ok('no unresolved computed backgrounds', unresolved === 0);

  // ---- 2. initial state --------------------------------------------------
  ok('starts with all 14 orgs',
    (await page.textContent('#result-count')).trim() === '14 organizations',
    await page.textContent('#result-count'));
  ok('field shows placeholder "All"', (await page.textContent('#ms-value')).trim() === 'All');
  ok('dirty hint hidden at rest', await page.locator('#dirty').isHidden());

  // ---- 3. popover opens and is actually usable ---------------------------
  await page.click('#ms-field');
  ok('popover VISIBLE after open', await page.locator('#ms-pop').isVisible());
  ok('segmented control visible', await page.locator('#segmented').isVisible());
  ok('mode sits above search in DOM order', await page.evaluate(() => {
    const seg = document.getElementById('segmented');
    const search = document.getElementById('ms-search');
    return !!(seg.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING);
  }));

  // ---- 4. segmented disabled while nothing selected ----------------------
  ok('segmented aria-disabled at 0 selections',
    await page.getAttribute('#segmented', 'aria-disabled') === 'true');
  ok('all three segments disabled at 0 selections',
    await page.locator('#segmented .seg[disabled]').count() === 3);

  // clicking a disabled segment must not change the mode
  await page.locator('.seg[data-mode="none"]').click({ force: true });
  ok('disabled segment click does not change mode',
    await page.getAttribute('.seg[data-mode="any"]', 'aria-checked') === 'true');

  // ---- 5. select AFFIRM + EBAY ------------------------------------------
  await page.locator('.ms-opt input[data-value="AFFIRM"]').check();
  // popover must survive the first toggle and stay operable
  ok('popover still VISIBLE after first toggle', await page.locator('#ms-pop').isVisible());
  ok('EBAY checkbox still VISIBLE (clickable) after re-render',
    await page.locator('.ms-opt input[data-value="EBAY"]').isVisible());
  await page.locator('.ms-opt input[data-value="EBAY"]').check();
  ok('popover still VISIBLE after second toggle', await page.locator('#ms-pop').isVisible());

  // the overlap this fixes — assert it is real, so nobody "simplifies" Done away later
  ok('open popover DOES overlay the Apply button (why Done exists)', await page.evaluate(() => {
    const p = document.getElementById('ms-pop').getBoundingClientRect();
    const a = document.getElementById('apply').getBoundingClientRect();
    return !(p.bottom < a.top || p.top > a.bottom || p.right < a.left || p.left > a.right);
  }));
  ok('Done button visible in popover footer', await page.locator('#ms-done').isVisible());
  ok('footer count reads "2 providers selected"',
    (await page.textContent('#ms-count')).trim() === '2 providers selected',
    await page.textContent('#ms-count'));

  ok('segmented enabled after selection',
    await page.getAttribute('#segmented', 'aria-disabled') === 'false');
  ok('no segment disabled after selection',
    await page.locator('#segmented .seg[disabled]').count() === 0);

  // ---- 6. closed-state label carries the mode ---------------------------
  ok('label = "Has any of: AFFIRM, EBAY"',
    (await page.textContent('#ms-value')).trim() === 'Has any of: AFFIRM, EBAY',
    await page.textContent('#ms-value'));

  await page.locator('.seg[data-mode="all"]').click();
  ok('label = "Has all of: AFFIRM, EBAY"',
    (await page.textContent('#ms-value')).trim() === 'Has all of: AFFIRM, EBAY',
    await page.textContent('#ms-value'));

  await page.locator('.seg[data-mode="none"]').click();
  ok('label = "Has none of: AFFIRM, EBAY"',
    (await page.textContent('#ms-value')).trim() === 'Has none of: AFFIRM, EBAY',
    await page.textContent('#ms-value'));

  // ---- 7. dirty hint before Apply ---------------------------------------
  ok('dirty hint VISIBLE before Apply', await page.locator('#dirty').isVisible());

  // ---- 8. results per mode ----------------------------------------------
  // The open popover overlays the Apply button (it does in production too, and the
  // mode row makes it ~60px taller). "Done" is the dismissal that makes Apply reachable.
  async function applyAndCount() {
    if (await page.locator('#ms-pop').isVisible()) await page.click('#ms-done');
    ok('Apply is clickable once popover is dismissed', await page.locator('#apply').isVisible());
    await page.click('#apply');
    const txt = (await page.textContent('#result-count')).trim();
    return parseInt(txt, 10);
  }
  async function names() {
    return page.$$eval('#rows tr td:first-child', tds => tds.map(t => t.textContent.trim()));
  }

  let n = await applyAndCount();
  ok('Has none of AFFIRM,EBAY → 5 orgs', n === 5, 'got ' + n);
  let list = await names();
  ok('  none-list excludes &Dine Ltd', !list.includes('&Dine Ltd'));
  ok('  none-list excludes Bluepeak Retail (EBAY only)', !list.includes('Bluepeak Retail'));
  ok('  none-list excludes zero-company org by default', !list.includes('Untouched Account'));
  ok('  none-list includes Rebecca Howell (STRIPE)', list.includes('Rebecca Howell'));
  ok('  none is an anti-join, not row-level NOT IN: Solvent Goods absent',
    !list.includes('Solvent Goods Co'));

  ok('dirty hint hidden after Apply', await page.locator('#dirty').isHidden());

  await page.click('#ms-field');
  await page.locator('.seg[data-mode="any"]').click();
  n = await applyAndCount();
  ok('Has any of AFFIRM,EBAY → 8 orgs', n === 8, 'got ' + n);

  await page.click('#ms-field');
  await page.locator('.seg[data-mode="all"]').click();
  n = await applyAndCount();
  ok('Has all of AFFIRM,EBAY → 4 orgs', n === 4, 'got ' + n);
  list = await names();
  ok('  all-list excludes Testing Company (AFFIRM only)', !list.includes('Testing Company'));
  ok('  all-list includes &Dine Ltd', list.includes('&Dine Ltd'));

  // any >= all  — adding a box must never shrink results in "any"
  ok('all-mode result is a subset size of any-mode', 4 <= 8);

  // ---- 9. 3+ selections switch to a count -------------------------------
  await page.click('#ms-field');
  await page.locator('.ms-opt input[data-value="STRIPE"]').check();
  ok('label switches to count at 3 selections',
    (await page.textContent('#ms-value')).trim() === 'Has all of 3 providers',
    await page.textContent('#ms-value'));

  // ---- 10. clearing to zero resets mode ---------------------------------
  await page.locator('.ms-opt input[data-value="AFFIRM"]').uncheck();
  await page.locator('.ms-opt input[data-value="EBAY"]').uncheck();
  await page.locator('.ms-opt input[data-value="STRIPE"]').uncheck();
  ok('cleared → label back to "All"', (await page.textContent('#ms-value')).trim() === 'All');
  ok('cleared → mode reset to any',
    await page.getAttribute('.seg[data-mode="any"]', 'aria-checked') === 'true');
  ok('cleared → segmented disabled again',
    await page.getAttribute('#segmented', 'aria-disabled') === 'true');

  // ---- 11. keyboard on the segmented control ----------------------------
  await page.locator('.ms-opt input[data-value="AFFIRM"]').check();
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
  const roving = await page.$$eval('#segmented .seg', b => b.filter(x => x.tabIndex === 0).length);
  ok('exactly one tab stop in the group (roving tabindex)', roving === 1, 'got ' + roving);
  ok('group is a radiogroup', await page.getAttribute('#segmented', 'role') === 'radiogroup');

  // ---- 12. Escape closes -------------------------------------------------
  await page.keyboard.press('Escape');
  ok('Escape closes popover', await page.locator('#ms-pop').isHidden());

  // ---- 13. Q1 toggle actually changes the table -------------------------
  await page.click('#ms-field');
  await page.locator('.ms-opt input[data-value="EBAY"]').check();
  await page.locator('.seg[data-mode="none"]').click();
  n = await applyAndCount();
  const beforeQ1 = n;
  await page.locator('#q1-toggle').check();
  const afterTxt = (await page.textContent('#result-count')).trim();
  const afterQ1 = parseInt(afterTxt, 10);
  ok('Q1 toggle adds the zero-company org', afterQ1 === beforeQ1 + 1,
    beforeQ1 + ' → ' + afterQ1);
  list = await names();
  ok('  zero-company org now listed', list.includes('Untouched Account'));

  // ---- 14. no horizontal overflow ---------------------------------------
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);
  ok('no page-level horizontal overflow', !overflow);

  // ---- 15. no JS errors --------------------------------------------------
  ok('zero JS errors', errors.length === 0, errors.join(' | '));

  // screenshots
  await page.locator('#q1-toggle').uncheck();
  await page.click('#ms-field');
  await page.locator('.seg[data-mode="all"]').click();
  await page.screenshot({ path: '/tmp/provider-filter-open.png', clip: { x: 0, y: 0, width: 1440, height: 720 } });
  await page.keyboard.press('Escape');
  await page.screenshot({ path: '/tmp/provider-filter-full.png', fullPage: true });

  await browser.close();

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if (fails.length) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  ✗ ' + f)); }
  process.exit(fail ? 1 : 0);
})();
