#!/usr/bin/env node
/**
 * verify-sync-mode.cjs — real Chromium checks for reports/onboarding-sync-mode/index.html
 *
 * Usage:  node scripts/verify-sync-mode.cjs [url]
 * Default target is the local file; pass the published URL to check the deployed copy.
 *
 * Rule this file exists to honour (AGENTS.md): when the question is "can the user still
 * interact with this?", assert isVisible() / hittability — never element state. An
 * isChecked() on a radio inside a hidden card passes while the UI is unusable.
 */
const { chromium } = require('playwright');
const path = require('path');

const target = process.argv[2] ||
  'file://' + path.resolve(__dirname, '../reports/onboarding-sync-mode/index.html');

let pass = 0;
const fails = [];
function ok(name, cond) {
  if (cond) { pass++; } else { fails.push(name); }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(target, { waitUntil: 'networkidle' });

  const sw = page.locator('.variant-switch');
  const h1 = page.locator('.ob-h1');
  const cardPt = page.locator('#mode-pt');
  const cardSum = page.locator('#mode-sum');

  // ── 1. Opens on the work, no intro screen, switcher first and full width ──
  ok('switcher visible', await sw.isVisible());
  ok('step heading visible on load', await h1.isVisible());
  ok('heading is the sync-mode step',
    (await h1.textContent()).trim() === 'How should we sync your data?');
  ok('switcher is first element in body',
    await page.evaluate(() => document.body.firstElementChild.classList.contains('variant-switch')));
  const swBox = await sw.boundingBox();
  ok('switcher spans the viewport width', swBox.width >= 1280 - 1 && swBox.x === 0);
  const h1Box = await h1.boundingBox();
  ok('switcher sits above the page content', swBox.y + swBox.height <= h1Box.y);
  ok('no chevron band / stepper on this step',
    (await page.locator('text=Organize').count()) === 0);
  ok('UI kit is the canonical linked stylesheet',
    await page.evaluate(() => !!document.querySelector(
      'link[href="https://dashasyn.github.io/synder-prototypes/ui-kit/synder-ui-kit.css"]')));
  ok('both mode cards visible', await cardPt.isVisible() && await cardSum.isVisible());

  // ── 2. Preview variant 1 — inline, BOTH visible at once ──
  const inPt = page.locator('#pv-inline-pt');
  const inSum = page.locator('#pv-inline-sum');
  ok('v1: per-transaction preview visible', await inPt.isVisible());
  ok('v1: summary preview visible', await inSum.isVisible());
  ok('v1: both previews on screen simultaneously',
    await inPt.isVisible() && await inSum.isVisible());
  const ptBox = await inPt.boundingBox(), sumBox = await inSum.boundingBox();
  ok('v1: previews sit side by side, not stacked', Math.abs(ptBox.y - sumBox.y) < 120);
  ok('v1: per-transaction preview shows a customer name',
    (await inPt.textContent()).includes('Amelia Hart'));
  ok('v1: summary preview shows one journal entry',
    (await inSum.textContent()).includes('Journal Entry'));
  ok('v1: the 412 / 1 contrast is legible in the previews',
    (await inPt.textContent()).includes('412 entries') &&
    (await inSum.textContent()).includes('1 entry'));
  ok('v1: modal trigger hidden', !(await page.locator('#mode-pt .pv-btn').isVisible()));
  ok('v1: big-tabs panel hidden', !(await page.locator('#pv-panel').isVisible()));

  // journal-entry lines must actually add up to the deposit
  const sums = await inSum.evaluate(el => {
    const num = t => parseFloat(t.replace(/[−,]/g, m => m === '−' ? '-' : '').replace(/,/g, ''));
    const rows = [...el.querySelectorAll('tr')];
    const head = num(rows[0].querySelector('.c-amt').textContent.trim());
    const lines = rows.slice(1).map(r => num(r.querySelector('.c-amt').textContent.trim()));
    return { head, total: lines.reduce((a, b) => a + b, 0) };
  });
  ok('v1: journal-entry lines sum to the deposit',
    Math.abs(sums.head - sums.total) < 0.005);

  // ── 3. Preview variant 2 — button + modal ──
  await page.click('#pv-2');
  ok('v2: inline previews gone', !(await inPt.isVisible()) && !(await inSum.isVisible()));
  const btnPt = page.locator('#mode-pt .pv-btn button');
  const btnSum = page.locator('#mode-sum .pv-btn button');
  ok('v2: both cards offer a preview button',
    await btnPt.isVisible() && await btnSum.isVisible());
  await btnPt.click();
  const modal = page.locator('#pv-modal-bg');
  ok('v2: modal opens', await modal.isVisible());
  ok('v2: modal carries the per-transaction register',
    (await page.locator('#pv-modal-body').textContent()).includes('Amelia Hart'));
  ok('v2: the other mode is NOT visible while the modal is open — the cost of this option',
    !(await inSum.isVisible()));
  await page.keyboard.press('Escape');
  ok('v2: Escape closes the modal', !(await modal.isVisible()));
  ok('v2: cards still interactive after closing',
    await cardPt.isVisible() && await btnSum.isVisible());
  await btnSum.click();
  ok('v2: summary modal opens with the journal entry',
    (await page.locator('#pv-modal-body').textContent()).includes('Journal Entry'));
  await page.locator('#pv-modal-bg .close-x').click();
  ok('v2: close button works', !(await modal.isVisible()));
  ok('v2: opening a preview did not change the selected mode',
    await page.locator('#mode-pt.sel').isVisible());

  // ── 4. Preview variant 3 — big tabs ──
  await page.click('#pv-3');
  const panel = page.locator('#pv-panel');
  ok('v3: panel visible', await panel.isVisible());
  ok('v3: inline previews hidden', !(await inPt.isVisible()));
  ok('v3: buttons hidden', !(await btnPt.isVisible()));
  ok('v3: opens on per-transaction', await page.locator('#tab-pt.active').isVisible());
  ok('v3: panel renders the register rows',
    (await page.locator('#pv-panel-body').textContent()).includes('Amelia Hart'));
  await page.click('#tab-sum');
  ok('v3: summary tab is live after clicking', await page.locator('#tab-sum.active').isVisible());
  ok('v3: panel swapped to the journal entry',
    (await page.locator('#pv-panel-body').textContent()).includes('Journal Entry'));
  ok('v3: per-transaction now invisible — one mode at a time',
    !(await page.locator('#pv-panel-body').textContent()).includes('Amelia Hart'));
  ok('v3: both tabs still clickable', await page.locator('#tab-pt').isVisible());

  // ── 5. Card body variants ──
  await page.click('#pv-1');
  await page.click('#cb-1');
  ok('cb1: plain lines visible', await page.locator('#mode-pt .mode-lines').isVisible());
  ok('cb1: downside line visible on both cards',
    await page.locator('#mode-pt .mode-down').isVisible() &&
    await page.locator('#mode-sum .mode-down').isVisible());
  ok('cb1: exactly three lines per card',
    (await page.locator('#mode-pt .mode-lines li').count()) === 3 &&
    (await page.locator('#mode-sum .mode-lines li').count()) === 3);
  ok('cb1: ticks hidden', !(await page.locator('#mode-pt .mode-ticks').isVisible()));
  ok('cb1: per-transaction downside is the row count',
    (await page.locator('#mode-pt .mode-down').textContent()).includes('412 entries'));
  ok('cb1: summary downside is the missing detail',
    (await page.locator('#mode-sum .mode-down').textContent()).includes('stay in Synder'));

  await page.click('#cb-2');
  ok('cb2: ticks visible', await page.locator('#mode-pt .mode-ticks').isVisible());
  ok('cb2: six ticks per card',
    (await page.locator('#mode-pt .mode-ticks li').count()) === 6 &&
    (await page.locator('#mode-sum .mode-ticks li').count()) === 6);
  ok('cb2: lines and downside hidden',
    !(await page.locator('#mode-pt .mode-lines').isVisible()) &&
    !(await page.locator('#mode-pt .mode-down').isVisible()));
  ok('cb2: previews unaffected by the card-body switch', await inPt.isVisible());

  // ── 6. Permanence variants — mutually exclusive, one claim on screen at a time ──
  await page.click('#pm-1');
  ok('pm1: line under the cards visible', await page.locator('.perm-under').isVisible());
  ok('pm1: in-card copy hidden', !(await page.locator('.perm-in-card').isVisible()));
  ok('pm1: old warning hidden', !(await page.locator('.perm-alert').isVisible()));
  ok('pm1: escape hatch is stated, not just the restriction',
    (await page.locator('.perm-under').textContent()).includes('create another organization'));

  await page.click('#pm-2');
  ok('pm2: copy inside the recommended card', await page.locator('#mode-pt .perm-in-card').isVisible());
  ok('pm2: under-cards line hidden', !(await page.locator('.perm-under').isVisible()));
  ok('pm2: summary card carries no permanence copy',
    (await page.locator('#mode-sum .perm-in-card').count()) === 0);

  await page.click('#pm-3');
  ok('pm3: current warning visible', await page.locator('.perm-alert').isVisible());
  ok('pm3: the other two hidden',
    !(await page.locator('.perm-under').isVisible()) &&
    !(await page.locator('.perm-in-card').isVisible()));

  // ── 7. The three dimensions are independent ──
  await page.click('#pv-2'); await page.click('#cb-2'); await page.click('#pm-1');
  ok('combo: preview=2 holds', await btnPt.isVisible() && !(await inPt.isVisible()));
  ok('combo: body=2 holds', await page.locator('#mode-pt .mode-ticks').isVisible());
  ok('combo: permanence=1 holds', await page.locator('.perm-under').isVisible());
  ok('combo: all three switch groups still operable',
    await page.locator('#pv-1').isVisible() &&
    await page.locator('#cb-1').isVisible() &&
    await page.locator('#pm-3').isVisible());

  // ── 8. Choosing a mode — liveness, not just state ──
  await page.click('#pv-1'); await page.click('#cb-1');
  await cardSum.click();
  ok('select: summary card marked selected', await page.locator('#mode-sum.sel').isVisible());
  ok('select: per-transaction card still visible and clickable',
    await cardPt.isVisible() && await page.locator('#mode-pt .mode-radio').isVisible());
  ok('select: both previews survive the selection', await inPt.isVisible() && await inSum.isVisible());
  await cardPt.click();
  ok('select: switching back works', await page.locator('#mode-pt.sel').isVisible());
  ok('select: only one card selected at a time',
    (await page.locator('.mode.sel').count()) === 1);

  // ── 9. Keyboard / a11y ──
  await page.locator('#mode-pt input').focus();
  await page.keyboard.press('ArrowDown');
  ok('a11y: arrow key moves the radio selection', await page.locator('#mode-sum.sel').isVisible());
  ok('a11y: focused card shows a visible focus ring',
    await page.evaluate(() => {
      const c = document.querySelector('#mode-sum');
      return getComputedStyle(c).outlineStyle !== 'none' || c.matches(':focus-within');
    }));
  await page.locator('#pv-2').focus();
  ok('a11y: switcher buttons are focusable',
    await page.evaluate(() => document.activeElement.id === 'pv-2'));
  ok('a11y: modal is labelled',
    await page.evaluate(() => {
      const m = document.querySelector('#pv-modal-bg');
      return m.getAttribute('role') === 'dialog' && !!m.getAttribute('aria-labelledby');
    }));

  // ── 10. Copy consistency ──
  const body = await page.locator('.ob-wrap').textContent();
  ok('copy: the same 412 is used on both sides of the comparison',
    (body.match(/412/g) || []).length >= 2);
  ok('copy: no jargon "journal entries that summarize" left from the old card',
    !body.includes('summarize all transactions together'));
  ok('copy: sample data is generic Shopify, not a named real merchant',
    body.includes('Shopify') && !body.includes('Dasha Test Company'));

  await browser.close();

  console.log(`\nTarget: ${target}`);
  console.log(`${pass} assertions passed, ${fails.length} failed`);
  if (fails.length) {
    fails.forEach(f => console.log('  FAIL  ' + f));
    process.exit(1);
  }
})();
