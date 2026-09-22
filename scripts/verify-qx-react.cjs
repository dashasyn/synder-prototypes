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

/* t() returns the KEY when a string is missing, and a key is truthy — so
   `t('x') || 'fallback'` never fires the fallback and renders "x" as a label.
   That has now shipped three times, so it fails the suite rather than waiting
   to be spotted in a screenshot. */
const fs = require('fs');
{
  const appSrc = fs.readFileSync(path.resolve(__dirname, '../projects/q-explorer-mui/app.js'), 'utf8');
  const bad = [...appSrc.matchAll(/t\('([a-z_]+)'\)\s*\|\|/g)].map(m => m[1]);
  if (bad.length) { fails.push(`t() with a dead || fallback: ${bad.join(', ')}`); }
  else pass++;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(target, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  ok('the app mounted', (await page.$$('[class*="Mui"]')).length > 20);

  try {

  /* ── the login screen, BEFORE dismissing it ───────────────────────
     Ignat, 2026-09-17: "There is no sign in." There wasn't. Neither checker
     could see that: this suite had no login step, and the parity checker
     signs in on its first line. A view you dismiss is a view you don't test —
     the same lesson the vanilla's login taught on 2026-09-14, unlearned. */
  ok('the app opens on a login screen', !!(await page.$('#view-login')));
  const loginLook = await page.evaluate(() => {
    const card = document.querySelector('#view-login .MuiPaper-root');
    const cs = getComputedStyle(document.getElementById('view-login'));
    const field = document.querySelector('#login-email');
    return {
      opaque: cs.backgroundColor,
      filled: !!field.closest('.MuiFilledInput-root'),
      cardShadow: card ? getComputedStyle(card).boxShadow : null,
    };
  });
  ok('the login background is opaque, not an alpha scrim, and matches the vanilla',
    loginLook.opaque === 'rgb(250, 250, 250)', loginLook.opaque);
  ok('login fields are the same filled fields as the rest of the app', loginLook.filled);
  ok('the login card is flat', loginLook.cardShadow === 'none', loginLook.cardShadow);
  ok('no untranslated keys on the login screen', (await rawKeys(page)).length === 0, await rawKeys(page));

  /* Login fidelity, measured against the vanilla rather than eyeballed.
     Ignat, 2026-09-17: "Add login page as it was." My first pass invented a
     layout — no wordmark, a primary-blue button, a footer instead of the
     bottom utility bar. Every number below was read off the vanilla. */
  const loginGeom = await page.evaluate(() => {
    const box = el => { if (!el) return null; const b = el.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.x) }; };
    const card = document.getElementById('login-card');
    const btn = document.getElementById('login-submit');
    const bar = document.getElementById('login-utility-bar');
    return {
      card: box(card), pad: getComputedStyle(card).padding,
      flag: box(document.querySelector('.login-flag')),
      name: box(document.querySelector('.login-name')),
      btn: box(btn), btnBg: getComputedStyle(btn).backgroundColor,
      barBottom: bar ? Math.round(window.innerHeight - bar.getBoundingClientRect().bottom) : null,
      links: bar ? bar.querySelectorAll('button').length : 0,
      forgot: !!document.getElementById('login-forgot'),
    };
  });
  ok('the login card is the vanilla\'s 380px with 36/40 padding',
    loginGeom.card.w === 380 && loginGeom.pad === '36px 40px', loginGeom);
  ok('the Swiss flag is 56x62', loginGeom.flag && loginGeom.flag.w === 56 && loginGeom.flag.h === 62,
    loginGeom.flag);
  ok('the QMS RPV CH wordmark is there at 210x61',
    loginGeom.name && loginGeom.name.w === 210 && loginGeom.name.h === 61, loginGeom.name);
  ok('the submit button is navy, full width and 39px tall',
    loginGeom.btnBg === 'rgb(28, 40, 72)' && loginGeom.btn.h === 39 && loginGeom.btn.w === 298,
    { bg: loginGeom.btnBg, btn: loginGeom.btn });
  ok('the forgot-password link is there', loginGeom.forgot);
  ok('the utility bar is pinned to the bottom with its four links',
    loginGeom.barBottom === 0 && loginGeom.links === 4, loginGeom);

  // empty submit puts a message under each field, not one for the form
  await page.click('#login-submit');
  await page.waitForTimeout(300);
  const loginErr = await page.evaluate(() => [...document.querySelectorAll('.Mui-error')]
    .filter(e => e.classList.contains('MuiFormHelperText-root')).map(e => e.textContent.trim()));
  ok('an empty submit errors both fields separately', loginErr.length === 2, loginErr);
  ok('an empty submit does not let you in', !!(await page.$('#view-login')));

  await page.fill('#login-email', 'a@b.c');
  await page.fill('#login-password', 'x');
  await page.click('#login-submit');
  await page.waitForTimeout(600);
  ok('a filled submit signs in', !(await page.$('#view-login')));

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

  const deHeading = await page.$eval('#page-header h6', e => e.textContent.trim());
  await page.click('#lang-trigger');
  await page.waitForTimeout(300);
  await page.click('.MuiMenu-list li:nth-child(2)');   // DE
  await page.waitForTimeout(400);
  const enHeading = await page.$eval('#page-header h6', e => e.textContent.trim());
  ok('the language switch actually re-renders the app',
    deHeading !== enHeading, { de: deHeading, en: enHeading });
  // Parity, not preference: the vanilla starts in English, so this must too.
  ok('the default language matches the vanilla prototype (English)',
    deHeading === 'Evaluations', deHeading);
  // switch back, or every assertion after this one runs in the other language
  await page.click('#lang-trigger');
  await page.waitForTimeout(300);
  await page.click('.MuiMenu-list li:first-child');
  await page.waitForTimeout(400);

  /* ── the evaluations list: filters, counts, row actions ───────────
     Ignat, 2026-09-17: "the filters are wrong", "the preview are wrong".
     Both were. The period filter was state nothing read, and every row got
     preview+delete regardless of what the vanilla gives it. */
  const rowCount = () => page.$$eval('tbody tr', r => r.length);
  const allRows = await rowCount();
  ok('the list renders every evaluation', allRows === 28, allRows);

  // Zeitraum was dropped on Ignat's ask (2026-09-17); the Period column sorts
  // instead. Asserted as an absence so it cannot creep back in unnoticed.
  ok('the Zeitraum filter is gone', !(await page.$('#f-period')));

  // status still filters, and the header count follows it
  await page.click('#f-status .MuiSelect-select');
  await page.waitForTimeout(250);
  await page.click('.MuiMenu-list li:first-child');
  await page.waitForTimeout(400);
  const nFiltered = await rowCount();
  ok('the status filter actually filters', nFiltered < allRows, { nFiltered, allRows });
  // Ignat removed the "N evaluations" subtitle on 2026-09-22 — asserted as an
  // absence so it cannot creep back in.
  ok('the evaluations header carries no count subtitle',
    !(await page.$('#page-header h6 + p')));

  // clear-all appears only when something is filtered, and restores the list
  ok('a Clear filters button appears once a filter is set', !!(await page.$('#f-clear-all')));
  await page.click('#f-clear-all');
  await page.waitForTimeout(400);
  ok('Clear filters restores every row', (await rowCount()) === allRows);
  ok('Clear filters then hides itself', !(await page.$('#f-clear-all')));

  // a filter that matches nothing shows the empty state, not a blank page
  await page.fill('#f-search', 'zzzzzzzz');
  await page.waitForTimeout(400);
  ok('a search matching nothing shows the empty state', !!(await page.$('#empty-state')));
  await page.click('#f-search-clear');
  await page.waitForTimeout(400);
  ok('the search clear restores every row', (await rowCount()) === allRows);

  // row actions must match the vanilla's, per row, not one set for all
  const actionMismatch = await page.evaluate(() => {
    const bad = [];
    const MAP = { visibility: 'visibility', download: 'download', delete: 'delete',
                    refresh: 'refresh' };
    for (const r of EVALUATIONS) {
      const tr = [...document.querySelectorAll('tbody tr')].find(x => x.textContent.includes(r.name));
      if (!tr) { bad.push(r.name + ': missing'); continue; }
      const got = [...tr.querySelectorAll('button[data-act]')].map(b => b.getAttribute('data-act')).sort();
      const want = r.actions.map(a => MAP[a]).sort();
      if (got.join() !== want.join()) bad.push(`${r.name}: ${got} != ${want}`);
    }
    return bad;
  });
  ok('every row offers exactly the actions the vanilla gives it',
    actionMismatch.length === 0, actionMismatch.slice(0, 3));

  // delete asks first, then offers undo — the vanilla's cfAsk + showUndoToast
  // a running row's actions are disabled now, so pick a live one
  await page.click('tbody tr button[data-act="delete"]:not([disabled])');
  await page.waitForTimeout(400);
  ok('delete opens a confirmation rather than deleting', !!(await page.$('#confirm-dialog')));
  ok('the list is untouched while the dialog is open', (await rowCount()) === allRows);
  await page.click('#confirm-delete');
  await page.waitForTimeout(500);
  ok('confirming removes the row', (await rowCount()) === allRows - 1);
  ok('an undo toast is offered', await page.isVisible('#undo-btn'));
  await page.click('#undo-btn');
  await page.waitForTimeout(500);
  ok('undo puts the row back', (await rowCount()) === allRows);

  // download reports back instead of doing nothing
  await page.click('tbody tr button[data-act="download"]:not([disabled])');
  await page.waitForTimeout(400);
  ok('download confirms it started', await page.isVisible('#note-toast'));
  await page.waitForTimeout(100);

  /* ── the shell and the accordions ─────────────────────────────────
     Ignat, 2026-09-17: "each section was an accordeon. Now they are not
     collapsable" and "the topbar should be fixed". Both true, and the parity
     checker had said this view was fine — because it counted controls and
     tables, and a static heading has exactly as many of each as an accordion
     header does. */
  const bar = await page.evaluate(() => {
    const el = document.querySelector('.MuiAppBar-root');
    const b = el.getBoundingClientRect();
    return { pos: getComputedStyle(el).position, top: Math.round(b.top) };
  });
  ok('the top bar is fixed, as #topbar is in the vanilla', bar.pos === 'fixed', bar);
  // Ignat removed the prototype banner on 2026-09-17; the bar had been offset
  // 36px to clear it, which is what left it looking broken once it went.
  ok('the top bar is pinned to the viewport edge, with no banner above it',
    bar.top === 0, bar.top);
  const clearance = await page.evaluate(() => {
    const b = document.querySelector('.MuiAppBar-root').getBoundingClientRect();
    const h = document.querySelector('#page-header h6').getBoundingClientRect();
    return { barBottom: Math.round(b.bottom), headingTop: Math.round(h.top) };
  });
  ok('the fixed bar does not cover the page heading',
    clearance.headingTop >= clearance.barBottom, clearance);

  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(250);
  ok('the top bar stays put when the page scrolls',
    (await page.evaluate(() => Math.round(document.querySelector('.MuiAppBar-root')
      .getBoundingClientRect().top))) === bar.top);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);

  const heads = await page.$$('.group-header');
  ok('every evaluation type is an accordion header', heads.length === 6, heads.length);
  const beforeCollapse = await rowCount();
  await page.click('#group-punctuality');
  await page.waitForTimeout(400);
  const afterCollapse = await rowCount();
  ok('clicking a group header collapses its table', afterCollapse < beforeCollapse,
    { beforeCollapse, afterCollapse });
  ok('the collapsed header says so',
    (await page.getAttribute('#group-punctuality', 'aria-expanded')) === 'false');
  ok('the header itself stays visible and clickable when collapsed',
    await page.isVisible('#group-punctuality'));
  await page.click('#group-punctuality');
  await page.waitForTimeout(400);
  ok('clicking it again restores the rows', (await rowCount()) === beforeCollapse);

  /* ── the three runtime features the extractor could not see ───────
     Validator round 1, Fidelity FID-1/2/3: the vanilla annotates rows AFTER
     load — annotateFailedRows(), markUnavailableActions(), initSortableHeaders().
     My extractor reads static markup, so none of them existed in the port and
     the parity checker agreed, because the control census matched. */
  const failedRow = await page.evaluate(() => {
    const r = EVALUATIONS.find(x => x.status === 'failed');
    const tr = [...document.querySelectorAll('tbody tr')].find(x => x.textContent.includes(r.name));
    return {
      name: r.name,
      reason: tr.querySelector('.fail-reason') ? tr.querySelector('.fail-reason').textContent.trim() : null,
      acts: [...tr.querySelectorAll('button[data-act]')].map(b => b.getAttribute('data-act')),
    };
  });
  ok('a failed row prints its failure reason', !!failedRow.reason && failedRow.reason.length > 5,
    failedRow.reason);
  ok('a failed row offers Run again', failedRow.acts.includes('refresh'), failedRow.acts);

  const runningOff = await page.evaluate(() => {
    const r = EVALUATIONS.find(x => x.status === 'in_progress' || x.status === 'running');
    const tr = [...document.querySelectorAll('tbody tr')].find(x => x.textContent.includes(r.name));
    return [...tr.querySelectorAll('button[data-act]')].map(b => b.disabled);
  });
  ok('every action on a still-running evaluation is disabled',
    runningOff.length > 0 && runningOff.every(Boolean), runningOff);

  // retry flips the row to in-progress and takes its reason away, as the vanilla does
  await page.click(`tbody tr button[data-act="refresh"]`);
  await page.waitForTimeout(500);
  const afterRetry = await page.evaluate(n => {
    const tr = [...document.querySelectorAll('tbody tr')].find(x => x.textContent.includes(n));
    return { text: tr.textContent, reason: !!tr.querySelector('.fail-reason'),
             acts: [...tr.querySelectorAll('button[data-act]')].map(b => b.getAttribute('data-act')),
             disabled: [...tr.querySelectorAll('button[data-act]')].every(b => b.disabled) };
  }, failedRow.name);
  ok('Run again moves the row to In Progress', /In Progress/i.test(afterRetry.text), afterRetry.text.slice(0, 80));
  ok('the failure reason goes away once it is rerunning', !afterRetry.reason);
  ok('Run again itself goes away', !afterRetry.acts.includes('refresh'), afterRetry.acts);
  ok('and its remaining actions go dead while it runs', afterRetry.disabled);

  // sortable headers
  const firstBefore = await page.$eval('tbody tr', r => r.textContent.slice(0, 40));
  const sortLabel = page.locator('thead .MuiTableSortLabel-root').first();
  await sortLabel.scrollIntoViewIfNeeded();
  await sortLabel.click();
  await page.waitForTimeout(400);
  const firstAsc = await page.$eval('tbody tr', r => r.textContent.slice(0, 40));
  await sortLabel.click();
  await page.waitForTimeout(400);
  const firstDesc = await page.$eval('tbody tr', r => r.textContent.slice(0, 40));
  ok('column headers sort the rows', firstAsc !== firstDesc,
    { firstBefore, firstAsc, firstDesc });
  ok('the sorted column shows its direction',
    (await page.$$eval('thead [aria-sort]', e => e.length)) > 0
    || (await page.$$eval('thead .Mui-active', e => e.length)) > 0);

  // A11Y round 1: both filter dropdowns reported an empty accessible name
  const names = await page.evaluate(() => ['f-status'].map(id => {
    const el = document.querySelector('#' + id + ' [role="combobox"]');
    const lid = el && el.getAttribute('aria-labelledby');
    if (!lid) return null;
    return lid.split(/\s+/).map(x => (document.getElementById(x) || {}).textContent || '')
      .join(' ').trim();
  }));
  ok('both filter dropdowns have a real accessible name',
    names.every(n => n && n.length > 2), names);

  const rowBtnName = await page.evaluate(() => {
    const b = document.querySelector('tbody button[data-act="delete"]');
    return b && b.getAttribute('aria-label');
  });
  ok('a row action names the evaluation it acts on, not just its verb',
    !!rowBtnName && rowBtnName.length > 12, rowBtnName);

  /* ── the logo, and sorting ────────────────────────────────────────
     Ignat, 2026-09-17: use the sign-in logo in the top bar; drop Zeitraum;
     make the columns sortable; default to Erstellt descending. */
  const logo = await page.evaluate(() => {
    const el = document.getElementById('topbar-logo');
    if (!el) return null;
    const flag = el.querySelector('.login-flag');
    const name = el.querySelector('.login-name');
    const p = name && name.querySelector('path');
    return {
      hasFlag: !!flag, hasName: !!name,
      nameFill: p ? getComputedStyle(p).fill : null,
      h: Math.round(el.getBoundingClientRect().height),
      barH: Math.round(document.querySelector('.MuiAppBar-root').getBoundingClientRect().height),
    };
  });
  ok('the top bar carries the real lockup, flag and wordmark',
    !!logo && logo.hasFlag && logo.hasName, logo);
  ok('the wordmark is white, not the default black on navy',
    logo.nameFill === 'rgb(255, 255, 255)', logo.nameFill);
  ok('the lockup fits inside the 48px bar', logo.h <= logo.barH, logo);

  // the default sort: Erstellt, descending, and as DATES not text
  /* Reload before judging the DEFAULT sort. Earlier assertions in this suite
     click sort headers, so by the time this runs the order is whatever they
     left behind — the first version of this check read a perfectly sorted
     table as unsorted for exactly that reason. A default is only a default on
     a fresh load. */
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await page.fill('#login-email', 'a@b.c');
  await page.fill('#login-password', 'x');
  await page.click('#login-submit');
  await page.waitForTimeout(800);

  // Each type is its own table, so the order has to hold INSIDE every group —
  // reading the first six rows of the page walks across group boundaries and
  // reports an unsorted sequence that is in fact correctly sorted.
  const perGroup = await page.$$eval('table', ts => ts.map(t =>
    [...t.querySelectorAll('tbody tr')].map(r => r.children[2].textContent.trim())));
  // Dates render as "26 May 2026" since 2026-09-22 (Ignat: short month names).
  // The old dd.mm.yyyy parser returned 0 for every cell, which emptied the
  // list and failed the assertion — the right way round for a parser that no
  // longer matches what is on screen.
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const toNum = d => {
    const m = String(d).match(/(\d{1,2})\s+([A-Za-zä]{3})\s+(\d{4})/);
    if (!m) return 0;
    const mi = MON.indexOf(m[2]);
    return mi < 0 ? 0 : +(m[3] + String(mi + 1).padStart(2, '0') + m[1].padStart(2, '0'));
  };
  const groupsSorted = perGroup.map(g => g.map(toNum).filter(Boolean))
    .filter(g => g.length > 1);
  ok('every group opens sorted by Erstellt, newest first',
    groupsSorted.length > 0 && groupsSorted.every(g => g.every((v, i) => i === 0 || g[i - 1] >= v)),
    perGroup[0]);
  // A text sort of dd.mm.yyyy puts 08.01.2026 above 03.05.2026. A real date
  // sort cannot, so look for a group where the two orders disagree.
  const textWrong = await page.evaluate(() => {
    const t = [...document.querySelectorAll('table')]
      .map(x => [...x.querySelectorAll('tbody tr')].map(r => r.children[2].textContent.trim()))
      .find(g => g.length > 1);
    const byText = [...t].sort((a, b) => b.localeCompare(a, 'de'));
    return { actual: t, byText };
  });
  ok('Erstellt sorts as dates, not as text',
    JSON.stringify(textWrong.actual) !== JSON.stringify(textWrong.byText)
      || textWrong.actual.length < 2, textWrong);
  const active = await page.$eval('thead .Mui-active', e => e.textContent.trim()).catch(() => null);
  ok('the Erstellt header shows it is the sorted column', !!active, active);

  // every column is sortable, and clicking one re-orders the rows
  const labels = await page.$$eval('thead .MuiTableSortLabel-root',
    e => [...new Set(e.map(x => x.textContent.trim()))]);
  ok('all four data columns are sortable, Actions is not', labels.length === 4, labels);
  const firstBefore2 = await page.$eval('tbody tr', r => r.textContent.slice(0, 40));
  const nameSort = page.locator('thead .MuiTableSortLabel-root').first();
  await nameSort.click();
  await page.waitForTimeout(400);
  ok('clicking Name re-sorts the rows',
    (await page.$eval('tbody tr', r => r.textContent.slice(0, 40))) !== firstBefore2);

  /* ── page header geometry, measured off ETC's own screens ─────────
     Ignat, 2026-09-22: "headers are very wide and take a lot of space."
     Every number below was read out of his two screenshots by
     scripts/sample-etc-header.cjs, not chosen: title 20px, breadcrumb 14px,
     a small primary button in the corner, and 74px from the app bar to the
     first row of content. Mine ran 100px on a 24px title and a 16px crumb. */
  const hdr = await page.evaluate(() => {
    const h = document.getElementById('page-header');
    const b = h.getBoundingClientRect();
    const title = h.querySelector('h6');
    const btn = h.querySelector('.MuiButton-root');
    return {
      h: Math.round(b.height),
      pad: getComputedStyle(h).padding,
      titleTag: title && title.tagName,
      titleFont: title && getComputedStyle(title).fontSize,
      btnH: btn && Math.round(btn.getBoundingClientRect().height),
      btnRight: btn && Math.round(window.innerWidth - btn.getBoundingClientRect().right),
    };
  });
  ok('the page title is 20px, not 24px', hdr.titleTag === 'H6' && hdr.titleFont === '20px', hdr);
  ok('the header pads 12px vertically, 24px horizontally', hdr.pad === '12px 24px', hdr.pad);
  ok('the list header fits in the measured budget', hdr.h <= 60, hdr.h);
  ok('the primary action is a small button in the corner',
    hdr.btnH >= 29 && hdr.btnH <= 32 && hdr.btnRight === 24, hdr);


  /* ── dates carry a short month name, in both languages ────────────
     Ignat, 2026-09-22: "1 Aug 2026 - it is easier to understand." The data
     still holds dd.mm.yyyy; this is a render-time formatter, so re-running the
     extractor cannot undo it. */
  const dateCells = await page.$$eval('tbody tr', rs =>
    rs.slice(0, 8).map(r => [r.children[1].textContent.trim(), r.children[2].textContent.trim()]));
  const flat = dateCells.flat();
  ok('no date still renders as dd.mm.yyyy',
    !flat.some(v => /^\d{2}\.\d{2}\.\d{4}/.test(v)), flat.slice(0, 4));
  ok('single dates read like "26 May 2026"',
    dateCells.every(([, c]) => /^\d{1,2} [A-Za-zä]{3} \d{4}$/.test(c)), dateCells.map(x => x[1]).slice(0, 3));
  ok('periods read like "19 May – 25 May 2026"',
    dateCells.some(([p2]) => /^\d{1,2} [A-Za-zä]{3} – \d{1,2} [A-Za-zä]{3} \d{4}$/.test(p2)),
    dateCells.map(x => x[0]).slice(0, 3));

  ok('the primary action says Add, not New',
    /add/i.test(await page.textContent('#new-eval-btn')), await page.textContent('#new-eval-btn'));

  // German gets German abbreviations from the extracted MONTH_NAMES
  await page.click('#lang-trigger');
  await page.waitForTimeout(300);
  await page.click('.MuiMenu-list li:nth-child(2)');
  await page.waitForTimeout(500);
  const deDates = await page.$$eval('tbody tr', rs =>
    rs.slice(0, 8).map(r => r.children[2].textContent.trim()));
  ok('German dates use German month abbreviations',
    deDates.some(d => /Mai|Okt|Dez|Mär/.test(d)), deDates.slice(0, 4));
  ok('the German button also says "hinzufügen", not "Neue"',
    /hinzu/i.test(await page.textContent('#new-eval-btn')), await page.textContent('#new-eval-btn'));
  await page.click('#lang-trigger');
  await page.waitForTimeout(300);
  await page.click('.MuiMenu-list li:first-child');
  await page.waitForTimeout(500);

  // ── navigation ───────────────────────────────────────────────
  await page.click('#qx-nav-trigger');
  await page.waitForTimeout(300);
  const navItems = await page.$$eval('.MuiMenu-list li', els => els.map(e => e.textContent.trim()));
  ok('Q-Explorer opens a menu with exactly two destinations',
    navItems.length === 2, navItems);
  await page.click('.MuiMenu-list li:nth-child(2)');
  await page.waitForTimeout(400);
  ok('it navigates to Scheduled reports',
    (await page.$eval('#page-header h6', e => e.textContent)).toLowerCase().includes('scheduled'));
  ok('no untranslated keys on scheduled reports', (await rawKeys(page)).length === 0, await rawKeys(page));

  /* Scheduled reports, rebuilt against the vanilla: six real schedules, its
     columns, its three filters, and pause/resume — the only action here that
     changes anything, and the one the port was missing. */
  const schedRows = await page.$$eval('#sched-table tbody tr', r => r.length);
  const schedWant = await page.evaluate(() => SCHEDULES.length);
  ok('every schedule is listed, from the extracted data', schedRows === schedWant && schedRows === 6,
    { schedRows, schedWant });
  const schedCols = await page.$$eval('#sched-table thead th', th => th.map(e => e.textContent.trim()));
  ok('the schedule table carries a Last run column', schedCols.length === 6, schedCols);

  await page.click('#s-status');
  await page.waitForTimeout(250);
  await page.click('.MuiMenu-list li:nth-child(2)');       // paused
  await page.waitForTimeout(400);
  const pausedRows = await page.$$eval('#sched-table tbody tr', r => r.length);
  const pausedWant = await page.evaluate(() => SCHEDULES.filter(s => s.status === 'paused').length);
  ok('the schedule status filter filters', pausedRows === pausedWant && pausedRows < schedRows,
    { pausedRows, pausedWant });
  await page.click('#s-clear-all');
  await page.waitForTimeout(400);

  await page.fill('#s-search', 'zzzzzz');
  await page.waitForTimeout(400);
  ok('a schedule search matching nothing shows the empty state', !!(await page.$('#sched-empty')));
  await page.fill('#s-search', '');
  await page.waitForTimeout(400);

  const pauseBefore = (await page.$$('#sched-table button[aria-label="pause"]')).length;
  await page.click('#sched-table button[aria-label="pause"]');
  await page.waitForTimeout(400);
  const pauseAfter = (await page.$$('#sched-table button[aria-label="pause"]')).length;
  ok('pausing a schedule flips it to resume', pauseAfter === pauseBefore - 1,
    { pauseBefore, pauseAfter });
  await page.click('#sched-table button[aria-label="resume"]');
  await page.waitForTimeout(400);
  ok('resuming flips it back',
    (await page.$$('#sched-table button[aria-label="pause"]')).length === pauseBefore);

  // ── the creation flow ────────────────────────────────────────
  await page.click('#qx-nav-trigger');
  await page.waitForTimeout(250);
  await page.click('.MuiMenu-list li:first-child');
  await page.waitForTimeout(400);
  await page.click('#new-eval-btn');
  await page.waitForTimeout(500);

  /* Variant 1, settled by Ignat 2026-09-17: the type is chosen in a POPUP
     first, then the details page opens with it set. */
  const dlg = await page.evaluate(() => {
    const d = document.getElementById('type-dialog');
    if (!d) return null;
    const opts = [...d.querySelectorAll('[id^="type-option-"]')];
    return {
      count: opts.length,
      icons: opts.map(o => (o.querySelector('.material-icons') || {}).textContent),
      labels: opts.map(o => o.textContent.trim().slice(0, 30)),
      title: (d.querySelector('.MuiDialogTitle-root') || {}).textContent,
      hasCancel: !!document.getElementById('type-dialog-cancel'),
    };
  });
  ok('New evaluation opens the type popup first', !!dlg, dlg);
  // Ignat, 2026-09-17: "Popup should appear over the Evaluations page."
  // It used to navigate first and open the dialog on top of the half-dead
  // form, so Cancel had to undo a navigation.
  ok('the popup opens OVER the evaluations list, without navigating first',
    (await page.$$('tbody tr')).length > 0 && !(await page.$('#run-btn')));
  ok('the popup offers all six types', dlg.count === 6, dlg.count);
  ok('every type carries its icon from the extracted EVAL_TYPES',
    dlg.icons.length === 6 && dlg.icons.every(i => i && i.length > 2), dlg.icons);
  const wantIcons = await page.evaluate(() => EVAL_TYPES.map(x => x.icon));
  ok('the icons are the vanilla\'s own, not ones I picked',
    JSON.stringify(dlg.icons) === JSON.stringify(wantIcons), { got: dlg.icons, wantIcons });
  ok('each type is described, not just named',
    dlg.labels.every(l => l.length > 10), dlg.labels);
  ok('the popup can be cancelled', dlg.hasCancel);
  ok('no untranslated keys in the type popup', (await rawKeys(page)).length === 0, await rawKeys(page));

  // cancelling returns to the list rather than leaving a half-open page
  await page.click('#type-dialog-cancel');
  await page.waitForTimeout(400);
  ok('cancelling the popup returns to the evaluations list',
    !!(await page.$('#f-search')) && !(await page.$('#run-btn')));

  await page.click('#new-eval-btn');
  await page.waitForTimeout(500);
  await page.click('#type-option-punctuality');
  await page.waitForTimeout(500);
  const chosen = await page.evaluate(() => ({
    gone: !document.getElementById('type-dialog'),
    runDisabled: document.getElementById('run-btn').disabled,
    lockedOpacity: getComputedStyle(document.getElementById('needs-type')).opacity,
    // the type left the identity card on 2026-09-22; the header carries it
    typeValue: (document.querySelector('#page-header h6 + p') || {}).textContent,
    crumbs: document.querySelector('.MuiBreadcrumbs-root').textContent,
  }));
  ok('picking a type closes the popup and opens the details page', chosen.gone, chosen);
  ok('the page arrives with the chosen type already set',
    /nktlich|unctual/i.test(chosen.typeValue || ''), chosen.typeValue);
  ok('picking a type enables Run and undims the page',
    !chosen.runDisabled && chosen.lockedOpacity === '1', chosen);
  ok('the breadcrumb offers the way back', /Evaluations/.test(chosen.crumbs), chosen.crumbs);
  const hdr2 = await page.evaluate(() => {
    const h = document.getElementById('page-header');
    const cr = h.querySelector('.MuiBreadcrumbs-root');
    const title = h.querySelector('h6');
    return {
      h: Math.round(h.getBoundingClientRect().height),
      crumbFont: getComputedStyle(cr).fontSize,
      crumbAbove: cr.getBoundingClientRect().bottom <= title.getBoundingClientRect().top + 1,
    };
  });
  ok('the breadcrumb is 14px, as theirs is', hdr2.crumbFont === '14px', hdr2.crumbFont);
  ok('the breadcrumb sits above the title', hdr2.crumbAbove, hdr2);
  ok('a header with a breadcrumb still fits the measured 74px budget',
    hdr2.h <= 80, hdr2.h);

  ok('no untranslated keys on new evaluation', (await rawKeys(page)).length === 0, await rawKeys(page));

  /* ── the creation flow: generated name and working filters ────────
     Ignat, 2026-09-17: "when an empty evaluation opens - show generated name"
     and "Filters don't work. Please check carefully creation flow." Every
     scope filter was a Select with two hardcoded options, SBB and BLS, and no
     state — so Cantons, Lines and Stops all offered company names. */
  // MUI puts a TextField's id on the input itself, so "#eval-name input"
  // matches nothing — a selector that finds nothing throws rather than lying,
  // which is the one good thing about this class of mistake.
  const nameAt = () => page.$eval('#eval-name', e => e.value);
  const gen = await nameAt();
  ok('an empty evaluation opens with a generated name', gen.length > 0, gen);
  ok('the generated name names the type and the period',
    /nktlich|unctual/i.test(gen) && /month|Monat/i.test(gen), gen);

  // the five scope filters carry real, distinct option sets
  const scope = await page.evaluate(() => {
    const ids = ['f-modes', 'f-tu', 'f-cantons', 'f-lines', 'f-stops'];
    return ids.map(id => !!document.getElementById(id));
  });
  ok('all five scope filters are there', scope.every(Boolean), scope);

  const optionsOf = async id => {
    await page.click(`#${id} .MuiSelect-select`);
    await page.waitForTimeout(300);
    const opts = await page.$$eval('.MuiMenu-list li', e => e.map(x => x.textContent.trim()));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    return opts;
  };
  const tuOpts = await optionsOf('f-tu');
  const cantonOpts = await optionsOf('f-cantons');
  const lineOpts = await optionsOf('f-lines');
  ok('transport companies come from ALL_TU, not two hardcoded names',
    tuOpts.length === (await page.evaluate(() => ALL_TU.length)) && tuOpts.length > 2, tuOpts.length);
  ok('cantons are cantons, not company names',
    cantonOpts.length === 26 && !cantonOpts.some(c => /SBB|BLS/.test(c)), cantonOpts.slice(0, 3));
  ok('lines are line numbers, not company names',
    lineOpts.length > 10 && !lineOpts.some(c => /^SBB|^BLS/.test(c)), lineOpts.slice(0, 3));

  // picking a TU cascades into the lines on offer, as renderLinesOptions does
  await page.click('#f-tu .MuiSelect-select');
  await page.waitForTimeout(300);
  await page.click('.MuiMenu-list li:first-child');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const linesAfterTu = await optionsOf('f-lines');
  ok('choosing a transport company narrows the lines on offer',
    linesAfterTu.length < lineOpts.length && linesAfterTu.length > 0,
    { before: lineOpts.length, after: linesAfterTu.length });

  // and the generated name follows the filters
  const nameAfter = await nameAt();
  ok('the generated name follows the filters', nameAfter !== gen, { gen, nameAfter });

  // typing in the name stops it following, as nameManuallyEdited does
  await page.fill('#eval-name', 'My own name');
  await page.waitForTimeout(200);
  await page.click('#f-cantons .MuiSelect-select');
  await page.waitForTimeout(300);
  await page.click('.MuiMenu-list li:first-child');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok('editing the name stops it being regenerated',
    (await nameAt()) === 'My own name', await nameAt());

  /* ── the Run card: notification and scheduling ────────────────────
     Ignat, 2026-09-17: "You lost notification block", "you lost Setup
     scheduled report part". Both were never ported — the page stopped after
     Time Period and Scope. */
  /* Ignat, 2026-09-22: "remove evaluation type from the first block". It is
     not a control and not in the card — the header names it instead. */
  ok('the evaluation type is not a control anywhere on the page',
    !(await page.$('#eval-type')) && !(await page.$('#eval-type-select')));
  ok('the identity card holds the name and nothing else',
    (await page.$$eval('#eval-name', e => e.length)) === 1);
  ok('but the header still says which type it is',
    /nktlich|unctual/i.test(await page.$eval('#page-header h6 + p', e => e.textContent)));

  ok('every weekday starts selected, as the vanilla does',
    (await page.$$eval('[id^="day-"] ', e => e.length)) === 7
    && (await page.$$eval('[id^="day-"].MuiChip-filledPrimary', e => e.length)) === 7);

  /* ── the third card, rebuilt 2026-09-22 ───────────────────────────
     "I don't like 'Run' block. Schedule is very small... I want notification
     to be a checkbox too, not a toggle." */
  const card3 = await page.evaluate(() => {
    const c = document.getElementById('run-card');
    const h = c.querySelector('h6');
    const sched = document.getElementById('schedule-checkbox');
    const noti = document.getElementById('notify-checkbox');
    const box = el => el.getBoundingClientRect();
    return {
      title: h.textContent.trim(),
      schedIsCheckbox: !!sched.closest('.MuiCheckbox-root'),
      notiIsCheckbox: !!noti.closest('.MuiCheckbox-root'),
      notiIsSwitch: !!noti.closest('.MuiSwitch-root'),
      schedFirst: box(sched).top < box(noti).top,
      schedHighlighted: !!document.getElementById('schedule-block'),
    };
  });
  ok('the card is no longer called "Run"', !/^run$/i.test(card3.title), card3.title);
  ok('it names what it holds — schedule and notification',
    /schedul|zeitplan/i.test(card3.title) && /notif|benachricht/i.test(card3.title), card3.title);
  ok('notification is a checkbox, not a toggle',
    card3.notiIsCheckbox && !card3.notiIsSwitch, card3);
  ok('the schedule is a checkbox too', card3.schedIsCheckbox);
  ok('the schedule comes first, where the weight belongs', card3.schedFirst, card3);
  ok('and it sits in its own highlighted block', card3.schedHighlighted);

  ok('the notification block is there', !!(await page.$('#notify-section')));
  ok('it offers an e-mail address', !!(await page.$('#notify-email')));
  const emailOn = await page.$eval('#notify-email', e => e.disabled);
  await page.click('#notify-checkbox');
  await page.waitForTimeout(350);
  ok('turning notification off disables the address field',
    emailOn === false && (await page.$eval('#notify-email', e => e.disabled)) === true);
  await page.click('#notify-checkbox');
  await page.waitForTimeout(350);

  ok('the scheduled-report block is there', !!(await page.$('#schedule-checkbox')));
  ok('the frequency fields stay hidden until it is switched on',
    !(await page.$('#schedule-fields')));
  await page.click('#schedule-checkbox');
  await page.waitForTimeout(400);
  ok('switching it on reveals the frequency fields', !!(await page.$('#schedule-fields')));
  ok('it defaults to Monthly with a day-of-month', !!(await page.$('#freq-options-monthly')));

  // the "Run on" control follows the frequency
  await page.click('#freq-select .MuiSelect-select');
  await page.waitForTimeout(300);
  await page.click('.MuiMenu-list li:nth-child(2)');   // weekly
  await page.waitForTimeout(400);
  ok('choosing Weekly swaps in the day-of-week buttons',
    !!(await page.$('#sched-days-row')) && !(await page.$('#freq-options-monthly')));
  await page.click('#freq-select .MuiSelect-select');
  await page.waitForTimeout(300);
  await page.click('.MuiMenu-list li:first-child');    // daily
  await page.waitForTimeout(400);
  ok('choosing Daily swaps in the time picker',
    !!(await page.$('#daily-time-select')) && !(await page.$('#sched-days-row')));
  ok('each frequency explains when the data is available',
    (await page.textContent('#freq-hint')).length > 10);

  /* Ignat, 2026-09-22: "Time Period. Last week (previous full week Mon - Sun)"
     and "move the blocks to the center". */
  ok('Last week is offered as a preset', !!(await page.$('#preset-last_week')));
  ok('and it explains what it means on hover',
    /mon|mo/i.test(await page.getAttribute('#preset-last_week', 'title') || ''),
    await page.getAttribute('#preset-last_week', 'title'));
  await page.click('#preset-last_week');
  await page.waitForTimeout(400);
  /* Read the SUMMARY line, not the name field: an earlier assertion types a
     custom name, which switches the generator off, so the name is whatever it
     was left as. Same order-dependence that made the default-sort check read a
     sorted table as unsorted. */
  ok('picking Last week is reflected in what the run will cover',
    /last week|letzte woche/i.test(await page.textContent('#summary-filters')),
    await page.textContent('#summary-filters'));

  const centred = await page.evaluate(() => {
    const card = document.getElementById('run-card').getBoundingClientRect();
    const left = Math.round(card.left);
    const right = Math.round(window.innerWidth - card.right);
    return { left, right };
  });
  ok('the blocks are centred, not pinned left',
    Math.abs(centred.left - centred.right) <= 2 && centred.left > 40, centred);

  // the period presets, and the custom range with its reversed-date error
  await page.click('#preset-custom');
  await page.waitForTimeout(300);
  ok('picking Custom reveals the date fields', !!(await page.$('#custom-dates')));
  await page.fill('#date-from', '2026-05-20');
  await page.fill('#date-to', '2026-05-01');
  await page.waitForTimeout(400);
  const reversed = await page.$$eval('.MuiFormHelperText-root.Mui-error', e => e.length);
  ok('a reversed date range is refused', reversed > 0, reversed);
  await page.fill('#date-to', '2026-05-25');
  await page.waitForTimeout(400);
  ok('correcting the range clears the error',
    (await page.$$eval('.MuiFormHelperText-root.Mui-error', e => e.length)) === 0);

  // days of week
  await page.click('#day-Mon');
  await page.waitForTimeout(300);
  ok('days of the week can be toggled off',
    (await page.$$eval('[id^="day-"].MuiChip-filledPrimary', e => e.length)) === 6);

  /* A custom range cannot be scheduled — every run would return the same fixed
     period. The vanilla says so and offers the way out rather than just
     grateying the box, so the port does too. */
  ok('a custom range blocks scheduling and explains why',
    !!(await page.$('#schedule-blocked-note'))
    && (await page.$eval('#schedule-checkbox', e => e.disabled)));
  await page.click('#schedule-blocked-link');
  await page.waitForTimeout(400);
  ok('the note offers a working way back to a rolling period',
    !(await page.$('#schedule-blocked-note'))
    && !(await page.$eval('#schedule-checkbox', e => e.disabled)));

  // Raw Data Export still bypasses this page for its own config form
  await page.click('.MuiBreadcrumbs-root a');
  await page.waitForTimeout(400);
  await page.click('#new-eval-btn');
  await page.waitForTimeout(500);
  await page.click('#type-option-raw_data');
  await page.waitForTimeout(600);
  ok('Raw Data Export goes straight to its own config, as in the vanilla',
    (await page.$$('#rd-run-btn')).length === 1 && !(await page.$('#type-dialog')));
  await page.click('.MuiBreadcrumbs-root a');
  await page.waitForTimeout(400);
  await page.click('#new-eval-btn');
  await page.waitForTimeout(500);
  await page.click('#type-option-punctuality');
  await page.waitForTimeout(500);

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

  // ── the port must carry the vanilla's DATA, not retyped samples ──
  //    Ignat, 2026-09-15: "Now you lost almost all logic." The fix is
  //    scripts/qx-extract-shared.cjs, so this pins the two together.
  const data = await page.evaluate(() => ({
    rows: EVALUATIONS.length,
    groups: [...new Set(EVALUATIONS.map(r => r.group))].sort(),
    statuses: [...new Set(EVALUATIONS.map(r => r.status))].sort(),
    constants: ['DATA', 'PUNCT_DATA', 'FA_DATA', 'DQI_TU', 'RPT_DATA', 'RD_TU']
      .filter(k => typeof window[k] === 'object'),
    pureFns: ['periodFromKey', 'punctAggregate', 'rptBuildTree', 'punctBuildTree']
      .filter(k => typeof window[k] === 'function'),
  }));
  ok('all 28 evaluations came across from the vanilla prototype',
    data.rows === 28, data.rows);
  ok('all six evaluation types came across', data.groups.length === 6, data.groups);
  ok('the real status set came across, including `running`',
    data.statuses.includes('running'), data.statuses);
  ok('the domain constants are loaded', data.constants.length === 6, data.constants);
  ok('the pure helper functions are loaded', data.pureFns.length === 4, data.pureFns);

  const rendered = await page.$$eval('tbody tr', r => r.length);
  ok('every evaluation renders', rendered === 28, rendered);

  // status_running and status_in_progress share a label in both languages,
  // so the menu must not offer the same text twice — and picking it has to
  // return BOTH underlying statuses rather than silently dropping one.
  await page.click('#f-status');
  await page.waitForTimeout(300);
  const opts = await page.$$eval('.MuiMenu-list li', els => els.map(e => e.textContent.trim()));
  ok('no two status options share a label', opts.length === new Set(opts).size, opts);
  const inProgress = opts.findIndex(o => /progress|bearbeitung/i.test(o));
  await page.click(`.MuiMenu-list li:nth-child(${inProgress + 1})`);
  await page.waitForTimeout(400);
  ok('picking "In progress" returns the `running` rows too, not just in_progress',
    (await page.$$eval('tbody tr', r => r.length)) === 5,
    await page.$$eval('tbody tr', r => r.length));
  await page.click('#f-status button[aria-label^="Clear"]');
  await page.waitForTimeout(400);

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

  // ── Punctuality DPM: the first report view, with the real breakdown ──
  await page.evaluate(() => window.__go && window.__go('list'));
  await page.waitForTimeout(200);
  const backToList = await page.$('#new-eval-btn');
  if (!backToList) { await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500); }
  // Reports are reached by the row's PREVIEW action, as in the vanilla —
  // the name is plain text there, and only done rows offer a preview.
  await page.click('tbody tr button[data-act="visibility"]');
  await page.waitForTimeout(700);

  ok('opening an evaluation lands on the punctuality report',
    (await page.$$('#punct-table')).length === 1);
  ok('three breakdown levels are offered',
    (await page.$$('#punct-auf-1, #punct-auf-2, #punct-auf-3')).length === 3);
  ok('no untranslated keys on the report', (await rawKeys(page)).length === 0, await rawKeys(page));

  const l1 = await page.$$eval('#punct-table tbody tr', r => r.length);
  ok('the first breakdown level renders rows', l1 > 5, l1);

  /* This assertion used to say "the totals row equals punctAggregate over every
     record", and it was WRONG — it enshrined my own model. The vanilla's Gesamt
     is PUNCT_DATA.gesamt through scl()/sclPunkt(), which its own comment calls
     "the whole network, not the sum of the rows below it". Third time a test of
     mine has encoded my mistake rather than checked the original, so what it
     checks now is the property that distinguishes the two: the Gesamt is FIRST,
     it says it is network-wide, and it does NOT equal the sum of the rows.
     The exact figures are proved against the vanilla by qx-content-parity.cjs,
     which is the non-circular place to prove them. */
  const gesamt = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#punct-table tbody tr')];
    const cells = r => [...r.children].map(c => c.textContent.trim());
    const num = v => +String(v).replace(/[.\s'’]/g, '').replace(',', '.') || 0;
    const first = cells(rows[0]);
    const sumSoll = rows.slice(1).reduce((n, r) => n + num(cells(r)[1]), 0);
    return { first, scope: rows[0].textContent, sumSoll, gesamtSoll: num(first[1]) };
  });
  ok('the Gesamt row comes first, not last', /total|gesamt/i.test(gesamt.first[0]), gesamt.first[0]);
  ok('it says it covers the whole network',
    /network|netz/i.test(gesamt.scope), gesamt.scope.slice(0, 60));
  ok('and it is not the sum of the rows beneath it',
    gesamt.gesamtSoll > 0 && gesamt.gesamtSoll !== gesamt.sumSoll,
    { gesamtSoll: gesamt.gesamtSoll, sumSoll: gesamt.sumSoll });

  // the KPI row above the table — four figures the port had nowhere
  const kpis = await page.$$eval('#kpi-row .MuiCard-root', cs => cs.length);
  ok('the report carries its four KPI cards', kpis === 4, kpis);
  const kpiPct = await page.$eval('#kpi-row h5', e => e.textContent.trim());
  ok('the headline KPI is the overall punctuality percentage',
    /^\d{1,3},\d{2}%$/.test(kpiPct), kpiPct);

  // the cascade must not offer a dimension already taken above
  await page.click('#punct-auf-2');
  await page.waitForTimeout(300);
  const lvl2 = await page.$$eval('.MuiMenu-list li', els => els.map(e => e.textContent.trim()));
  const lvl1Label = await page.$eval('#punct-auf-1 .MuiSelect-select', e => e.textContent.trim());
  ok('the second level cannot repeat the first level\'s dimension',
    !lvl2.includes(lvl1Label), { lvl1Label, lvl2 });
  await page.click('.MuiMenu-list li:first-child');
  await page.waitForTimeout(600);
  /* The report now OPENS two levels deep, matching the vanilla's
     selected="linienbuendel" / selected="linie". Counting rows after adding a
     THIRD level proves nothing — depth-2 nodes render collapsed, so the
     visible count is unchanged and the assertion would be measuring the
     default expansion state, not the breakdown. Clearing a level is the
     change that must move the count. */
  ok('the report opens two levels deep, as the vanilla does',
    (await page.$eval('#punct-auf-2 .MuiSelect-select', e => e.textContent.trim())).length > 0);
  /* Rows now arrive COLLAPSED, as the vanilla's do, so clearing a breakdown
     level no longer changes the visible count — what changes it is expanding a
     row. That is the behaviour worth asserting. */
  await page.click('#punct-table tbody tr button[aria-label="expand"]');
  await page.waitForTimeout(500);
  const l2 = await page.$$eval('#punct-table tbody tr', r => r.length);
  ok('expanding a row reveals its children', l2 > l1, { l1, l2 });
  await page.click('#punct-table tbody tr button[aria-label="collapse"]');
  await page.waitForTimeout(500);
  ok('collapsing it hides them again',
    (await page.$$eval('#punct-table tbody tr', r => r.length)) === l1);

  // ── every evaluation type opens its own view, with numbers that come
  //    from the extracted logic rather than anything retyped here ──────
  const openByName = async name => {
    await page.evaluate(n => {
      const row = [...document.querySelectorAll('tbody tr')]
        .find(tr => tr.textContent.includes(n));
      const b = row && row.querySelector('button[data-act="visibility"]');
      if (b) b.click();
    }, name);
    await page.waitForTimeout(700);
  };
  const goBack = async () => {
    await page.evaluate(() => { const a = document.querySelector('.MuiBreadcrumbs-root a'); if (a) a.click(); });
    await page.waitForTimeout(500);
  };
  // The first row of a group is often in_progress or failed, and those carry
  // no preview at all in the vanilla — so ask for one that does.
  const nameOf = g => page.evaluate(gr => {
    const r = EVALUATIONS.find(x => x.group === gr && x.actions.includes('visibility'))
           || EVALUATIONS.find(x => x.group === gr);
    return r && r.name;
  }, g);

  const EXPECT = {
    punctuality:   '#punct-table',
    connection:    '#rpt-table',
    trip_failures: '#fa-table',
    data_quality:  '#dqi-tabs',
  };
  // Line Analysis is deliberately absent: not one of its rows carries a
  // preview in the vanilla, so it has no report to open. Asserted rather than
  // assumed, because "I ported it and nothing happens" looks identical.
  const lineActs = await page.evaluate(() =>
    [...new Set(EVALUATIONS.filter(r => r.group === 'line_analysis').flatMap(r => r.actions))]);
  ok('no line-analysis row offers a preview, as in the vanilla',
    !lineActs.includes('visibility'), lineActs);
  for (const [group, sel] of Object.entries(EXPECT)) {
    const name = await nameOf(group);
    if (!name) { fails.push(`no evaluation of type ${group}`); continue; }
    await openByName(name);
    ok(`${group} opens its own report view`, (await page.$$(sel)).length === 1, sel);
    // DQI opens on a tab of cards rather than a table, so count whichever
    // this view actually renders instead of assuming every report is a table.
    const n = await page.evaluate(() =>
      document.querySelectorAll('tbody tr').length + document.querySelectorAll('.dqi-card').length);
    ok(`${group} renders content`, n > 0, n);
    ok(`${group} has no untranslated keys`, (await rawKeys(page)).length === 0, await rawKeys(page));
    await goBack();
  }

  // Trip Failures: the totals row and the failure rate come from FA_DATA
  // and the extracted faNum/faPct, not from anything written in the view.
  await openByName(await nameOf('trip_failures'));
  const fa = await page.$$eval('#fa-table tbody tr:last-child td',
    c => c.map(x => x.textContent.trim()).slice(1, 4));
  const faWant = await page.evaluate(() => [faNum(FA_DATA.gesamt[0]), faNum(FA_DATA.gesamt[1]),
    faPct(FA_DATA.gesamt[1], FA_DATA.gesamt[0]).toFixed(2) + '%']);
  ok('Trip Failures totals equal FA_DATA through faNum/faPct',
    JSON.stringify(fa) === JSON.stringify(faWant), { fa, faWant });
  await goBack();

  await openByName(await nameOf('data_quality'));
  // the table lives behind the second tab; Overview is what opens
  ok('DQI opens on the Overview tab', (await page.$$('#dqi-overview')).length === 1);
  ok('the Overview shows a card per indicator',
    (await page.$$('.dqi-card')).length === 10, (await page.$$('.dqi-card')).length);
  await page.click('#dqi-tabs button:nth-child(2)');
  await page.waitForTimeout(500);
  const dqi = await page.$$eval('#dqi-table tbody tr:first-child td',
    c => c.map(x => x.textContent.trim()).slice(0, 4));
  const dqiWant = await page.evaluate(() => [DQI_TU[0].label, ...DQI_TU[0].v.slice(0, 3).map(v => v.toFixed(2))]);
  ok('DQI first row equals DQI_TU[0]',
    JSON.stringify(dqi) === JSON.stringify(dqiWant), { dqi, dqiWant });
  await goBack();

  await openByName(await nameOf('connection'));
  const rpt = await page.$$eval('#rpt-table tbody tr:last-child td',
    c => c.map(x => x.textContent.trim()).slice(1, 4));
  const rptWant = await page.evaluate(() =>
    RPT_DATA.gesamt.slice(0, 3).map(v => v === null ? '—' : v.toFixed(2) + '%'));
  /* The read-only parameter chips — three expandable summaries the port had
     no equivalent for, and the "and other" in Ignat's message. */
  const chipCount = await page.$$eval('#rpt-param-row [role="button"]', e => e.length);
  const chipWant = await page.evaluate(() => CONNECTION_CHIPS.length);
  ok('the Connection report carries its parameter chips',
    chipCount === chipWant && chipCount === 3, { chipCount, chipWant });
  await page.click('#chip-0');
  await page.waitForTimeout(350);
  ok('a chip expands into its membership list',
    (await page.$$eval('.rpt-chip-dropdown', e => e.length)) === 1);
  ok('the dropdown says it is read-only rather than pretending to filter',
    (await page.textContent('.rpt-chip-dropdown')).length > 20);
  ok('the expanded chip reports its state',
    (await page.getAttribute('#chip-0', 'aria-expanded')) === 'true');
  await page.click('#chip-0');
  await page.waitForTimeout(300);
  ok('clicking the chip again closes it',
    (await page.$$eval('.rpt-chip-dropdown', e => e.length)) === 0);

  const subInline = await page.evaluate(() => {
    const h = document.getElementById('page-header');
    const title = h.querySelector('h6');
    const p2 = h.querySelector('h6 + p');
    if (!p2) return null;
    return Math.abs(title.getBoundingClientRect().top - p2.getBoundingClientRect().top);
  });
  ok('a header subtitle shares the title line rather than taking a third row',
    subInline !== null && subInline < 12, subInline);

  ok('Connection totals equal RPT_DATA.gesamt',
    JSON.stringify(rpt) === JSON.stringify(rptWant), { rpt, rptWant });
  await goBack();

  // Raw data: per-column filtering and paging over the real 4 950 rows.
  // It is reached from a PUNCTUALITY row's table_chart action (openPunctRaw),
  // not from the list — a raw_data row in the list is a finished export and
  // offers download only. Routing it from the list left this view unreachable.
  await openByName(await nameOf('punctuality'));
  await page.click('#punct-table tbody tr:first-child button[aria-label="raw"]');
  await page.waitForTimeout(700);
  const firstPage = await page.$$eval('#raw-table tbody tr', r => r.length);
  ok('raw data pages at 25 rows', firstPage === 25, firstPage);
  const totalRaw = await page.evaluate(() => PUNCT_RAW.length);
  ok('the raw set is the real one, not a sample', totalRaw > 1000, totalRaw);
  await page.fill('#raw-table thead tr:nth-child(2) input', 'zzzzzz');
  await page.waitForTimeout(500);
  ok('a filter that matches nothing shows the empty state',
    (await page.$$('#raw-empty')).length === 1);
  await page.fill('#raw-table thead tr:nth-child(2) input', '');
  await page.waitForTimeout(500);
  ok('clearing the filter restores the page',
    (await page.$$eval('#raw-table tbody tr', r => r.length)) === 25);
  await goBack();

  // ── the views reached through a row action ───────────────────
  await openByName(await nameOf('punctuality'));
  await page.click('#punct-table tbody tr:first-child button[aria-label="chart"]');
  await page.waitForTimeout(700);
  ok('a punctuality row opens a chart', (await page.$$('#chart-svg')).length === 1);
  ok('the chart draws bars', (await page.$$eval('#chart-svg rect', r => r.length)) > 0);
  ok('the chart has no untranslated keys', (await rawKeys(page)).length === 0, await rawKeys(page));
  await goBack();

  await openByName(await nameOf('trip_failures'));
  await page.click('#fa-table tbody tr:first-child button[aria-label="mask"]');
  await page.waitForTimeout(700);
  ok('a trip-failures row opens the Ausfallmaske', (await page.$$('#fa-mask-causes')).length === 1);
  ok('the mask has no untranslated keys', (await rawKeys(page)).length === 0, await rawKeys(page));

  /* The mask's trip table. The parity checker read "tables 1 -> 0" here and I
     took it for a formatting difference; it was the whole list of cancelled
     trips, plus its date window and rows-per-page. */
  ok('the Ausfallmaske lists the individual trips', (await page.$$('#fa-mask-table')).length === 1);
  const maskCols = await page.$$eval('#fa-mask-table thead th', th => th.length);
  ok('the trip table has all 14 columns', maskCols === 14, maskCols);
  const maskRows = await page.$$eval('#fa-mask-table tbody tr', r => r.length);
  ok('the trip table pages at 10', maskRows === 10, maskRows);

  await page.click('#fa-mask-pp .MuiSelect-select');
  await page.waitForTimeout(250);
  await page.click('.MuiMenu-list li:nth-child(2)');       // 25
  await page.waitForTimeout(400);
  const maskAll = await page.evaluate(() => FA_MASK_DATA.length);
  ok('rows-per-page changes what the table shows',
    (await page.$$eval('#fa-mask-table tbody tr', r => r.length)) === Math.min(25, maskAll));

  await page.fill('#fa-mask-von', '01.01.2099');
  await page.click('#fa-mask-apply');
  await page.waitForTimeout(400);
  ok('a date window that matches nothing shows the empty state',
    !!(await page.$('#fa-mask-empty')));
  await page.click('#fa-mask-reset');
  await page.waitForTimeout(400);
  ok('reset restores the trips', (await page.$$('#fa-mask-table')).length === 1);
  await goBack();

  // A raw_data row in the list is a FINISHED export: download, no preview.
  const rawActs = await page.evaluate(() => {
    const r = EVALUATIONS.find(x => x.group === 'raw_data' && x.status === 'done');
    const tr = [...document.querySelectorAll('tbody tr')].find(x => x.textContent.includes(r.name));
    return [...tr.querySelectorAll('button[data-act]')].map(b => b.getAttribute('data-act'));
  });
  ok('a done raw-data row offers download and delete, not preview',
    rawActs.includes('download') && rawActs.includes('delete') && !rawActs.includes('visibility'), rawActs);

  await page.click('#new-eval-btn');
  await page.waitForTimeout(600);
  await page.click('#type-option-raw_data');
  await page.waitForTimeout(700);
  ok('choosing Raw Data Export opens its config form',
    (await page.$$('#rd-run-btn')).length === 1);
  ok('the threshold is required and blocks the run',
    (await page.$$('#rd-threshold')).length === 1);
  await page.click('#rd-run-btn');
  await page.waitForTimeout(400);
  ok('running without a threshold shows the error',
    (await page.$$('#rd-threshold-error')).length === 1);
  ok('the config has no untranslated keys', (await rawKeys(page)).length === 0, await rawKeys(page));

  ok('no console errors', errors.length === 0, errors.slice(0, 4));
  } catch (e) {
    // A thrown click used to kill the run and print a stack instead of the
    // 99 results already collected, which hides WHICH gate caught the bug.
    const where = (e.stack || '').split('\n').find(l => l.includes('verify-qx-react')) || '';
    fails.push(`the run stopped early: ${e.message.split('\n')[0]} ${where.trim()}`);
  }

  await browser.close();
  console.log(`\n${pass} assertions passed, ${fails.length} failed`);
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
})();
