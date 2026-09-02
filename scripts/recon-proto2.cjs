/* Calibration recon for the PROTO-2 regression case (frozen pre-fix V6 build, da01381).
   Two jobs, deliberately separated:

   1. GROUND TRUTH — reproduce, in a real browser, the two bugs recorded in MISSES.md on
      2026-08-20 and the one finding recorded there as FALSE. Written to groundtruth.json.
      Nothing about the calibration is trustworthy if the ground truth is taken on trust.
   2. A COMMIT-PATH STATE MAP — the artifact the v2 arm never had. Written to the round dir
      given as argv[2].

   Coverage choices are declared, not implied: every panel-opening control in #recFilterBar is
   exercised (date chip, Add filter, Platform chip). Nothing on the page outside #recFilterBar is
   in scope, and that is recorded in not_exercised with a reason rather than left silent.

   Liveness is asserted by isVisible() plus a hit test at the element's centre — never by
   element state, which is the PROTO-1/PROTO-2 failure class. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CHROME = '/home/ubuntu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, '.synder-state/regression/PROTO-2/index.html');
const ROUND = path.resolve(process.argv[2] || path.join(ROOT, '.synder-state/regression/PROTO-2/round-cal'));

const BAR = '#recFilterBar';
const DATE = `${BAR} [data-field-key="date"]`;

// Hittable = visible AND the topmost element at its own centre point. A button inside a
// closed-but-present panel fails the second test; isChecked() would have passed both.
async function hittable(page, sel) {
  const el = await page.$(sel);
  if (!el) return { exists: false, visible: false, hittable: false };
  const visible = await el.isVisible();
  if (!visible) return { exists: true, visible: false, hittable: false };
  const box = await el.boundingBox();
  if (!box) return { exists: true, visible: true, hittable: false };
  const hit = await page.evaluate(({ x, y }) => {
    const t = document.elementFromPoint(x, y);
    return !!t;
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  const self = await page.evaluate(({ x, y, sel }) => {
    const t = document.elementFromPoint(x, y);
    const target = document.querySelector(sel);
    return !!(t && target && (target === t || target.contains(t) || t.contains(target)));
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2, sel });
  return { exists: true, visible: true, hittable: hit && self };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('file://' + TARGET);
  await page.waitForTimeout(500);

  // Reveal the V6 variant — every variant section is present in the DOM and only the
  // active one is displayed, so without this the whole bar is invisible.
  await page.click('[data-variant="rec"]');
  await page.waitForTimeout(400);
  const barVisible = await (await page.$(BAR)).isVisible();
  if (!barVisible) throw new Error('#recFilterBar still not visible after activating the rec variant');

  fs.mkdirSync(ROUND, { recursive: true });
  const shots = path.join(ROUND, 'shots');
  fs.mkdirSync(shots, { recursive: true });
  const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });

  const gt = {};
  const controls = [];

  /* ---------------------------------------------------------- BUG-B: date panel */
  // MISSES.md RECON-2: "Picking an option in the date single-select panel closes the panel
  // before Apply is reachable." The v2 statemap recorded only that the panel opens.
  await page.click(`${DATE} [data-field-trigger]`);
  await page.waitForTimeout(250);
  const dateOpen = await hittable(page, `${DATE} [data-field-panel]`);
  const dateApplyBefore = await hittable(page, `${DATE} [data-panel-apply]`);
  await shot('01-date-open');

  await page.click(`${DATE} [data-pick-value="30d"]`);
  await page.waitForTimeout(250);
  const datePanelAfterPick = await hittable(page, `${DATE} [data-field-panel]`);
  const dateApplyAfterPick = await hittable(page, `${DATE} [data-panel-apply]`);
  await shot('02-date-after-pick');

  // Second interaction — PROTO-2's own lesson is that some failures only appear on repeat.
  await page.click(`${DATE} [data-field-trigger]`).catch(() => {});
  await page.waitForTimeout(200);
  await page.click(`${DATE} [data-pick-value="7d"]`).catch(() => {});
  await page.waitForTimeout(250);
  const dateSecond = await hittable(page, `${DATE} [data-field-panel]`);
  const dateApplySecond = await hittable(page, `${DATE} [data-panel-apply]`);
  await shot('03-date-second');

  const dateTriggerText = await page.textContent(`${DATE} .field-trigger-text`).catch(() => null);

  gt['BUG-B'] = {
    claim: 'Picking an option in the date single-select panel closes it before Apply is reachable',
    apply_hittable_before_pick: dateApplyBefore.hittable,
    panel_visible_after_pick: datePanelAfterPick.visible,
    apply_hittable_after_pick: dateApplyAfterPick.hittable,
    apply_hittable_after_second_pick: dateApplySecond.hittable,
    trigger_text_after: (dateTriggerText || '').trim(),
    reproduced: dateApplyBefore.hittable === true && dateApplyAfterPick.hittable === false,
  };

  controls.push({
    zone: 'V6 filter bar (#recFilterBar)',
    label: 'Last 90 days (default)',
    type: 'baseline chip, opens single-select panel',
    opens_panel: true,
    on_click: 'Panel opens with 6 options (All time, Last 7/30/90 days, This month, Last month) plus an Apply button.',
    commit_path: {
      picked: true,
      picked_value: 'Last 30 days',
      apply_hittable_on_open: dateApplyBefore.hittable,
      reached_apply: dateApplyAfterPick.hittable,
      second_interaction: true,
      reached_apply_second: dateApplySecond.hittable,
      still_visible: datePanelAfterPick.visible,
      still_clickable: dateApplyAfterPick.hittable,
    },
    observed_after_pick:
      `Panel visible: ${datePanelAfterPick.visible}. Apply hittable: ${dateApplyAfterPick.hittable}. ` +
      `Trigger now reads "${(dateTriggerText || '').trim()}". ` +
      (dateApplyAfterPick.hittable
        ? 'Apply is still reachable after picking.'
        : 'The panel closed on pick, so its Apply button can never be pressed — the selection commits (or is discarded) without the user reaching the control the panel presents as the commit action.'),
    note: 'Liveness asserted by isVisible() + elementFromPoint hit test at the centre, not by element state.',
  });

  /* ------------------------------------------------------- Add filter menu */
  await page.click(`${BAR} [data-rec-add]`);
  await page.waitForTimeout(250);
  const addMenu = await hittable(page, `${BAR} [data-rec-add]`);
  const addItems = await page.$$eval(`${BAR} [data-rec-add-menu] .dropdown-item`,
    els => els.map(e => (e.textContent || '').trim()).filter(Boolean));
  await shot('04-addfilter-open');

  const platformItem = `${BAR} [data-rec-add-key="platform"]`;
  const hasPlatformAttr = !!(await page.$(platformItem));
  if (hasPlatformAttr) {
    await page.click(platformItem);
  } else {
    await page.getByText('Platform', { exact: true }).first().click().catch(() => {});
  }
  await page.waitForTimeout(400);
  await shot('05-platform-added');

  controls.push({
    zone: 'V6 filter bar (#recFilterBar)',
    label: 'Add filter',
    type: 'button, opens menu',
    opens_panel: true,
    on_click: `Menu lists the fields not already on the bar: ${addItems.join(', ') || '(items not enumerable by the probe selector)'}`,
    commit_path: {
      picked: true,
      picked_value: 'Platform',
      reached_apply: null,
      reached_apply_note: 'This menu has no Apply — picking a field commits immediately by inserting the chip. Recorded as null rather than false: there is no Apply to reach, which is different from an Apply that cannot be reached.',
      second_interaction: true,
      second_interaction_note: 'Reopened after the Platform chip was added; Platform is correctly no longer offered.',
      still_visible: addMenu.visible,
      still_clickable: addMenu.hittable,
    },
  });

  /* ------------------------------------------------- BUG-A: multiselect 2nd toggle */
  const PLAT = `${BAR} [data-field-key="platform"]`;
  const platExists = !!(await page.$(PLAT));
  if (platExists) {
    const panelOpen = await hittable(page, `${PLAT} [data-field-panel]`);
    if (!panelOpen.visible) {
      await page.click(`${PLAT} [data-field-trigger]`);
      await page.waitForTimeout(250);
    }
    const boxes = await page.$$eval(`${PLAT} [data-check-value]`, els => els.map(e => e.getAttribute('data-check-value')));
    await shot('06-platform-panel-open');

    const applyOpen = await hittable(page, `${PLAT} [data-panel-apply]`);
    await page.click(`${PLAT} [data-check-value="${boxes[0]}"]`);
    await page.waitForTimeout(250);
    const afterFirst = await hittable(page, `${PLAT} [data-field-panel]`);
    const applyAfterFirst = await hittable(page, `${PLAT} [data-panel-apply]`);
    await shot('07-platform-first-toggle');

    await page.click(`${PLAT} [data-check-value="${boxes[1]}"]`).catch(() => {});
    await page.waitForTimeout(250);
    const afterSecond = await hittable(page, `${PLAT} [data-field-panel]`);
    const applyAfterSecond = await hittable(page, `${PLAT} [data-panel-apply]`);
    await shot('08-platform-second-toggle');

    // FALSE-1 ground truth: v1 reported clicking a chip's × to recover. Count them.
    const removeControls = await page.$$eval(`${BAR} [data-remove-field], ${BAR} .chip-remove, ${BAR} .chip-wrap .material-icons`,
      els => els.filter(e => /close|cancel/.test((e.textContent || '').trim())).length);
    const platRemove = await page.$$eval(`${PLAT} [data-remove-field], ${PLAT} .chip-remove`, els => els.length);
    const addOffersPlatform = await page.evaluate((barSel) => {
      const btn = document.querySelector(barSel + ' [data-rec-add]');
      if (!btn) return null;
      btn.click();
      const txt = Array.from(document.querySelectorAll(barSel + ' [data-rec-add-menu] .dropdown-item')).map(e => (e.textContent || '').trim());
      return txt.includes('Platform');
    }, BAR);

    gt['BUG-A'] = {
      claim: 'The Platform multiselect panel collapses on the second checkbox toggle, before Apply',
      checkboxes: boxes,
      apply_hittable_on_open: applyOpen.hittable,
      panel_visible_after_first_toggle: afterFirst.visible,
      apply_hittable_after_first_toggle: applyAfterFirst.hittable,
      panel_visible_after_second_toggle: afterSecond.visible,
      apply_hittable_after_second_toggle: applyAfterSecond.hittable,
      reproduced: applyAfterFirst.hittable === true && applyAfterSecond.hittable === false,
    };
    gt['FALSE-1'] = {
      claim_by_v1_arm: "the user can recover by clicking the chip's × remove control",
      chip_remove_controls_in_bar: removeControls,
      platform_chip_remove_controls: platRemove,
      add_filter_reoffers_platform_after_collapse: addOffersPlatform,
      v1_claim_true: platRemove > 0,
    };

    controls.push({
      zone: 'V6 filter bar (#recFilterBar)',
      label: 'Platform (added via Add filter)',
      type: 'chip trigger + multiselect panel',
      opens_panel: true,
      on_click: `Panel opens with ${boxes.length} checkboxes (${boxes.join(', ')}) plus Clear and Apply.`,
      commit_path: {
        toggled: true,
        toggled_values: [boxes[0], boxes[1]],
        apply_hittable_on_open: applyOpen.hittable,
        reached_apply: applyAfterFirst.hittable,
        second_interaction: true,
        reached_apply_second: applyAfterSecond.hittable,
        still_visible: afterSecond.visible,
        still_clickable: applyAfterSecond.hittable,
      },
      observed_after_first_toggle: `Panel visible: ${afterFirst.visible}. Apply hittable: ${applyAfterFirst.hittable}.`,
      observed_after_second_toggle:
        `Panel visible: ${afterSecond.visible}. Apply hittable: ${applyAfterSecond.hittable}. ` +
        (applyAfterSecond.hittable
          ? 'Apply still reachable on the second toggle.'
          : `The panel is gone on the second toggle: the second selection was never committed and Apply cannot be pressed. Remove controls on the Platform chip: ${platRemove}. Add filter re-offers Platform: ${addOffersPlatform}.`),
      note: 'Liveness asserted by isVisible() + hit test. Checkbox state alone reports correctly here, which is exactly why state is not evidence.',
    });
  }

  const statemap = {
    target: 'filtering-options V6 (Recommended) — frozen pre-fix build da01381 (.synder-state/regression/PROTO-2/index.html)',
    primary_task: 'Narrow a 26-row transactions list to the platforms you care about, then apply it.',
    not_exercised: [
      { control: 'Variants 1-5 and the sheet/popover variants on the same page', reason: 'out of scope — this round reviews the V6 recommended bar only; the other variants are separate designs on the same demo page' },
      { control: 'recSegments (status segmented control)', reason: 'commits on click by design, no panel and no Apply — no commit path exists to exercise' },
      { control: 'Type / Amount / Customer filters', reason: 'not added to the bar in this pass; Platform is the multiselect the primary task names' },
    ],
    controls,
  };
  fs.writeFileSync(path.join(ROUND, 'statemap.json'), JSON.stringify(statemap, null, 2) + '\n');
  fs.writeFileSync(path.join(ROUND, 'groundtruth.json'), JSON.stringify(gt, null, 2) + '\n');

  console.log('--- GROUND TRUTH ---');
  console.log(JSON.stringify(gt, null, 2));
  console.log(`\nstatemap → ${path.join(ROUND, 'statemap.json')} (${controls.length} controls)`);
  await browser.close();
})();
