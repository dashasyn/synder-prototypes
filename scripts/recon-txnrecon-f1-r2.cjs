// Round-2 recon for Finalist 1 (no preselection; import method follows the account).
// Real Chromium. Records text before/after, liveness via elementFromPoint, focus target.
const fs = require('fs');
const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const URL = process.env.F1_URL || 'https://dashasyn.github.io/synder-prototypes/projects/txnrecon-setup/finalist-1-sketch.html';
const OUT = process.argv[2] || 'projects/txnrecon-setup/round2';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  const dialogs = []; let acceptDialog = true;
  p.on('dialog', async d => { dialogs.push(d.message()); acceptDialog ? await d.accept() : await d.dismiss(); });
  const load = async () => { await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(300); };
  const card = async () => (await p.innerText('.card')).replace(/\n\s*\n/g, '\n').trim();
  const live = async sel => p.evaluate(s => {
    const el = document.querySelector(s); if (!el) return { exists: false, visible: false, hittable: false };
    const r = el.getBoundingClientRect(); const vis = !!(el.offsetParent || el.getClientRects().length) && r.width > 0 && r.height > 0;
    if (!vis) return { exists: true, visible: false, hittable: false };
    el.scrollIntoView({ block: 'center' }); const r2 = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r2.left + r2.width / 2, r2.top + r2.height / 2);
    return { exists: true, visible: true, hittable: !!hit && (hit === el || el.contains(hit)), disabled: !!el.disabled };
  }, sel);
  const focus = async () => p.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return 'body (focus lost)'; return a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (a.className ? '.' + String(a.className).split(' ').join('.') : '') + ' "' + (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 40) + '"'; });
  const optsOf = async sel => p.$eval(sel, s => [...s.children].map(c => c.tagName === 'OPTGROUP' ? { group: c.label, options: [...c.children].map(o => o.textContent) } : c.textContent));
  const accName = async sel => p.$eval(sel, el => { const id = el.id; const lab = id ? document.querySelector('label[for="' + id + '"]') : null; return el.getAttribute('aria-label') || (lab && lab.innerText.trim()) || (el.closest('label') && el.closest('label').innerText.trim()) || null; });
  const controls = [], states = [], observations = [];
  const add = c => controls.push(c);
  const snap = async (name, how) => states.push({ state: name, how, visible_text: await card() });

  // ---- 0. Initial
  await load();
  await snap('initial (nothing selected)', 'page load');
  const initAccDisabled = await p.$eval('#f-acc', e => e.disabled);
  const grpHidden = await p.$eval('#grp-data', e => e.classList.contains('hidden'));
  observations.push(`Initial: Integration and Account show "Select..."; Account disabled=${initAccDisabled}; "How we get the data" hidden=${grpHidden}. Period preselected to "Last month (Aug 1–31)".`);

  // ---- Run with nothing selected
  await p.click('#run'); await p.waitForTimeout(200);
  add({ zone: 'header', label: 'Run reconciliation (empty form)', type: 'button', before: 'nothing selected', action: 'click',
    after: `error banner: "${(await p.innerText('#run-error')).trim()}"; focus → ${await focus()}; Integration marked invalid=${await p.$eval('#f-int', e => e.classList.contains('field-invalid'))}; Account marked invalid=${await p.$eval('#f-acc', e => e.classList.contains('field-invalid'))}; run started=${await p.$eval('#running', e => e.classList.contains('on'))}`,
    ...(await live('#run')), still_visible: (await live('#run')).visible, still_clickable: (await live('#run')).hittable });
  await snap('Run clicked with empty form', 'click Run with nothing selected');

  // ---- Integration select
  await load();
  const intOpts = await optsOf('#f-int');
  await p.selectOption('#f-int', 'stripe'); await p.waitForTimeout(150);
  const afterInt = { hint: await p.innerText('#h-int'), accDisabled: await p.$eval('#f-acc', e => e.disabled), accOpts: await optsOf('#f-acc'), grpHidden: await p.$eval('#grp-data', e => e.classList.contains('hidden')), accHint: await p.innerText('#h-acc') };
  await snap('integration = Stripe, account not chosen', 'select Integration = mzkt.by (Stripe)');
  await p.selectOption('#f-acc', 'fees'); await p.waitForTimeout(150);
  await p.selectOption('#f-int', 'paypal'); await p.waitForTimeout(150);
  const afterSwitch = { acc: await p.$eval('#f-acc', e => e.value), accOpts: await optsOf('#f-acc'), grpHidden: await p.$eval('#grp-data', e => e.classList.contains('hidden')) };
  const lvInt = await live('#f-int');
  add({ zone: 'what to reconcile', label: 'Integration', type: 'native select', accessible_name: await accName('#f-int'), options: intOpts,
    before: 'Select...', action: 'pick mzkt.by (Stripe); later pick an account, then switch to PayPal',
    after: `after Stripe: hint "${afterInt.hint}", Account enabled=${!afterInt.accDisabled}, Account hint "${afterInt.accHint}", data section hidden=${afterInt.grpHidden}. Account options: ${JSON.stringify(afterInt.accOpts)}. After switching to PayPal with "Stripe fees" chosen: account value="${afterSwitch.acc}" (cleared), data section hidden=${afterSwitch.grpHidden}, PayPal account options: ${JSON.stringify(afterSwitch.accOpts)}`,
    commit_path: { picked: true, reached_apply: true, apply_note: 'native select commits on pick; no Apply step', second_interaction: true, still_visible: lvInt.visible, still_clickable: lvInt.hittable } });

  // ---- Account select
  await load();
  await p.selectOption('#f-int', 'stripe');
  const results = {};
  for (const a of ['clearing', 'clearing_eur', 'fees', 'checking']) {
    await p.selectOption('#f-acc', a); await p.waitForTimeout(250);
    results[a] = { hint: await p.innerText('#h-acc'), text: (await p.innerText('#grp-data')).replace(/\n\s*\n/g, '\n').trim() };
    await snap(`Stripe + account ${a}`, `select Account = ${a}`);
  }
  const lvAcc = await live('#f-acc');
  add({ zone: 'what to reconcile', label: 'Account to reconcile', type: 'native select with optgroups', accessible_name: await accName('#f-acc'),
    before: 'disabled until an integration is picked; hint "Select an integration first"', action: 'pick clearing, clearing EUR, Stripe fees, Business Checking in turn',
    after: Object.entries(results).map(([k, v]) => `${k}: hint "${v.hint}" → data section: ${JSON.stringify(v.text)}`).join(' || '),
    commit_path: { picked: true, reached_apply: true, apply_note: 'native select commits on pick', second_interaction: true, still_visible: lvAcc.visible, still_clickable: lvAcc.hittable } });

  // ---- Period select + custom dates
  await load();
  const perOpts = await optsOf('#f-per');
  const per = {};
  for (const v of ['last_week', 'last_quarter', 'custom', 'last_month']) { await p.selectOption('#f-per', v); await p.waitForTimeout(100); per[v] = { hint: await p.innerText('#h-per'), datesShown: (await live('#d-from')).visible }; }
  const lvPer = await live('#f-per');
  add({ zone: 'period', label: 'Date range', type: 'native select', accessible_name: await accName('#f-per'), options: perOpts,
    before: 'Last month (Aug 1–31) preselected', action: 'pick each option in turn',
    after: Object.entries(per).map(([k, v]) => `${k}: hint "${v.hint}", date inputs visible=${v.datesShown}`).join('; '),
    commit_path: { picked: true, reached_apply: true, apply_note: 'native select', second_interaction: true, still_visible: lvPer.visible, still_clickable: lvPer.hittable } });
  // custom reversed & future-only & today
  const custom = async (f, t) => { await load(); await p.selectOption('#f-int', 'stripe'); await p.selectOption('#f-acc', 'clearing'); await p.selectOption('#f-per', 'custom'); await p.fill('#d-from', f); await p.fill('#d-to', t); await p.dispatchEvent('#d-to', 'change'); await p.click('#run'); await p.waitForTimeout(200); return { err: (await p.innerText('#run-error')).trim(), started: await p.$eval('#running', e => e.classList.contains('on')), hint: await p.innerText('#h-per'), min: await p.$eval('#d-from', e => e.min), max: await p.$eval('#d-to', e => e.max) }; };
  const rev = await custom('2026-08-31', '2026-08-01');
  const fut = await custom('2026-11-01', '2026-11-30');
  const today = await custom('2026-09-01', '2026-09-25');
  add({ zone: 'period', label: 'Custom start/end date inputs', type: 'date inputs', action: 'custom period with Stripe+clearing chosen, then Run',
    after: `reversed Aug31→Aug1: error "${rev.err}", started=${rev.started}; future-only Nov 1–30: error "${fut.err}", started=${fut.started}, hint "${fut.hint}"; range ending today (Sep 1–25): error "${today.err}", started=${today.started}; input min="${fut.min}" max="${fut.max}"`,
    still_visible: true, still_clickable: true });

  // ---- tooltips
  await load();
  for (const [lab, sel] of [['Date range tooltip (?)', 'button[aria-label="About date range"]'], ['Account tooltip (?)', 'button[aria-label="About account"]']]) {
    await p.hover(sel); await p.waitForTimeout(150);
    const txt = await p.$eval(sel + ' .tip-bubble', e => ({ t: e.innerText, vis: getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0' }));
    await p.focus(sel); const fv = await p.$eval(sel + ' .tip-bubble', e => getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0');
    add({ zone: sel.includes('date') ? 'period' : 'what to reconcile', label: lab, type: 'tooltip', action: 'hover, then keyboard focus', after: `text "${txt.t}"; shown on hover=${txt.vis}; shown on focus=${fv}`, still_visible: true, still_clickable: true });
  }

  // ---- Auto panel (Stripe + clearing): mode toggle, matching rules
  await load(); await p.selectOption('#f-int', 'stripe'); await p.selectOption('#f-acc', 'clearing'); await p.waitForTimeout(200);
  const autoText = (await p.innerText('#grp-data')).trim();
  // matching rules modal from auto
  await p.click('#match-rules-auto'); await p.waitForTimeout(150);
  const modalOpen = await p.$eval('#match-modal', e => e.classList.contains('on')); const modalFocus = await focus(); const modalText = (await p.innerText('#match-modal')).trim();
  await p.keyboard.press('Tab'); const tabFocus = await focus(); await p.keyboard.press('Tab'); const tab2 = await focus();
  await p.keyboard.press('Escape'); await p.waitForTimeout(100); const escClosed = !(await p.$eval('#match-modal', e => e.classList.contains('on'))); const focusAfterEsc = await focus();
  await p.click('#match-rules-auto'); await p.waitForTimeout(100); await p.click('#match-modal-close'); await p.waitForTimeout(100);
  const closeClosed = !(await p.$eval('#match-modal', e => e.classList.contains('on')));
  const lvMR = await live('#match-rules-auto');
  add({ zone: 'how we get the data', label: 'Matching rules (link → modal)', type: 'modal', action: 'click; Tab ×2; Escape; reopen; Close',
    after: `opens=${modalOpen}; modal text ${JSON.stringify(modalText)}; focus on open → ${modalFocus}; Tab → ${tabFocus}; Tab → ${tab2}; Escape closes=${escClosed}, focus after → ${focusAfterEsc}; Close button closes=${closeClosed}`,
    commit_path: { picked: true, reached_apply: true, apply_note: 'Close button reached and closes', second_interaction: true, still_visible: lvMR.visible, still_clickable: lvMR.hittable } });

  // mode toggle → manual panel
  await p.click('#mode-toggle'); await p.waitForTimeout(200);
  const manualText = (await p.innerText('#grp-data')).replace(/\n\s*\n/g, '\n').trim(); const toggleLabel2 = await p.innerText('#mode-toggle');
  await snap('Stripe + clearing, after "Set import methods"', 'click Set import methods');
  const msels = await p.$$eval('.msel select', ss => ss.map(s => ({ side: s.dataset.side, value: s.value, options: [...s.options].map(o => o.textContent), named: !!(s.getAttribute('aria-label') || s.id && document.querySelector('label[for="' + s.id + '"]') || s.getAttribute('aria-labelledby')) })));
  // Books method select
  await p.selectOption('.msel select[data-side=books]', 'Manual'); await p.waitForTimeout(150);
  const booksManualText = (await p.innerText('#sources')).replace(/\n\s*\n/g, '\n').trim();
  await p.selectOption('.msel select[data-side=books]', 'Automated'); await p.waitForTimeout(150);
  const lvB = await live('.msel select[data-side=books]');
  add({ zone: 'how we get the data', label: 'Import method (Accounting side) select', type: 'native select', accessible_name_present: msels.find(m => m.side === 'books')?.named, options: msels.find(m => m.side === 'books')?.options,
    before: `value ${msels.find(m => m.side === 'books')?.value}`, action: 'pick Manual, then Automated', after: `Manual → sources text ${JSON.stringify(booksManualText)}`,
    commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: lvB.visible, still_clickable: lvB.hittable } });
  // Integration method select
  const intM = {};
  for (const v of ['Automated', 'Manual', 'Assisted']) { await p.selectOption('.msel select[data-side=integration]', v); await p.waitForTimeout(150); intM[v] = (await p.innerText('#sources')).replace(/\n\s*\n/g, '\n').trim().split('Integration').slice(1).join('Integration'); }
  const lvI = await live('.msel select[data-side=integration]');
  add({ zone: 'how we get the data', label: 'Import method (Integration side) select', type: 'native select', accessible_name_present: msels.find(m => m.side === 'integration')?.named, options: msels.find(m => m.side === 'integration')?.options,
    before: `value after toggle: ${msels.find(m => m.side === 'integration')?.value}`, action: 'pick Automated, Manual, Assisted', after: Object.entries(intM).map(([k, v]) => `${k} → ${JSON.stringify(v)}`).join(' || '),
    commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: lvI.visible, still_clickable: lvI.hittable } });
  add({ zone: 'how we get the data', label: 'Set import methods / Use automatic retrieval (toggle link)', type: 'link button', before: 'label "Set import methods", auto card shown', action: 'click',
    after: `label → "${toggleLabel2}"; manual panel text ${JSON.stringify(manualText)}`, still_visible: (await live('#mode-toggle')).visible, still_clickable: (await live('#mode-toggle')).hittable });

  // accordion (Assisted is current)
  const accSel = '#sources [data-steps]';
  await p.focus(accSel); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  const accOpen = await p.$eval(accSel, e => e.getAttribute('aria-expanded')); const accFocus = await focus();
  const stepsText = await p.$$eval('#sources .acc.on .steps', ss => ss.map(s => s.innerText.trim()));
  await p.click(accSel); await p.waitForTimeout(120); await p.click(accSel); await p.waitForTimeout(120);
  const lvAcc2 = await live(accSel);
  add({ zone: 'how we get the data', label: 'How-to accordion ("How to get … from Stripe")', type: 'accordion', action: 'keyboard Enter; then click twice',
    after: `aria-expanded → ${accOpen}; focus after Enter → ${accFocus}; steps text ${JSON.stringify(stepsText)}`,
    commit_path: { toggled: true, reached_apply: true, apply_note: 'no Apply; toggles in place', second_interaction: true, still_visible: lvAcc2.visible, still_clickable: lvAcc2.hittable } });

  // Browse / Remove
  const nDrops = await p.$$eval('#sources [data-pick]', x => x.length);
  await p.focus('#sources [data-pick]'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  const afterPickFocus = await focus(); const chip = await p.$$eval('#sources .chip', c => c.map(x => x.innerText.replace(/\n/g, ' ')));
  const realInput = await p.$$eval('#sources input[type=file]', x => x.length);
  await p.click('#sources [data-rm]'); await p.waitForTimeout(120); const afterRm = await p.$$eval('#sources .chip', c => c.length);
  await p.click('#sources [data-pick]'); await p.waitForTimeout(120);
  const lvPick = await live('#sources [data-pick]');
  add({ zone: 'how we get the data', label: 'Browse (file picker)', type: 'file picker', action: `Enter on Browse (${nDrops} drop zones); Remove; Browse again`,
    after: `no OS file dialog, a file is fabricated: chips ${JSON.stringify(chip)}; real <input type=file> count=${realInput}; focus after → ${afterPickFocus}; Remove → chips left ${afterRm}`,
    commit_path: { picked: true, reached_apply: true, apply_note: 'file appears immediately as a chip', second_interaction: true, still_visible: lvPick.visible, still_clickable: lvPick.hittable } });

  // Run with a file missing
  await p.click('#run'); await p.waitForTimeout(150);
  const missErr = (await p.innerText('#run-error')).trim(); const missFocus = await focus();
  // back to automatic with uploads → confirm (dismiss then accept)
  acceptDialog = false; dialogs.length = 0; await p.click('#mode-toggle'); await p.waitForTimeout(150);
  const keptAfterCancel = await p.$$eval('#sources .chip', c => c.length); const dlg = dialogs[0];
  acceptDialog = true; await p.click('#mode-toggle'); await p.waitForTimeout(150);
  const notice = await p.innerText('#auto-notice');
  add({ zone: 'how we get the data', label: 'Use automatic retrieval (with an uploaded file)', type: 'link button', action: 'click → Cancel on confirm; click → OK',
    after: `native confirm "${dlg}"; Cancel keeps chips=${keptAfterCancel}; OK → notice "${notice}"`, still_visible: true, still_clickable: true });
  add({ zone: 'header', label: 'Run reconciliation (one file missing, Assisted)', type: 'button', action: 'click', after: `error "${missErr}"; focus → ${missFocus}`, still_visible: true, still_clickable: true });

  // ---- Manual-only account (fees): both sides
  await load(); await p.selectOption('#f-int', 'stripe'); await p.selectOption('#f-acc', 'fees'); await p.waitForTimeout(200);
  const feeMsels = await p.$$eval('.msel select', ss => ss.map(s => s.dataset.side + ':' + [...s.options].map(o => o.textContent).join('/')));
  const togHidden = !(await live('#mode-toggle')).visible;
  observations.push(`Stripe + "Stripe fees": toggle hidden=${togHidden}; method selects ${JSON.stringify(feeMsels)} — the Accounting side is forced to Manual too (QuickBooks file upload required).`);

  // ---- PayPal / Shopify
  for (const [int, acc] of [['paypal', 'pp'], ['shopify', 'sh']]) {
    await load(); await p.selectOption('#f-int', int); const ao = await optsOf('#f-acc'); await p.selectOption('#f-acc', acc); await p.waitForTimeout(200);
    const t = (await p.innerText('#grp-data')).replace(/\n\s*\n/g, '\n').trim();
    observations.push(`${int} + ${acc}: account groups ${JSON.stringify(ao)}; data section ${JSON.stringify(t)}`);
    await snap(`${int} + ${acc}`, `select ${int}, account ${acc}`);
  }

  // ---- Happy path run + frozen form
  await load(); await p.selectOption('#f-int', 'stripe'); await p.selectOption('#f-acc', 'clearing'); await p.click('#run'); await p.waitForTimeout(300);
  const runState = { label: await p.innerText('#run'), status: (await p.innerText('#running')).trim(), disabled: await p.$$eval('#f-per,#f-int,#f-acc,#mode-toggle', els => els.map(e => e.id + '=' + (e.disabled || e.getAttribute('aria-disabled') === 'true'))) };
  const closeLv = await live('.bar .x');
  await p.click('.bar .x'); await p.waitForTimeout(150);
  add({ zone: 'header', label: 'Run reconciliation (Stripe + clearing, automatic)', type: 'button', action: 'click',
    after: `button → "${runState.label}"; status ${JSON.stringify(runState.status)}; disabled: ${runState.disabled.join(', ')}`, still_visible: true, still_clickable: true });
  add({ zone: 'header', label: 'Close (✕)', type: 'icon button', action: 'click (after run)', after: `no navigation/dialog; url unchanged=${p.url() === URL}`, still_visible: closeLv.visible, still_clickable: closeLv.hittable });
  await snap('run started', 'Stripe + clearing, automatic, Run');

  const map = { target: 'Finalist 1 — projects/txnrecon-setup/finalist-1-sketch.html @ 18913e7', url: URL, round: 2,
    primary_task: 'Start a reconciliation: choose integration and account, then (if needed) upload files, and run it.',
    zones: ['header', 'period', 'what to reconcile', 'how we get the data', 'matching rules modal', 'run status'],
    page_errors: errors, observations, states,
    not_exercised: [
      { control: 'Drag-and-drop onto the upload zone', reason: 'prototype has no drop handler; only Browse is wired' },
      { control: 'Results / matched-unmatched screen', reason: 'not built — the flow ends at "Reconciliation started"' },
      { control: 'Retrieval failure and empty-result states', reason: 'not implemented in the prototype' }
    ],
    controls };
  fs.writeFileSync(OUT + '/statemap.json', JSON.stringify(map, null, 2));
  console.log('controls', controls.length, 'states', states.length, 'errors', errors.length);
  await b.close();
})();
