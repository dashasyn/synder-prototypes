// Verifies variant 8 (Groups + scoped statuses) in filtering-options/index.html.
// Counts are cross-checked against an INDEPENDENT filter over the dataset
// parsed out of the source, so nothing is taken on trust.
const fs = require('fs');
const { JSDOM } = require('/tmp/node_modules/jsdom');

const FILE = '/home/ubuntu/.openclaw/workspace/filtering-options/index.html';
const html = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
    if (cond) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  -> ' + extra : '')); }
}
function eq(name, actual, expected) {
    ok(name + ' (= ' + JSON.stringify(expected) + ')', actual === expected, 'got ' + JSON.stringify(actual));
}

// ---- independent oracle -------------------------------------------------
const ROW_RE = /\{ date: '([\d-]+)',\s*customer: '([^']+)',\s*platform: '([^']+)',\s*type: '([^']+)',\s*amount: ([\d.]+),\s*status: '([^']+)'\s*\}/g;
const DATA = [];
let m;
while ((m = ROW_RE.exec(html)) !== null) {
    DATA.push({ date: m[1], customer: m[2], platform: m[3], type: m[4], amount: parseFloat(m[5]), status: m[6] });
}
const TODAY = '2026-04-30';
const W = { all: null, '7d': ['2026-04-24', TODAY], '30d': ['2026-04-01', TODAY],
            '90d': ['2026-01-30', TODAY], month: ['2026-04-01','2026-04-30'],
            lastmonth: ['2026-03-01','2026-03-31'] };
function oracle(f) {
    f = f || {};
    return DATA.filter(t => {
        const w = W[f.date || 'all'];
        if (w && !(t.date >= w[0] && t.date <= w[1])) return false;
        if (f.status && f.status.length && f.status.indexOf(t.status) === -1) return false;
        if (f.platform && f.platform.length && f.platform.indexOf(t.platform) === -1) return false;
        if (f.type && f.type.length && f.type.indexOf(t.type) === -1) return false;
        if (f.customer && f.customer !== 'all' && t.customer !== f.customer) return false;
        return true;
    });
}
const BASE = { date: '90d' };
// Taxonomy parsed from source so the suite can't drift from it.
const SG_START = html.indexOf('var STATUS_GROUPS = {');
const SG_BLOCK = html.slice(SG_START, html.indexOf('};', SG_START));
const STATUS_GROUPS = {};
{ const re=/'([^']+)':\s*'([^']+)'/g; let g; while((g=re.exec(SG_BLOCK))!==null) STATUS_GROUPS[g[1]]=g[2]; }
const inGroup = n => Object.keys(STATUS_GROUPS).filter(x=>STATUS_GROUPS[x]===n);
const GROUP_NAMES = ['Needs attention','Ready to sync','In progress','Successful','Deleted'];
const GROUPS = { all: [] };
GROUP_NAMES.forEach(g => { GROUPS[g.toLowerCase().replace(/ /g,'-')] = inGroup(g); });
const PILL_MAX = 4;
const ALL_STATUSES = Object.keys(STATUS_GROUPS);

console.log('dataset rows parsed: ' + DATA.length);
eq('oracle sees 45 rows', DATA.length, 45);

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const D = dom.window.document;

// -- helpers
const q  = (s, r) => (r || D).querySelector(s);
const qa = (s, r) => Array.from((r || D).querySelectorAll(s));
const tabs      = () => qa('#groupsTabs .status-segment');
const tab       = k  => q('#groupsTabs [data-group="' + k + '"]');
const subRow    = () => q('#groupsSub');
const pills     = () => qa('#groupsSub .sub-pill');
const pill      = s  => q('#groupsSub [data-sub-status="' + s + '"]');
const allPill   = () => q('#groupsSub [data-sub-all]');
const crumb     = () => q('#groupsSub [data-breadcrumb]');
const rows      = () => qa('#groupsTable tbody tr');
const statusCol = () => rows().map(r => r.cells[5].textContent.replace(/^●\s*/, '').trim());
const countText = () => q('#groupsCount').textContent;
const tabCount  = k => parseInt(tab(k).querySelector('.seg-count').textContent, 10);
const pillCount = s => parseInt(pill(s).querySelector('.sub-count').textContent, 10);
const chipKeys  = () => qa('#groupsFilterBar [data-field-key]').map(e => e.getAttribute('data-field-key'));

console.log('\n-- variant 8 exists and is wired');
ok('nav tab 8 present', !!q('.nav-tab[data-variant="groups"]'));
ok('section present', !!q('#variant-groups'));
eq('6 group tabs', tabs().length, 6);
eq('tab order', tabs().map(t => t.getAttribute('data-group')).join(','),
    Object.keys(GROUPS).join(','));

console.log('\n-- initial state: All tab, 90-day baseline');
ok('All tab active', tab('all').classList.contains('active'));
eq('rows = oracle(90d)', rows().length, oracle(BASE).length);
ok('count line names the default',
    /last 90 days \(default\), no filters applied/.test(countText()), countText());
ok('sub row visible on All', subRow().classList.contains('show'));
ok('All group renders a DROPDOWN (8 members > 4)', !!q('#groupsSub [data-sub-dropdown]'));
eq('no pills on All', pills().length, 0);

console.log('\n-- every group tab count matches the oracle');
Object.keys(GROUPS).forEach(k => {
    eq('tab count ' + k, tabCount(k), oracle(Object.assign({}, BASE, { status: GROUPS[k] })).length);
});

// With the real taxonomy in place, the pills-vs-dropdown threshold now falls
// out on its own: Needs attention has 8 members and In progress has 6, so both
// render the scoped dropdown; Successful has 3, so it renders pills; Ready to
// sync and Deleted have one each, so they render no second level at all.
console.log('\n-- big group (Needs attention, 8) renders the scoped dropdown');
tab('needs-attention').click();
ok('attention tab active', tab('needs-attention').classList.contains('active'));
ok('8 members is over the pill threshold', GROUPS['needs-attention'].length > PILL_MAX);
eq('no pills', pills().length, 0);
ok('scoped dropdown rendered', !!q('#groupsSub [data-sub-dropdown]'));
eq('dropdown offers exactly the group members',
    qa('#groupsSub [data-sub-check]').length, GROUPS['needs-attention'].length);
eq('rows = oracle(needs attention)', rows().length,
    oracle(Object.assign({}, BASE, { status: GROUPS['needs-attention'] })).length);

console.log('\n-- CONTRADICTION IS UNREACHABLE: no control offers a status outside the group');
const outside = ALL_STATUSES.filter(s => GROUPS['needs-attention'].indexOf(s) === -1);
outside.forEach(s => {
    ok('no "' + s + '" control inside Needs attention',
        !q('#groupsSub [data-sub-status="' + s + '"]') && !q('#groupsSub [data-sub-check="' + s + '"]'));
});
ok('status is NOT offered in Add filter', !q('#groupsFilterBar [data-groups-add-key="status"]'));

console.log('\n-- small group (Successful, 3) renders pills with counts');
tab('successful').click();
ok('3 members is within the pill threshold', GROUPS['successful'].length <= PILL_MAX);
eq('pills = All + 3 members', pills().length, GROUPS['successful'].length + 1);
eq('pill labels', pills().slice(1).map(p => p.getAttribute('data-sub-status')).join('|'),
    GROUPS['successful'].join('|'));
ok('All pill active by default', allPill().classList.contains('active'));
GROUPS['successful'].forEach(st => {
    eq('pill count ' + st, pillCount(st), oracle(Object.assign({}, BASE, { status: [st] })).length);
});

console.log('\n-- single-status groups render no second level');
['ready-to-sync', 'deleted'].forEach(k => {
    tab(k).click();
    eq(k + ' has one member', GROUPS[k].length, 1);
    eq('no pills', pills().length, 0);
    ok('no dropdown', !q('#groupsSub [data-sub-dropdown]'));
    ok('sub row hidden', !subRow().classList.contains('show'));
});

console.log('\n-- picking one status inside a pills group');
tab('successful').click();
pill('Skipped').click();
eq('rows = oracle(Skipped)', rows().length, oracle(Object.assign({}, BASE, { status: ['Skipped'] })).length);
ok('every row IS Skipped', statusCol().every(x => x === 'Skipped'), statusCol().join(','));
ok('Skipped pill active', pill('Skipped').classList.contains('active'));
ok('All pill no longer active', !allPill().classList.contains('active'));
ok('tab shows PARTIAL, not active', tab('successful').classList.contains('partial') &&
    !tab('successful').classList.contains('active'));
eq('tab count still whole group', tabCount('successful'),
    oracle(Object.assign({}, BASE, { status: GROUPS['successful'] })).length);
ok('header carries the fraction',
    new RegExp('Showing\\s*' + oracle(Object.assign({}, BASE, { status: ['Skipped'] })).length +
        '\\s*of\\s*' + oracle(Object.assign({}, BASE, { status: GROUPS['successful'] })).length +
        '\\s*in Successful').test(countText().replace(/\s+/g, ' ')), countText());
// With pills on screen the lit pill + row label already state both levels,
// so a breadcrumb chip would duplicate them (variant 3's mistake).
ok('NO breadcrumb next to pills (would duplicate the lit pill)', !crumb());
ok('row label names the parent group',
    /Status in Successful/.test(q('.substatus-label').textContent),
    q('.substatus-label').textContent);

console.log('\n-- scope filters survive a tab switch (the whole point)');
// put Platform on the bar and apply Stripe inside its own panel
q('[data-groups-add]').click();
q('[data-groups-add-key="platform"]').click();
ok('platform chip on the bar', chipKeys().indexOf('platform') !== -1, chipKeys().join(','));
const pf = q('#groupsFilterBar [data-field-key="platform"]');
const rowsBeforeApply = rows().length;
q('[data-check-value="Stripe"]', pf).click();
eq('checkbox toggle does NOT re-query (Apply-gated)', rows().length, rowsBeforeApply);
q('[data-panel-apply]', pf).click();
eq('rows after Apply', rows().length,
    oracle({ date: '90d', status: ['Rule failed'], platform: ['Stripe'] }).length);
ok('count line names 1 filter', /1<\/strong> filter applied|1 filter applied/.test(q('#groupsCount').innerHTML),
    q('#groupsCount').textContent);

tab('ready-to-sync').click();
ok('platform chip STILL on the bar after switching tabs', chipKeys().indexOf('platform') !== -1);
eq('rows on ready tab keep Stripe scope', rows().length,
    oracle({ date: '90d', status: GROUPS['ready-to-sync'], platform: ['Stripe'] }).length);
Object.keys(GROUPS).forEach(k => {
    eq('tab count ' + k + ' respects scope', tabCount(k),
        oracle({ date: '90d', status: GROUPS[k], platform: ['Stripe'] }).length);
});

// Helper: commit a selection inside a scoped dropdown.
function pickInDropdown(statuses) {
    const dd = q('#groupsSub [data-sub-dropdown]');
    q('[data-sub-trigger]', dd).click();
    qa('[data-sub-check]', dd).forEach(cb => {
        const want = statuses.indexOf(cb.getAttribute('data-sub-check')) !== -1;
        if (cb.checked !== want) cb.click();
    });
    q('[data-sub-apply]', dd).click();
}

console.log('\n-- each tab remembers its own status selection');
tab('successful').click();
allPill().click();   // clear what the earlier block left selected
ok('successful tab back at the whole group', allPill().classList.contains('active'));
pill('Skipped').click();
tab('needs-attention').click();
pickInDropdown(['Failed']);
eq('dropdown selection applied', rows().length,
    oracle({ date: '90d', status: ['Failed'], platform: ['Stripe'] }).length);
tab('successful').click();
ok('successful remembered Skipped', pill('Skipped').classList.contains('active'));
tab('needs-attention').click();
ok('needs-attention remembered its dropdown selection', !!crumb() && /Failed/.test(crumb().textContent),
    crumb() && crumb().textContent);

console.log('\n-- clicking the active tab steps back up to the whole group');
tab('needs-attention').click();
ok('sub selection cleared', !crumb());
eq('rows = whole needs-attention group', rows().length,
    oracle({ date: '90d', status: GROUPS['needs-attention'], platform: ['Stripe'] }).length);

console.log('\n-- the All pill is the way back up when pills are showing');
tab('successful').click();
ok('remembered Skipped still lit', pill('Skipped').classList.contains('active'));
ok('still no breadcrumb beside pills', !crumb());
allPill().click();
ok('All pill active', allPill().classList.contains('active'));
ok('Skipped no longer lit', !pill('Skipped').classList.contains('active'));
ok('tab back to solid active, not partial',
    tab('successful').classList.contains('active') && !tab('successful').classList.contains('partial'));

console.log('\n-- All tab dropdown: scoped to the whole taxonomy, Apply-gated');
tab('all').click();
const dd = q('#groupsSub [data-sub-dropdown]');
eq('dropdown offers every status', qa('[data-sub-check]', dd).length, ALL_STATUSES.length);
q('[data-sub-trigger]', dd).click();
ok('panel open', q('[data-sub-panel]', dd).classList.contains('active'));
const beforeDd = rows().length;
q('[data-sub-check="Failed"]', dd).click();
q('[data-sub-check="Skipped"]', dd).click();
eq('checkbox toggles do NOT re-query', rows().length, beforeDd);
ok('panel still open after two toggles', q('[data-sub-panel]', dd).classList.contains('active'));
q('[data-sub-apply]', dd).click();
eq('rows after Apply', rows().length,
    oracle({ date: '90d', status: ['Failed', 'Skipped'], platform: ['Stripe'] }).length);
ok('rows are only Failed/Skipped',
    statusCol().every(x => x === 'Failed' || x === 'Skipped'), statusCol().join(','));
ok('dropdown DOES get a breadcrumb ("2 selected" names nothing)', !!crumb());
ok('breadcrumb says 2 statuses', /2 statuses|Failed, Skipped/.test(crumb().textContent), crumb().textContent);
q('[data-clear-crumb]', crumb()).click();
ok('breadcrumb x clears the dropdown selection', !crumb());
eq('back to whole scope', rows().length, oracle({ date: '90d', platform: ['Stripe'] }).length);

console.log('\n-- dashboard deep-link picks the parent tab');
q('#groupsDeepLinkBtn').click();
q('[data-deeplink="Synced with rule failed"]').click();
ok('attention tab is the active one', tab('needs-attention').classList.contains('partial'));
ok('breadcrumb marked From dashboard', /From dashboard/.test(crumb().textContent), crumb().textContent);
ok('breadcrumb names the arriving status',
    /Synced with rule failed/.test(crumb().textContent), crumb().textContent);
eq('deep-link reset scope to baseline', chipKeys().join(','), 'date');
eq('rows = oracle(Synced with rule failed, 90d)', rows().length,
    oracle({ date: '90d', status: ['Synced with rule failed'] }).length);
ok('every row IS Synced with rule failed', statusCol().every(x => x === 'Synced with rule failed'));

console.log('\n-- deep-link into a single-status group renders no second level');
q('#groupsDeepLinkBtn').click();
q('[data-deeplink="Deleted"]').click();
ok('deleted tab active (whole group == the status)', tab('deleted').classList.contains('active'));
eq('no pills', pills().length, 0);
ok('no dropdown', !q('#groupsSub [data-sub-dropdown]'));
ok('breadcrumb still explains where it came from',
    !!crumb() && /From dashboard/.test(crumb().textContent));
eq('rows = oracle(Deleted)', rows().length, oracle({ date: '90d', status: ['Deleted'] }).length);

console.log('\n-- an explicit tab click drops the dashboard marker');
tab('ready-to-sync').click();
ok('no breadcrumb on a clean single-status tab', !crumb());
ok('sub row hidden', !subRow().classList.contains('show'));
eq('rows = oracle(Ready to sync)', rows().length,
    oracle({ date: '90d', status: GROUPS['ready-to-sync'] }).length);

console.log('\n-- empty state and recovery');
tab('successful').click();
pill('Skipped').click();
q('[data-groups-add]').click();
q('[data-groups-add-key="platform"]').click();
const pf2 = q('#groupsFilterBar [data-field-key="platform"]');
q('[data-check-value="Shopify"]', pf2).click();
q('[data-panel-apply]', pf2).click();
eq('no rows', rows().length, 0);
ok('empty state shown', !!q('#groupsTable .empty-state'));
q('#groupsTable [data-empty-clear]').click();
eq('recovered to baseline All', rows().length, oracle(BASE).length);
ok('back on All tab', tab('all').classList.contains('active'));
eq('scope chips cleared', chipKeys().join(','), 'date');

console.log('\n-- other variants unaffected');
['current','popular','chips','button','quick','rec','sheetbtn'].forEach(v => {
    ok('nav tab ' + v + ' still present', !!q('.nav-tab[data-variant="' + v + '"]'));
    ok('section ' + v + ' still present', !!q('#variant-' + v));
});
ok('V6 segments still render', qa('#recSegments .status-segment').length === 6);
ok('V7 segments still render', qa('#sheetbtnSegments .status-segment').length === 6);
ok('V1 table still renders', qa('#currentTable tbody tr').length > 0 || !!q('#currentTable .empty-state'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
