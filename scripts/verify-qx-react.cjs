#!/usr/bin/env node
/**
 * verify-qx-react.cjs — the React + MUI port.
 *
 * Carries over the gates the vanilla suite learned the hard way:
 *   · a LAYOUT gate first — 183 assertions once passed while the page was
 *     squeezed into a third of the window because nothing checked layout
 *   · no untranslated keys — t() falls back to the key, so a missing
 *     string renders as raw snake_case and looks like a label
 *   · assert visibility, not element state
 *
 * Usage: node scripts/verify-qx-react.cjs [url-or-path]
 */
const { chromium } = require('playwright');
const path = require('path');

const target = process.argv[2] ||
  'file://' + path.resolve(__dirname, '../projects/q-explorer-mui/index.html');

let pass = 0; const fails = [];
const ok = (n, c, got) => c ? pass++ : fails.push(`${n}${got !== undefined ? ` — got ${JSON.stringify(got)}` : ''}`);

const RAMP = [12, 13, 14, 16, 20, 24, 34, 48, 60, 96];

/** Any visible text that is still a raw i18n key. */
const rawKeys = page => page.evaluate(() => {
  const out = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (el.offsetParent === null) continue;
    if (String(el.className).includes('material-icons')) continue;
    for (const n of el.childNodes) {
      if (n.nodeType !== 3) continue;
      const tx = n.textContent.trim();
      if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(tx)) out.add(tx);
    }
  }
  return [...out];
});

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(target, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  ok('the app mounted', (await page.$$('[class*="Mui"]')).length > 50);

  // ── layout gate, before anything else ────────────────────────
  const layout = await page.evaluate(() => {
    const box = el => { const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    return {
      vw: window.innerWidth,
      bar: box(document.querySelector('.MuiAppBar-root')),
      scrollW: document.documentElement.scrollWidth,
    };
  });
  ok('the app bar spans the full viewport width',
    layout.bar.x === 0 && layout.bar.w === layout.vw, layout.bar);
  ok('the app bar is a dense 48px toolbar', Math.abs(layout.bar.h - 48) <= 1, layout.bar.h);
  ok('no horizontal overflow at 1440', layout.scrollW <= layout.vw, layout);

  // ── theme: the four measured deviations ──────────────────────
  const theme = await page.evaluate(() => {
    const bar = document.querySelector('.MuiAppBar-root');
    const btn = document.querySelector('.MuiButton-contained');
    // The BAND lives on the TableHead root; MUI's head cells are transparent
    // and sit on top of it. Reading the cell reports rgba(0,0,0,0) while the
    // header is visibly grey — verified against a screenshot: the pixels
    // across the header row are #F4F4F4.
    const head = document.querySelector('.MuiTableHead-root');
    const card = document.querySelector('.MuiPaper-outlined');
    const cs = el => el ? getComputedStyle(el) : null;
    return {
      barBg: cs(bar).backgroundColor, barShadow: cs(bar).boxShadow,
      btnBg: cs(btn).backgroundColor, btnShadow: cs(btn).boxShadow,
      btnSize: cs(btn).fontSize, btnTransform: cs(btn).textTransform,
      headBg: cs(head).backgroundColor,
      cardBorder: cs(card).borderTopWidth + ' ' + cs(card).borderTopColor,
      cardShadow: cs(card).boxShadow,
    };
  });
  ok('AppBar is brand navy #1C2848', theme.barBg === 'rgb(28, 40, 72)', theme.barBg);
  ok('AppBar is flat', theme.barShadow === 'none', theme.barShadow);
  ok('primary is the measured #2196F3', theme.btnBg === 'rgb(33, 150, 243)', theme.btnBg);
  ok('contained buttons carry no elevation', theme.btnShadow === 'none', theme.btnShadow);
  ok('buttons are sizeSmall (13px, uppercase)',
    theme.btnSize === '13px' && theme.btnTransform === 'uppercase', theme);
  ok('TableHead carries the measured #F4F4F4 band',
    theme.headBg === 'rgb(244, 244, 244)', theme.headBg);
  ok('cards are outlined with the measured #E7E7E7 hairline, no shadow',
    theme.cardBorder === '1px rgb(231, 231, 231)' && theme.cardShadow === 'none', theme);

  // ── i18n: both languages, and no key left raw ────────────────
  ok('no untranslated keys on the evaluations list',
    (await rawKeys(page)).length === 0, await rawKeys(page));

  const deHeading = await page.$eval('h5', e => e.textContent.trim());
  await page.click('#lang-trigger');
  await page.waitForTimeout(300);
  await page.click('.MuiMenu-list li:first-child');   // EN
  await page.waitForTimeout(400);
  const enHeading = await page.$eval('h5', e => e.textContent.trim());
  ok('the language switch actually re-renders the app',
    deHeading !== enHeading, { de: deHeading, en: enHeading });
  ok('German is the default', deHeading === 'Auswertungen', deHeading);

  // ── navigation ───────────────────────────────────────────────
  await page.click('#qx-nav-trigger');
  await page.waitForTimeout(300);
  const navItems = await page.$$eval('.MuiMenu-list li', els => els.map(e => e.textContent.trim()));
  ok('Q-Explorer opens a menu with exactly two destinations',
    navItems.length === 2, navItems);
  await page.click('.MuiMenu-list li:nth-child(2)');
  await page.waitForTimeout(400);
  ok('it navigates to Scheduled reports',
    (await page.$eval('h5', e => e.textContent)).toLowerCase().includes('scheduled'));
  ok('no untranslated keys on scheduled reports', (await rawKeys(page)).length === 0, await rawKeys(page));

  // ── the creation flow ────────────────────────────────────────
  await page.click('#qx-nav-trigger');
  await page.waitForTimeout(250);
  await page.click('.MuiMenu-list li:first-child');
  await page.waitForTimeout(400);
  await page.click('#new-eval-btn');
  await page.waitForTimeout(500);

  const blank = await page.evaluate(() => ({
    runDisabled: document.getElementById('run-btn').disabled,
    lockedOpacity: getComputedStyle(document.getElementById('needs-type')).opacity,
    crumbs: document.querySelector('.MuiBreadcrumbs-root').textContent,
  }));
  ok('New evaluation opens with Run disabled', blank.runDisabled, blank);
  ok('the cards below the type are dimmed until it is set',
    blank.lockedOpacity === '0.5', blank.lockedOpacity);
  ok('the breadcrumb offers the way back', /Evaluations/.test(blank.crumbs), blank.crumbs);
  ok('no untranslated keys on new evaluation', (await rawKeys(page)).length === 0, await rawKeys(page));

  // choosing a type unlocks the page
  await page.click('#eval-type');
  await page.waitForTimeout(300);
  await page.click('.MuiMenu-list li:first-child');
  await page.waitForTimeout(400);
  const chosen = await page.evaluate(() => ({
    runDisabled: document.getElementById('run-btn').disabled,
    lockedOpacity: getComputedStyle(document.getElementById('needs-type')).opacity,
  }));
  ok('choosing a type enables Run and undims the page',
    !chosen.runDisabled && chosen.lockedOpacity === '1', chosen);

  // breadcrumb really navigates
  await page.click('.MuiBreadcrumbs-root a');
  await page.waitForTimeout(400);
  ok('the breadcrumb returns to the list',
    !!(await page.$('#new-eval-btn')));

  // ── filters: no All option, empty is all, ✕ clears ───────────
  const before = await page.$$eval('tbody tr', r => r.length);
  await page.click('#f-status');
  await page.waitForTimeout(300);
  const statusOpts = await page.$$eval('.MuiMenu-list li', els => els.map(e => e.textContent.trim()));
  ok('the status menu offers no All option',
    !statusOpts.some(o => /^(all|alle)$/i.test(o)), statusOpts);
  await page.click('.MuiMenu-list li:first-child');
  await page.waitForTimeout(400);
  const filtered = await page.$$eval('tbody tr', r => r.length);
  ok('picking a status filters the table', filtered < before, { before, filtered });
  await page.click('#f-status button[aria-label^="Clear"]');
  await page.waitForTimeout(400);
  ok('the ✕ clears the filter and restores every row',
    (await page.$$eval('tbody tr', r => r.length)) === before);

  // ── typography: every rendered size on MUI's ramp ────────────
  const sizes = await page.evaluate(() => {
    const out = new Set();
    for (const el of document.querySelectorAll('body *')) {
      if (el.offsetParent === null) continue;
      if (String(el.className).includes('material-icons')) continue;
      if (String(el.className).includes('spike-bar')) continue;
      const has = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (has) out.add(Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100);
    }
    return [...out];
  });
  ok('every rendered font size is on MUI\'s ramp',
    sizes.every(s => RAMP.includes(s)), sizes.filter(s => !RAMP.includes(s)));

  ok('no console errors', errors.length === 0, errors.slice(0, 4));

  await browser.close();
  console.log(`\n${pass} assertions passed, ${fails.length} failed`);
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
})();
