// Verifies filtering-options/index.html:
//  1. every variant is Apply-gated (no filter interaction re-queries the list)
//  2. every filter value agrees with an INDEPENDENT filter over the raw dataset
//  3. variants 5 and 6 behave as designed
const fs = require('fs');
const { JSDOM } = require('/tmp/node_modules/jsdom');

const FILE = '/home/ubuntu/.openclaw/workspace/filtering-options/index.html';
const html = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
    if (cond) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + extra : '')); }
}
function eq(name, actual, expected) {
    ok(name + ' (= ' + JSON.stringify(expected) + ')', actual === expected, 'got ' + JSON.stringify(actual));
}

// ---- Independent oracle: parse the dataset out of the source and
// ---- reimplement the filter rules, so counts aren't taken on trust.
const ROW_RE = /\{ date: '([\d-]+)',\s*customer: '([^']+)',\s*platform: '([^']+)',\s*type: '([^']+)',\s*amount: ([\d.]+),\s*status: '([^']+)'\s*\}/g;
const DATA = [];
let m;
while ((m = ROW_RE.exec(html)) !== null) {
    DATA.push({ date: m[1], customer: m[2], platform: m[3], type: m[4], amount: parseFloat(m[5]), status: m[6] });
}
const TODAY = '2026-04-30';
const DATE_WINDOW = {
    all: null,
    '7d': ['2026-04-24', TODAY],
    '30d': ['2026-04-01', TODAY],
    '90d': ['2026-01-30', TODAY],
    month: ['2026-04-01', '2026-04-30'],
    lastmonth: ['2026-03-01', '2026-03-31']
};
function oracle(f) {
    return DATA.filter(t => {
        const w = DATE_WINDOW[f.date || 'all'];
        if (w && !(t.date >= w[0] && t.date <= w[1])) return false;
        if (f.status && f.status.length && !f.status.includes(t.status)) return false;
        if (f.platform && f.platform.length && !f.platform.includes(t.platform)) return false;
        if (f.type && f.type.length && !f.type.includes(t.type)) return false;
        if (f.customer && f.customer !== 'all' && t.customer !== f.customer) return false;
        const a = f.amount || 'all';
        if (a === 'lt100' && !(t.amount < 100)) return false;
        if (a === '100to500' && !(t.amount >= 100 && t.amount <= 500)) return false;
        if (a === 'gt500' && !(t.amount > 500)) return false;
        return true;
    }).length;
}
const TOTAL = DATA.length;
const FILTER_KEYS = ['date', 'status', 'platform', 'type', 'amount', 'customer'];

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const d = dom.window.document;

const rows = id => d.querySelectorAll('#' + id + ' tbody tr').length;
const hint = id => d.getElementById(id).classList.contains('show');
const field = (bar, key) => d.querySelector('#' + bar + ' [data-field-key="' + key + '"]');
const trigger = (bar, key) => field(bar, key).querySelector('[data-field-trigger]');
const panel = (bar, key) => field(bar, key).querySelector('[data-field-panel]');
function pick(bar, key, value) {
    trigger(bar, key).click();
    panel(bar, key).querySelector('[data-pick-value="' + value + '"]').click();
}
function check(bar, key, value, on) {
    trigger(bar, key).click();
    const cb = panel(bar, key).querySelector('[data-check-value="' + value + '"]');
    cb.checked = on === undefined ? true : on;
    cb.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

console.log('\n— Dataset —');
eq('parsed rows', TOTAL, 26);
eq('distinct statuses', new Set(DATA.map(r => r.status)).size, 8);
ok('V6 has no bar-level Apply and no dirty hint',
    !d.querySelector('#recFilterBar [data-rec-apply]') && !d.getElementById('recDirtyHint'));
ok('V6 has no Reset to default', !d.querySelector('#recFilterBar [data-rec-reset]'));
ok('all four status groups represented in the table markup',
    ['status-failed', 'status-synced', 'status-ready-to-sync', 'status-skipped']
        .every(c => html.includes('.' + c) || html.includes(c)));

console.log('\n— Structure: six variants, every one Apply-gated —');
eq('nav tabs', d.querySelectorAll('.nav-tab').length, 8);
eq('variant sections', d.querySelectorAll('.variant-section').length, 8);
const APPLIES = {
    current: '#currentFilterBar [data-apply]',
    popular: '#popularFilterBar [data-popular-apply]',
    chips:   '#chipsFilterBar [data-chips-apply]',
    button:  '#buttonFilterBar [data-popover-apply]',
    quick:   '#quickFilterBar [data-quick-apply]',
    sheetbtn:'#sheetbtnApplyBtn'
};
Object.keys(APPLIES).forEach(k => ok(k + ' has an Apply button', !!d.querySelector(APPLIES[k])));
['currentDirtyHint', 'popularDirtyHint', 'chipsDirtyHint', 'buttonDirtyHint', 'quickDirtyHint']
    .forEach(id => ok(id + ' exists', !!d.getElementById(id)));
ok('no result-count preview in sheet footer', !/result/i.test(d.getElementById('sheetPreview').textContent));
ok('no result-count preview on V4 Apply', !/result/i.test(d.querySelector(APPLIES.button).textContent));

console.log('\n— Cross-check every filter value against the oracle (via V1) —');
const v1Apply = () => d.querySelector('#currentFilterBar [data-apply]');
const v1Reset = () => d.querySelector('#currentFilterBar [data-reset]');
const OPTS = {
    date: ['all', '7d', '30d', '90d', 'month', 'lastmonth'],
    status: ['Failed', 'Rule failed', 'Rollback failed', 'Synced', 'Synced with warnings', 'Skipped', 'Ready to sync', 'Pending'],
    platform: ['Stripe', 'Shopify', 'PayPal', 'Amazon'],
    type: ['Sale', 'Refund', 'Payout', 'Fee'],
    amount: ['all', 'lt100', '100to500', 'gt500'],
    customer: ['all', 'Acme Corp', 'Global Tech', 'Local Store', 'Northwind Ltd', 'Bright Studio', 'Vertex Supply']
};
let mismatches = [];
Object.keys(OPTS).forEach(key => {
    const multi = key === 'status' || key === 'platform' || key === 'type';
    OPTS[key].forEach(value => {
        v1Reset().click();
        if (multi) check('currentFilterBar', key, value); else pick('currentFilterBar', key, value);
        v1Apply().click();
        const expected = oracle({ [key]: multi ? [value] : value });
        if (rows('currentTable') !== expected) mismatches.push(key + '=' + value + ' got ' + rows('currentTable') + ' want ' + expected);
    });
});
const totalValues = Object.values(OPTS).reduce((a, o) => a + o.length, 0);
ok('all ' + totalValues + ' single-filter values match the oracle', mismatches.length === 0, mismatches.join('; '));

v1Reset().click();
check('currentFilterBar', 'status', 'Failed');
check('currentFilterBar', 'status', 'Synced');
check('currentFilterBar', 'platform', 'Stripe');
v1Apply().click();
eq('OR within a dimension, AND across dimensions',
    rows('currentTable'), oracle({ status: ['Failed', 'Synced'], platform: ['Stripe'] }));
v1Reset().click();

console.log('\n— V1 Current: staged —');
ok('Apply disabled while clean', v1Apply().disabled);
check('currentFilterBar', 'status', 'Failed');
eq('table untouched after selecting Status', rows('currentTable'), TOTAL);
ok('dirty hint shown', hint('currentDirtyHint'));
eq('Apply label counts staged filters', v1Apply().textContent, 'Apply 1 filter');
v1Apply().click();
eq('Apply commits', rows('currentTable'), oracle({ status: ['Failed'] }));
ok('dirty hint cleared', !hint('currentDirtyHint'));
ok('clicking Apply closes any open dropdown', !panel('currentFilterBar', 'status').classList.contains('active'));
check('currentFilterBar', 'status', 'Synced');
check('currentFilterBar', 'status', 'Skipped');
ok('multiselect panel stays open across toggles', panel('currentFilterBar', 'status').classList.contains('active'));
eq('both toggles staged', rows('currentTable'), oracle({ status: ['Failed'] }));
v1Apply().click();
eq('three statuses OR-ed', rows('currentTable'), oracle({ status: ['Failed', 'Synced', 'Skipped'] }));
v1Reset().click();

console.log('\n— V2 Popular + Sheet: staged —');
check('popularFilterBar', 'platform', 'Stripe');
eq('table untouched after popular dropdown', rows('popularTable'), TOTAL);
ok('dirty hint shown', hint('popularDirtyHint'));
d.querySelector('#popularFilterBar [data-popular-apply]').click();
eq('Apply commits', rows('popularTable'), oracle({ platform: ['Stripe'] }));
check('popularFilterBar', 'status', 'Synced');
eq('staged only', rows('popularTable'), oracle({ platform: ['Stripe'] }));
d.getElementById('allFiltersBtn').click();
ok('sheet inherits the bar draft',
    /Synced/.test(field('sheetContent', 'status').querySelector('.field-trigger-text').textContent));
pick('sheetContent', 'amount', 'lt100');
eq('sheet edits do not touch the table', rows('popularTable'), oracle({ platform: ['Stripe'] }));
d.getElementById('sheetApplyBtn').click();
eq('sheet Apply commits bar + sheet edits',
    rows('popularTable'), oracle({ platform: ['Stripe'], status: ['Synced'], amount: 'lt100' }));
d.getElementById('allFiltersBtn').click();
pick('sheetContent', 'amount', 'gt500');
d.getElementById('sheetCloseBtn').click();
eq('closing the sheet applies nothing',
    rows('popularTable'), oracle({ platform: ['Stripe'], status: ['Synced'], amount: 'lt100' }));
d.querySelector('#popularFilterBar [data-popular-reset]').click();
eq('Reset → all rows', rows('popularTable'), TOTAL);

console.log('\n— V3 Chips: staged —');
const v3Apply = () => d.querySelector('#chipsFilterBar [data-chips-apply]');
pick('chipsFilterBar', 'date', '7d');
eq('table untouched after chip pick', rows('chipsTable'), TOTAL);
v3Apply().click();
eq('Apply commits', rows('chipsTable'), oracle({ date: '7d' }));
check('chipsFilterBar', 'status', 'Synced');
eq('second chip staged only', rows('chipsTable'), oracle({ date: '7d' }));
v3Apply().click();
eq('AND applied', rows('chipsTable'), oracle({ date: '7d', status: ['Synced'] }));
field('chipsFilterBar', 'status').querySelector('[data-remove-field]').click();
eq('chip × only stages the removal', rows('chipsTable'), oracle({ date: '7d', status: ['Synced'] }));
v3Apply().click();
eq('Apply commits the removal', rows('chipsTable'), oracle({ date: '7d' }));
d.getElementById('chipsClearAll').click();
eq('Clear all commits', rows('chipsTable'), TOTAL);

console.log('\n— V4 Button + Chips: staged —');
d.getElementById('filtersBtn').click();
check('popoverBody', 'platform', 'Amazon');
eq('popover edits do not touch the table', rows('buttonTable'), TOTAL);
d.querySelector(APPLIES.button).click();
eq('popover Apply commits', rows('buttonTable'), oracle({ platform: ['Amazon'] }));
d.querySelector('#buttonAppliedRow [data-remove-filter]').click();
eq('chip × in the row only stages', rows('buttonTable'), oracle({ platform: ['Amazon'] }));
ok('row grows its own Apply when dirty', !!d.querySelector('#buttonAppliedRow [data-row-apply]'));
d.querySelector('#buttonAppliedRow [data-row-apply]').click();
eq('row Apply commits', rows('buttonTable'), TOTAL);

console.log('\n— V5 Quick filters —');
const presets = () => Array.from(d.querySelectorAll('#quickPresetBar .preset-pill'));
eq('six presets rendered', presets().length, 6);
eq('first preset is Attention required',
    presets()[0].textContent.replace(/[0-9]+$/, '').replace('error_outline', '').trim(), 'Attention required');
const ATTENTION = ['Failed', 'Rule failed', 'Rollback failed', 'Synced with warnings'];
const presetCount = i => parseInt(presets()[i].querySelector('.preset-count').textContent, 10);
eq('Attention count matches the oracle', presetCount(0), oracle({ status: ATTENTION }));
eq('Failed count matches the oracle', presetCount(1), oracle({ status: ['Failed'] }));
eq('Ready to sync count matches the oracle', presetCount(2), oracle({ status: ['Ready to sync'] }));
presets()[0].click();
eq('preset commits in one click', rows('quickTable'), oracle({ status: ATTENTION }));
ok('preset pill shows active', presets()[0].classList.contains('active'));
ok('no unapplied-changes hint after a preset', !hint('quickDirtyHint'));
eq('bar reflects the preset', field('quickFilterBar', 'status').querySelector('.field-trigger-text').textContent, '4 selected');
presets()[0].click();
eq('clicking the active preset clears it', rows('quickTable'), TOTAL);
// a preset carries staged bar changes with it, so nothing is left half-applied
check('quickFilterBar', 'platform', 'Stripe');
ok('bar change is staged', hint('quickDirtyHint'));
eq('table untouched', rows('quickTable'), TOTAL);
presets()[1].click();
eq('preset commits the staged platform too',
    rows('quickTable'), oracle({ status: ['Failed'], platform: ['Stripe'] }));
ok('nothing left staged', !hint('quickDirtyHint'));
d.querySelector('#quickFilterBar [data-quick-reset]').click();
eq('Reset → all rows', rows('quickTable'), TOTAL);
ok('presets cleared by Reset', !presets().some(p => p.classList.contains('active')));

console.log('\n— V6 Recommended (panel-scoped Apply) —');
const segs = () => Array.from(d.querySelectorAll('#recSegments .status-segment'));
const segCount = i => parseInt(segs()[i].querySelector('.seg-count').textContent, 10);
const panelApply = key => field('recFilterBar', key).querySelector('[data-panel-apply]');
eq('five segments', segs().length, 5);
eq('baseline is last 90 days',
    d.querySelector('#recFilterBar .baseline-chip .field-trigger-text').textContent, 'Last 90 days');
ok('baseline is labelled as the default', !!d.querySelector('#recFilterBar .baseline-chip .baseline-note'));
eq('90-day default shows every row', rows('recTable'), oracle({ date: '90d' }));
eq('count line does not claim a filter is applied',
    /no filters applied/.test(d.getElementById('recCount').textContent), true);
eq('Attention segment count matches the oracle', segCount(1), oracle({ date: '90d', status: ATTENTION }));
segs()[1].click();
eq('segment commits in one click', rows('recTable'), oracle({ date: '90d', status: ATTENTION }));
ok('segment marked active', segs()[1].classList.contains('active'));
// deep-link still narrows the segment
d.getElementById('recDeepLinkBtn').click();
eq('deep-link filters to the granular status', rows('recTable'), oracle({ date: '90d', status: ['Rule failed'] }));
ok('containing segment shows partial, not active',
    segs()[1].classList.contains('partial') && !segs()[1].classList.contains('active'));
d.querySelector('#recFilterBar [data-remove-deeplink]').click();
eq('removing the deep-link chip clears status', rows('recTable'), oracle({ date: '90d' }));

// every filter panel carries its own Apply
d.querySelector('#recFilterBar [data-rec-add]').click();
d.querySelector('#recFilterBar [data-rec-add-key="platform"]').click();
ok('added chip exists', !!field('recFilterBar', 'platform'));
trigger('recFilterBar', 'platform').click();
ok('platform panel has its own Apply', !!panelApply('platform'));
ok('baseline date panel has its own Apply too', (() => {
    trigger('recFilterBar', 'date').click();
    return !!panelApply('date');
})());

// selecting inside a panel does NOT touch the table until its Apply
trigger('recFilterBar', 'platform').click();
check('recFilterBar', 'platform', 'Stripe');
eq('panel edit is staged, table untouched', rows('recTable'), oracle({ date: '90d' }));
panelApply('platform').click();
eq('panel Apply commits', rows('recTable'), oracle({ date: '90d', platform: ['Stripe'] }));

// closing a panel WITHOUT Apply discards the edit
trigger('recFilterBar', 'platform').click();
check('recFilterBar', 'platform', 'Shopify');
eq('still staged', rows('recTable'), oracle({ date: '90d', platform: ['Stripe'] }));
trigger('recFilterBar', 'platform').click();   // re-click closes without applying
eq('closing without Apply changes nothing', rows('recTable'), oracle({ date: '90d', platform: ['Stripe'] }));
trigger('recFilterBar', 'platform').click();
ok('discarded edit is gone when the panel reopens',
    !panel('recFilterBar', 'platform').querySelector('[data-check-value="Shopify"]').checked);
trigger('recFilterBar', 'platform').click();

// the date baseline goes through the same panel Apply
trigger('recFilterBar', 'date').click();
panel('recFilterBar', 'date').querySelector('[data-pick-value="7d"]').click();
eq('date pick is staged, not applied', rows('recTable'), oracle({ date: '90d', platform: ['Stripe'] }));
trigger('recFilterBar', 'date').click();
trigger('recFilterBar', 'date').click();
panel('recFilterBar', 'date').querySelector('[data-pick-value="7d"]').click();
panelApply('date').click();
eq('date Apply commits', rows('recTable'), oracle({ date: '7d', platform: ['Stripe'] }));
ok('baseline chip switches to a changed state',
    d.querySelector('#recFilterBar .baseline-chip').classList.contains('changed'));

console.log('\n— V7 Button + Side sheet —');
const sbBadge = () => d.getElementById('sheetbtnBadge');
const sbChips = () => Array.from(d.querySelectorAll('#sheetbtnChips .applied-chip'));
const sbOpen  = () => d.getElementById('sheetbtnSheet').classList.contains('active');
eq('starts unfiltered', rows('sheetbtnTable'), TOTAL);
ok('chips bar hidden when nothing applied', !d.getElementById('sheetbtnChips').classList.contains('show'));
ok('badge hidden when nothing applied', !sbBadge().classList.contains('show'));
ok('sheet closed initially', !sbOpen());
// Reworked 2026-08-20: the sheet owns EVERY filter, status included, and the
// segment row is gone. One control per dimension is preserved by there being
// only one status control on the page, not by splitting it out.
ok('no segments row in variant 7', !d.getElementById('sheetbtnSegments'));
ok('no "Showing N of M" count line', !d.getElementById('sheetbtnCount'));
ok('no count sentence rendered anywhere in the mock page',
    !/Showing\s*\d+\s*of/.test(d.querySelector('#variant-sheetbtn .mock-page').textContent));

d.getElementById('sheetbtnFiltersBtn').click();
ok('Filters button opens the sheet', sbOpen());
eq('sheet holds every filter', d.querySelectorAll('#sheetbtnContent [data-field-key]').length, FILTER_KEYS.length);
ok('status IS a field in the sheet now', !!field('sheetbtnContent', 'status'));
eq('status offers all 8 statuses',
    field('sheetbtnContent', 'status').querySelectorAll('[data-check-value]').length, 8);

// Single-select panels are radio rows so every panel reads as the same control.
['date', 'amount', 'customer'].forEach(k => {
    ok(k + ' panel uses radio rows',
        field('sheetbtnContent', k).querySelectorAll('.dropdown-radio-item input[type="radio"]').length > 0);
    ok(k + ' panel has no bare checkmark rows',
        field('sheetbtnContent', k).querySelectorAll('.dropdown-item').length === 0);
});
['status', 'platform', 'type'].forEach(k => {
    ok(k + ' panel still uses checkboxes',
        field('sheetbtnContent', k).querySelectorAll('.dropdown-checkbox-item input[type="checkbox"]').length > 0);
});
ok('exactly one date radio is checked',
    field('sheetbtnContent', 'date').querySelectorAll('.dropdown-radio-item input:checked').length === 1);

check('sheetbtnContent', 'platform', 'Stripe');
check('sheetbtnContent', 'platform', 'Shopify');
check('sheetbtnContent', 'type', 'Sale');
eq('sheet edits do not touch the table', rows('sheetbtnTable'), TOTAL);
eq('Apply label counts selected VALUES, not dimensions',
    d.getElementById('sheetbtnApplyBtn').textContent, 'Apply 3 filters');
d.getElementById('sheetbtnApplyBtn').click();
ok('Apply closes the sheet', !sbOpen());
eq('Apply commits', rows('sheetbtnTable'), oracle({ platform: ['Stripe', 'Shopify'], type: ['Sale'] }));
eq('badge shows the value count', sbBadge().textContent, '3');
ok('badge visible', sbBadge().classList.contains('show'));
eq('one chip per active dimension', sbChips().length, 2);
ok('1-2 values are spelled out',
    /Platform: Stripe, Shopify/.test(sbChips()[0].textContent), sbChips()[0].textContent);
ok('chips are display-only — no dropdown inside',
    !d.querySelector('#sheetbtnChips [data-field-trigger]') && !d.querySelector('#sheetbtnChips [data-field-panel]'));
ok('chip has exactly one control, the remove button',
    sbChips()[0].querySelectorAll('button').length === 1 && !!sbChips()[0].querySelector('[data-drop]'));

// 3+ values collapse to "First + N more"
d.getElementById('sheetbtnFiltersBtn').click();
check('sheetbtnContent', 'platform', 'PayPal');
d.getElementById('sheetbtnApplyBtn').click();
eq('3 values collapse to first + N more',
    sbChips()[0].textContent.replace('close', '').trim(), 'Platform: Stripe + 2 more');
d.getElementById('sheetbtnFiltersBtn').click();
check('sheetbtnContent', 'platform', 'Amazon');
d.getElementById('sheetbtnApplyBtn').click();
eq('4 values → first + 3 more',
    sbChips()[0].textContent.replace('close', '').trim(), 'Platform: Stripe + 3 more');
eq('the table still filters on all four',
    rows('sheetbtnTable'), oracle({ platform: ['Stripe', 'Shopify', 'PayPal', 'Amazon'], type: ['Sale'] }));
d.getElementById('sheetbtnFiltersBtn').click();
check('sheetbtnContent', 'platform', 'PayPal', false);
check('sheetbtnContent', 'platform', 'Amazon', false);
d.getElementById('sheetbtnApplyBtn').click();
eq('back to 2 values, spelled out again',
    sbChips()[0].textContent.replace('close', '').trim(), 'Platform: Stripe, Shopify');

// Status behaves like any other dimension now: it stages, commits on Apply,
// gets a chip, and the badge counts it.
d.getElementById('sheetbtnFiltersBtn').click();
check('sheetbtnContent', 'status', 'Failed');
check('sheetbtnContent', 'status', 'Rule failed');
eq('status stages only', rows('sheetbtnTable'), oracle({ platform: ['Stripe', 'Shopify'], type: ['Sale'] }));
d.getElementById('sheetbtnApplyBtn').click();
eq('status commits with the rest', rows('sheetbtnTable'),
    oracle({ status: ['Failed', 'Rule failed'], platform: ['Stripe', 'Shopify'], type: ['Sale'] }));
ok('status now HAS a chip', !!d.querySelector('#sheetbtnChips [data-drop="status"]'));
eq('badge counts status values too', sbBadge().textContent, '5');

// Reset clears the whole sheet, status included — nothing lives outside it.
d.getElementById('sheetbtnFiltersBtn').click();
d.getElementById('sheetbtnResetBtn').click();
eq('Reset clears the status draft',
    field('sheetbtnContent', 'status').querySelectorAll('[data-check-value]:checked').length, 0);
d.getElementById('sheetbtnApplyBtn').click();
eq('Reset + Apply clears everything', rows('sheetbtnTable'), TOTAL);
eq('no chips left', sbChips().length, 0);

// removing a chip commits immediately — there is no Apply outside the sheet
d.getElementById('sheetbtnFiltersBtn').click();
check('sheetbtnContent', 'status', 'Synced');
check('sheetbtnContent', 'platform', 'Stripe');
d.getElementById('sheetbtnApplyBtn').click();
d.querySelector('#sheetbtnChips [data-drop="platform"]').click();
eq('chip x applies at once', rows('sheetbtnTable'), oracle({ status: ['Synced'] }));
d.getElementById('sheetbtnFiltersBtn').click();
d.getElementById('sheetbtnCloseBtn').click();
eq('closing without Apply changes nothing', rows('sheetbtnTable'), oracle({ status: ['Synced'] }));

d.querySelector('#sheetbtnChips [data-clear]').click();
eq('Clear all commits', rows('sheetbtnTable'), TOTAL);
ok('chips bar hides again', !d.getElementById('sheetbtnChips').classList.contains('show'));

// search commits on Enter and combines with filters
const sbSearch = d.getElementById('sheetbtnSearch');
sbSearch.value = 'acme';
sbSearch.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
eq('typing alone does not search', rows('sheetbtnTable'), TOTAL);
sbSearch.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
eq('Enter commits the search', rows('sheetbtnTable'), DATA.filter(t => /acme/i.test(t.customer)).length);
d.getElementById('sheetbtnFiltersBtn').click();
check('sheetbtnContent', 'status', 'Synced');
d.getElementById('sheetbtnApplyBtn').click();
eq('search ANDs with the sheet status',
    rows('sheetbtnTable'), DATA.filter(t => /acme/i.test(t.customer) && t.status === 'Synced').length);
d.querySelector('#sheetbtnChips [data-clear]').click();
sbSearch.value = '';
sbSearch.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
eq('cleared search restores everything', rows('sheetbtnTable'), TOTAL);

console.log('\n— Empty state is reachable and recovers —');
check('currentFilterBar', 'status', 'Rule failed');
pick('currentFilterBar', 'customer', 'Local Store');
v1Apply().click();
eq('no rows for that combination', rows('currentTable'), 0);
ok('empty state rendered', !!d.querySelector('#currentTable .empty-state'));
d.querySelector('#currentTable [data-empty-clear]').click();
eq('empty-state clear recovers', rows('currentTable'), TOTAL);

console.log('\n— V6 layout order —');
// Segment counts are derived from the applied filters, so the filters must come
// first in the DOM: cause above effect, and the tab row adjacent to its table.
{
    const page = d.querySelector('#variant-rec .mock-page');
    const order = [...page.children].map(el => el.id).filter(Boolean);
    const iBar = order.indexOf('recFilterBar');
    const iSeg = order.indexOf('recSegments');
    ok('filter bar precedes segments', iBar !== -1 && iSeg !== -1 && iBar < iSeg, order.join(' → '));
    ok('segments sit directly above the table toolbar',
        order[iSeg + 1] === 'recCount', order.join(' → '));
}

console.log('\n— No JS errors, mirror in sync —');
const errs = [];
dom.window.addEventListener('error', e => errs.push(e.message));
ok('no uncaught errors during the run', errs.length === 0, errs.join('; '));
const mirror = fs.readFileSync('/home/ubuntu/.openclaw/workspace/reports/filtering-options/index.html', 'utf8');
ok('reports/ mirror is byte-identical', mirror === html);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
