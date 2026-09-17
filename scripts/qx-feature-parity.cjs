#!/usr/bin/env node
/**
 * qx-feature-parity.cjs — what does the vanilla prototype offer that the
 * React port does not?
 *
 * Ignat, 2026-09-15: "I just want to repeat all the functions. For example
 * at the moment I don't see overview in dattenqualitat report." He was
 * right, and finding that by eye is the problem: I had been checking each
 * view against my memory of it rather than against the thing itself.
 *
 * So this inventories the INTERACTIVE AFFORDANCES of every view in both —
 * tabs, buttons, selects, toggles — and prints what is missing. It reports;
 * it does not judge. Some gaps are deliberate (a chart the port renders
 * differently) and some are real. Its job is to make sure none are unknown.
 *
 * Usage: node scripts/qx-feature-parity.cjs
 */
const { chromium } = require('playwright');
const path = require('path');

const VANILLA = 'file://' + path.resolve(__dirname, '../projects/q-explorer-prototype/index.html');
const REACT   = 'file://' + path.resolve(__dirname, '../projects/q-explorer-mui/index.html');

/** Affordances of whatever is currently on screen, as stable labels. */
const affordances = (page, root) => page.evaluate(sel => {
  // Scoped, because the vanilla renders the whole app behind its login screen
  // — counting document-wide there reports six tables the user cannot see.
  const scope = (sel && document.querySelector(sel)) || document;
  const seen = { tabs: [], buttons: [], selects: [], tables: 0, inputs: 0, expanders: 0 };
  const vis = el => el.offsetParent !== null || getComputedStyle(el).position === 'fixed';
  const label = el => (el.getAttribute('aria-label') || el.textContent || '')
    .replace(/\s+/g, ' ').trim().slice(0, 40);

  for (const el of scope.querySelectorAll('[role="tab"], .dqi-tab, .MuiTab-root')) {
    if (vis(el)) seen.tabs.push(label(el));
  }
  for (const el of scope.querySelectorAll('button, a.btn, .MuiButton-root')) {
    if (!vis(el)) continue;
    const l = label(el);
    // icon-only buttons carry a ligature name, not prose — skip them here
    if (!l || /^[a-z_]+$/.test(l)) continue;
    seen.buttons.push(l);
  }
  // One entry per CONTROL. The vanilla wraps each native select in a
  // .mui-select with a visible trigger, so counting both doubles its total
  // and invents gaps that are not there.
  const controls = new Set();
  for (const el of scope.querySelectorAll('.mui-select, .MuiFormControl-root, select')) {
    if (!vis(el)) continue;
    // The language switcher is app chrome on every view, and the two build it
    // differently — a native <select> in the vanilla, a Button + Menu in the
    // port. Counting it charged the port a phantom missing control on SIX
    // views and buried the two gaps that were real.
    if (el.id === 'topbar-lang-select' || el.closest('#topbar-lang-select')) continue;
    if (el.id === 'lang-trigger') continue;
    if (el.closest('.mui-select') && !el.classList.contains('mui-select')) continue;
    if (el.closest('.MuiFormControl-root') && !el.classList.contains('MuiFormControl-root')) continue;
    controls.add(el);
  }
  seen.selects = [...controls].map(el => label(el).slice(0, 24));
  /* Anything that collapses. Ignat, 2026-09-17: "on evaluations page each
     section was an accordeon. Now they are not collapsable." Controls and
     tables both matched on that view, so counting only those had nothing to
     say — a static heading and an accordion header look identical to a census
     of selects. aria-expanded is what actually distinguishes them. */
  seen.expanders = [...scope.querySelectorAll('[aria-expanded]')].filter(vis)
    // a dropdown trigger also carries aria-expanded; counting those puts the
    // select census back in and hides the accordions this is here to find
    .filter(el => !el.matches('[role="combobox"], .mui-select-trigger, .MuiSelect-select')
               && !el.closest('.mui-select, .MuiSelect-select')).length;
  seen.tables = [...scope.querySelectorAll('table')].filter(vis).length;
  seen.inputs = [...scope.querySelectorAll('input')].filter(vis).length;
  return seen;
}, root || null);


/** Shell properties that hold across every view — measured once per app. */
const shellProbe = page => page.evaluate(() => {
  const bar = document.querySelector('#topbar') || document.querySelector('.MuiAppBar-root');
  if (!bar) return { barPos: 'none', barH: 0, barTop: false };
  const b = bar.getBoundingClientRect();
  return {
    barPos: getComputedStyle(bar).position,
    barH: Math.round(b.height),
    barTop: Math.round(b.top) === 0,
    barTopPx: Math.round(b.top),
  };
});

/**
 * Differences Ignat has ASKED for. Without these the checker reports agreed
 * decisions as regressions, and a checker that cries wolf is one nobody reads.
 *
 * They are printed, not hidden: a silent allowance is how a real gap hides
 * behind a deliberate one. The Zeitraum case also shows why the count metric
 * needs the note — the port dropped that filter and still totals the same,
 * because its search field is a MUI FormControl while the vanilla's is a bare
 * input. Same number, different composition. "ok" by coincidence is not "ok".
 */
const DELIBERATE = {
  'reports-list': [
    'Zeitraum filter removed on request 2026-09-17; the Period column sorts instead',
  ],
  'raw-punct': [
    'column filters are text inputs, not selects — multi-column filtering is MUI X Pro and the tier is unsettled',
  ],
};

const uniq = a => [...new Set(a.filter(Boolean))];

(async () => {
  const browser = await chromium.launch();

  /* ── vanilla: walk its views by id ─────────────────────────────── */
  const v = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await v.goto(VANILLA, { waitUntil: 'networkidle' });
  // The login screen is compared BEFORE it is dismissed. Signing in on the
  // first line is exactly why this checker could not see that the React port
  // had no login at all (Ignat, 2026-09-17: "There is no sign in").
  const vanillaLogin = await affordances(v, '#view-login');
  await v.fill('#login-email', 'a@b.c');
  await v.fill('#login-password', 'x');
  await v.click('.btn-login');
  await v.waitForTimeout(500);

  const VIEWS = ['login', 'reports-list', 'scheduled', 'wizard', 'report-punct', 'report-fa',
                 'report-dqi', 'report-connection', 'rohdaten', 'raw-punct',
                 'ausfallmaske', 'chart-punct', 'chart-fa', 'chart-connection'];
  const shell = {};
  shell.v = await shellProbe(v);
  const vanilla = { login: vanillaLogin };
  for (const view of VIEWS.filter(x => x !== 'login')) {
    await v.evaluate(n => window.showView && window.showView(n), view);
    await v.waitForTimeout(300);
    vanilla[view] = await affordances(v);
  }
  await v.close();

  /* ── react: walk it the way a user does ────────────────────────── */
  const r = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await r.goto(REACT, { waitUntil: 'networkidle' });
  await r.waitForTimeout(1600);

  const react = {};
  react['login'] = await affordances(r, '#view-login');
  if (await r.$('#login-email')) {
    await r.fill('#login-email', 'a@b.c');
    await r.fill('#login-password', 'x');
    await r.click('#login-submit');
    await r.waitForTimeout(700);
  }
  shell.r = await shellProbe(r);
  react['reports-list'] = await affordances(r);

  const openGroup = async group => {
    await r.evaluate(g => {
      const row = EVALUATIONS.find(x => x.group === g && x.actions.includes('visibility'))
               || EVALUATIONS.find(x => x.group === g);
      const tr = [...document.querySelectorAll('tbody tr')].find(x => x.textContent.includes(row.name));
      const b = tr && tr.querySelector('button[data-act="visibility"]');
      if (b) b.click();
    }, group);
    await r.waitForTimeout(700);
  };
  const back = async () => {
    await r.evaluate(() => { const a = document.querySelector('.MuiBreadcrumbs-root a'); if (a) a.click(); });
    await r.waitForTimeout(500);
  };

  const MAP = {
    'report-punct': 'punctuality', 'report-fa': 'trip_failures',
    'report-dqi': 'data_quality', 'report-connection': 'connection',
  };
  for (const [view, group] of Object.entries(MAP)) {
    await openGroup(group);
    react[view] = await affordances(r);
    await back();
  }
  // the raw table hangs off a punctuality row (openPunctRaw), not off a
  // raw_data row — a raw_data row in the list is a finished export
  await openGroup('punctuality');
  await r.click('#punct-table tbody tr:first-child button[aria-label="raw"]').catch(() => {});
  await r.waitForTimeout(600);
  react['raw-punct'] = await affordances(r);
  await r.evaluate(() => { const a = document.querySelector('.MuiBreadcrumbs-root a'); if (a) a.click(); });
  await r.waitForTimeout(500);

  // the chart / mask / rohdaten screens are reached through a row action
  await openGroup('punctuality');
  await r.click('#punct-table tbody tr:first-child button[aria-label="chart"]').catch(() => {});
  await r.waitForTimeout(600);
  react['chart-punct'] = await affordances(r);
  await r.evaluate(() => { const a = document.querySelector('.MuiBreadcrumbs-root a'); if (a) a.click(); });
  await r.waitForTimeout(500);

  await openGroup('trip_failures');
  await r.click('#fa-table tbody tr:first-child button[aria-label="mask"]').catch(() => {});
  await r.waitForTimeout(600);
  react['ausfallmaske'] = await affordances(r);
  await r.evaluate(() => { const a = document.querySelector('.MuiBreadcrumbs-root a'); if (a) a.click(); });
  await r.waitForTimeout(500);

  await openGroup('trip_failures');
  await r.click('#fa-table tbody tr:first-child button[aria-label="chart"]').catch(() => {});
  await r.waitForTimeout(600);
  react['chart-fa'] = await affordances(r);
  await r.evaluate(() => { const a = document.querySelector('.MuiBreadcrumbs-root a'); if (a) a.click(); });
  await r.waitForTimeout(500);

  await openGroup('connection');
  await r.click('#rpt-table tbody tr:first-child button[aria-label="chart"]').catch(() => {});
  await r.waitForTimeout(600);
  react['chart-connection'] = await affordances(r);
  await r.evaluate(() => { const a = document.querySelector('.MuiBreadcrumbs-root a'); if (a) a.click(); });
  await r.waitForTimeout(500);

  // Raw Data Export config is reached from New evaluation, not from a row —
  // a row in the list is a FINISHED export and opens the table.
  await r.click('#new-eval-btn');
  await r.waitForTimeout(600);
  await r.click('#eval-type');
  await r.waitForTimeout(300);
  await r.evaluate(() => {
    const li = [...document.querySelectorAll('.MuiMenu-list li')].find(x => /Raw Data|Rohdaten/.test(x.textContent));
    if (li) li.click();
  });
  await r.waitForTimeout(700);
  react['rohdaten'] = await affordances(r);
  await back();

  await r.click('#new-eval-btn');
  await r.waitForTimeout(600);
  react['wizard'] = await affordances(r);
  await back();
  await r.click('#qx-nav-trigger');
  await r.waitForTimeout(250);
  await r.click('.MuiMenu-list li:nth-child(2)');
  await r.waitForTimeout(500);
  react['scheduled'] = await affordances(r);
  await r.close();
  await browser.close();

  /* ── report ────────────────────────────────────────────────────── */
  console.log('\nFeature parity — vanilla vs React port\n');

  // Shell properties are true on every view at once, so they belong here
  // rather than in the per-view table. The top bar being position:fixed is
  // one of them, and no census of controls would ever notice it.
  const shellLines = [];
  for (const [k, want, got] of [
    ['top bar position', shell.v.barPos, shell.r.barPos],
    ['top bar height', shell.v.barH, shell.r.barH],
  ]) if (String(want) !== String(got)) shellLines.push(`${k}: ${want} -> ${got}`);
  // The bar's ABSOLUTE top is not comparable: the vanilla still carries the
  // variant-switcher bar above its own chrome, and the React port's banner was
  // removed on 2026-09-17. What matters is that each sits at the top of its own
  // app — for the port, with no banner left, that means the viewport edge.
  if (shell.r.barTopPx !== 0)
    shellLines.push(`port top bar is ${shell.r.barTopPx}px from the viewport top, not pinned to it`);
  console.log(`${'shell'.padEnd(20)} ${shellLines.length ? shellLines.join('\n' + ' '.repeat(21)) : 'ok'}`);
  let gaps = shellLines.length;
  for (const view of VIEWS) {
    const a = vanilla[view];
    const b = react[view];
    if (!b) {
      console.log(`${view.padEnd(20)} NOT PORTED`);
      gaps++;
      continue;
    }
    const missingTabs = uniq(a.tabs).filter(x => !uniq(b.tabs).includes(x));
    const lines = [];
    if (missingTabs.length) lines.push(`tabs: ${missingTabs.join(' | ')}`);
    // Comparing select LABELS is hopeless across the two: the vanilla's
    // trigger text is the option list, the port's is the MUI label. Counting
    // them is the honest signal — a view with fewer controls is missing
    // controls. A noisy check that cries wolf is worse than no check.
    if (a.selects.length > b.selects.length)
      lines.push(`controls ${a.selects.length} -> ${b.selects.length}`);
    if (a.tables > b.tables) lines.push(`tables ${a.tables} -> ${b.tables}`);
    if (a.expanders > b.expanders)
      lines.push(`collapsible ${a.expanders} -> ${b.expanders}`);
    if (lines.length) {
      console.log(`${view.padEnd(20)} ${lines.join('\n' + ' '.repeat(21))}`);
      gaps += lines.length;
    } else {
      console.log(`${view.padEnd(20)} ok`);
    }
    for (const d of DELIBERATE[view] || [])
      console.log(`${' '.repeat(20)} · by request: ${d}`);
  }
  console.log(`\n${gaps} gap(s)\n`);
})();
