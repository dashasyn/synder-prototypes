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
const GROUPS = {
    all: [],
    attention: ['Failed', 'Rule failed', 'Rollback failed', 'Synced with warnings'],
    ready: ['Ready to sync', 'Pending'],
    synced: ['Synced'],
    skipped: ['Skipped']
};
const ALL_STATUSES = ['Failed','Rule failed','Rollback failed','Synced','Synced with warnings','Skipped','Ready to sync','Pending'];

console.log('dataset rows parsed: ' + DATA.length);
eq('oracle sees 26 rows', DATA.length, 26);

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
eq('5 group tabs', tabs().length, 5);
eq('tab order', tabs().map(t => t.getAttribute('data-group')).join(','),
    'all,attention,ready,synced,skipped');

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

console.log('\n-- narrowing inside Attention required');
tab('attention').click();
ok('attention tab active', tab('attention').classList.contains('active'));
ok('pills row rendered (4 members <= 4)', pills().length > 0);
eq('pills = All + 4 members', pills().length, 5);
eq('pill labels', pills().slice(1).map(p => p.getAttribute('data-sub-status')).join('|'),
    GROUPS.attention.join('|'));
eq('rows = oracle(attention)', rows().length, oracle(Object.assign({}, BASE, { status: GROUPS.attention })).length);
ok('All pill active by default', allPill().classList.contains('active'));

console.log('\n-- CONTRADICTION IS UNREACHABLE: no control offers a status outside the group');
const outside = ALL_STATUSES.filter(s => GROUPS.attention.indexOf(s) === -1);
outside.forEach(s => {
    ok('no "' + s + '" control inside Attention required',
        !q('#groupsSub [data-sub-status="' + s + '"]') && !q('#groupsSub [data-sub-check="' + s + '"]'));
});
ok('status is NOT offered in Add filter', !q('#groupsFilterBar [data-groups-add-key="status"]'));

console.log('\n-- every member pill count matches the oracle');
GROUPS.attention.forEach(s => {
    eq('pill count ' + s, pillCount(s), oracle(Object.assign({}, BASE, { status: [s] })).length);
});

console.log('\n-- picking one status');
pill('Rule failed').click();
eq('rows = oracle(Rule failed)', rows().length, oracle(Object.assign({}, BASE, { status: ['Rule failed'] })).length);
ok('every row IS Rule failed', statusCol().every(s => s === 'Rule failed'), statusCol().join(','));
ok('Rule failed pill active', pill('Rule failed').classList.contains('active'));
ok('All pill no longer active', !allPill().classList.contains('active'));
ok('tab shows PARTIAL, not active', tab('attention').classList.contains('partial') &&
    !tab('attention').classList.contains('active'));
eq('tab count still whole group', tabCount('attention'),
    oracle(Object.assign({}, BASE, { status: GROUPS.attention })).length);
ok('header carries the fraction',
    new RegExp('Showing\\s*1\\s*of\\s*' + oracle(Object.assign({}, BASE, { status: GROUPS.attention })).length +
        '\\s*in Attention required').test(countText().replace(/\s+/g, ' ')), countText());
// With pills on screen the lit pill + row label already state both levels,
// so a breadcrumb chip would duplicate them (variant 3's mistake).
ok('NO breadcrumb next to pills (would duplicate the lit pill)', !crumb());
ok('row label names the parent group',
    /Status in Attention required/.test(q('.substatus-label').textContent),
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

tab('ready').click();
ok('platform chip STILL on the bar after switching tabs', chipKeys().indexOf('platform') !== -1);
eq('rows on ready tab keep Stripe scope', rows().length,
    oracle({ date: '90d', status: GROUPS.ready, platform: ['Stripe'] }).length);
Object.keys(GROUPS).forEach(k => {
    eq('tab count ' + k + ' respects scope', tabCount(k),
        oracle({ date: '90d', status: GROUPS[k], platform: ['Stripe'] }).length);
});

console.log('\n-- each tab remembers its own status selection');
ok('ready tab starts at whole group', allPill().classList.contains('active'));
pill('Pending').click();
tab('attention').click();
ok('attention remembered Rule failed', pill('Rule failed').classList.contains('active'));
tab('ready').click();
ok('ready remembered Pending', pill('Pending').classList.contains('active'));

console.log('\n-- clicking the active tab steps back up to the whole group');
tab('ready').click();
ok('ready sub cleared', allPill().classList.contains('active'));
eq('rows = whole ready group', rows().length,
    oracle({ date: '90d', status: GROUPS.ready, platform: ['Stripe'] }).length);

console.log('\n-- the All pill is the way back up when pills are showing');
tab('attention').click();
ok('remembered Rule failed still lit', pill('Rule failed').classList.contains('active'));
ok('still no breadcrumb', !crumb());
allPill().click();
ok('All pill active', allPill().classList.contains('active'));
ok('Rule failed no longer lit', !pill('Rule failed').classList.contains('active'));
ok('tab back to solid active, not partial',
    tab('attention').classList.contains('active') && !tab('attention').classList.contains('partial'));

console.log('\n-- All tab dropdown: scoped, multiselect, Apply-gated');
tab('all').click();
const dd = q('#groupsSub [data-sub-dropdown]');
eq('dropdown offers all 8 statuses', qa('[data-sub-check]', dd).length, 8);
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
    statusCol().every(s => s === 'Failed' || s === 'Skipped'), statusCol().join(','));
ok('dropdown DOES get a breadcrumb ("2 selected" names nothing)', !!crumb());
ok('breadcrumb says 2 statuses', /2 statuses|Failed, Skipped/.test(crumb().textContent), crumb().textContent);
q('[data-clear-crumb]', crumb()).click();
ok('breadcrumb x clears the dropdown selection', !crumb());
eq('back to whole scope', rows().length, oracle({ date: '90d', platform: ['Stripe'] }).length);

console.log('\n-- dashboard deep-link picks the parent tab');
q('#groupsDeepLinkBtn').click();
q('[data-deeplink="Rule failed"]').click();
ok('attention tab is the active one', tab('attention').classList.contains('partial'));
ok('Rule failed pill active', pill('Rule failed').classList.contains('active'));
ok('breadcrumb marked From dashboard', /From dashboard/.test(crumb().textContent), crumb().textContent);
eq('deep-link reset scope to baseline', chipKeys().join(','), 'date');
eq('rows = oracle(Rule failed, 90d)', rows().length,
    oracle({ date: '90d', status: ['Rule failed'] }).length);
ok('every row IS Rule failed', statusCol().every(s => s === 'Rule failed'));

console.log('\n-- deep-link into a single-status group renders no second level');
q('#groupsDeepLinkBtn').click();
q('[data-deeplink="Skipped"]').click();
ok('skipped tab active (whole group == the status)', tab('skipped').classList.contains('active'));
eq('no pills', pills().length, 0);
ok('no dropdown', !q('#groupsSub [data-sub-dropdown]'));
ok('breadcrumb still explains where it came from',
    !!crumb() && /From dashboard/.test(crumb().textContent));
eq('rows = oracle(Skipped)', rows().length, oracle({ date: '90d', status: ['Skipped'] }).length);

console.log('\n-- an explicit tab click drops the dashboard marker');
tab('synced').click();
ok('no breadcrumb on a clean single-status tab', !crumb());
ok('sub row hidden', !subRow().classList.contains('show'));
eq('rows = oracle(Synced)', rows().length, oracle({ date: '90d', status: ['Synced'] }).length);

console.log('\n-- empty state and recovery');
tab('attention').click();
pill('Rollback failed').click();
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
ok('V6 segments still render', qa('#recSegments .status-segment').length === 5);
ok('V7 has no segments row (reworked 2026-08-20)', !q('#sheetbtnSegments'));
ok('V7 owns status in its sheet instead', !!q('#variant-sheetbtn'));
ok('V1 table still renders', qa('#currentTable tbody tr').length > 0 || !!q('#currentTable .empty-state'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
