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
  await page.click('.MuiMenu-list li:nth-child(2)');   // DE
  await page.waitForTimeout(400);
  const enHeading = await page.$eval('h5', e => e.textContent.trim());
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
  await page.click('tbody tr a');
  await page.waitForTimeout(700);

  ok('opening an evaluation lands on the punctuality report',
    (await page.$$('#punct-table')).length === 1);
  ok('three breakdown levels are offered',
    (await page.$$('#punct-auf-1, #punct-auf-2, #punct-auf-3')).length === 3);
  ok('no untranslated keys on the report', (await rawKeys(page)).length === 0, await rawKeys(page));

  const l1 = await page.$$eval('#punct-table tbody tr', r => r.length);
  ok('the first breakdown level renders rows', l1 > 5, l1);

  // The numbers must come from the extracted logic, not from anything
  // re-typed here: compare the Gesamt row against punctAggregate directly.
  const totals = await page.$$eval('#punct-table tbody tr:last-child td',
    c => c.map(x => x.textContent.trim()));
  const expect = await page.evaluate(() => {
    const a = punctAggregate(PUNCT_RECORDS);
    const f = n => Math.round(n).toLocaleString('de-CH');
    return [f(a.soll), f(a.ist), f(a.punkt), f(a.delta), a.wert.toFixed(2) + '%'];
  });
  ok('the totals row equals punctAggregate over every record',
    JSON.stringify(totals.slice(1, 6)) === JSON.stringify(expect), { totals: totals.slice(1, 6), expect });

  // the cascade must not offer a dimension already taken above
  await page.click('#punct-auf-2');
  await page.waitForTimeout(300);
  const lvl2 = await page.$$eval('.MuiMenu-list li', els => els.map(e => e.textContent.trim()));
  const lvl1Label = await page.$eval('#punct-auf-1 .MuiSelect-select', e => e.textContent.trim());
  ok('the second level cannot repeat the first level\'s dimension',
    !lvl2.includes(lvl1Label), { lvl1Label, lvl2 });
  await page.click('.MuiMenu-list li:first-child');
  await page.waitForTimeout(600);
  const l2 = await page.$$eval('#punct-table tbody tr', r => r.length);
  ok('adding a second level expands the tree', l2 > l1, { l1, l2 });

  // ── every evaluation type opens its own view, with numbers that come
  //    from the extracted logic rather than anything retyped here ──────
  const openByName = async name => {
    await page.evaluate(n => {
      const a = [...document.querySelectorAll('tbody a')].find(x => x.textContent.trim() === n);
      if (a) a.click();
    }, name);
    await page.waitForTimeout(700);
  };
  const goBack = async () => {
    await page.evaluate(() => { const a = document.querySelector('.MuiBreadcrumbs-root a'); if (a) a.click(); });
    await page.waitForTimeout(500);
  };
  const nameOf = g => page.evaluate(gr => {
    const r = EVALUATIONS.find(x => x.group === gr); return r && r.name;
  }, g);

  const EXPECT = {
    punctuality:   '#punct-table',
    connection:    '#rpt-table',
    trip_failures: '#fa-table',
    data_quality:  '#dqi-tabs',
    raw_data:      '#raw-table',
    line_analysis: '#punct-table',
  };
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
  ok('Connection totals equal RPT_DATA.gesamt',
    JSON.stringify(rpt) === JSON.stringify(rptWant), { rpt, rptWant });
  await goBack();

  // Raw data: per-column filtering and paging over the real 4 950 rows
  await openByName(await nameOf('raw_data'));
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

  ok('no console errors', errors.length === 0, errors.slice(0, 4));

  await browser.close();
  console.log(`\n${pass} assertions passed, ${fails.length} failed`);
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
})();
