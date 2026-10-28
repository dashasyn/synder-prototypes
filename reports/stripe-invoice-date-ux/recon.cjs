// Recon for the external Stripe invoice date prototype → statemap.json (text only).
const { chromium } = require('playwright');
const fs = require('fs');
const URL = 'https://dashasyn.github.io/synder-ux-prototypes/prototypes/stripe-invoice-date/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  const vis = s => p.locator(s).first().isVisible();
  const en = s => p.locator(s).first().isEnabled();
  const val = s => p.locator(s).inputValue();
  const toast = async () => { const t = p.locator('#toast'); return (await t.isVisible()) ? (await t.textContent()).trim() : null; };
  const modal = () => p.locator('#modal-overlay').evaluate(e => getComputedStyle(e).display !== 'none' && e.classList.contains('show'));
  const variant = async v => { await p.click(`.vbar .tab[data-variant="${v}"]`); await p.waitForTimeout(80); };
  const textOf = async s => (await p.locator(s).innerText()).replace(/\s+\n/g, '\n').trim();
  const zones = [];
  const Z = (zone, extra) => { const z = { zone, ...extra, controls: [] }; zones.push(z); return z; };

  // ── PT · Pro
  await variant('pt-pro');
  let z = Z('PT · Invoices tab · Pro (variant pt-pro)', { visible_text: await textOf('#panel-invoices') });
  z.row_order = await p.$$eval('#panel-invoices .setting-label', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  let before = await val('#sel-invoice-date');
  await p.selectOption('#sel-invoice-date', 'created'); const t1 = await toast(); const v1 = await val('#sel-invoice-date');
  await p.waitForTimeout(2000);
  await p.selectOption('#sel-invoice-date', 'issued'); const t2 = await toast(); const v2 = await val('#sel-invoice-date');
  z.controls.push({ label: 'Invoice date', type: 'select (native)', options: ['Created date', 'Issued date'], initial_value: before,
    behaviour: `Change to Created → value "${v1}", toast "${t1}" (auto-save, no confirmation). Change back to Issued → value "${v2}", toast "${t2}". The page ALSO has an "Update" button at the bottom of the tab.`,
    commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: await vis('#sel-invoice-date'), still_clickable: await en('#sel-invoice-date') } });
  await p.click('#btn-update'); const t3 = await toast();
  z.controls.push({ label: 'Update (Invoices tab)', type: 'button', behaviour: `Click → toast "${t3}". Invoice date already saved on change, so two save models co-exist on one tab.`, still_visible: await vis('#btn-update') });
  z.controls.push({ label: 'Existing toggles (Apply payments…, Cancel sync…, Sync unpaid (open) invoices, Sync zero invoices)', type: 'toggle (static)', behaviour: 'Static, all Off, not clickable (context only). Their help text is reworded (e.g. "Synder applies the payment to the matching unpaid invoice.") — not the live strings.' });
  z.notes = ['Invoice date row is the FIRST row on the tab, above the four existing toggles (FDD gives no position; earlier proposal put it after Sync unpaid (open) invoices).',
    'Row carries a "New" badge, a help sentence, a grey caption about defaults, and a blue info callout about the transactions table — three text blocks for one select.',
    'pt-pro opens with value Issued date while the caption says existing connections stay on Created — the state does not say whether this is a new or existing connection.'];

  // left nav
  z = Z('PT · settings tab bar (left/inner nav)', {});
  await p.click('#pt-nav button[data-tab="sales"]'); const sv = await vis('#panel-sales');
  await p.click('#pt-nav button[data-tab="general"]'); const ov = await textOf('#panel-other');
  await p.click('#pt-nav button[data-tab="invoices"]'); const iv = await vis('#panel-invoices');
  z.controls.push({ label: 'Tabs General…Multicurrency', type: 'tab buttons', behaviour: `Sales → Sales panel visible=${sv}. General → placeholder "${ov}". Invoices → back, visible=${iv}.` });
  z.controls.push({ label: 'Default / Invoice payment / + Create additional settings', type: 'buttons (static)', behaviour: 'No handlers; nothing happens on click.' });

  // ── PT · Upgrade
  await variant('pt-upgrade');
  z = Z('PT · Invoices tab · below Pro (variant pt-upgrade)', { visible_text: await textOf('#row-invoice-date') });
  const upEn = await en('#sel-invoice-date'); const upV = await val('#sel-invoice-date');
  z.controls.push({ label: 'Invoice date (gated)', type: 'select', behaviour: `Disabled=${!upEn}, shows "${upV}". "Upgrade to use" badge visible=${await vis('#badge-upgrade')}; message "This feature is available on higher plans. Upgrade plan" under the select. Help caption and callout hidden.`,
    commit_path: { picked: false, reached_apply: false, second_interaction: true, still_visible: await vis('#sel-invoice-date'), still_clickable: upEn, note: 'disabled — cannot pick; this is the intended gate' } });
  await p.click('#plan-msg a'); 
  z.controls.push({ label: 'Upgrade plan', type: 'link', behaviour: `href="#" — click does nothing (url now ${p.url().replace(URL,'')||'(same)'}).` });

  // ── PT · RevRec lock
  await variant('pt-revrec');
  z = Z('PT · Invoices tab · RevRec lock (variant pt-revrec)', { visible_text: await textOf('#row-invoice-date') });
  z.controls.push({ label: 'Invoice date (locked)', type: 'select', behaviour: `Disabled=${!(await en('#sel-invoice-date'))}, forced to "${await val('#sel-invoice-date')}" regardless of the value chosen in pt-pro. Lock message + "Change Schedule start date instead →" + grey note "When Schedule start is Payment date, this control can be changed."`,
    commit_path: { picked: false, reached_apply: false, second_interaction: true, still_visible: true, still_clickable: false, note: 'disabled by design' } });
  await p.click('#goto-revrec'); const onRR = await vis('#view-revrec');
  z.controls.push({ label: 'Change Schedule start date instead →', type: 'link-button', behaviour: `Click → RevRec view visible=${onRR}; variant bar switches to RevRec.` });

  // ── RevRec
  z = Z('RevRec · Schedule start + schedule details (variant revrec)', { visible_text: await textOf('#view-revrec') });
  const rows0 = await p.$$eval('#view-revrec table tbody tr', trs => trs.map(t => t.innerText.replace(/\t/g,' | ')));
  await p.selectOption('#sel-schedule-start', 'issued'); const m1 = await modal(); const mt = m1 ? await textOf('#modal-overlay') : null;
  const vDuring = await val('#sel-schedule-start');
  await p.click('#modal-cancel'); const afterCancel = { open: await modal(), value: await val('#sel-schedule-start') };
  await p.selectOption('#sel-schedule-start', 'payment'); const m2 = await modal();
  await p.keyboard.press('Escape'); const afterEsc = { open: await modal(), value: await val('#sel-schedule-start') };
  if (afterEsc.open) await p.click('#modal-close');
  const afterX = { open: await modal(), value: await val('#sel-schedule-start') };
  await p.selectOption('#sel-schedule-start', 'issued'); await p.click('#modal-confirm');
  const afterConfirm = { open: await modal(), value: await val('#sel-schedule-start'), toast: await toast() };
  const rows1 = await p.$$eval('#view-revrec table tbody tr', trs => trs.map(t => t.innerText.replace(/\t/g,' | ')));
  await p.selectOption('#sel-schedule-start', 'payment'); await p.click('#modal-confirm');
  const rows2 = await p.$$eval('#view-revrec table tbody tr', trs => trs.map(t => t.innerText.replace(/\t/g,' | ')));
  const focusInModal = null;
  z.controls.push({ label: 'Schedule start date', type: 'select → confirmation modal', options: ['Invoice created date','Invoice issued date','Payment date'],
    behaviour: `Pick Issued → modal open=${m1}, select shows "${vDuring}" while modal open. Modal text: "${mt}". Cancel → ${JSON.stringify(afterCancel)}. Pick Payment → modal=${m2}; Escape → ${JSON.stringify(afterEsc)} (Escape does NOT close if open=true); × → ${JSON.stringify(afterX)}. Pick Issued + Confirm → ${JSON.stringify(afterConfirm)}.`,
    commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: await vis('#sel-schedule-start'), still_clickable: await en('#sel-schedule-start') } });
  z.controls.push({ label: 'Schedule details table', type: 'table (static rows, one cell scripted)',
    behaviour: `Rows before any change: ${JSON.stringify(rows0)}. After confirming Invoice issued date: ${JSON.stringify(rows1)}. After confirming Payment date: ${JSON.stringify(rows2)}. The "after release" row's Schedule start cell is rewritten on every confirm, although the modal just said existing schedules keep their dates.` });
  z.notes = ['Header line reads "Configuration · mzkt.by (Stripe) · invented chrome (not live in demo)" — a prototype annotation rendered as product text.',
    'Label "Schedule start date" appears twice (section heading + row label), each with its own description.',
    'A "Sync lock:" paragraph and an "Issued date column" note sit inside the product UI as explanations.'];

  // After setting Payment date, does PT lock lift?
  await variant('pt-revrec');
  zones.push({ zone: 'Cross-screen: RevRec ↔ PT lock', controls: [{ label: 'PT RevRec lock after Schedule start = Payment date', type: 'state dependency',
    behaviour: `With Schedule start confirmed as Payment date on RevRec, returning to PT · RevRec lock still shows select disabled=${!(await en('#sel-invoice-date'))} and the lock message visible=${await vis('#lock-msg')}. The lock is a fixed variant, not derived from Schedule start.` }] });

  // ── PT · Sales
  await variant('pt-sales');
  z = Z('PT · Sales tab · rename (variant pt-sales)', { visible_text: await textOf('#panel-sales') });
  const pb = await val('#sel-payment-posting');
  await p.selectOption('#sel-payment-posting', 'created'); const s1 = await toast();
  await p.selectOption('#sel-payment-posting', 'balance'); const s2 = await toast();
  z.controls.push({ label: 'Payment posting date', type: 'select (native)', options: ['Created date','Balance date (recommended)'], initial_value: pb,
    behaviour: `Change → toast "${s1}", change back → "${s2}". Also an Update button on the tab.`, commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: await en('#sel-payment-posting') } });
  z.notes = ['Row shows a "Renamed" badge and the line "Was “Posting date”. Renamed so it is not confused with the new Invoice date setting." in the product UI.',
    'Help text uses "cash-side" in bold.'];

  // ── Summary
  await variant('summary');
  z = Z('Summary Sync · Sales recording date (variant summary)', { visible_text: await textOf('#view-summary') });
  const sb = await val('#sel-sales-recording');
  await p.selectOption('#sel-sales-recording', 'payment'); const u1 = await toast();
  await p.selectOption('#sel-sales-recording', 'created'); const u2 = await toast();
  z.controls.push({ label: 'Sales recording date', type: 'select (native)', options: ['Invoice created date','Invoice issued date','Payment date'], initial_value: sb,
    behaviour: `Change → toast "${u1}", again → "${u2}".`, commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: true } });
  await p.click('#sum-plan-gate'); const gEn = await en('#sel-sales-recording');
  z.controls.push({ label: 'Plan state micro-toggle (Pro available / Upgrade to use)', type: 'segmented control inside the product card',
    behaviour: `Upgrade to use → whole Sales recording date select disabled=${!gEn} (Payment date and Invoice created date also unavailable), badge + "This feature is available on higher plans. Upgrade plan". Pro available → re-enabled.`,
    commit_path: { toggled: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: true } });
  await p.click('#sum-plan-pro');
  z.notes = ['Card subtitle "Summary Sync settings for this Stripe connection." and a "Plan state:" switch are inside the product card.',
    'Help continues "Default for the issued option is Invoice issued date. Datasource dating matches Per Transaction rules." — FDD/engineering wording.'];

  const map = { target: 'Stripe invoice date — ' + URL, primary_task: 'Choose which date (created vs issued) Stripe invoices carry in the books and in RevRec schedules, and understand what the choice changes.',
    not_exercised: [
      { control: 'Sync details / transaction drilldown', reason: 'not present in this prototype — FDD S1.5 requires it' },
      { control: 'Trial state / new-connection state', reason: 'no variant for them in this prototype' },
      { control: 'Learn more → / How to change mode links', reason: 'href="#", no destination' }],
    zones, page_errors: errs };
  fs.writeFileSync('reports/stripe-invoice-date-ux/round-1/statemap.json', JSON.stringify(map, null, 1));
  await b.close(); console.log('ok', zones.length, errs);
})();
