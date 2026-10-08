#!/usr/bin/env node
/**
 * verify-invoice-date.cjs — real-Chromium check of the Stripe invoice date prototype.
 * Asserts visibility / enabled-ness after every interaction, not state alone.
 *   node scripts/verify-invoice-date.cjs [url]
 */
const { chromium } = require('playwright');
const path = require('path');

const target = process.argv[2] ||
  'file://' + path.resolve(__dirname, '../projects/stripe-invoice-date/index.html');

let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? pass++ : (fail++, console.log('  FAIL ' + name)); };
const MARK = '[live copy not captured]';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(target, { waitUntil: 'networkidle' });
  ok('icon font renders glyphs, not words', await page.evaluate(async () => { await document.fonts.ready;
    return [...document.querySelectorAll('.mi')].every(e => e.getBoundingClientRect().width <= 26); }));

  const vis = s => page.locator(s).isVisible();
  const en = s => page.locator(s).isEnabled();
  const val = s => page.locator(s).inputValue();
  const txt = async s => (await page.locator(s).textContent()).replace(/\s+/g, ' ').trim();
  const screen = n => page.locator('#sc-' + n).click();
  const state = s => page.locator('#st-' + s).click();
  const modalOpen = () => page.locator('#confirm').evaluate(e => e.classList.contains('show'));

  const smallText = () => page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('body *').forEach(el => {
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!own && !['SELECT', 'OPTION'].includes(el.tagName)) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 14) bad.push(el.tagName + ' ' + fs + 'px "' + el.textContent.trim().slice(0, 30) + '"');
    });
    return bad;
  });
  const checkFonts = async where => {
    const bad = await smallText();
    ok('no text under 14px on ' + where + (bad.length ? ' — ' + bad.slice(0, 3).join('; ') : ''), bad.length === 0);
  };

  // ── chrome ────────────────────────────────────────────────────────────
  ok('switcher is first element in body',
     (await page.evaluate(() => document.body.firstElementChild.className)).includes('variant-switch'));
  ok('switcher spans viewport width',
     Math.round(await page.locator('.variant-switch').evaluate(e => e.getBoundingClientRect().width)) === 1280);

  // ── 1 · Invoices tab, Pro+ existing ──────────────────────────────────
  ok('starts on Invoices tab', (await txt('.set-tab.on')) === 'Invoices');
  ok('Invoice date row visible', await vis('#inv-row'));
  ok('Invoice date sits right after Sync unpaid (open) invoices', await page.evaluate(() => {
    const l = [...document.querySelectorAll('.set-body .row-label')].map(e => e.textContent.replace(/Off$/, '').trim());
    return l.indexOf('Invoice date') === l.indexOf('Sync unpaid (open) invoices') + 1; }));
  ok('Invoice date: long option names, issued marked recommended', (await page.locator('#inv-date option').allTextContents()).join('|') === 'Invoice created date|Invoice issued date (recommended)');
  ok('no dead Learn more on the new row', (await page.locator('#inv-row a', { hasText: 'Learn more' }).count()) === 0);
  ok('existing Invoices toggles match live defaults (all Off)', await page.evaluate(() =>
    [...document.querySelectorAll('.set-body [role=switch]')].every(t => t.getAttribute('aria-checked') === 'false')));
  ok('no teaching note in the switcher', (await page.locator('#vs-note').count()) === 0);
  ok('no Trial state in the switcher', (await page.locator('#st-trial').count()) === 0);
  ok('existing connection defaults to Created', (await val('#inv-date')) === 'created');
  ok('select enabled on Pro+', await en('#inv-date'));
  ok('no lock note on Pro+', (await page.locator('#inv-lock').count()) === 0);
  ok('no Upgrade chip on Pro+', (await page.locator('#chip-upgrade').count()) === 0);
  ok('live shell: sidebar, sync-mode picker, transaction-type tabs, Update', (await vis('.sb')) &&
     (await vis('.pick')) && (await txt('.type.on')).endsWith('Default') && (await vis('#btn-update')));
  ok('no horizontal overflow at 1280', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok('Update disabled with nothing to save', !(await en('#btn-update')));
  await page.selectOption('#inv-date', 'issued');
  ok('change to Issued sticks', (await val('#inv-date')) === 'issued');
  ok('select keeps focus after change', await page.evaluate(() => document.activeElement.id === 'inv-date'));
  ok('Update enabled after a change', await en('#btn-update'));
  await page.locator('#btn-update').click();
  ok('Update disables itself once saved', !(await en('#btn-update')));
  ok('focus returns to the edited field after saving', await page.evaluate(() => document.activeElement.id === 'inv-date'));
  ok('saved value kept after Update', (await val('#inv-date')) === 'issued');
  await page.locator('#tab-Sales').click(); await page.locator('#tab-Invoices').click();
  ok('saved value survives a tab round-trip', (await val('#inv-date')) === 'issued');
  ok('no confirmation on Stripe setting', !(await modalOpen()));
  ok('select still visible + enabled after change', (await vis('#inv-date')) && (await en('#inv-date')));
  await page.selectOption('#inv-date', 'created');
  ok('change back to Created sticks', (await val('#inv-date')) === 'created');
  ok('Update re-enabled by the second change', await en('#btn-update'));
  await page.locator('#btn-update').click();
  await checkFonts('screen 1');

  await state('new');
  ok('new connection defaults to Issued', (await val('#inv-date')) === 'issued');

  await state('below');
  ok('below Pro: row still visible', await vis('#inv-row'));
  ok('below Pro: Upgrade to use chip visible', await vis('#chip-upgrade'));
  ok('below Pro: chip is the live link-style chip', (await page.locator('#chip-upgrade').evaluate(e => e.tagName)) === 'A');
  ok('below Pro: value Created', (await val('#inv-date')) === 'created');
  ok('below Pro: select locked before any interaction', !(await en('#inv-date')));
  ok('below Pro: no red upgrade line, only the chip', (await page.locator('.gate-msg').count()) === 0);
  ok('below Pro: Update stays disabled', !(await en('#btn-update')));

  await state('rrpay');
  ok('RevRec payment date: select enabled', await en('#inv-date'));
  ok('RevRec payment date: no lock', (await page.locator('#inv-lock').count()) === 0);

  await state('rrinv');
  ok('RevRec invoice date: select disabled', !(await en('#inv-date')));
  ok('RevRec invoice date: lock note visible', await vis('#inv-lock'));
  ok('lock note names the product and the exact option', (await txt('#inv-lock')).startsWith('Locked while Synder RevRec starts schedules from the invoice created date.'));
  ok('lock note links to Schedule start', await vis('#go-schedule'));
  ok('lock note sits right under the select, above the description', await page.evaluate(() => {
    const sel = document.getElementById('inv-date').getBoundingClientRect(), n = document.getElementById('inv-lock').getBoundingClientRect(),
          h = document.getElementById('inv-help').getBoundingClientRect();
    return n.top >= sel.bottom && n.bottom <= h.top; }));
  await page.locator('#go-schedule').click();

  // ── 4 · RevRec · Recognition settings (live layout, Ignat's screenshots 2026-10-07) ──
  ok('lock link lands on RevRec settings', await vis('#sched-row'));
  ok('RevRec opens as the full-screen Configuration overlay (no app sidebar)', !(await vis('.sb')) &&
     (await txt('.rr-head')).endsWith('Configuration') && (await txt('.rr-main h1')) === 'Recognition settings');
  ok('live banner kept', (await txt('.rr-banner')) ===
     'New settings will apply to all future transactions. To update previously imported transactions contact support for help.');
  ok('live field order around Schedule start', (await page.$$eval('.rr-field label', ls => ls.map(l => l.childNodes[0].textContent.trim()))).join('|')
     === 'Discounts recognition mode|Schedule start date|Group revrec entries|Monthly subscriptions in revenue recognition');
  ok('Schedule start reads Invoice created date', (await val('#sched-date')) === 'created');
  ok('three schedule values', (await page.locator('#sched-date option').allTextContents()).join('|')
     === 'Invoice created date|Invoice issued date|Payment date');
  ok('no option still called plain "Invoice date"',
     !(await page.locator('#sched-date option').allTextContents()).includes('Invoice date'));
  ok('RevRec settings is a real screen, not a spec note', (await page.locator('#sc-4').evaluate(b => b.parentElement === document.getElementById('sc-1').parentElement)));

  await screen(6);
  ok('RevRec subscriptions is a real screen (no spec notes left)', (await page.locator('.spec-tag').count()) === 0 &&
     await page.evaluate(() => document.getElementById('sc-6').parentElement === document.getElementById('sc-1').parentElement));
  ok('Subscriptions list in the app shell', (await vis('.sb')) && (await vis('#subs-table')));
  const existing = '#subs-table tbody tr:not(.row-built) td.sub-start';
  const startsBefore = await page.locator(existing).allTextContents();
  ok('no post-change subscriptions before a change', (await page.locator('#subs-table tr.row-built').count()) === 0);
  ok('variant switch shown on screen 6', (await vis('#var-tl')) && (await vis('#var-rs')) && !(await vis('#st-pro')));
  await page.locator('#see-details').click();
  ok('See details opens full-screen Subscription details', !(await vis('.sb')) && (await txt('.rr-head')).endsWith('Subscription details'));
  ok('three live tabs', (await page.locator('.sd-tabs button').allTextContents()).join('|') === 'Revenue schedule|Transaction timeline|Revenue recognition transactions');
  ok('A: Revenue schedule has no inline issued date', (await page.locator('.rs-iss').count()) === 0);
  await page.locator('#subtab-timeline').click();
  ok('A: Issued date column in Transaction timeline', await vis('#th-issued'));
  ok('A: column sits right after Transaction date', await page.evaluate(() => {
    const h = [...document.querySelectorAll('#tl-table th')].map(e => e.textContent.trim()); return h.indexOf('Issued date') === h.indexOf('Transaction date') + 1; }));
  ok('A: post-release invoice shows its issued date', (await txt('#tl-iss-1')) === '05/24/2026');
  ok('A: Transaction date stays the created date', (await page.locator('#tl-inv-1 td').nth(6).textContent()) === '05/22/2026');
  await page.locator('#tl-tg-3').click();
  ok('A: expanding an older payment shows its invoice', await vis('#tl-inv-3'));
  ok('A: pre-release invoice has a blank issued date', (await txt('#tl-iss-3')) === '');
  await page.locator('#tl-tg-3').click();
  ok('A: collapsing hides it again', (await page.locator('#tl-inv-3').count()) === 0);
  await checkFonts('transaction timeline');
  ok('timeline table fits without horizontal scroll', await page.evaluate(() => { const w = document.querySelector('#tl-table').closest('.table-wrap'); return w.scrollWidth <= w.clientWidth + 1; }));
  await page.locator('#var-rs').click();
  ok('B: no Issued date column in Transaction timeline', (await page.locator('#th-issued').count()) === 0);
  await page.locator('#subtab-schedule').click();
  ok('B: issued date inline on Revenue schedule invoices', (await txt('#rs-iss-1')) === '· Issued May 24, 2026');
  ok('B: pre-release invoice shows a dash', (await txt('#rs-iss-3')) === '· Issued —');
  await checkFonts('revenue schedule');
  await page.locator('#subtab-rrtx').click();
  ok('Revenue recognition transactions tab renders', (await txt('#screen')).includes('No data'));
  await page.locator('#var-tl').click();
  await page.locator('.rr-head a').click();
  ok('closing details returns to the list', await vis('#subs-table'));
  await screen(4);

  await page.selectOption('#sched-date', 'issued');
  ok('changing Schedule start opens confirmation', await modalOpen());
  ok('confirm dialog visible', await vis('#confirm .modal'));
  ok('Cancel has focus', await page.evaluate(() => document.activeElement.id === 'dlg-cancel'));
  ok('value not applied before confirm', (await val('#sched-date')) === 'created');
  ok('dialog names the new value', (await txt('#dlg-body')).includes('invoice issued date'));
  await page.locator('#dlg-cancel').click();
  ok('Cancel closes dialog', !(await modalOpen()));
  ok('Cancel leaves value', (await val('#sched-date')) === 'created');
  ok('select usable after Cancel', (await vis('#sched-date')) && (await en('#sched-date')));

  await page.selectOption('#sched-date', 'payment');
  ok('reopens on second change', await modalOpen());
  await page.keyboard.press('Escape');
  ok('Escape closes dialog', !(await modalOpen()));
  ok('Escape leaves value', (await val('#sched-date')) === 'created');

  await page.selectOption('#sched-date', 'issued');
  await page.locator('#dlg-ok').click();
  ok('Change applies value', (await val('#sched-date')) === 'issued');
  await checkFonts('screen 4');
  await page.locator('#confirm').evaluate(e => e.classList.add('show'));
  await checkFonts('confirm dialog');
  await page.locator('#confirm').evaluate(e => e.classList.remove('show'));
  await screen(6);
  ok('existing subscriptions not re-dated',
     JSON.stringify(await page.locator(existing).allTextContents()) === JSON.stringify(startsBefore));
  ok('one subscription built after the change', (await page.locator('#subs-table tr.row-built').count()) === 1);
  ok('post-change subscription starts on its issued date',
     (await page.locator('#subs-table tr.row-built', { hasText: 'Contoso' }).locator('td.sub-start').textContent()) === '10/05/2026');
  ok('post-change row visible', await page.locator('#subs-table tr.row-built').first().isVisible());
  await checkFonts('subscriptions list');

  await screen(4);
  await page.selectOption('#sched-date', 'payment');
  await page.locator('#dlg-ok').click();
  ok('Schedule start now Payment date', (await val('#sched-date')) === 'payment');
  await screen(6);
  ok('second post-change subscription starts on its payment date',
     (await page.locator('#subs-table tr.row-built', { hasText: 'Fabrikam' }).locator('td.sub-start').textContent()) === '10/14/2026');
  ok('earlier post-change subscription not re-dated',
     (await page.locator('#subs-table tr.row-built', { hasText: 'Contoso' }).locator('td.sub-start').textContent()) === '10/05/2026');
  ok('existing schedules still not re-dated',
     JSON.stringify(await page.locator(existing).allTextContents()) === JSON.stringify(startsBefore));
  await screen(1);
  ok('app shell back after leaving RevRec', await vis('.sb'));
  ok('Sync lock lifts once Schedule start = Payment date', (await en('#inv-date')) && (await page.locator('#inv-lock').count()) === 0);

  // ── 2 · Sales tab rename ────────────────────────────────────────────
  await page.locator('#tab-Sales').click();
  ok('Sales tab reachable from tab bar', (await txt('.set-tab.on')) === 'Sales');
  ok('renamed label shown', (await txt('#post-label')) === 'Payment posting date');
  ok('old "Posting date" label gone', !(await page.locator('.row-label').allTextContents()).map(s => s.trim()).includes('Posting date'));
  ok('posting options unchanged', (await page.locator('#post-date option').allTextContents()).join('|') === 'Created date|Balance date (recommended)');
  ok('posting helper names the cash side and points to Invoice date', (await txt('#post-help')).includes('balance transactions') &&
     (await txt('#post-help')).includes('Invoice date setting'));
  ok('old “Select posting date for transactions” helper gone', !(await txt('#post-help')).includes('Select posting date'));
  ok('posting default Balance date', (await val('#post-date')) === 'balance');
  await page.selectOption('#post-date', 'created');
  ok('Sales change enables Update', await en('#btn-update'));
  await page.locator('#btn-update').click();
  ok('Sales Update saves', (await val('#post-date')) === 'created' && !(await en('#btn-update')));
  ok('org states disabled on Sales tab', !(await en('#st-pro')) && !(await en('#st-rrinv')));
  await checkFonts('screen 2');
  await page.locator('#tab-Invoices').click();
  ok('Invoices tab reachable from tab bar', await vis('#inv-row'));

  // ── 3 · Summary Sync ────────────────────────────────────────────────
  await screen(3);
  ok('Summary row visible', await vis('#sum-row'));
  ok('Summary opens as the live Settings overlay', !(await vis('.sb')) &&
     (await txt('.rr-head')).endsWith('Settings (DS_test_with_AI)') && (await txt('.ss-main h2')) === 'General');
  ok('live card order kept', (await page.$$eval('.ss-hd b', bs => bs.map(b => b.childNodes[0].textContent.trim()))).join('|') ===
     'Synchronization frequency|Summary period|Timezone|Sales recording date|Sync mode|Sync open invoices|QuickBooks Online JE number sequence');
  ok('Sales recording date has the three FDD values', (await page.locator('#sum-date option').allTextContents()).join('|') ===
     'Invoice created date|Invoice issued date|Payment date');
  ok('old payment-only description replaced', !(await txt('#sum-row')).includes('Enable this setting to record sales on the payment date'));
  ok('Summary is a real screen, not a spec note', await page.evaluate(() =>
    document.getElementById('sc-3').parentElement === document.getElementById('sc-1').parentElement));
  ok('RevRec states available on Summary', await en('#st-rrinv'));
  await state('pro');
  ok('existing Summary org on Invoice created date', (await val('#sum-date')) === 'created');
  await state('new');
  ok('new Summary org on Invoice issued date', (await val('#sum-date')) === 'issued');
  ok('AR explained in plain words', (await txt('#sum-row')).includes('Accounts Receivable (money customers still owe you)'));
  await state('pro');
  await page.selectOption('#sum-date', 'payment');
  ok('Payment date asks first', await modalOpen());
  ok('Payment date dialog says what changes', (await txt('#dlg-title')) === 'Record sales on the payment date?' &&
     (await txt('#dlg-body')).includes('money customers still owe you'));
  ok('value not applied before confirm', (await val('#sum-date')) === 'created');
  await page.keyboard.press('Escape');
  ok('Escape keeps Invoice created date', !(await modalOpen()) && (await val('#sum-date')) === 'created');
  await page.selectOption('#sum-date', 'payment');
  await page.locator('#dlg-ok').click();
  ok('can pick Payment date after confirming', (await val('#sum-date')) === 'payment');
  ok('focus back on the select', await page.evaluate(() => document.activeElement.id === 'sum-date'));
  await page.selectOption('#sum-date', 'created');
  ok('leaving Payment date needs no confirmation', !(await modalOpen()) && (await val('#sum-date')) === 'created');
  await state('below');
  ok('below Pro: whole Sales recording date disabled', !(await en('#sum-date')));
  ok('below Pro: Summary chip shown, no red line', (await vis('#chip-upgrade')) && (await page.locator('.gate-msg').count()) === 0);
  await state('rrinv');
  ok('RevRec active: Summary select looks usable', await en('#sum-date'));
  await page.selectOption('#sum-date', 'issued');
  ok('RevRec active: change refused, value kept', (await val('#sum-date')) === 'created');
  ok('RevRec active: red toast at the top says why', (await vis('.toast-err')) &&
     (await txt('.toast-err .toast-msg')) === 'You cannot change this setting, as revenue recognition is set to recognize invoices since invoice created date');
  ok('toast closes with ×', await (async () => { await page.locator('.toast-err .toast-x').click(); return (await page.locator('.toast-err').count()) === 0; })());
  await state('rrpay');
  await page.selectOption('#sum-date', 'issued');
  ok('RevRec on Payment date: Summary change allowed, no toast', (await val('#sum-date')) === 'issued' && (await page.locator('.toast-err').count()) === 0);
  await checkFonts('screen 3');

  // ── 5 · Sync details ────────────────────────────────────────────────
  await screen(5);
  ok('example group shown on screen 5', await vis('#ex-issued'));
  ok('org group hidden on screen 5', !(await vis('#st-pro')));
  ok('Transaction date row present', (await page.locator('#kv .k').allTextContents()).includes('Transaction date'));
  ok('Issued date / Date in books rows removed', (await page.locator('#kv-issued, #kv-books').count()) === 0);
  ok('Sync log present', await vis('#log-table'));
  ok('A: Sync log message gives the reason', (await txt('#log-inv td:nth-child(4)')) === 'Invoice was created. Invoice date: Jan 6, 2026 (issued date in Stripe, per your Invoice date setting).');
  await page.locator('#ex-created').click();
  ok('B: reason names the created date', (await txt('#log-why')) === 'Invoice date: Dec 28, 2025 (created date in Stripe, per your Invoice date setting).');
  ok('reason is a normal message, not red', await page.evaluate(() => getComputedStyle(document.getElementById('log-why')).color === getComputedStyle(document.getElementById('log-why').parentElement).color));
  await checkFonts('screen 5');
  await page.locator('#ex-issued').click();

  // ── RevRec org on the Invoices tab (screenshot 2026-10-08) ─────
  ok('Transactions screen removed', (await page.locator('#sc-7').count()) === 0);
  await screen(1); await state('pro');
  ok('Pro org: PT_3, no Category column, Sync unpaid Off', (await txt('.sb-org')).startsWith('PTPT_3') &&
     (await page.locator('#bad-debt').count()) === 0 &&
     (await page.locator('[role=switch][aria-label="Sync unpaid (open) invoices"]').getAttribute('aria-checked')) === 'false');
  await state('rrinv');
  ok('RevRec org: RevRec_test with Revenue recognition in the sidebar', (await txt('.sb-org')).includes('RevRec_test') &&
     (await page.locator('.sb-item', { hasText: 'Revenue recognition' }).count()) === 1);
  ok('RevRec org: Sync unpaid (open) invoices On (live)', (await page.locator('[role=switch][aria-label="Sync unpaid (open) invoices"]').getAttribute('aria-checked')) === 'true');
  ok('RevRec org: Bad Debts category column visible', (await vis('#bad-debt')) && (await val('#bad-debt-cat')) === 'b');
  ok('RevRec org: transaction-type tabs are Default + Payment', (await page.locator('.type').allTextContents()).map(s => s.replace('home', '').trim()).join('|') === 'Default|Payment');
  ok('RevRec org: Invoice date still visible and locked', (await vis('#inv-date')) && !(await en('#inv-date')));
  ok('RevRec org: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await checkFonts('invoices tab, RevRec org');

  // ── 6 · RevRec setup (live 'Revenue recognition set up', screenshot 2026-10-08) ──
  await screen(8);
  ok('setup screen in RevRec org with Revenue recognition active', (await txt('.setup h1')) === 'Revenue recognition set up' && (await txt('.sb-sub.on')).endsWith('Revenue recognition'));
  ok('Synder-settings switches shown on setup screen', (await vis('#so-off')) && (await vis('#sid-created')));
  await page.locator('#so-off').click(); await page.locator('#sid-created').click();
  await page.selectOption('#setup-sched', 'issued');
  ok('both checks fail → two separate toasts', (await page.locator('.toast-err').count()) === 2);
  ok('toast 1: sync open invoices (live copy)', (await page.locator('.toast-err .toast-msg').nth(0).textContent()) === 'Enable sync open invoices in Synder Settings first, if you want to recognize revenue since invoice date');
  ok('toast 2: Invoice date', (await page.locator('.toast-err .toast-msg').nth(1).textContent()).startsWith('Set Invoice date to Invoice issued date'));
  ok('refused pick reverts to Payment date', (await val('#setup-sched')) === 'payment');
  await page.locator('#so-on').click();
  await page.selectOption('#setup-sched', 'issued');
  ok('only the failing check toasts', (await page.locator('.toast-err').count()) === 1 &&
     (await txt('.toast-err .toast-msg')).startsWith('Set Invoice date'));
  await page.selectOption('#setup-sched', 'created');
  ok('Invoice created date needs only open invoices → accepted', (await val('#setup-sched')) === 'created' && (await page.locator('.toast-err').count()) === 0);
  await page.locator('#sid-issued').click();
  await page.selectOption('#setup-sched', 'issued');
  ok('both settings in place → Invoice issued date accepted', (await val('#setup-sched')) === 'issued' && (await page.locator('.toast-err').count()) === 0);
  await page.locator('#so-off').click();
  await page.selectOption('#setup-sched', 'payment');
  ok('Payment date never checks', (await val('#setup-sched')) === 'payment' && (await page.locator('.toast-err').count()) === 0);
  await page.selectOption('#setup-sched', 'created');
  await page.waitForTimeout(50);
  await checkFonts('setup + toast');
  ok('setup: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

  ok('no page errors' + (errors.length ? ' — ' + errors[0] : ''), errors.length === 0);
  await checkFonts('switcher bar');

  await browser.close();
  console.log(`${pass} passed, ${fail} failed — ${target}`);
  process.exit(fail ? 1 : 0);
})();
