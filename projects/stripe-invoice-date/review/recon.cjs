// Recon → statemap.json for the Stripe invoice date prototype (text only, real Chromium).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const URL = process.argv[2] || 'https://dashasyn.github.io/synder-prototypes/projects/stripe-invoice-date/';
const OUT = path.join(__dirname, 'round-1', 'statemap.json');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?v=' + Date.now(), { waitUntil: 'networkidle' });
  const vis = s => p.locator(s).first().isVisible(); const en = s => p.locator(s).first().isEnabled();
  const val = s => p.locator(s).inputValue();
  const T = async s => (await p.locator(s).first().innerText()).replace(/\n{2,}/g, '\n').trim();
  const sc = async n => { await p.click('#sc-' + n); await p.waitForTimeout(60); };
  const st = async s => { await p.click('#st-' + s); await p.waitForTimeout(60); };
  const focus = () => p.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName));
  const modal = () => p.locator('#confirm').evaluate(e => e.classList.contains('show'));
  const zones = []; const Z = (zone, o) => { const z = { zone, ...o, controls: [] }; zones.push(z); return z; };

  // variant bar
  let z = Z('Prototype switcher (dark bar, not product)', { visible_text: await T('.variant-switch') });
  z.controls.push({ label: 'Screen / Org / Example / Spec notes buttons', type: 'button group', behaviour: 'Swap the screen or org state in place. Org buttons not relevant to a screen are disabled.' });

  // 1 Invoices — Pro+ existing
  await sc(1); await st('pro');
  z = Z('1 · Stripe settings → Invoices tab (org: Pro+ existing connection)', { visible_text: await T('.content') });
  z.row_order = await p.$$eval('.set-body .row-label', ls => ls.map(l => l.textContent.replace(/Off$/, '').trim()));
  const u0 = await en('#btn-update');
  await p.selectOption('#inv-date', 'issued'); const u1 = await en('#btn-update'); const v1 = await val('#inv-date');
  await p.click('#btn-update'); const u2 = await en('#btn-update'); const f2 = await focus();
  await p.click('#tab-Sales'); await p.click('#tab-Invoices'); const keep = await val('#inv-date');
  await p.selectOption('#inv-date', 'created'); const u3 = await en('#btn-update'); await p.click('#btn-update');
  z.controls.push({ label: 'Invoice date', type: 'select (native, full width)', options: ['Created date', 'Issued date'], initial_value: 'created',
    behaviour: `Update disabled before any change (${!u0}). Pick Issued → value ${v1}, Update enabled=${u1}, no confirmation dialog, no toast. Click Update → Update disabled=${!u2}, focus returns to ${f2}. Sales→Invoices round-trip keeps "${keep}". Second change to Created → Update enabled=${u3}, saved again.`,
    commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: await vis('#inv-date'), still_clickable: await en('#inv-date') } });
  z.controls.push({ label: 'Update', type: 'button', behaviour: 'Disabled until a select on the tab changes; saves and disables itself. No success message.' });
  z.controls.push({ label: 'Existing switches (Apply payments…, Cancel sync…, Sync unpaid (open) invoices, Sync zero invoices)', type: 'static "Off" switches', behaviour: 'Live strings, static context, not clickable.' });
  await p.click('#tab-Sales'); const onSales = await vis('#post-row'); await p.click('#tab-Invoices'); const back = await vis('#inv-row');
  await p.click('#tab-Sales'); await p.click('#tab-Invoices');
  z.controls.push({ label: 'Left settings menu (General…Multicurrency) and transaction-type tabs (Default…Invoice)', type: 'tabs',
    behaviour: `Only Sales and Invoices are clickable; others static. Sales → Sales panel visible=${onSales}; Invoices → back visible=${back}; repeated twice.`,
    commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: back, still_clickable: true, note: 'tabs commit on click' } });

  await st('new'); { const v0 = await val('#inv-date'); await p.selectOption('#inv-date', 'created'); const e1 = await en('#btn-update'); await p.click('#btn-update');
    await p.selectOption('#inv-date', 'issued'); await p.click('#btn-update');
    Z('1 · Invoices tab (org: Pro+ new connection)', { visible_text: await T('#inv-row') })
    .controls.push({ label: 'Invoice date', type: 'select', behaviour: `Opens on "${v0}" (new connections default to Issued). Change → Update enabled=${e1}, saved; changed back and saved.`,
      commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: await en('#inv-date') } }); }

  await st('below'); z = Z('1 · Invoices tab (org: below Pro)', { visible_text_before_attempt: await T('#inv-row') });
  await p.click('#inv-date'); const g1 = await vis('#inv-gate'); const gtxt = g1 ? await T('#inv-gate') : null; const vAfterClick = await val('#inv-date');
  await p.selectOption('#inv-date', 'issued'); const vAfterKey = await val('#inv-date');
  z.visible_text_after_attempt = await T('#inv-row');
  z.controls.push({ label: 'Invoice date (plan-gated)', type: 'select, looks enabled', behaviour: `Purple link chip "Upgrade to use" next to the label. Clicking the select does not open it; red line appears directly under the select: "${gtxt}". Value stays "${vAfterClick}". Keyboard/selection attempt to Issued reverts to "${vAfterKey}". Update stays disabled=${!(await en('#btn-update'))}. Pattern copied from live "Apply location" toggle (Ignat's screenshot).`,
    commit_path: { picked: true, reached_apply: false, second_interaction: true, still_visible: await vis('#inv-date'), still_clickable: true, note: 'gate is the intended result' } });

  await st('rrpay'); { const e0 = await en('#inv-date'); await p.selectOption('#inv-date', 'issued'); await p.click('#btn-update'); await p.selectOption('#inv-date', 'created'); await p.click('#btn-update');
    Z('1 · Invoices tab (org: RevRec, Schedule start = Payment date)', { visible_text: await T('#inv-row') })
    .controls.push({ label: 'Invoice date', type: 'select', behaviour: `Enabled=${e0}, no lock note. Changed to Issued + Update, then back + Update: both saved.`,
      commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: await en('#inv-date') } }); }
  await st('rrinv'); z = Z('1 · Invoices tab (org: RevRec, Schedule start = Invoice created date)', { visible_text: await T('#inv-row') });
  z.controls.push({ label: 'Invoice date (RevRec lock)', type: 'select, disabled', behaviour: `Disabled=${!(await en('#inv-date'))}, shows saved value "${await val('#inv-date')}". Lock note under the description with a link "Schedule start date".`,
    commit_path: { picked: false, reached_apply: false, second_interaction: true, still_visible: true, still_clickable: false, note: 'disabled by design' } });
  await p.click('#go-schedule');
  z.controls.push({ label: 'Schedule start date (link in lock note)', type: 'link', behaviour: `Opens screen 5 RevRec settings (full-screen Configuration overlay, app sidebar hidden=${!(await vis('.sb'))}).` });

  // 5 RevRec
  z = Z('5 · RevRec → Configuration → Recognition settings (rebuilt from live screenshots)', { visible_text: await T('.content') });
  await sc(6); const rows0 = await p.$$eval('#sched-table tbody tr', r => r.map(x => x.innerText.replace(/\t/g, ' | '))); await sc(4);
  await p.selectOption('#sched-date', 'issued'); const m1 = await modal(); const dlg = m1 ? await T('#confirm .modal') : null; const fm = await focus(); const vDuring = await val('#sched-date');
  await p.click('#dlg-cancel'); const afterCancel = { open: await modal(), value: await val('#sched-date'), focus: await focus() };
  await p.selectOption('#sched-date', 'payment'); await p.keyboard.press('Escape'); const afterEsc = { open: await modal(), value: await val('#sched-date') };
  await p.selectOption('#sched-date', 'issued'); await p.click('#dlg-ok'); const afterOk = { open: await modal(), value: await val('#sched-date') };
  await sc(6); const rows1 = await p.$$eval('#sched-table tbody tr', r => r.map(x => x.innerText.replace(/\t/g, ' | ')));
  await sc(4); await p.selectOption('#sched-date', 'payment'); await p.click('#dlg-ok');
  await sc(6); const rows2 = await p.$$eval('#sched-table tbody tr', r => r.map(x => x.innerText.replace(/\t/g, ' | ')));
  await sc(4);
  z.controls.push({ label: 'Schedule start date', type: 'select → confirmation dialog', options: ['Invoice created date', 'Invoice issued date', 'Payment date'],
    behaviour: `Pick Issued → dialog open=${m1}, focus on ${fm}, select still shows "${vDuring}". Dialog text: "${dlg}". Cancel → ${JSON.stringify(afterCancel)}. Pick Payment, Escape → ${JSON.stringify(afterEsc)}. Pick Issued, Change → ${JSON.stringify(afterOk)}. No success message after Change. Other selects on the page (Discounts recognition mode, Group revrec entries, Monthly subscriptions) are live context with one option each.`,
    commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: await vis('#sched-date'), still_clickable: await en('#sched-date') } });
  await sc(1);
  zones.push({ zone: 'Cross-screen: RevRec Schedule start ↔ Invoices lock', controls: [{ label: 'Invoice date after Schedule start = Payment date', type: 'state dependency',
    behaviour: `Back on Invoices (org RevRec): select enabled=${await en('#inv-date')}, lock note present=${(await p.locator('#inv-lock').count()) > 0}. Lock is derived from the current Schedule start.` }] });

  // spec note
  zones.push({ zone: 'Spec note · Schedule details (not captured from live)', visible_text: 'Spec note tag + "[live copy not captured] Existing columns are placeholders — only Invoice issued date is new." + table', controls: [{ label: 'Schedule details table', type: 'table',
    behaviour: `Rows before any change: ${JSON.stringify(rows0)}. After confirming Invoice issued date: ${JSON.stringify(rows1)}. After confirming Payment date: ${JSON.stringify(rows2)}. Existing rows keep their Schedule start; each confirm adds one highlighted "built after the change" row.` }] });

  // 2 Sales
  await sc(2); z = Z('2 · Stripe settings → Sales tab (Posting date renamed)', { visible_text: await T('.set-body') });
  await p.selectOption('#post-date', 'created'); const s1 = await en('#btn-update'); await p.click('#btn-update');
  await p.selectOption('#post-date', 'balance'); await p.click('#btn-update');
  z.controls.push({ label: 'Payment posting date', type: 'select', options: ['Created date', 'Balance date (recommended)'], behaviour: `Change → Update enabled=${s1}; Update saves. Second change saved too. Label was "Posting date" (no visible label in the live DOM); description is proposed.`,
    commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: true } });

  // 3 Sync details
  await sc(5); z = Z('3 · Transaction → Sync details (example A: synced on issued date)', { visible_text: await T('.content') });
  await p.click('#ex-created'); const bText = await T('#kv');
  z.controls.push({ label: 'Example switch A/B (prototype bar)', type: 'button', behaviour: `B (synced on created date) shows: ${JSON.stringify(bText)} — Issued date row stays, "Date in books" row disappears.` });
  await p.click('#ex-issued'); await p.click('#kv-books a');
  z.controls.push({ label: '"Invoice date" link in Date in books row', type: 'link', behaviour: `Opens the Invoices tab with Invoice date visible=${await vis('#inv-row')}.` });

  // 4 Summary
  await sc(3); await st('pro'); z = Z('4 · Summary Sync → Settings (DS_test_with_AI) → General (rebuilt from live screenshots)', { visible_text: await T('.content') });
  await p.selectOption('#sum-date', 'payment'); const sv1 = await val('#sum-date'); await p.selectOption('#sum-date', 'issued'); const sv2 = await val('#sum-date');
  z.controls.push({ label: 'Sales recording date', type: 'select (org-level row, not per integration)', options: ['Invoice created date', 'Invoice issued date', 'Payment date'],
    behaviour: `Existing org opens on Invoice created date. Pick Payment → "${sv1}", pick Issued → "${sv2}". Saves on change: no Update button, no confirmation, no success message on this page. Card description is proposed copy.`,
    commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: true } });
  await st('new'); { const v0 = await val('#sum-date'); await p.selectOption('#sum-date', 'created'); const a1 = await val('#sum-date'); await p.selectOption('#sum-date', 'issued');
    z.controls.push({ label: 'Sales recording date (new org)', type: 'select', behaviour: `Opens on "${v0}". Changed to "${a1}" then back to Issued, both applied on change.`,
      commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: true } }); }
  await st('below'); await p.selectOption('#sum-date', 'issued'); const gv = await val('#sum-date'); const gtx = await T('#sum-gate');
  await p.selectOption('#sum-date', 'payment'); const gclear = (await p.locator('#sum-gate').count()) === 0;
  z.controls.push({ label: 'Sales recording date (below Pro)', type: 'select with option-level gate', behaviour: `"Upgrade to use" chip next to the card title. Picking Invoice issued date reverts to "${gv}" and shows "${gtx}". Picking Payment date works and clears the red line=${gclear}.`,
    commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: true } });

  const map = { target: 'Stripe invoice date prototype — ' + URL,
    primary_task: 'Choose which date (created vs issued) Stripe invoices carry in the books, in Summary sales and in RevRec schedules, and understand what that choice changes.',
    not_exercised: [
      { control: 'Invoice date (RevRec lock)', reason: 'select disabled by design; the escape link was exercised instead' },
      { control: 'Learn more / Upgrade plan / How to change links', reason: 'href="#", no destination in the prototype' },
      { control: 'Save failures / loading', reason: 'prototype has no backend; no error states exist' }],
    zones, page_errors: errs };
  fs.writeFileSync(OUT, JSON.stringify(map, null, 1)); console.log('ok', zones.length, 'zones', errs);
  await b.close();
})();
