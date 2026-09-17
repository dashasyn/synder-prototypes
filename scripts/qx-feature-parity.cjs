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
  const seen = { tabs: [], buttons: [], selects: [], tables: 0, inputs: 0 };
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
  seen.tables = [...scope.querySelectorAll('table')].filter(vis).length;
  seen.inputs = [...scope.querySelectorAll('input')].filter(vis).length;
  return seen;
}, root || null);

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
  react['reports-list'] = await affordances(r);

  const openGroup = async group => {
    await r.evaluate(g => {
      const row = EVALUATIONS.find(x => x.group === g && x.actions.includes('visibility'))
               || EVALUATIONS.find(x => x.group === g);
      const tr = [...document.querySelectorAll('tbody tr')].find(x => x.textContent.includes(row.name));
      const b = tr && tr.querySelector('button[aria-label="view"]');
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
  let gaps = 0;
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
    if (lines.length) {
      console.log(`${view.padEnd(20)} ${lines.join('\n' + ' '.repeat(21))}`);
      gaps += lines.length;
    } else {
      console.log(`${view.padEnd(20)} ok`);
    }
  }
  console.log(`\n${gaps} gap(s)\n`);
})();
