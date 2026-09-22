#!/usr/bin/env node
/**
 * qx-content-parity.cjs — does the port show the same NUMBERS as the vanilla?
 *
 * Ignat, 2026-09-22: "Please check reports again and again. All of them are
 * still missing parts... I need you to repeat all functions, big numbers,
 * small numbers, graphs, tables."
 *
 * qx-feature-parity.cjs counts affordances — controls, tables, collapsibles.
 * It answers "is the control there". It cannot answer "does the table have the
 * same columns", "is the KPI the same number", "does the chart draw the same
 * bars", and every gap Ignat has found this week has been of that kind.
 *
 * So this one compares CONTENT, per view, between the two prototypes:
 *   · tab labels
 *   · every table's column headers and row count
 *   · the first rows of cell values
 *   · KPI / big numbers (any standalone numeric text >= 16px)
 *   · chart geometry (bar count, and the bar heights as ratios)
 *
 * Normalisation is the whole difficulty. Two deliberate differences are
 * folded out rather than reported forever:
 *   · dates — the port renders "26 May 2026", the vanilla "26.05.2026"
 *     (Ignat, 2026-09-22). Both are reduced to yyyy-mm-dd before comparing.
 *   · whitespace and the Swiss thousands apostrophe.
 *
 * Usage: node scripts/qx-content-parity.cjs [view ...]
 */
const { chromium } = require('playwright');
const path = require('path');

/* Both walks must open the SAME evaluation. "First row with a preview" is not
   the same rule on both sides once the DOM order differs, and the punctuality
   figures are scaled per row — so a mismatched pair reports a content gap that
   is really just two different evaluations. Pick the names up front. */
const vm = require('vm');
const fsx = require('fs');
const dataCtx = { console };
vm.createContext(dataCtx);
vm.runInContext(
  fsx.readFileSync(path.resolve(__dirname, '../projects/q-explorer-mui/i18n.js'), 'utf8') + '\n' +
  fsx.readFileSync(path.resolve(__dirname, '../projects/q-explorer-mui/data.js'), 'utf8'), dataCtx);
const TARGET = {};
for (const g of ['punctuality', 'trip_failures', 'data_quality', 'connection']) {
  const r = dataCtx.EVALUATIONS.find(x => x.group === g && x.actions.includes('visibility'))
         || dataCtx.EVALUATIONS.find(x => x.group === g);
  TARGET[g] = r && r.name;
}

const VANILLA = 'file://' + path.resolve(__dirname, '../projects/q-explorer-prototype/index.html');
const REACT   = 'file://' + path.resolve(__dirname, '../projects/q-explorer-mui/index.html');

/* ── content probe, run in both pages ─────────────────────────────── */
const probe = page => page.evaluate(() => {
  const vis = el => el.offsetParent !== null || getComputedStyle(el).position === 'fixed';
  const MON = { jan: 1, feb: 2, mar: 3, mär: 3, apr: 4, may: 5, mai: 5, jun: 6, jul: 7,
                aug: 8, sep: 9, oct: 10, okt: 10, nov: 11, dec: 12, dez: 12 };
  const norm = s => String(s)
    // "26 May 2026" and "26.05.2026" both become 2026-05-26
    .replace(/(\d{1,2})\s+([A-Za-zä]{3})[a-zä]*\s+(\d{4})/g,
      (_, d, m, y) => `${y}-${String(MON[m.toLowerCase()] || 0).padStart(2, '0')}-${d.padStart(2, '0')}`)
    .replace(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g,
      (_, d, m, y) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
    .replace(/[’' ]/g, '')          // Swiss thousands apostrophe, nbsp
    .replace(/\s+/g, ' ').trim();

  const tables = [...document.querySelectorAll('table')].filter(vis).map(t => ({
    headers: [...t.querySelectorAll('thead th')].map(th => norm(th.textContent)).filter(Boolean),
    rows: [...t.querySelectorAll('tbody tr')].filter(vis).length,
    sample: [...t.querySelectorAll('tbody tr')].filter(vis).slice(0, 3)
      .map(r => [...r.children].map(c => norm(c.textContent)).filter(x => x !== '')),
  }));

  // "big numbers": standalone numeric text rendered at 16px or more
  const bigNumbers = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.children.length) continue;
    const tx = norm(el.textContent);
    if (!/^[-+]?[\d.,%\s]+$/.test(tx) || tx.length < 1 || !/\d/.test(tx)) continue;
    if (parseFloat(getComputedStyle(el).fontSize) < 16) continue;
    if (el.closest('table')) continue;                 // table cells are covered above
    bigNumbers.push(tx);
  }

  const tabs = [...document.querySelectorAll('[role="tab"], .dqi-tab, .MuiTab-root')]
    .filter(vis).map(e => norm(e.textContent)).filter(Boolean);

  // chart geometry: bar heights as ratios, so scale differences do not matter
  const charts = [...document.querySelectorAll('svg')].filter(vis).map(svg => {
    const bars = [...svg.querySelectorAll('rect')]
      .map(r => +r.getAttribute('height') || 0).filter(h => h > 1);
    const max = Math.max(1, ...bars);
    return { bars: bars.length, shape: bars.map(h => Math.round(h / max * 20)) };
  }).filter(c => c.bars > 1);

  return { tables, bigNumbers: bigNumbers.sort(), tabs, charts };
});

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  const browser = await chromium.launch();

  /* ── vanilla: walk by view id ──────────────────────────────────── */
  const v = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await v.goto(VANILLA, { waitUntil: 'networkidle' });
  await v.fill('#login-email', 'a@b.c'); await v.fill('#login-password', 'x');
  await v.click('.btn-login'); await v.waitForTimeout(500);

  const VIEWS = process.argv.slice(2).length ? process.argv.slice(2)
    : ['report-punct', 'report-fa', 'report-dqi', 'report-connection',
       'raw-punct', 'ausfallmaske', 'chart-punct', 'chart-fa', 'chart-connection'];
  /* The vanilla's reports are RENDERED BY THE ROW ACTION — showPunctReport(this)
     and friends — not by showView(). Walking it with showView() gave a report
     shell with an empty tbody, so the first run of this checker compared an
     empty vanilla against a populated port and printed "rows 0 -> 44" as if
     the port had invented rows. Drive it the way a user does. */
  const vOpenGroup = async group => {
    await v.evaluate(() => window.showView('reports-list'));
    await v.waitForTimeout(300);
    await v.evaluate(name => {
      const tr = [...document.querySelectorAll('tr[data-name]')]
        .find(x => x.dataset.name === name);
      const btn = tr && tr.querySelector('.action-preview');
      if (btn) btn.click();
    }, TARGET[group]);
    await v.waitForTimeout(700);
  };
  const vRowAction = async (icon) => {
    await v.evaluate(ic => {
      const b = [...document.querySelectorAll('.view.active button')]
        .find(x => (x.querySelector('.material-icons') || {}).textContent === ic);
      if (b) b.click();
    }, icon);
    await v.waitForTimeout(700);
  };

  const van = {};
  const VGROUP = { 'report-punct': 'punctuality', 'report-fa': 'trip_failures',
                   'report-dqi': 'data_quality', 'report-connection': 'connection' };
  for (const [view, g] of Object.entries(VGROUP)) {
    if (!VIEWS.includes(view)) continue;
    await vOpenGroup(g); van[view] = await probe(v);
  }
  if (VIEWS.includes('raw-punct')) {
    await vOpenGroup('punctuality'); await vRowAction('table_chart');
    van['raw-punct'] = await probe(v);
  }
  if (VIEWS.includes('chart-punct')) {
    await vOpenGroup('punctuality'); await vRowAction('bar_chart');
    van['chart-punct'] = await probe(v);
  }
  if (VIEWS.includes('ausfallmaske')) {
    await vOpenGroup('trip_failures'); await vRowAction('grid_on');
    van['ausfallmaske'] = await probe(v);
  }
  if (VIEWS.includes('chart-fa')) {
    await vOpenGroup('trip_failures'); await vRowAction('bar_chart');
    van['chart-fa'] = await probe(v);
  }
  if (VIEWS.includes('chart-connection')) {
    await vOpenGroup('connection'); await vRowAction('bar_chart');
    van['chart-connection'] = await probe(v);
  }
  await v.close();

  /* ── react: walk it the way a user does ────────────────────────── */
  const r = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await r.goto(REACT, { waitUntil: 'networkidle' }); await r.waitForTimeout(1500);
  await r.fill('#login-email', 'a@b.c'); await r.fill('#login-password', 'x');
  await r.click('#login-submit'); await r.waitForTimeout(800);

  const open = async group => {
    await r.evaluate(name => {
      const tr = [...document.querySelectorAll('tbody tr')].find(x => x.textContent.includes(name));
      const b = tr && tr.querySelector('button[data-act="visibility"]');
      if (b) b.click();
    }, TARGET[group]);
    await r.waitForTimeout(800);
  };
  const back = async () => {
    await r.evaluate(() => { const a = document.querySelector('.MuiBreadcrumbs-root a'); if (a) a.click(); });
    await r.waitForTimeout(500);
  };
  const rowAction = async (table, act) => {
    await r.click(`${table} tbody tr:first-child button[aria-label="${act}"]`).catch(() => {});
    await r.waitForTimeout(700);
  };

  const react = {};
  const GROUP = { 'report-punct': 'punctuality', 'report-fa': 'trip_failures',
                  'report-dqi': 'data_quality', 'report-connection': 'connection' };
  for (const [view, g] of Object.entries(GROUP)) {
    if (!VIEWS.includes(view)) continue;
    await open(g); react[view] = await probe(r); await back();
  }
  if (VIEWS.includes('raw-punct')) {
    await open('punctuality'); await rowAction('#punct-table', 'raw');
    react['raw-punct'] = await probe(r); await back(); await back();
  }
  if (VIEWS.includes('chart-punct')) {
    await open('punctuality'); await rowAction('#punct-table', 'chart');
    react['chart-punct'] = await probe(r); await back(); await back();
  }
  if (VIEWS.includes('ausfallmaske')) {
    await open('trip_failures'); await rowAction('#fa-table', 'mask');
    react['ausfallmaske'] = await probe(r); await back(); await back();
  }
  if (VIEWS.includes('chart-fa')) {
    await open('trip_failures'); await rowAction('#fa-table', 'chart');
    react['chart-fa'] = await probe(r); await back(); await back();
  }
  if (VIEWS.includes('chart-connection')) {
    await open('connection'); await rowAction('#rpt-table', 'chart');
    react['chart-connection'] = await probe(r); await back(); await back();
  }
  await r.close(); await browser.close();

  /* ── report ────────────────────────────────────────────────────── */
  console.log('\nContent parity — vanilla vs React port\n');
  let gaps = 0;
  for (const view of VIEWS) {
    const a = van[view], b = react[view];
    const lines = [];
    if (!b) { console.log(`${view.padEnd(20)} NOT REACHED`); gaps++; continue; }

    if (!eq(a.tabs, b.tabs)) lines.push(`tabs      ${JSON.stringify(a.tabs)} -> ${JSON.stringify(b.tabs)}`);

    const at = a.tables, bt = b.tables;
    if (at.length !== bt.length) lines.push(`tables    ${at.length} -> ${bt.length}`);
    at.forEach((ta, i) => {
      const tb = bt[i];
      if (!tb) return;
      const missing = ta.headers.filter(h => !tb.headers.includes(h));
      const extra = tb.headers.filter(h => !ta.headers.includes(h));
      if (missing.length) lines.push(`t${i} cols   missing ${JSON.stringify(missing.slice(0, 8))}`);
      if (extra.length) lines.push(`t${i} cols   extra   ${JSON.stringify(extra.slice(0, 6))}`);
      if (ta.rows !== tb.rows) lines.push(`t${i} rows   ${ta.rows} -> ${tb.rows}`);
      const firstA = (ta.sample[0] || []).join(' | ');
      const firstB = (tb.sample[0] || []).join(' | ');
      if (firstA && firstA !== firstB)
        lines.push(`t${i} row0   ${firstA.slice(0, 90)}\n${' '.repeat(21)}       -> ${firstB.slice(0, 90)}`);
    });

    const missNum = a.bigNumbers.filter(n => !b.bigNumbers.includes(n));
    if (missNum.length) lines.push(`numbers   missing ${JSON.stringify(missNum.slice(0, 10))}`);
    if (a.bigNumbers.length !== b.bigNumbers.length)
      lines.push(`numbers   ${a.bigNumbers.length} -> ${b.bigNumbers.length}`);

    if (a.charts.length !== b.charts.length)
      lines.push(`charts    ${a.charts.length} -> ${b.charts.length}`);
    a.charts.forEach((ca, i) => {
      const cb = b.charts[i]; if (!cb) return;
      if (ca.bars !== cb.bars) lines.push(`chart${i} bars ${ca.bars} -> ${cb.bars}`);
      else if (!eq(ca.shape, cb.shape)) lines.push(`chart${i} shape differs`);
    });

    if (lines.length) { console.log(`${view.padEnd(20)} ${lines.join('\n' + ' '.repeat(21))}`); gaps += lines.length; }
    else console.log(`${view.padEnd(20)} ok`);
  }
  console.log(`\n${gaps} content gap(s)\n`);
})();
