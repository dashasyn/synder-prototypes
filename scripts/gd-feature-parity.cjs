#!/usr/bin/env node
/**
 * gd-feature-parity.cjs — drive BOTH prototypes and print the gaps.
 *
 * MUI_PORT_BRIEF.md §5: "A check that only asserts what you remembered to
 * assert cannot find a missing screen." On the Q-Explorer port this style of
 * check found two bugs that 81 passing assertions had nothing to say about —
 * a view nothing navigated to, and a routing rule that made a whole screen
 * unreachable.
 *
 * So this script does not assert a remembered list. It:
 *   1. walks the vanilla prototype through every view and inventories it
 *   2. EXPLORES the React port from its real entry points — nav menus, the
 *      variant switcher, table rows, row actions — and records where it
 *      actually landed
 *   3. fails if a registered view is unreachable, and prints every structural
 *      difference (titles, columns, row counts, actions) for the rest
 *
 * Usage: node scripts/gd-feature-parity.cjs     (needs the :8777 server)
 */
const { chromium } = require('playwright');
const os = require('os');

const CHROME = os.homedir() + '/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const VANILLA = 'http://localhost:8777/projects/grunddaten-editor/index.html';
const REACT = 'http://localhost:8777/projects/grunddaten-mui/index.html';

const norm = s => (s || '').replace(/\s+/g, ' ').replace(/^[+✕−✓⧉·\s]+/, '').trim().toLowerCase();

/** The same inventory on both sides, read out of the DOM, not out of memory. */
const INVENTORY = () => {
  const txt = el => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const n = s => s.replace(/\s+/g, ' ').replace(/^[+✕−✓⧉·\s]+/, '').trim().toLowerCase();
  const main = document.querySelector('main') || document.getElementById('content');
  if (!main) return null;
  const heading = main.querySelector('h1, h6, .MuiTypography-h6');
  const table = main.querySelector('table');
  return {
    title: heading ? txt(heading) : '',
    columns: table ? [...table.querySelectorAll('thead th')].map(th => n(txt(th))).filter(Boolean) : [],
    rows: table ? table.querySelectorAll('tbody tr').length : 0,
    tabs: [...main.querySelectorAll('[role=tab], .tab')].map(x => n(txt(x)).replace(/\d+$/, '')),
    actions: [...new Set([...main.querySelectorAll('button')]
      .map(b => n(txt(b)))
      .filter(s => s && s.length > 2 && !/^[a-z_]+$/.test(s) === false ? false : true)
      .filter(s => s && s.length > 2))],
    fields: main.querySelectorAll('input, textarea').length,
  };
};

/* ── the vanilla, driven through its own navigate() ─────────────────── */
/* Every id here is READ OUT OF THE DATA, never typed in, and each one picks
   the row the port's exploration lands on — otherwise the two sides are
   inventoried on different records and every row count looks like a bug.
   A typed 'WB' did exactly that on the first run: the vanilla rendered an
   empty "new schedule" page and the checker reported 0 → 13 rows. */
const VANILLA_ROUTES = [
  ['stations',      p => p.evaluate(() => navigate('stations'))],
  ['detail',        p => p.evaluate(() => navigate('detail', stations[0].id, stations[0].lines[0]))],
  ['lines',         p => p.evaluate(() => navigate('lines'))],
  ['lineDetail',    p => p.evaluate(() => navigate('lineDetail', lineData[0].id))],
  ['lineMgmt',      p => p.evaluate(() => navigate('lineMgmt'))],
  ['spc',           p => p.evaluate(() => navigate('spc'))],
  ['texts',         p => p.evaluate(() => navigate('texts'))],
  ['sounds',        p => p.evaluate(() => navigate('sounds'))],
  ['playlistDetail', p => p.evaluate(() => navigate('playlistDetail', playlists[0].id))],
  ['music',         p => p.evaluate(() => { setMusicVer('events'); })],
  ['musicEvent',    p => p.evaluate(() => navigate('musicEvent', musicEvents[0].id))],
  ['musicStations', p => p.evaluate(() => { setMusicVer('stations'); })],
  ['musicStation',  p => p.evaluate(() => {
    // the vanilla's own sort, so this is the first row of the list
    const order = lineData.map(l => l.id);
    const first = stationSchedules.slice().sort((a, b) =>
      (order.indexOf(a.lineId) - order.indexOf(b.lineId)) ||
      getStation(a.stationId).name.localeCompare(getStation(b.stationId).name))[0];
    openStationSchedule(first.stationId, first.lineId);
  })],
];

async function inventoryVanilla(browser) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(VANILLA, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  const out = {};
  for (const [view, go] of VANILLA_ROUTES) {
    try { await go(p); await p.waitForTimeout(250); out[view] = await p.evaluate(INVENTORY); }
    catch (e) { out[view] = { error: e.message.split('\n')[0] }; }
  }
  await p.close();
  return out;
}

/* ── the React port, EXPLORED rather than routed ────────────────────── */
async function exploreReact(browser) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(REACT, { waitUntil: 'networkidle' });
  await p.waitForSelector('main[data-view]');
  await p.waitForTimeout(400);

  const registered = await p.evaluate(() => Object.keys(VIEWS));
  const at = () => p.getAttribute('main[data-view]', 'data-view');
  const found = {};
  const record = async view => {
    if (!found[view]) found[view] = await p.evaluate(INVENTORY);
  };

  // Exploration clicks things that open dialogs (a ⋮ menu, a delete confirm).
  // Escape belongs to the overlay first, so clear it before moving on —
  // without this the walk deadlocks on the first modal it happens to open.
  const clearOverlays = async () => {
    for (let i = 0; i < 3; i++) {
      if (!(await p.$('.MuiDialog-root, .MuiMenu-root'))) break;
      await p.keyboard.press('Escape');
      await p.waitForTimeout(250);
    }
  };

  const openMenu = async (label, dataView) => {
    await clearOverlays();
    await p.click(`header button[data-nav="${label}"]`);
    await p.waitForSelector('.MuiMenu-list', { timeout: 4000 });
    await p.click(`.MuiMenu-list li[data-view="${dataView}"]`);
    await p.waitForTimeout(450);
  };

  // seeds: everything the top navigation can reach on its own
  const seeds = [
    ['cfg', 'stations'], ['cfg', 'lines'], ['cfg', 'spc'],
    ['cfg', 'texts'], ['cfg', 'sounds'], ['cfg', 'lineMgmt'],
    ['evr', 'music'],
  ];

  for (const [menu, dv] of seeds) {
    await openMenu(menu, dv);
    await record(await at());

    // …then follow what the page itself offers: tabs, rows, row actions
    const tabs = await p.$$('[role=tab]');
    for (let i = 1; i < tabs.length; i++) {
      const fresh = await p.$$('[role=tab]');
      if (!fresh[i]) break;
      await fresh[i].click(); await p.waitForTimeout(350);
      await record(await at());
      await drill(p, record, at, clearOverlays);
      await openMenu(menu, dv);
    }
    await drill(p, record, at, clearOverlays);
    await openMenu(menu, dv);
  }

  // the variant switcher is the only route to the other music version
  for (const btn of ['#vs-1', '#vs-2']) {
    await clearOverlays();
    await p.click(btn);
    await p.waitForTimeout(500);
    await record(await at());
    await drill(p, record, at, clearOverlays);
    await clearOverlays();
  }

  await p.close();
  return { registered, found, errors };
}

/** From a list view, take every route the page offers into a detail view. */
async function drill(p, record, at, clearOverlays) {
  await clearOverlays();
  const before = await at();
  const attempts = [
    () => p.click('tbody tr:first-child button:has-text("Bearbeiten")', { timeout: 1500 }),
    () => p.click('tbody tr:first-child button:has-text("Edit")', { timeout: 1500 }),
    () => p.click('tbody tr:first-child a', { timeout: 1500 }),
    () => p.click('tbody tr:first-child', { timeout: 1500 }),
  ];
  for (const go of attempts) {
    try {
      await go();
      await p.waitForTimeout(500);
      const now = await at();
      if (now === before) { await clearOverlays(); continue; }
      if (now !== before) {
        await record(now);
        // back out the way a user would — the breadcrumb, never a back button
        const crumb = await p.$('.MuiBreadcrumbs-root button');
        if (crumb) { await crumb.click(); await p.waitForTimeout(400); }
        return;
      }
    } catch (e) { /* that route does not exist here; try the next */ }
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const van = await inventoryVanilla(browser);
  const { registered, found, errors } = await exploreReact(browser);
  await browser.close();

  const gaps = [];

  console.log('── reachability (exploration, not a remembered list)');
  const unreachable = registered.filter(v => !found[v]);
  for (const v of registered) console.log(`  ${found[v] ? '✓' : '✗'} ${v}`);
  if (unreachable.length) gaps.push(`unreachable views: ${unreachable.join(', ')}`);

  const orphan = Object.keys(van).filter(v => !registered.includes(v));
  if (orphan.length) gaps.push(`views the vanilla has and the port does not: ${orphan.join(', ')}`);

  console.log('\n── structure, vanilla vs port');
  for (const v of Object.keys(van)) {
    const a = van[v], b = found[v];
    if (!a || a.error) { console.log(`  ? ${v.padEnd(15)} vanilla route failed: ${a && a.error}`); continue; }
    if (!b) continue;
    const notes = [];
    if (a.columns.length !== b.columns.length)
      notes.push(`columns ${a.columns.length}→${b.columns.length} [${a.columns}] vs [${b.columns}]`);
    else {
      const diff = a.columns.filter((c, i) => c !== b.columns[i]);
      if (diff.length) notes.push(`column labels differ: ${diff.join(' / ')}`);
    }
    if (a.rows !== b.rows) notes.push(`rows ${a.rows} → ${b.rows}`);
    if (a.tabs.length !== b.tabs.length) notes.push(`tabs ${a.tabs.length} → ${b.tabs.length}`);
    const missingActions = a.actions.filter(x => !b.actions.some(y => y.includes(x) || x.includes(y)));
    if (missingActions.length) notes.push(`actions only in the vanilla: ${missingActions.join(' · ')}`);
    console.log(`  ${notes.length ? '·' : '✓'} ${v.padEnd(15)} ${notes.join('\n                    ') || 'same shape'}`);
    if (a.rows !== b.rows) gaps.push(`${v}: row count ${a.rows} → ${b.rows}`);
    if (a.columns.length !== b.columns.length) gaps.push(`${v}: column count ${a.columns.length} → ${b.columns.length}`);
  }

  if (errors.length) { console.log('\n── JS errors during exploration'); errors.forEach(e => console.log('  ' + e)); }

  console.log('\n' + (gaps.length ? `${gaps.length} gap(s):` : 'no gaps'));
  gaps.forEach(g => console.log('  ✗ ' + g));
  process.exit(unreachable.length || errors.length ? 1 : 0);
})();
