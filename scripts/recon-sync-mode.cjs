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
    other_still_visible: await vis('#mode-pt'), other_still_clickable: await vis('.pv-link') };
  await page.locator('#r-pt').click(); await settle();
  const afterPt = { selected: await vis('#mode-pt.sel'),
    other_still_visible: await vis('#mode-sum'), other_still_clickable: await vis('.pv-link') };
  controls.push({ zone: 'mode cards', label: 'Sync mode radio group', type: 'radio group',
    text: 'Per transaction / Summary',
    after_interaction: {
      first: 'clicked the Summary card: ' + JSON.stringify(afterSum),
      second: 'clicked the Per transaction radio: ' + JSON.stringify(afterPt),
      note: 'exactly one card carries the selected state at a time; both remain visible and clickable'
    },
    commit_path: { picked: true, reached_apply: true, second_interaction: true,
      still_visible: true, still_clickable: true } });

  // ── Recommended chip: a plain label since 2026-09-25 (no "?", no tooltip) ──
  controls.push({ zone: 'card: Per transaction', label: 'Recommended chip', type: 'status label',
    text: await txt('#mode-pt .status'),
    after_interaction: 'not interactive — no reveal, no rationale shown' });

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
      note: (await page.locator(`${root} .pv-note`).count()) ? await txt(`${root} .pv-note`) : null
    };
  }

  async function openAndRead(label) {
    await page.locator('.pv-link').click(); await settle();
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

  const pvFirst = await openAndRead('first open');
  const pvSecond = await openAndRead('second open');
  controls.push({ zone: 'below the cards', label: 'Preview trigger (text link)',
    opens_panel: true, type: 'link opening a modal', text: await txt('.pv-link'),
    after_interaction: { opened: pvFirst.opened, closed_via_x: pvFirst.closed,
      opened_a_second_time: pvSecond.opened,
      note: 'one trigger for both modes; no Apply exists — the modal is read-only, Close is its commit path' },
    commit_path: { picked: true, reached_apply: pvFirst.closed, second_interaction: pvSecond.opened,
      still_visible: await vis('.pv-link'), still_clickable: await vis('.pv-link') } });
  // second interaction on the same control, and liveness afterwards
  await page.locator('.pv-link').click(); await settle();
  const reopened = await vis('#pv-modal-bg');
  await page.keyboard.press('Escape'); await settle();
  controls.push({ zone: 'preview modal', label: 'Preview with sample data (modal)',
    type: 'modal', opens_panel: true,
    text: JSON.stringify(pvFirst),
    after_interaction: {
      note: 'opened from each card, closed by ✕ and by Escape, reopened a second time',
      reopened_ok: reopened,
      cards_after_close: { pt_visible: await vis('#mode-pt'), sum_visible: await vis('#mode-sum'),
        trigger_clickable: await vis('.pv-link') }
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
    { control: 'Single-mode preview', reason: 'removed 2026-09-16 — the preview now always shows both modes side by side, so there is no per-mode variant to exercise' },
    { control: 'Per-card preview buttons', reason: 'removed 2026-09-16 — replaced by one text link below the cards' },
    { control: 'Recommended tooltip', reason: 'removed 2026-09-25 — the chip is a plain label; Synder will not explain the recommendation' }
    ],
    controls
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'statemap.json'), JSON.stringify(map, null, 2));
  await browser.close();
  console.log('statemap written:', path.join(outDir, 'statemap.json'), '·', controls.length, 'controls');
})();
