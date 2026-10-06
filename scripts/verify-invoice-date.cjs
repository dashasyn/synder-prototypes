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
  ok('below Pro: no red line before an attempt', (await page.locator('#inv-gate').count()) === 0);
  await page.locator('#inv-date').click();
  ok('below Pro: clicking the select reveals the red line', (await vis('#inv-gate')) &&
     (await txt('#inv-gate')) === 'This feature is available on higher plans. Upgrade plan');
  ok('below Pro: click does not change the value', (await val('#inv-date')) === 'created');
  await page.selectOption('#inv-date', 'issued');
  ok('below Pro: keyboard/selection attempt reverts to Created', (await val('#inv-date')) === 'created');
  ok('below Pro: red line still shown after attempt', await vis('#inv-gate'));
  ok('below Pro: select stays visible and focusable', (await vis('#inv-date')) &&
     await page.evaluate(() => document.activeElement.id === 'inv-date'));
  ok('below Pro: Update stays disabled', !(await en('#btn-update')));

  await state('rrpay');
  ok('RevRec payment date: select enabled', await en('#inv-date'));
  ok('RevRec payment date: no lock', (await page.locator('#inv-lock').count()) === 0);

  await state('rrinv');
  ok('RevRec invoice date: select disabled', !(await en('#inv-date')));
  ok('RevRec invoice date: lock note visible', await vis('#inv-lock'));
  ok('lock note links to Schedule start', await vis('#go-schedule'));
  await page.locator('#go-schedule').click();

  // ── 4 · RevRec ──────────────────────────────────────────────────────
  ok('lock link lands on RevRec screen', await vis('#sched-row'));
  ok('Schedule start reads Invoice created date', (await val('#sched-date')) === 'created');
  ok('three schedule values', (await page.locator('#sched-date option').allTextContents()).join('|')
     === 'Invoice created date|Invoice issued date|Payment date');
  ok('no option still called plain "Invoice date"',
     !(await page.locator('#sched-date option').allTextContents()).includes('Invoice date'));
  ok('RevRec marker visible', (await txt('#rr-marker')).startsWith(MARK));
  ok('RevRec is labelled a spec note', await vis('#rr-spec'));
  ok('table marker visible', (await txt('#tbl-marker')).startsWith(MARK));
  ok('Issued column present', (await page.locator('#sched-table th').allTextContents()).includes('Invoice issued date'));
  ok('pre-release row has blank issued date',
     (await page.locator('#sched-table tbody tr').nth(2).locator('td').nth(3).textContent()).trim() === '');
  const existing = '#sched-table tbody tr:not(.row-built) td:nth-child(5)';
  const startsBefore = await page.locator(existing).allTextContents();
  ok('no post-change rows before a change', (await page.locator('#sched-table tr.row-built').count()) === 0);

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
  ok('existing schedule rows not re-dated',
     JSON.stringify(await page.locator(existing).allTextContents()) === JSON.stringify(startsBefore));
  ok('one schedule built after the change', (await page.locator('#sched-table tr.row-built').count()) === 1);
  ok('post-change schedule starts on its issued date',
     (await page.locator('#sched-table tr.row-built').nth(0).locator('td').nth(4).textContent()) === 'Oct 5, 2026' &&
     (await page.locator('#sched-table tr.row-built').nth(0).locator('td').nth(3).textContent()) === 'Oct 5, 2026');
  ok('post-change row visible', await page.locator('#sched-table tr.row-built').first().isVisible());
  await checkFonts('screen 4');
  await page.locator('#confirm').evaluate(e => e.classList.add('show'));
  await checkFonts('confirm dialog');
  await page.locator('#confirm').evaluate(e => e.classList.remove('show'));

  await page.selectOption('#sched-date', 'payment');
  await page.locator('#dlg-ok').click();
  ok('Schedule start now Payment date', (await val('#sched-date')) === 'payment');
  ok('second post-change schedule starts on its payment date',
     (await page.locator('#sched-table tr.row-built').nth(1).locator('td').nth(4).textContent()) === 'Oct 14, 2026');
  ok('earlier post-change schedule not re-dated',
     (await page.locator('#sched-table tr.row-built').nth(0).locator('td').nth(4).textContent()) === 'Oct 5, 2026');
  ok('existing schedules still not re-dated',
     JSON.stringify(await page.locator(existing).allTextContents()) === JSON.stringify(startsBefore));
  await screen(1);
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
  ok('Summary marker visible', (await txt('#sum-marker')).startsWith(MARK));
  ok('Summary is labelled a spec note', await vis('#sum-spec'));
  ok('spec notes sit in their own switcher group', await page.evaluate(() =>
    document.getElementById('sc-3').parentElement !== document.getElementById('sc-1').parentElement));
  ok('RevRec states disabled on Summary', !(await en('#st-rrinv')));
  await state('pro');
  ok('existing Summary org on Invoice created date', (await val('#sum-date')) === 'created');
  await state('new');
  ok('new Summary org on Invoice issued date', (await val('#sum-date')) === 'issued');
  await state('below');
  ok('below Pro: Summary select still enabled', await en('#sum-date'));
  ok('below Pro: Summary chip shown', await vis('#chip-upgrade'));
  ok('below Pro: no Summary red line before an attempt', (await page.locator('#sum-gate').count()) === 0);
  await page.selectOption('#sum-date', 'issued');
  ok('below Pro: picking Invoice issued date reverts', (await val('#sum-date')) === 'created');
  ok('below Pro: and reveals the red line', (await vis('#sum-gate')) &&
     (await txt('#sum-gate')).startsWith('This feature is available on higher plans.'));
  await page.selectOption('#sum-date', 'payment');
  ok('below Pro: can pick Payment date', (await val('#sum-date')) === 'payment');
  ok('below Pro: red line clears after a valid pick', (await page.locator('#sum-gate').count()) === 0);
  await checkFonts('screen 3');

  // ── 5 · Sync details ────────────────────────────────────────────────
  await screen(5);
  ok('example group shown on screen 5', await vis('#ex-issued'));
  ok('org group hidden on screen 5', !(await vis('#st-pro')));
  ok('Transaction date row present', (await page.locator('#kv .k').allTextContents()).includes('Transaction date'));
  ok('A: Issued date row visible', await vis('#kv-issued'));
  ok('A: Date in books row visible', await vis('#kv-books'));
  ok('A: books date is the issued date', (await txt('#kv-books')).startsWith('Jan 6, 2026'));
  await page.locator('#ex-created').click();
  ok('B: Issued date row visible', await vis('#kv-issued'));
  ok('B: no Date in books row', (await page.locator('#kv-books').count()) === 0);
  await checkFonts('screen 5');
  await page.locator('#ex-issued').click();
  await page.locator('#kv-books a').click();
  ok('setting link in Sync details opens Invoices tab', await vis('#inv-row'));

  ok('no page errors' + (errors.length ? ' — ' + errors[0] : ''), errors.length === 0);
  await checkFonts('switcher bar');

  await browser.close();
  console.log(`${pass} passed, ${fail} failed — ${target}`);
  process.exit(fail ? 1 : 0);
})();
