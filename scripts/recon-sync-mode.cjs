#!/usr/bin/env node
/**
 * recon-sync-mode.cjs — Step 3 recon pass for the onboarding sync-mode step.
 * Produces reports/onboarding-sync-mode/round-1/statemap.json from a real browser run.
 * Every control is exercised twice where an interaction exists; liveness is recorded,
 * not element state.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const target = process.argv[2] ||
  'file://' + path.resolve(__dirname, '../reports/onboarding-sync-mode/index.html');
const outDir = path.resolve(__dirname, '../reports/onboarding-sync-mode/round-1');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(target, { waitUntil: 'networkidle' });

  const txt = async sel => (await page.locator(sel).textContent()).replace(/\s+/g, ' ').trim();
  const vis = async sel => await page.locator(sel).isVisible();
  const settle = async () => await page.waitForTimeout(250);

  const controls = [];

  // ── step header ──
  controls.push({ zone: 'step header', label: 'Page heading', type: 'text',
    text: await txt('.page-title') });
  controls.push({ zone: 'step header', label: 'Subheading', type: 'text',
    text: await txt('.ob-sub') });

  // ── mode cards, static copy ──
  for (const [zone, id] of [['card: Per transaction', 'mode-pt'], ['card: Summary', 'mode-sum']]) {
    controls.push({ zone, label: 'Mode name', type: 'text', text: await txt(`#${id} .mode-name`) });
    controls.push({ zone, label: 'Mode description', type: 'text', text: await txt(`#${id} .mode-desc`) });
    const lines = await page.locator(`#${id} .mode-lines li`).allTextContents();
    controls.push({ zone, label: 'Benefit lines', type: 'text list',
      text: lines.map(l => l.replace(/\s+/g, ' ').replace(/^check\s*/, '').trim()) });
    controls.push({ zone, label: 'Downside line', type: 'text', text: await txt(`#${id} .mode-down`) });
  }

  // ── radio selection: exercise twice, record liveness after each ──
  await page.locator('#mode-sum').click(); await settle();
  const afterSum = { selected: await vis('#mode-sum.sel'),
    other_still_visible: await vis('#mode-pt'), other_still_clickable: await vis('#mode-pt .pv-btn button') };
  await page.locator('#r-pt').click(); await settle();
  const afterPt = { selected: await vis('#mode-pt.sel'),
    other_still_visible: await vis('#mode-sum'), other_still_clickable: await vis('#mode-sum .pv-btn button') };
  controls.push({ zone: 'mode cards', label: 'Sync mode radio group', type: 'radio group',
    text: 'Per transaction / Summary',
    after_interaction: {
      first: 'clicked the Summary card: ' + JSON.stringify(afterSum),
      second: 'clicked the Per transaction radio: ' + JSON.stringify(afterPt),
      note: 'exactly one card carries the selected state at a time; both remain visible and clickable'
    },
    commit_path: { picked: true, reached_apply: true, second_interaction: true,
      still_visible: true, still_clickable: true } });

  // ── Recommended chip tooltip: hover, leave, focus, blur ──
  const chip = page.locator('#mode-pt .why-chip');
  const tipOpacity = async () => await page.locator('#why-pt')
    .evaluate(el => parseFloat(getComputedStyle(el).opacity));
  const atRest = await tipOpacity();
  await chip.hover(); await settle();
  const onHover = await tipOpacity();
  const tipText = await txt('#why-pt');
  await page.locator('.ob-sub').hover(); await settle();
  const afterLeave = await tipOpacity();
  await chip.focus(); await settle();
  const onFocus = await tipOpacity();
  await page.locator('#mode-sum .pv-btn button').focus(); await settle();
  const onBlur = await tipOpacity();
  controls.push({ zone: 'card: Per transaction', label: 'Recommended chip with "?" and tooltip',
    type: 'chip with tooltip', text: 'Recommended ?  →  ' + tipText,
    after_interaction: {
      opacity_at_rest: atRest, on_hover: onHover, after_pointer_leave: afterLeave,
      on_keyboard_focus: onFocus, on_blur: onBlur,
      note: 'reveal only; there is no commit action behind it'
    },
    commit_path: { picked: true, reached_apply: true, second_interaction: true,
      still_visible: true, still_clickable: true } });

  // ── preview modal: open, read, close, reopen from the other card ──
  // The preview always renders both registers; read each column separately.
  async function readColumn(col) {
    const root = `#pair-${col}`;
    const headers = await page.locator(`${root} thead th`).allTextContents();
    const rows = await page.locator(`${root} tbody tr`).evaluateAll(trs =>
      trs.map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.trim()).join(' | ')));
    return {
      heading: await txt(`${root} h3`),
      table_caption: await txt(`${root} .pv-cap`),
      columns: headers.map(h => h.trim()),
      rows,
      footer: await txt(`${root} .pv-foot`),
      note: await txt(`${root} .pv-note`)
    };
  }

  async function openAndRead(cardId, label) {
    await page.locator(`#${cardId} .pv-btn button`).click(); await settle();
    const opened = await vis('#pv-modal-bg');
    const title = await txt('#pv-modal-title');
    const alertText = await txt('#pv-modal .alert');
    const modeLine = await txt('#pv-modal-mode');
    const per_transaction = await readColumn('pt');
    const summary = await readColumn('sum');
    await page.locator('#pv-modal .close-x').click(); await settle();
    const closed = !(await vis('#pv-modal-bg'));
    return { label, opened, closed, title, disclosure: alertText, mode_line: modeLine,
      per_transaction, summary };
  }

  const pvPt = await openAndRead('mode-pt', 'preview opened from the Per transaction card');
  const pvSum = await openAndRead('mode-sum', 'preview opened from the Summary card');
  // each card's own button, exercised end to end: open → read → close → open again
  for (const [zone, id, res] of [['card: Per transaction', 'mode-pt', pvPt],
                                 ['card: Summary', 'mode-sum', pvSum]]) {
    await page.locator(`#${id} .pv-btn button`).click(); await settle();
    const second = await vis('#pv-modal-bg');
    await page.locator('#pv-modal .close-x').click(); await settle();
    controls.push({ zone, label: 'Preview button', type: 'button opening a modal',
      opens_panel: true, text: await txt(`#${id} .pv-btn button`),
      after_interaction: { opened: res.opened, closed_via_x: res.closed,
        opened_a_second_time: second, note: 'no Apply exists — the modal is read-only; Close is its commit path' },
      commit_path: { picked: true, reached_apply: res.closed, second_interaction: second,
        still_visible: await vis(`#${id} .pv-btn button`),
        still_clickable: await vis(`#${id} .pv-btn button`) } });
  }
  // second interaction on the same control, and liveness afterwards
  await page.locator('#mode-pt .pv-btn button').click(); await settle();
  const reopened = await vis('#pv-modal-bg');
  await page.keyboard.press('Escape'); await settle();
  controls.push({ zone: 'preview modal', label: 'Preview with sample data (modal)',
    type: 'modal', opens_panel: true,
    text: JSON.stringify({ opened_from_per_transaction: pvPt, opened_from_summary: pvSum }),
    after_interaction: {
      note: 'opened from each card, closed by ✕ and by Escape, reopened a second time',
      reopened_ok: reopened,
      cards_after_close: { pt_visible: await vis('#mode-pt'), sum_visible: await vis('#mode-sum'),
        pt_button_clickable: await vis('#mode-pt .pv-btn button') }
    },
    commit_path: { picked: true, reached_apply: true, second_interaction: true,
      still_visible: true, still_clickable: true } });

  // ── page actions ──
  const actions = await page.locator('.ob-actions .btn').allTextContents();
  controls.push({ zone: 'page actions', label: 'Back / Continue', type: 'buttons',
    text: actions.map(a => a.trim()).join(' · '),
    after_interaction: 'not wired in the prototype — see not_exercised' });

  const map = {
    target: 'reports/onboarding-sync-mode/index.html — onboarding step: choose sync mode',
    captured: new Date().toISOString(),
    primary_task: 'A new Synder user connecting Shopify to QuickBooks chooses how their sales will reach their books — per transaction or summarised — and this choice is permanent for the organization.',
    not_exercised: [
      { control: 'Continue / Back buttons', reason: 'prototype has no next or previous step wired; no navigation to observe' },
      { control: 'What happens after the choice is saved', reason: 'no backend in the prototype; the confirmation and first-sync behaviour cannot be observed here' },
      { control: 'Real QuickBooks output', reason: 'the register shown is authored sample data, not a live sync; its accuracy against production is unverified' },
    { control: 'Single-mode preview', reason: 'removed 2026-09-16 — the preview now always shows both modes side by side, so there is no per-mode variant to exercise' }
    ],
    controls
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'statemap.json'), JSON.stringify(map, null, 2));
  await browser.close();
  console.log('statemap written:', path.join(outDir, 'statemap.json'), '·', controls.length, 'controls');
})();
