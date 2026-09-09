// Verify the three reconciliation-setup variants in real Chromium.
// Rule from AGENTS.md: assert isVisible()/clickability, never element state.
const { chromium } = require('playwright');
const path = require('path');

const DIR = 'file://' + path.resolve('projects/recon-setup');
let pass = 0, fail = 0;
const errs = [];

function ok(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name); }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  // ---------------- A ----------------
  console.log('\nA. One line');
  await page.goto(DIR + '/a.html');
  ok('sentence visible', await page.locator('#sentence').isVisible());
  ok('sentence names integration + period',
    /Reconcile\s+mzkt\.by \(Stripe\)\s+for\s+August 2026/.test(
      (await page.locator('#sentence').innerText()).replace(/\s+/g, ' ')));
  ok('run button visible and enabled',
    await page.locator('#run').isVisible() && await page.locator('#run').isEnabled());
  ok('read-only promise visible', await page.locator('.safe').first().isVisible());
  ok('editor hidden before toggle', !(await page.locator('#editor').isVisible()));
  ok('no field is unset (no "Select..." anywhere)',
    !(await page.locator('body').innerText()).includes('Select...'));

  await page.locator('#toggle').click();
  ok('editor visible after toggle', await page.locator('#editor').isVisible());
  for (const id of ['#f-int', '#f-acc', '#f-per']) {
    ok('field clickable: ' + id, await page.locator(id).isVisible() && await page.locator(id).isEnabled());
  }
  // summary must restate itself, and the field must stay usable afterwards
  await page.selectOption('#f-per', 'July 2026 (Jul 1 – 31)');
  ok('summary period updated', (await page.locator('#s-per').innerText()).trim() === 'July 2026');
  ok('summary dates updated', (await page.locator('#s-dates').innerText()).includes('Jul 1'));
  ok('period select still visible after change', await page.locator('#f-per').isVisible());

  await page.locator('#toggle').click();
  ok('editor hidden again', !(await page.locator('#editor').isVisible()));
  ok('toggle still clickable after 2 toggles', await page.locator('#toggle').isVisible());

  await page.locator('#run').click();
  ok('running block visible', await page.locator('#running').isVisible());
  ok('run disabled after click', !(await page.locator('#run').isEnabled()));
  await page.screenshot({ path: '/tmp/synder/setup-a.png', fullPage: true });

  // ---------------- B ----------------
  console.log('\nB. One column');
  await page.goto(DIR + '/b.html');
  ok('three groups visible', await page.locator('.grp').count() === 3);
  ok('no "Select..." placeholder',
    !(await page.locator('body').innerText()).includes('Select...'));
  ok('only one data question (no duplicate label)',
    (await page.locator('body').innerText()).split('Automation mode').length - 1 === 0);
  ok('auto-fetch line visible', await page.locator('#auto').isVisible());
  ok('dropzone hidden by default', !(await page.locator('#drop').isVisible()));
  ok('run enabled by default', await page.locator('#run').isEnabled());

  // manual path: link -> dropzone -> file chip, each step must stay usable
  await page.locator('#manual').click();
  ok('dropzone visible after "upload myself"', await page.locator('#drop').isVisible());
  ok('choose-file clickable', await page.locator('#pick').isVisible() && await page.locator('#pick').isEnabled());
  await page.locator('#pick').click();
  ok('file chip visible', await page.locator('#file').isVisible());
  ok('remove link clickable', await page.locator('#rmfile').isVisible() && await page.locator('#rmfile').isEnabled());

  // Shopify + Xero must become a named required upload and block Run
  await page.selectOption('#f-int', 'My store (Shopify)');
  ok('auto line hidden for Shopify', !(await page.locator('#auto').isVisible()));
  ok('required upload visible for Shopify', await page.locator('#drop').isVisible());
  ok('upload names the file', (await page.locator('#need').innerText()).includes('payouts'));
  ok('run blocked until file provided', !(await page.locator('#run').isEnabled()));
  ok('integration select still visible after change', await page.locator('#f-int').isVisible());
  await page.locator('#pick').click();
  ok('run unblocked after file', await page.locator('#run').isEnabled());

  await page.selectOption('#f-int', 'mzkt.by (Stripe)');
  ok('back to auto for Stripe', await page.locator('#auto').isVisible());
  await page.locator('#run').click();
  ok('running block visible', await page.locator('#running').isVisible());
  await page.screenshot({ path: '/tmp/synder/setup-b.png', fullPage: true });

  // ---------------- C ----------------
  console.log('\nC. No form');
  await page.goto(DIR + '/c.html');
  ok('four account rows visible', await page.locator('#rows .row').count() === 4);
  for (let i = 0; i < 4; i++) {
    ok('row ' + (i + 1) + ' visible', await page.locator('#rows .row').nth(i).isVisible());
  }
  // 2 unrun + 1 waiting on a file = 3 unchecked; the checked row is excluded
  ok('summary counts unchecked (3 of 4)', (await page.locator('#sum').innerText()).includes('3 of 4'));
  ok('first row Run clickable',
    await page.locator('#rows .row').nth(0).locator('[data-run]').isVisible());
  ok('period control visible', await page.locator('#f-per').isVisible());
  ok('no nested buttons',
    await page.evaluate(() => !document.querySelector('button button')));

  await page.locator('#rows .row').nth(0).locator('[data-run]').click();
  ok('row 1 shows In progress', (await page.locator('#rows .row').nth(0).innerText()).includes('In progress'));
  ok('row 1 still visible after run', await page.locator('#rows .row').nth(0).isVisible());
  ok('summary recounted to 2 of 4', (await page.locator('#sum').innerText()).includes('2 of 4'));
  ok('row 2 Run still clickable',
    await page.locator('#rows .row').nth(1).locator('[data-run]').isEnabled());
  await page.screenshot({ path: '/tmp/synder/setup-c.png', fullPage: true });

  // ---------------- index ----------------
  console.log('\nIndex');
  await page.goto(DIR + '/index.html');
  ok('three variant cards visible', await page.locator('.v').count() === 3);
  for (const l of ['./a.html', './b.html', './c.html']) {
    ok('link visible: ' + l, await page.locator('a[href="' + l + '"]').isVisible());
  }

  // ---------------- shared checks ----------------
  console.log('\nShared');
  for (const f of ['a.html', 'b.html', 'c.html']) {
    await page.goto(DIR + '/' + f);
    const txt = await page.locator('body').innerText();
    ok(f + ': no "Start matching"', !txt.includes('Start matching'));
    ok(f + ': no "Run audit"', !txt.includes('Run audit'));
    ok(f + ': no "Reconciliation details"', !txt.includes('Reconciliation details'));
    ok(f + ': no footer bleed', !txt.includes('All Rights Reserved'));
    const kit = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim());
    ok(f + ': UI kit loaded (--color-primary=' + kit + ')', kit.toLowerCase() === '#0053cc');
  }

  await browser.close();

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if (errs.length) { console.log('PAGE ERRORS:'); errs.forEach(e => console.log('  ' + e)); }
  else console.log('zero page errors');
  process.exit(fail || errs.length ? 1 : 0);
})();
