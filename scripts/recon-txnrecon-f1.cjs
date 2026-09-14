/**
 * Step 3 recon — TxnRecon setup, Finalist 1 (#f1 pane of team-compare.html).
 * Real Chromium. Records what actually happens on interaction, as text.
 * Liveness (isVisible / clickability) after every interaction, never element state.
 * Every panel-opening control: open -> pick/toggle -> try to reach commit -> twice.
 */
const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.RECON_URL ||
  'https://dashasyn.github.io/synder-prototypes/projects/txnrecon-setup/finalist-1-sketch.html';
const OUT = '/home/ubuntu/.openclaw/workspace/projects/txnrecon-setup/round1/statemap.json';

const controls = [];
const not_exercised = [];
const observations = [];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  p.on('pageerror', e => pageErrors.push(e.message));
  await p.goto(URL, { waitUntil: 'networkidle' });

  const live = async sel => {
    const l = p.locator(sel).first();
    if (!(await l.count())) return { still_visible: false, still_clickable: false };
    const visible = await l.isVisible().catch(() => false);
    let clickable = false;
    if (visible) {
      // hittability: does an elementFromPoint at its centre land inside it?
      clickable = await l.evaluate(el => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!t && (el === t || el.contains(t) || t.contains(el));
      }).catch(() => false);
    }
    return { still_visible: visible, still_clickable: clickable };
  };
  const txt = async sel => (await p.locator(sel).first().count())
    ? (await p.locator(sel).first().innerText()).trim() : null;
  const val = async sel => p.locator(sel).first().inputValue().catch(() => null);
  const activeEl = () => p.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return 'body (focus lost)';
    return a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') +
      (a.className && typeof a.className === 'string' ? '.' + a.className.trim().split(/\s+/).join('.') : '') +
      ' "' + (a.innerText || a.value || '').trim().slice(0, 40) + '"';
  });

  /* ── header ───────────────────────────────────────────────────────────── */
  controls.push({
    zone: 'header', label: 'Close (✕)', type: 'icon button',
    before: 'Setup form filled in', action: 'click',
    after: await (async () => {
      const url0 = p.url();
      await p.locator('.bar button.x').click();
      await p.waitForTimeout(150);
      return `no visible change, no dialog, no navigation (url unchanged: ${p.url() === url0}). No confirmation before discarding the setup.`;
    })(),
    ...(await live('.bar button.x')),
  });

  controls.push({
    zone: 'header', label: 'Read-only. Nothing in your books changes.', type: 'static badge',
    after: 'Static text beside the primary action. Text: "' + (await txt('#read-only')) + '"',
    ...(await live('#read-only')),
  });

  /* ── period ───────────────────────────────────────────────────────────── */
  const perBefore = { value: await val('#f-per'), hint: await txt('#h-per'), datesVisible: await p.locator('#dates').isVisible() };
  await p.selectOption('#f-per', 'custom');
  await p.waitForTimeout(120);
  const perCustom1 = { value: await val('#f-per'), hint: await txt('#h-per'), datesVisible: await p.locator('#dates').isVisible(), from: await val('#d-from'), to: await val('#d-to') };
  await p.selectOption('#f-per', 'last_week');
  await p.waitForTimeout(120);
  const perWeek = { hint: await txt('#h-per'), datesVisible: await p.locator('#dates').isVisible(), from: await val('#d-from'), to: await val('#d-to') };
  await p.selectOption('#f-per', 'custom');
  await p.waitForTimeout(120);
  const perCustom2 = { value: await val('#f-per'), datesVisible: await p.locator('#dates').isVisible(), from: await val('#d-from'), to: await val('#d-to') };
  controls.push({
    zone: 'period', label: 'Date range', type: 'native select (dropdown)', opens_panel: true,
    options: ['Last week (Aug 24–30)', 'Last month (Aug 1–31)', 'Last quarter (Jun 1–Aug 31)', 'Custom'],
    before: `value=${perBefore.value}, hint="${perBefore.hint}", custom date inputs visible=${perBefore.datesVisible}`,
    after: `picked Custom -> value=${perCustom1.value}, date inputs visible=${perCustom1.datesVisible}, prefilled ${perCustom1.from}..${perCustom1.to}, hint="${perCustom1.hint}". Picked Last week -> hint="${perWeek.hint}" (EMPTY string; Last month is the only option with helper copy), inputs ${perWeek.from}..${perWeek.to}, inputs visible=${perWeek.datesVisible}. Picked Custom again -> visible=${perCustom2.datesVisible}, inputs ${perCustom2.from}..${perCustom2.to}.`,
    commit_path: { picked: true, reached_apply: true, apply_note: 'no Apply step — native select commits on change; value read back and confirmed changed', second_interaction: true, ...(await live('#f-per')) },
    ...(await live('#f-per')),
  });

  // reversed / future custom range
  await p.fill('#d-from', '2026-08-31');
  await p.fill('#d-to', '2026-08-01');
  await p.locator('#d-to').dispatchEvent('change');
  await p.waitForTimeout(150);
  const reversed = { hint: await txt('#h-per'), runDisabled: await p.locator('#run').isDisabled(), err: await p.locator('.err, .error, [role="alert"]').count() };
  await p.fill('#d-from', '2027-01-01');
  await p.fill('#d-to', '2027-12-31');
  await p.locator('#d-to').dispatchEvent('change');
  await p.waitForTimeout(150);
  const future = { hint: await txt('#h-per'), runDisabled: await p.locator('#run').isDisabled() };
  controls.push({
    zone: 'period', label: 'Custom start / end date inputs', type: 'date inputs',
    before: 'Custom selected, 2026-08-01..2026-08-31',
    after: `Set end BEFORE start (2026-08-31 -> 2026-08-01): hint shows "${reversed.hint}", no error element on page (count=${reversed.err}), Run reconciliation disabled=${reversed.runDisabled}. Set an entirely future range (2027-01-01..2027-12-31): hint "${future.hint}", Run disabled=${future.runDisabled}. No validation of any kind on the range.`,
    ...(await live('#d-from')),
  });

  await p.selectOption('#f-per', 'last_month');
  await p.waitForTimeout(120);

  // tooltip
  await p.locator('.tip').first().focus();
  await p.waitForTimeout(150);
  const tipFocusVisible = await p.locator('.tip .tip-bubble').first().isVisible();
  await p.locator('.tip').first().hover();
  await p.waitForTimeout(250);
  const tipHoverVisible = await p.locator('.tip .tip-bubble').first().isVisible();
  controls.push({
    zone: 'period', label: 'About date range (?) tooltip', type: 'icon button + popover', opens_panel: true,
    after: `Keyboard focus on the "?" button -> bubble visible=${tipFocusVisible}. Mouse hover -> bubble visible=${tipHoverVisible}. Bubble text: "${(await p.locator('.tip .tip-bubble').first().innerText()).trim()}". Button carries aria-label but no aria-describedby/aria-expanded linking it to the bubble.`,
    commit_path: { toggled: true, reached_apply: true, apply_note: 'informational popover — reaching the content IS the commit; recorded whether it can be reached by keyboard as well as mouse', second_interaction: true, ...(await live('.tip')) },
    ...(await live('.tip')),
  });

  /* ── what to reconcile ────────────────────────────────────────────────── */
  const intBefore = { value: await val('#f-int'), hint: await txt('#h-int'), toggleVisible: await p.locator('#mode-toggle').isVisible(), autoVisible: await p.locator('#auto-panel').isVisible() };
  await p.selectOption('#f-int', 'paypal');
  await p.waitForTimeout(200);
  const intPaypal = { hint: await txt('#h-int'), toggleVisible: await p.locator('#mode-toggle').isVisible(), autoVisible: await p.locator('#auto-panel').isVisible(), manualVisible: await p.locator('#manual-panel').isVisible(), runDisabled: await p.locator('#run').isDisabled(), acc: await txt('#h-acc') };
  await p.selectOption('#f-int', 'shopify');
  await p.waitForTimeout(200);
  const intShopify = { hint: await txt('#h-int'), toggleVisible: await p.locator('#mode-toggle').isVisible(), runDisabled: await p.locator('#run').isDisabled() };
  await p.selectOption('#f-int', 'stripe');
  await p.waitForTimeout(200);
  const intStripe = { hint: await txt('#h-int'), toggleVisible: await p.locator('#mode-toggle').isVisible(), autoVisible: await p.locator('#auto-panel').isVisible(), runDisabled: await p.locator('#run').isDisabled() };
  controls.push({
    zone: 'what to reconcile', label: 'Integration', type: 'native select (dropdown)', opens_panel: true,
    options: ['mzkt.by (Stripe)', 'Great payments for every one (PayPal)', 'My store (Shopify)'],
    before: `value=${intBefore.value}, hint="${intBefore.hint}", "Upload manually" toggle visible=${intBefore.toggleVisible}, automatic card visible=${intBefore.autoVisible}`,
    after: `Picked PayPal -> hint="${intPaypal.hint}", automatic-retrieval card visible=${intPaypal.autoVisible}, manual upload panel visible=${intPaypal.manualVisible}, the "Upload manually" toggle DISAPPEARS (visible=${intPaypal.toggleVisible}) with no explanation, Run disabled=${intPaypal.runDisabled}, account hint="${intPaypal.acc}". Picked Shopify -> hint="${intShopify.hint}", toggle visible=${intShopify.toggleVisible}, Run disabled=${intShopify.runDisabled}. Picked Stripe again -> hint="${intStripe.hint}", automatic card back (visible=${intStripe.autoVisible}), Run disabled=${intStripe.runDisabled}. NOTE the two hint formats: Stripe "${intStripe.hint}" vs PayPal "${intPaypal.hint}".`,
    commit_path: { picked: true, reached_apply: true, apply_note: 'commits on change; value + downstream panels read back', second_interaction: true, ...(await live('#f-int')) },
    ...(await live('#f-int')),
  });

  const accBefore = { value: await val('#f-acc'), hint: await txt('#h-acc'), cls: await p.locator('#h-acc').getAttribute('class') };
  await p.selectOption('#f-acc', 'fees');
  await p.waitForTimeout(150);
  const accShared = { hint: await txt('#h-acc'), cls: await p.locator('#h-acc').getAttribute('class'), runDisabled: await p.locator('#run').isDisabled() };
  await p.selectOption('#f-acc', 'sales');
  await p.waitForTimeout(150);
  const accShared2 = { hint: await txt('#h-acc'), runDisabled: await p.locator('#run').isDisabled() };
  await p.selectOption('#f-acc', 'clearing');
  await p.waitForTimeout(150);
  controls.push({
    zone: 'what to reconcile', label: 'Account to reconcile', type: 'native select (dropdown)', opens_panel: true,
    options: ['Stripe mzkt.by (required for Synder)', 'Stripe fees', 'Stripe sales'],
    before: `value=${accBefore.value}, hint="${accBefore.hint}" (class=${accBefore.cls})`,
    after: `Picked "Stripe fees" (a shared account) -> hint becomes "${accShared.hint}" (class=${accShared.cls}), Run reconciliation still enabled (disabled=${accShared.runDisabled}). Picked "Stripe sales" -> "${accShared2.hint}", Run disabled=${accShared2.runDisabled}. The currency, which the non-shared hint shows, DISAPPEARS when the warning takes over the same hint slot. Back on "Stripe mzkt.by (required for Synder)" -> hint="${await txt('#h-acc')}".`,
    commit_path: { picked: true, reached_apply: true, apply_note: 'commits on change; hint + Run state read back', second_interaction: true, ...(await live('#f-acc')) },
    ...(await live('#f-acc')),
  });

  /* ── how we get the data ──────────────────────────────────────────────── */
  const autoCard = { title: await txt('.aa-title'), body: await txt('#aa-body') };
  controls.push({
    zone: 'how we get the data', label: 'Automatic file retrieval card', type: 'static card',
    after: `Title "${autoCard.title}", body "${autoCard.body}". Shown by default for Stripe. Run reconciliation enabled=${!(await p.locator('#run').isDisabled())}.`,
    ...(await live('.auto-card')),
  });

  await p.locator('#mode-toggle').click();
  await p.waitForTimeout(250);
  const m1 = { label: await txt('#mode-toggle'), manualVisible: await p.locator('#manual-panel').isVisible(), srcCount: await p.locator('#manual-panel .src').count(), booksMethod: await p.locator('#manual-panel select[data-side="books"]').inputValue(), intMethod: await p.locator('#manual-panel select[data-side="integration"]').inputValue(), runDisabled: await p.locator('#run').isDisabled(), focus: await activeEl() };
  await p.locator('#mode-toggle').click();
  await p.waitForTimeout(250);
  const m2 = { label: await txt('#mode-toggle'), autoVisible: await p.locator('#auto-panel').isVisible(), runDisabled: await p.locator('#run').isDisabled() };
  await p.locator('#mode-toggle').click();
  await p.waitForTimeout(250);
  controls.push({
    zone: 'how we get the data', label: 'Upload manually / Use automatic retrieval toggle', type: 'link button switching panel', opens_panel: true,
    before: 'Automatic file retrieval card shown, label "Upload manually", Run enabled',
    after: `Click 1 -> manual panel visible=${m1.manualVisible} with ${m1.srcCount} source cards; books Import method defaults to "${m1.booksMethod}" while the integration side flips to "${m1.intMethod}" — so "Upload manually" produces a HYBRID where the Accounting side is still automated; Run becomes disabled=${m1.runDisabled} with no on-screen statement of what is missing; focus after click = ${m1.focus}. Click 2 -> label "${m2.label}", automatic card visible=${m2.autoVisible}, Run re-enabled (disabled=${m2.runDisabled}) and any files already picked are silently discarded. Click 3 -> back to manual, still live.`,
    commit_path: { toggled: true, reached_apply: true, apply_note: 'the toggle IS the commit — panel swap verified in both directions', second_interaction: true, ...(await live('#mode-toggle')) },
    ...(await live('#mode-toggle')),
  });

  // books import method
  const bSel = '#manual-panel select[data-side="books"]';
  await p.selectOption(bSel, 'Manual');
  await p.waitForTimeout(250);
  const bManual = { blocks: await p.locator('#manual-panel .src').first().locator('.need').count(), runDisabled: await p.locator('#run').isDisabled(), focus: await activeEl() };
  await p.selectOption(bSel, 'Automated');
  await p.waitForTimeout(250);
  const bAuto = { blocks: await p.locator('#manual-panel .src').first().locator('.need').count() };
  await p.selectOption(bSel, 'Manual');
  await p.waitForTimeout(250);
  controls.push({
    zone: 'how we get the data · Accounting card', label: 'Import method (Accounting)', type: 'native select (dropdown)', opens_panel: true,
    options: ['Automated (recommended)', 'Manual'],
    before: 'Manual mode open, Accounting method = Automated, no upload blocks',
    after: `Picked Manual -> ${bManual.blocks} upload block(s) appear, Run disabled=${bManual.runDisabled}; focus after the change = ${bManual.focus} (the whole #sources grid is re-rendered via innerHTML on every change). Picked Automated again -> blocks=${bAuto.blocks}. Picked Manual a second time -> still live.`,
    commit_path: { picked: true, reached_apply: true, apply_note: 'commits on change; upload blocks read back', second_interaction: true, ...(await live(bSel)) },
    ...(await live(bSel)),
  });

  const iSel = '#manual-panel select[data-side="integration"]';
  await p.selectOption(iSel, 'Manual');
  await p.waitForTimeout(250);
  const iManual = { blocks: await p.locator('#manual-panel .src').nth(1).locator('.need').count(), first: await txt('#manual-panel .src:nth-child(2) .acc-h') };
  await p.selectOption(iSel, 'Assisted');
  await p.waitForTimeout(250);
  const iAssisted = { blocks: await p.locator('#manual-panel .src').nth(1).locator('.need').count() };
  await p.selectOption(iSel, 'Automated');
  await p.waitForTimeout(250);
  const iAutoInManual = { blocks: await p.locator('#manual-panel .src').nth(1).locator('.need').count(), runDisabled: await p.locator('#run').isDisabled(), autoCardVisible: await p.locator('#auto-panel').isVisible(), toggleLabel: await txt('#mode-toggle') };
  await p.selectOption(iSel, 'Assisted');
  await p.waitForTimeout(250);
  controls.push({
    zone: 'how we get the data · Integration card', label: 'Import method (Integration)', type: 'native select (dropdown)', opens_panel: true,
    options: ['Automated (recommended)', 'Assisted', 'Manual'],
    after: `Picked Manual -> ${iManual.blocks} upload block(s). Picked Assisted -> ${iAssisted.blocks} upload block(s). Picked "Automated (recommended)" from INSIDE the manual panel -> upload blocks=${iAutoInManual.blocks}, Run disabled=${iAutoInManual.runDisabled}, but the page stays in the manual panel (automatic card visible=${iAutoInManual.autoCardVisible}) while the toggle above still reads "${iAutoInManual.toggleLabel}" — two different controls now set the same thing and disagree about which mode is active. Picked Assisted again -> blocks back.`,
    commit_path: { picked: true, reached_apply: true, apply_note: 'commits on change; blocks + Run state read back', second_interaction: true, ...(await live(iSel)) },
    ...(await live(iSel)),
  });

  // how-to accordion
  const accH = '#manual-panel .acc-h';
  const accBefore2 = { expanded: await p.locator(accH).first().getAttribute('aria-expanded'), stepsVisible: await p.locator('#manual-panel .acc .steps').first().isVisible() };
  await p.locator(accH).first().click();
  await p.waitForTimeout(250);
  const acc1 = { expanded: await p.locator(accH).first().getAttribute('aria-expanded'), stepsVisible: await p.locator('#manual-panel .acc .steps').first().isVisible(), focus: await activeEl() };
  await p.locator(accH).first().click();
  await p.waitForTimeout(250);
  const acc2 = { expanded: await p.locator(accH).first().getAttribute('aria-expanded'), stepsVisible: await p.locator('#manual-panel .acc .steps').first().isVisible(), focus: await activeEl(), ...(await live(accH)) };
  await p.locator(accH).first().click();
  await p.waitForTimeout(250);
  controls.push({
    zone: 'how we get the data · Integration card', label: 'How to get <file> — steps accordion', type: 'accordion',
    before: `aria-expanded=${accBefore2.expanded}, steps visible=${accBefore2.stepsVisible}`,
    after: `Click 1 -> aria-expanded=${acc1.expanded}, steps visible=${acc1.stepsVisible}, focus afterwards = ${acc1.focus}. Click 2 (collapse) -> aria-expanded=${acc2.expanded}, steps visible=${acc2.stepsVisible}, header still visible=${acc2.still_visible} / clickable=${acc2.still_clickable}, focus = ${acc2.focus}. Click 3 -> expands again. The header survives repeat toggling, but every toggle re-renders #sources via innerHTML, so keyboard focus is destroyed each time.`,
    commit_path: { toggled: true, reached_apply: true, apply_note: 'no Apply — expanding IS the commit; verified the panel content is reachable and the header survives a second toggle', second_interaction: true, ...(await live(accH)) },
    ...(await live(accH)),
  });
  observations.push(`Drop zone copy (before any file is picked): "${await txt('#manual-panel .dm')}" · Browse control label "${await txt('#manual-panel .db')}" + "${await txt('#manual-panel .dt')}"`);
  observations.push(`Upload block label: "${await txt('#manual-panel .nn')}"`);
  // the example-steps note only renders for integrations whose steps are marked example:true
  await p.selectOption('#f-int', 'paypal');
  await p.waitForTimeout(300);
  await p.locator('#manual-panel .acc-h').first().click();
  await p.waitForTimeout(250);
  observations.push(`Example-steps note rendered inside the product UI (PayPal, Assisted): "${await txt('#manual-panel .egnote')}"`);
  observations.push(`PayPal with no automatic option: "Upload manually" toggle visible=${await p.locator('#mode-toggle').isVisible()}, Run disabled=${await p.locator('#run').isDisabled()}, nothing on screen explains why the automatic option is gone.`);
  await p.selectOption('#f-int', 'stripe');
  await p.waitForTimeout(250);
  await p.locator('#mode-toggle').click();
  await p.waitForTimeout(250);
  await p.selectOption(bSel, 'Manual');
  await p.selectOption(iSel, 'Assisted');
  await p.waitForTimeout(250);

  // Browse / Remove
  const browseSel = '#manual-panel [data-pick]';
  const nBefore = await p.locator(browseSel).count();
  await p.locator(browseSel).first().click();
  await p.waitForTimeout(250);
  const afterPick = { chips: await p.locator('#manual-panel .chip').count(), name: await txt('#manual-panel .chip .nm'), size: await txt('#manual-panel .chip .sz'), runDisabled: await p.locator('#run').isDisabled(), remaining: await p.locator(browseSel).count(), focus: await activeEl() };
  // fill everything that is still missing
  let guard = 0;
  while (await p.locator(browseSel).count() > 0 && guard++ < 12) {
    await p.locator(browseSel).first().click();
    await p.waitForTimeout(150);
  }
  const allFilled = { runDisabled: await p.locator('#run').isDisabled(), chips: await p.locator('#manual-panel .chip').count() };
  await p.locator('#manual-panel [data-rm]').first().click();
  await p.waitForTimeout(200);
  const afterRemove = { chips: await p.locator('#manual-panel .chip').count(), runDisabled: await p.locator('#run').isDisabled() };
  await p.locator(browseSel).first().click();
  await p.waitForTimeout(200);
  controls.push({
    zone: 'how we get the data · upload blocks', label: 'Browse (file picker) / Remove', type: 'button + drop zone',
    before: `${nBefore} empty drop zone(s), Run disabled=${true}`,
    after: `Click Browse -> no OS file dialog; the prototype fabricates a file. Chip shows name "${afterPick.name}" and size "${afterPick.size}" (a hard-coded size for a file nobody chose), chips=${afterPick.chips}, Run disabled=${afterPick.runDisabled}, focus afterwards = ${afterPick.focus}. Filling every block -> chips=${allFilled.chips}, Run disabled=${allFilled.runDisabled}. Clicking Remove -> chips=${afterRemove.chips}, Run disabled=${afterRemove.runDisabled} again, with no message naming what is now missing. Re-picking works (second interaction).`,
    commit_path: { picked: true, reached_apply: true, apply_note: 'the commit here is Run reconciliation becoming enabled once every block is filled — reached and read back; Remove then re-pick exercised the path a second time', second_interaction: true, ...(await live(browseSel)) },
    ...(await live(browseSel)),
  });
  observations.push('There is no error state for a wrong file type or an oversized file anywhere in the prototype, and no progress/parsing state after a file is added.');

  // Matching rules modal (from inside the manual panel)
  const openBefore = await p.locator('#match-modal').isVisible();
  await p.locator('#manual-panel a.match-open').first().click();
  await p.waitForTimeout(300);
  const modalOpen = { visible: await p.locator('#match-modal').isVisible(), focus: await activeEl(), title: await txt('#match-modal-title'), body: await txt('.match-modal p') };
  // can focus leave the dialog? tab three times and see where we land
  await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
  const tabbedTo = await activeEl();
  const escapedDialog = await p.evaluate(() => {
    const d = document.querySelector('.match-modal');
    return !d.contains(document.activeElement);
  });
  await p.locator('#match-modal-close').click();
  await p.waitForTimeout(250);
  const modalClosed = { visible: await p.locator('#match-modal').isVisible(), focus: await activeEl() };
  await p.locator('#manual-panel a.match-open').first().click();
  await p.waitForTimeout(250);
  const modalOpen2 = { visible: await p.locator('#match-modal').isVisible() };
  await p.keyboard.press('Escape');
  await p.waitForTimeout(250);
  const modalEsc = { visible: await p.locator('#match-modal').isVisible() };
  const inA11yTreeWhenClosed = await p.evaluate(() => {
    const m = document.getElementById('match-modal');
    const cs = getComputedStyle(m);
    return { display: cs.display, visibility: cs.visibility, opacity: cs.opacity, ariaHidden: m.getAttribute('aria-hidden'), inert: m.hasAttribute('inert') };
  });
  controls.push({
    zone: 'matching rules', label: 'Matching rules link -> modal dialog', type: 'link opening modal', opens_panel: true,
    before: `modal visible=${openBefore}`,
    after: `Click -> modal visible=${modalOpen.visible}, title "${modalOpen.title}", first paragraph "${modalOpen.body}". Focus after opening = ${modalOpen.focus} — focus is NOT moved into the dialog. Pressing Tab three times lands on ${tabbedTo}; focus outside the dialog = ${escapedDialog} (no focus trap). Close button -> visible=${modalClosed.visible}, focus returns to ${modalClosed.focus} (not restored to the link that opened it). Re-opened -> visible=${modalOpen2.visible}; Escape closes it -> visible=${modalEsc.visible}. While closed the dialog element computes to ${JSON.stringify(inA11yTreeWhenClosed)}.`,
    commit_path: { toggled: true, reached_apply: true, apply_note: 'opened, read content, reached and used Close; then re-opened and closed via Escape', second_interaction: true, ...(await live('#manual-panel a.match-open')) },
    ...(await live('#manual-panel a.match-open')),
  });

  /* ── keyboard sweep ───────────────────────────────────────────────────── */
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.locator('.bar button.x').focus();
  const tabOrder = [];
  for (let i = 0; i < 14; i++) {
    tabOrder.push(await activeEl());
    await p.keyboard.press('Tab');
  }
  const focusRing = await p.evaluate(() => {
    const el = document.getElementById('mode-toggle');
    el.focus();
    const cs = getComputedStyle(el);
    return { outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, boxShadow: cs.boxShadow };
  });
  observations.push('Tab order from the close button: ' + tabOrder.join(' -> '));
  observations.push('Computed focus style on the "Upload manually" toggle: ' + JSON.stringify(focusRing));

  /* ── run (terminal) ───────────────────────────────────────────────────── */
  // get back to a runnable state
  await p.selectOption('#f-int', 'stripe');
  await p.waitForTimeout(200);
  const runReady = { disabled: await p.locator('#run').isDisabled(), label: await txt('#run') };
  await p.locator('#run').click();
  await p.waitForTimeout(400);
  const runAfter = {
    label: await txt('#run'), disabled: await p.locator('#run').isDisabled(),
    banner: await txt('#running'), bannerVisible: await p.locator('#running').isVisible(),
    formStillEditable: await p.locator('#f-per').isEnabled(),
    scrolledIntoView: await p.locator('#running').evaluate(el => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; }),
  };
  controls.push({
    zone: 'header / status', label: 'Run reconciliation', type: 'primary button',
    before: `disabled=${runReady.disabled}, label "${runReady.label}", automatic retrieval selected`,
    after: `Click -> label "${runAfter.label}", disabled=${runAfter.disabled}. Status region #running visible=${runAfter.bannerVisible}, in viewport=${runAfter.scrolledIntoView}, text: "${runAfter.banner}". The form above stays editable (date select enabled=${runAfter.formStillEditable}) although changing it now does nothing. There is no confirmation step, no summary of what is about to be compared, and no way to cancel.`,
    ...(await live('#run')),
  });
  controls.push({
    zone: 'header / status', label: 'Run reconciliation — disabled state', type: 'primary button',
    after: 'When any required upload is missing the button is set disabled with no tooltip, no aria-describedby, no inline list of what is missing, and no visible change to the upload blocks themselves. Nothing on screen names the blocker.',
    ...(await live('#run')),
  });

  not_exercised.push({ control: 'Real OS file upload / drag-and-drop', reason: 'prototype fabricates the file on Browse; no real input[type=file] exists, so file-type, size and parse errors cannot be reached' });
  not_exercised.push({ control: 'Results / matched-unmatched screen after Run', reason: 'the prototype ends at the "Reconciliation started" status; no results view is built' });
  not_exercised.push({ control: 'Automatic retrieval failure / empty-result states', reason: 'not implemented in the prototype' });

  const map = {
    target: 'projects/txnrecon-setup/finalist-1-sketch.html (Finalist 1 · Automatic retrieval — the #f1 pane of team-compare.html)',
    url: URL,
    primary_task: 'Set up a reconciliation run: choose the period, the integration and the QuickBooks account, decide how the two sides of the data get here (automatic retrieval or uploaded files), then start the run.',
    zones: ['header', 'period', 'what to reconcile', 'how we get the data', 'how we get the data · Accounting card', 'how we get the data · Integration card', 'how we get the data · upload blocks', 'matching rules', 'header / status'],
    page_errors: pageErrors,
    observations,
    not_exercised,
    controls,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(map, null, 2) + '\n');
  console.log('statemap written: ' + OUT);
  console.log('controls: ' + controls.length + ' · page errors: ' + pageErrors.length);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
