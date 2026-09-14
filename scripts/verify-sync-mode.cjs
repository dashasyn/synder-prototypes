#!/usr/bin/env node
/**
 * verify-sync-mode.cjs — real Chromium checks for reports/onboarding-sync-mode/index.html
 *
 * Usage:  node scripts/verify-sync-mode.cjs [url]
 * Default target is the local file; pass the published URL to check the deployed copy.
 *
 * Two standing rules this file enforces:
 *  - Liveness, not state (AGENTS.md): when the question is "can the user still interact with
 *    this?", assert isVisible() / hittability. isChecked() passes inside a closed panel.
 *  - Modal padding (regression, 2026-09-14): the kit puts padding on .modal-header / .modal-body,
 *    never on .modal itself. Bare children sit flush against the edge. Measured, not eyeballed.
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
  const modalBg = page.locator('#pv-modal-bg');
  const modal = page.locator('#pv-modal');

  // ── 1. Opens on the work, no intro screen, switcher first and full width ──
  ok('switcher visible', await sw.isVisible());
  ok('step heading visible on load', await h1.isVisible());
  ok('heading is the sync-mode step',
    (await h1.textContent()).trim() === 'How should we sync your data?');
  ok('switcher is first element in body',
    await page.evaluate(() => document.body.firstElementChild.classList.contains('variant-switch')));
  const swBox = await sw.boundingBox();
  ok('switcher spans the viewport width', swBox.width >= 1279 && swBox.x === 0);
  ok('switcher sits above the page content', swBox.y + swBox.height <= (await h1.boundingBox()).y);
  ok('no chevron band / stepper on this step',
    (await page.locator('text=Organize').count()) === 0);
  ok('UI kit is the canonical linked stylesheet',
    await page.evaluate(() => !!document.querySelector(
      'link[href="https://dashasyn.github.io/synder-prototypes/ui-kit/synder-ui-kit.css"]')));
  ok('both mode cards visible', await cardPt.isVisible() && await cardSum.isVisible());
  ok('modal is closed on load', !(await modalBg.isVisible()));

  // ── 2. Card body — three lines, each with a tick, plus the downside ──
  ok('three lines per card',
    (await page.locator('#mode-pt .mode-lines li').count()) === 3 &&
    (await page.locator('#mode-sum .mode-lines li').count()) === 3);
  ok('lines are visible on both cards',
    await page.locator('#mode-pt .mode-lines').isVisible() &&
    await page.locator('#mode-sum .mode-lines').isVisible());
  const tick = await page.evaluate(() => {
    const li = document.querySelector('#mode-pt .mode-lines li');
    const cs = getComputedStyle(li, '::before');
    return { content: cs.content, color: cs.color };
  });
  ok('each line carries a tick marker', tick.content.includes('✓'));
  // kit token --color-green is #1F8940 → rgb(31, 137, 64); assert green dominance, not a literal
  const tickRgb = tick.color.match(/\d+/g).map(Number);
  ok('the tick is the kit green, not the body colour',
    tickRgb[1] > tickRgb[0] && tickRgb[1] > tickRgb[2]);
  ok('downside line visible on both cards',
    await page.locator('#mode-pt .mode-down').isVisible() &&
    await page.locator('#mode-sum .mode-down').isVisible());
  ok('per-transaction downside is the row count',
    (await page.locator('#mode-pt .mode-down').textContent()).includes('412 entries'));
  ok('summary downside is the missing detail',
    (await page.locator('#mode-sum .mode-down').textContent()).includes('stay in Synder'));
  ok('no six-tick list left behind', (await page.locator('.mode-ticks').count()) === 0);

  // ── 3. Permanence — one grey line under the cards, not a yellow warning ──
  const perm = page.locator('.perm-under');
  ok('permanence line visible', await perm.isVisible());
  ok('permanence sits below both cards',
    (await perm.boundingBox()).y > (await cardSum.boundingBox()).y + (await cardSum.boundingBox()).height - 1);
  ok('permanence states the escape hatch',
    (await perm.textContent()).includes('create another organization'));
  ok('permanence is grey, not a warning colour', await perm.evaluate(el => {
    const c = getComputedStyle(el).color;
    const m = c.match(/\d+/g).map(Number);
    return Math.abs(m[0] - m[1]) < 40 && Math.abs(m[1] - m[2]) < 60 && m[0] < 160;
  }));
  ok('no yellow alert on the page', (await page.locator('.alert-warning').count()) === 0);
  ok('permanence appears once only', (await page.locator('.perm-under').count()) === 1);

  // ── 4. Preview is button + modal; nothing inline ──
  const btnPt = page.locator('#mode-pt .pv-btn button');
  const btnSum = page.locator('#mode-sum .pv-btn button');
  ok('both cards offer a preview button', await btnPt.isVisible() && await btnSum.isVisible());
  // Trust (2026-09-14): at this step nothing has synced, so the button must not promise a look at
  // real books. "See it in QuickBooks" implied data that does not exist yet.
  const labelPt = (await btnPt.textContent()).trim();
  ok('button calls it a preview', /preview/i.test(labelPt));
  ok('button says the data is a sample', /sample/i.test(labelPt));
  ok('button no longer promises real books',
    !/see it in/i.test(labelPt) && !/see it in/i.test((await btnSum.textContent())));
  ok('both buttons carry the same label', labelPt === (await btnSum.textContent()).trim());
  ok('no inline preview left in the cards', (await page.locator('.mode .pv').count()) === 0);
  ok('no big-tabs panel left on the page', (await page.locator('#pv-panel').count()) === 0);

  // ── 5. Modal padding — the 2026-09-14 regression, measured ──
  await btnPt.click();
  ok('modal opens', await modalBg.isVisible());
  const mBox = await modal.boundingBox();
  const titleBox = await page.locator('#pv-modal-title').boundingBox();
  const pvBox = await page.locator('#pv-modal-body .pv').boundingBox();
  const footBox = await page.locator('.modal-foot').boundingBox();
  ok('title has left padding', titleBox.x - mBox.x >= 20);
  ok('preview has left padding', pvBox.x - mBox.x >= 20);
  ok('preview has right padding', (mBox.x + mBox.width) - (pvBox.x + pvBox.width) >= 20);
  ok('preview is not flush against the header', pvBox.y - (titleBox.y + titleBox.height) >= 12);
  ok('footer is not flush against the preview', footBox.y - (pvBox.y + pvBox.height) >= 12);
  ok('modal fits inside the viewport', mBox.x >= 0 && mBox.x + mBox.width <= 1280);
  ok('header rule separates title from body', await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.modal-title-row'));
    return parseFloat(cs.borderBottomWidth) >= 1;
  }));

  // ── 5b. The modal repeats the disclosure, so it survives being opened directly ──
  const sample = page.locator('.pv-sample');
  ok('modal states the data is a sample', await sample.isVisible());
  ok('modal says nothing has synced yet',
    /nothing has synced yet/i.test(await sample.textContent()));
  ok('modal says when real data appears',
    /after the first sync/i.test(await sample.textContent()));
  ok('modal title calls it a preview',
    /preview/i.test(await page.locator('#pv-modal-title').textContent()));
  ok('modal title is conditional, not a claim about existing books',
    /would look like/i.test(await page.locator('#pv-modal-title').textContent()));
  ok('register header is marked as a sample',
    /sample/i.test(await page.locator('#pv-modal-body .pv-head').first().textContent()));
  ok('disclosure sits above the register',
    (await sample.boundingBox()).y < (await page.locator('#pv-modal-body .pv').first().boundingBox()).y);

  // ── 6. Modal content, variant 1 — chosen mode only ──
  const body1 = await page.locator('#pv-modal-body').textContent();
  ok('v1: modal names the mode it is showing',
    (await page.locator('#pv-modal-mode').textContent()).includes('Per transaction'));
  ok('v1: register shows customer names', body1.includes('Amelia Hart'));
  ok('v1: register has column headers',
    (await page.locator('#pv-modal-body th').count()) === 4);
  ok('v1: register names the QuickBooks accounts', body1.includes('Shopify Sales') && body1.includes('Merchant fees'));
  ok('v1: eight sample rows shown', (await page.locator('#pv-modal-body tbody tr').count()) === 8);
  ok('v1: footer reconciles the sample to the real count',
    body1.includes('412 entries') && body1.includes('404 more'));
  ok('v1: a note explains the consequence, not just the rows',
    (await page.locator('#pv-modal-body .pv-note').textContent()).includes('412 entries to one deposit line'));
  ok('v1: the other mode is NOT in the modal — the cost of this option',
    !body1.includes('Journal Entry'));
  await page.keyboard.press('Escape');
  ok('v1: Escape closes', !(await modalBg.isVisible()));

  await btnSum.click();
  const body1s = await page.locator('#pv-modal-body').textContent();
  ok('v1: summary modal shows the journal entry', body1s.includes('Journal Entry'));
  ok('v1: summary lines name real QuickBooks accounts',
    body1s.includes('Sales of Product Income') && body1s.includes('Sales Tax Payable'));
  ok('v1: summary footer states 1 entry for the same 412 orders',
    body1s.includes('1 entry') && body1s.includes('412 orders'));
  // the journal-entry lines must actually add up to the deposit
  const sums = await page.locator('#pv-modal-body .pv').evaluate(el => {
    const num = t => parseFloat(t.replace(/−/g, '-').replace(/,/g, ''));
    const rows = [...el.querySelectorAll('tbody tr')];
    const head = num(rows[0].querySelector('.c-amt').textContent.trim());
    const lines = rows.slice(1).map(r => num(r.querySelector('.c-amt').textContent.trim()));
    return { head, total: lines.reduce((a, b) => a + b, 0) };
  });
  ok('v1: journal-entry lines sum to the deposit', Math.abs(sums.head - sums.total) < 0.005);
  await page.locator('#pv-modal .close-x').click();
  ok('v1: close button works', !(await modalBg.isVisible()));
  ok('v1: cards still interactive after closing',
    await cardPt.isVisible() && await btnSum.isVisible());
  ok('v1: opening a preview did not change the selected mode',
    await page.locator('#mode-pt.sel').isVisible());

  // ── 7. Modal content, variant 2 — both modes side by side ──
  await page.click('#md-2');
  await btnPt.click();
  const pairPt = page.locator('#pair-pt');
  const pairSum = page.locator('#pair-sum');
  ok('v2: both registers visible at once',
    await pairPt.isVisible() && await pairSum.isVisible());
  const pBox = await pairPt.boundingBox(), sBox = await pairSum.boundingBox();
  ok('v2: they sit side by side, not stacked', Math.abs(pBox.y - sBox.y) < 40 && sBox.x > pBox.x);
  ok('v2: both columns labelled',
    (await pairPt.locator('h3').textContent()).includes('Per transaction') &&
    (await pairSum.locator('h3').textContent()).includes('Summary'));
  ok('v2: the 412-vs-1 contrast is on screen together',
    (await pairPt.textContent()).includes('412 entries') &&
    (await pairSum.textContent()).includes('1 entry'));
  ok('v2: sample disclosure still shown in the side-by-side modal', await page.locator('.pv-sample').isVisible());
  ok('v2: both registers marked as samples',
    (await page.locator('#pv-modal-body .pv-head').count()) === 2 &&
    (await page.locator('#pv-modal-body .pv-head').first().textContent()).includes('Sample') &&
    (await page.locator('#pv-modal-body .pv-head').last().textContent()).includes('Sample'));
  const m2 = await modal.boundingBox();
  ok('v2: modal widens for the pair', m2.width > mBox.width);
  ok('v2: modal still fits the viewport', m2.x >= 0 && m2.x + m2.width <= 1280);
  const pvBox2 = await pairPt.locator('.pv').boundingBox();
  ok('v2: left padding survives the wider layout', pvBox2.x - m2.x >= 20);
  const pvBox2r = await pairSum.locator('.pv').boundingBox();
  ok('v2: right padding survives the wider layout',
    (m2.x + m2.width) - (pvBox2r.x + pvBox2r.width) >= 20);
  ok('v2: opening from the summary card shows the same pair', await (async () => {
    await page.keyboard.press('Escape');
    await btnSum.click();
    return await page.locator('#pair-pt').isVisible() && await page.locator('#pair-sum').isVisible();
  })());
  await page.keyboard.press('Escape');
  ok('v2: closes cleanly', !(await modalBg.isVisible()));

  await page.click('#md-1');
  ok('switching back to v1 restores the single register', await (async () => {
    await btnPt.click();
    const single = (await page.locator('#pv-modal-body').textContent()).includes('Amelia Hart') &&
                   (await page.locator('#pair-sum').count()) === 0;
    await page.keyboard.press('Escape');
    return single;
  })());

  // ── 8. Choosing a mode — liveness, not just state ──
  await cardSum.click();
  ok('select: summary card marked selected', await page.locator('#mode-sum.sel').isVisible());
  ok('select: per-transaction card still visible and clickable',
    await cardPt.isVisible() && await btnPt.isVisible());
  await cardPt.click();
  ok('select: switching back works', await page.locator('#mode-pt.sel').isVisible());
  ok('select: only one card selected at a time', (await page.locator('.mode.sel').count()) === 1);
  ok('select: permanence line survives every selection', await perm.isVisible());

  // ── 9. Keyboard / a11y ──
  await page.locator('#mode-pt input').focus();
  await page.keyboard.press('ArrowDown');
  ok('a11y: arrow key moves the radio selection', await page.locator('#mode-sum.sel').isVisible());
  await btnPt.click();
  ok('a11y: focus moves into the modal on open',
    await page.evaluate(() => document.querySelector('#pv-modal').contains(document.activeElement)));
  ok('a11y: modal is a labelled dialog', await page.evaluate(() => {
    const m = document.querySelector('#pv-modal-bg');
    return m.getAttribute('role') === 'dialog' && m.getAttribute('aria-modal') === 'true' &&
           !!document.getElementById(m.getAttribute('aria-labelledby'));
  }));
  ok('a11y: close control has an accessible name',
    (await page.locator('#pv-modal .close-x').getAttribute('aria-label')) === 'Close');
  await page.keyboard.press('Escape');
  ok('a11y: switcher buttons are focusable', await (async () => {
    await page.locator('#md-2').focus();
    return await page.evaluate(() => document.activeElement.id === 'md-2');
  })());
  await page.click('#md-1');

  // ── 10. Copy consistency ──
  const text = await page.locator('.ob-wrap').textContent();
  ok('copy: the same 412 is used on both sides of the comparison',
    (text.match(/412/g) || []).length >= 2);
  ok('copy: no jargon "journal entries that summarize" left from the old card',
    !text.includes('summarize all transactions together'));
  ok('copy: sample data is generic Shopify, not a real connected merchant',
    text.includes('Shopify') && !text.includes('Dasha Test Company'));

  await browser.close();

  console.log(`\nTarget: ${target}`);
  console.log(`${pass} assertions passed, ${fails.length} failed`);
  if (fails.length) {
    fails.forEach(f => console.log('  FAIL  ' + f));
    process.exit(1);
  }
})();
