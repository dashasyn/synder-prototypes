/* Screenshot the transactions prototype in a fixed set of states.
   Usage: node scripts/txn-shots.cjs <outDir> [pathToIndexHtml]
   Used as a before/after harness for the UI-kit adoption. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outDir = process.argv[2] || '/tmp/txn-shots';
const file = process.argv[3] || path.resolve(__dirname, '../reports/transactions-prototype/index.html');
const URL = 'file://' + file;

fs.mkdirSync(outDir, { recursive: true });

const errs = [];

async function shot(page, name) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, name + '.png'), fullPage: true });
  console.log('  · ' + name);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + String(e)));
  page.on('requestfailed', r => errs.push('requestfailed: ' + r.url()));

  await page.goto(URL);
  await page.waitForTimeout(500);

  await shot(page, '01-dashboard');

  await page.evaluate(() => showPage('list'));
  await shot(page, '02-list');

  // selection → bulk toolbar
  await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('tbody input[type=checkbox]')].slice(0, 3);
    boxes.forEach(b => b.click());
  });
  await shot(page, '03-selection');

  await page.evaluate(() => { if (window.clearSelection) clearSelection(); });

  // an open filter panel
  await page.evaluate(() => {
    const chip = document.querySelector('[data-field-trigger], .chip, .filter-chip');
    if (chip) chip.click();
  });
  await shot(page, '04-panel-open');
  await page.keyboard.press('Escape');

  // empty state via a search that matches nothing
  await page.evaluate(() => {
    const s = document.querySelector('input[type=search], #search, .search-input, input[placeholder*="earch"]');
    if (s) { s.value = 'zzzzqqq'; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
  });
  await shot(page, '05-empty');
  await page.evaluate(() => { if (window.clearSearch) clearSearch(); });

  // confirm dialog
  await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('tbody input[type=checkbox]')].slice(0, 2);
    boxes.forEach(b => b.click());
    if (window.bulkRollback) bulkRollback();
  });
  await shot(page, '06-confirm');

  // variant 2 / V7 filter sheet
  await page.goto(URL);
  await page.waitForTimeout(400);
  await page.evaluate(() => { if (window.setSyncVariant) setSyncVariant(2); });
  await page.evaluate(() => showPage('list'));
  await page.waitForTimeout(200);
  await page.evaluate(() => { if (window.openV7Sheet) openV7Sheet(); });
  await shot(page, '07-v7-sheet');

  // token resolution + unresolved var() audit
  const audit = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const out = { primary: cs.getPropertyValue('--color-primary').trim(), unresolved: [] };
    // any element whose computed colour is empty because a var() failed
    for (const el of document.querySelectorAll('*')) {
      const s = getComputedStyle(el);
      for (const prop of ['color', 'background-color', 'border-top-color']) {
        const v = s.getPropertyValue(prop);
        if (v === '' || v === 'invalid') out.unresolved.push(el.className + ' / ' + prop);
      }
    }
    return out;
  });

  await browser.close();

  console.log('\n--color-primary resolves to: ' + (audit.primary || '(unset)'));
  console.log('unresolved var() sites: ' + audit.unresolved.length);
  if (errs.length) { console.log('\nPAGE ERRORS (' + errs.length + '):'); errs.forEach(e => console.log('  ! ' + e)); }
  else console.log('page errors: 0');
})();
