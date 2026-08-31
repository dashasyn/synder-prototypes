/* Verify the UI-kit adoption on the transactions prototype in real Chromium,
   and re-verify the round-1 Critical/High fixes still hold after the restyle.
   Liveness is asserted with isVisible()/clickability, not element state —
   isChecked() passes fine inside a closed panel. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FILE = path.resolve(__dirname, '../reports/transactions-prototype/index.html');
const URL = 'file://' + FILE;
const KIT = path.resolve(__dirname, '../ui-kit/synder-ui-kit.css');

let pass = 0, fail = 0;
const errs = [];
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + x : '')); } };

const BRAND_OK = new Set(['#6772e5', '#96bf48', '#635bff', '#2ca01c']);

(async () => {
  /* ---- static source checks ---------------------------------------------- */
  const html = fs.readFileSync(FILE, 'utf8');
  const s = html.indexOf('<style>'), e = html.indexOf('</style>', s);
  const css = html.slice(s, e);

  ok('kit is linked, relative path', html.includes('<link rel="stylesheet" href="../../ui-kit/synder-ui-kit.css">'));
  ok('kit file exists at that path', fs.existsSync(KIT));

  const rawInCss = [...css.matchAll(/#[0-9A-Fa-f]{3,6}\b/g)].map(m => m[0].toLowerCase());
  const offending = rawInCss.filter(h => !BRAND_OK.has(h));
  ok('no raw hex in the stylesheet except brand colours', offending.length === 0, offending.join(' '));

  const inlineRaw = [...html.matchAll(/style="([^"]*#[0-9A-Fa-f]{3,6}[^"]*)"/g)]
    .map(m => m[1])
    .filter(d => [...d.matchAll(/#[0-9A-Fa-f]{3,6}\b/g)].some(h => !BRAND_OK.has(h[0].toLowerCase())));
  ok('no raw hex in style="" attributes except brand colours', inlineRaw.length === 0, inlineRaw.slice(0, 3).join(' | '));

  const kitNames = new Set([...fs.readFileSync(KIT, 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1]));
  const declared = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1]));
  const shadowed = [...declared].filter(d => kitNames.has(d));
  ok('no kit token is shadowed by a local declaration', shadowed.length === 0, shadowed.join(' '));

  const controlMisuse = [...css.matchAll(/(?:border|background)[a-z-]*\s*:[^;{}]*var\(--control-(?:track|thumb-off)\)/g)];
  ok('no Toggle control tokens used as borders or backgrounds', controlMisuse.length === 0, controlMisuse.length + ' sites');
  ok('no GSP/.sds-* tokens in a React/MUI prototype', !/var\(--sds-/.test(css));

  /* ---- live browser checks ----------------------------------------------- */
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', ex => errs.push('pageerror: ' + String(ex)));
  page.on('requestfailed', r => errs.push('requestfailed: ' + r.url()));
  await page.goto(URL);
  await page.waitForTimeout(500);

  const tok = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      primary: cs.getPropertyValue('--color-primary').trim(),
      grey20: cs.getPropertyValue('--color-grey-20').trim(),
      sidebarW: cs.getPropertyValue('--sidebar-width').trim(),
      bodyFont: getComputedStyle(document.body).fontFamily,
      bodyBg: getComputedStyle(document.body).backgroundColor,
    };
  });
  ok('kit stylesheet actually applied (--color-primary)', tok.primary === '#0053CC', tok.primary || '(unset)');
  ok('kit grey scale available (--color-grey-20)', tok.grey20 === '#DFE4EC', tok.grey20 || '(unset)');
  ok('body font resolves to Roboto', /Roboto/.test(tok.bodyFont), tok.bodyFont);

  const shell = await page.evaluate(() => {
    const sb = document.querySelector('.sidebar'), tb = document.querySelector('.topbar');
    const csb = getComputedStyle(sb), ctb = getComputedStyle(tb);
    return {
      sbWidth: Math.round(sb.getBoundingClientRect().width),
      sbPos: csb.position,
      sbTop: Math.round(sb.getBoundingClientRect().top),
      tbPos: ctb.position,
      tbHeight: Math.round(tb.getBoundingClientRect().height),
      navHeights: [...document.querySelectorAll('.nav-item')].map(n => Math.round(n.getBoundingClientRect().height)),
    };
  });
  ok('sidebar is the kit width (230px)', shell.sbWidth === 230, shell.sbWidth + 'px');
  ok('kit app-shell positioning neutralised — sidebar not sticky', shell.sbPos === 'static', shell.sbPos);
  ok('sidebar starts at the top, no dead band', shell.sbTop === 0, shell.sbTop + 'px');
  ok('topbar not sticky', shell.tbPos === 'static', shell.tbPos);
  ok('topbar keeps its 50px height', shell.tbHeight === 50, shell.tbHeight + 'px');
  ok('every nav row is one line at the kit row height', shell.navHeights.every(h => h === 42), shell.navHeights.join(','));

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('no horizontal overflow on the dashboard at 1440', overflow <= 0, overflow + 'px');

  /* ---- round-1 fixes, re-verified --------------------------------------- */
  await page.evaluate(() => showPage('list'));
  await page.waitForTimeout(300);

  const listOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('no horizontal overflow on the list at 1440', listOverflow <= 0, listOverflow + 'px');

  const tabNames = await page.evaluate(() =>
    [...document.querySelectorAll('[role="tab"]')].map(t => t.innerText.trim().split('\n')[0]));
  ok('DOM-1 fix intact — a "Not synced" tab exists', tabNames.some(t => /Not synced/i.test(t)), tabNames.join(' / '));

  // selection → bulk toolbar visible and reporting the right count
  const boxes = page.locator('tbody input[type=checkbox]');
  await boxes.nth(0).click(); await boxes.nth(1).click(); await boxes.nth(2).click();
  await page.waitForTimeout(150);
  const bar = page.locator('#bulk-toolbar');
  ok('bulk toolbar is VISIBLE after selecting rows', await bar.isVisible());
  ok('bulk count reads 3', (await page.locator('#bulk-count-num').innerText()).trim() === '3',
    (await page.locator('#bulk-count-num').innerText()).trim());
  ok('every bulk action is clickable, not just present',
    (await page.locator('#bulk-toolbar button:visible').count()) >= 5,
    (await page.locator('#bulk-toolbar button:visible').count()) + ' visible buttons');

  // TRU-1: switching tab resets the selection
  await page.locator('[role="tab"]').nth(1).click();
  await page.waitForTimeout(250);
  ok('TRU-1 fix intact — selection resets on tab change, toolbar hidden', !(await bar.isVisible()));

  // TRU-2: uncheck-all clears everything, including off-screen rows
  await page.locator('[role="tab"]').nth(0).click();
  await page.waitForTimeout(250);
  await page.locator('#chk-all, thead input[type=checkbox]').first().click();
  await page.waitForTimeout(150);
  await page.locator('#chk-all, thead input[type=checkbox]').first().click();
  await page.waitForTimeout(200);
  const leftSelected = await page.evaluate(() => (window.selectionCount ? selectionCount() : -1));
  ok('TRU-2 fix intact — uncheck-all leaves nothing selected', leftSelected === 0, String(leftSelected));
  ok('TRU-2 fix intact — toolbar unmounts with the selection', !(await bar.isVisible()));

  // A11Y-1: row action menu items are real, focusable, visible buttons.
  // Item count is status-dependent (a 'Ready to sync' row gets Sync now, an
  // already-synced row does not), so open the menu on a Ready-to-sync row.
  const readyRow = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#main-table tbody tr')];
    const i = rows.findIndex(r => /Ready to sync/.test(r.innerText));
    return i;
  });
  ok('a Ready to sync row is present to test the fullest row menu', readyRow >= 0, String(readyRow));
  await page.locator('.row-menu-btn').nth(readyRow).click();
  await page.waitForTimeout(200);
  const menuItems = page.locator('[role="menu"]:visible [role="menuitem"]');
  const nItems = await menuItems.count();
  // A Ready-to-sync row correctly offers only Sync now + Archive: there is
  // nothing yet to roll back or explain, so 2 is the right count, not 3.
  ok('A11Y-1 fix intact — row menu opens with visible menuitems', nItems >= 2, nItems + ' items');
  const labels = (await menuItems.allInnerTexts()).map(t => t.trim());
  ok('A11Y-1 fix intact — Sync now is in the row menu', labels.some(l => /Sync now/i.test(l)), labels.join(' / '));
  ok('A11Y-1 fix intact — Archive is in the row menu', labels.some(l => /Archive/i.test(l)), labels.join(' / '));
  const allButtons = await page.evaluate(() => {
    const m = [...document.querySelectorAll('[role="menu"]')].find(x => x.offsetParent !== null);
    if (!m) return false;
    return [...m.querySelectorAll('[role="menuitem"]')].every(i => i.tagName === 'BUTTON');
  });
  ok('A11Y-1 fix intact — menuitems are <button>, keyboard-reachable', allButtons);
  const firstItemVisible = await menuItems.first().isVisible();
  ok('row menu items are clickable, not merely in the DOM', firstItemVisible);
  await page.keyboard.press('Escape');

  // CLR-1: rollback confirm carries the recovery sentence.
  // bulkRollback uses a native confirm(), so read it off the dialog event.
  let dialogText = '';
  page.on('dialog', async d => { dialogText = dialogText || d.message(); await d.dismiss(); });
  await boxes.nth(0).click();
  await page.waitForTimeout(120);
  await page.evaluate(() => bulkRollback());
  await page.waitForTimeout(300);
  ok('CLR-1 fix intact — rollback names the recovery path',
    /sync it again/i.test(dialogText), JSON.stringify(dialogText.slice(0, 120)));
  ok('DOM-3 fix intact — no "accounting platform/system" wording',
    !/accounting (platform|system)/i.test(html));

  await browser.close();

  console.log(`\n${pass} passed, ${fail} failed`);
  if (errs.length) { console.log('PAGE ERRORS (' + errs.length + '):'); errs.forEach(x => console.log('  ! ' + x)); }
  else console.log('page errors: 0');
  process.exit(fail || errs.length ? 1 : 0);
})();
