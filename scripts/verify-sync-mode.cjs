#!/usr/bin/env node
/**
 * verify-sync-mode.cjs — real Chromium checks for reports/onboarding-sync-mode/index.html
 *
 * Usage:  node scripts/verify-sync-mode.cjs [url]
 * Default target is the local file; pass the published URL to check the deployed copy.
 *
 * Standing rules this file enforces:
 *  - Liveness, not state (AGENTS.md): when the question is "can the user still interact with
 *    this?", assert isVisible() / hittability. isChecked() passes inside a closed panel.
 *  - Modal padding (regression, 2026-09-14): the kit puts padding on .modal-header / .modal-body /
 *    .modal-footer, never on .modal itself. Measured, not eyeballed.
 *  - Kit components, not lookalikes (Ignat, 2026-09-14): the register is table.table, the radio is
 *    input.radio, the disclosure is .alert — no hand-rolled equivalents.
 *  - Minimum 14px (Ignat, 2026-09-14) on every authored style. Kit components keep their own
 *    published sizes; the audit reports any that fall below so they are a decision, not a drift.
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
  const h1 = page.locator('.page-title');
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
  ok('no chevron band / stepper on this step', (await page.locator('text=Organize').count()) === 0);
  ok('UI kit is the canonical linked stylesheet',
    await page.evaluate(() => !!document.querySelector(
      'link[href="https://dashasyn.github.io/synder-prototypes/ui-kit/synder-ui-kit.css"]')));
  ok('both mode cards visible', await cardPt.isVisible() && await cardSum.isVisible());
  ok('modal is closed on load', !(await modalBg.isVisible()));

  // ── 2. Kit components, not lookalikes ──
  ok('heading uses the kit page-title style', await h1.evaluate(el => el.classList.contains('page-title')));
  ok('radios are real kit radios, visible and hittable',
    await page.locator('#r-pt.radio').isVisible() && await page.locator('#r-sum.radio').isVisible());
  ok('radio geometry comes from the kit (20px circle)', await page.evaluate(() => {
    const r = document.querySelector('#r-pt').getBoundingClientRect();
    return Math.round(r.width) === 20 && Math.round(r.height) === 20;
  }));
  ok('no hand-rolled radio left behind', (await page.locator('.mode-radio').count()) === 0);
  ok('the recommended chip is a kit status chip',
    await page.locator('#mode-pt .status.status-green').isVisible());
  ok('the Summary card carries no chip', (await page.locator('#mode-sum .status').count()) === 0);
  ok('only one chip on the step', (await page.locator('.modes .status').count()) === 1);
  ok('buttons are kit buttons',
    await page.locator('#mode-pt .pv-btn button.btn.btn-outlined').isVisible());
  ok('page actions use the kit primary + outlined pair',
    (await page.locator('.ob-actions .btn').count()) === 2 &&
    (await page.locator('.ob-actions .btn-outlined').count()) === 1);

  // ── 3. Type scale — nothing authored below 14px ──
  const small = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.ob-wrap *, .variant-switch *, #pv-modal *').forEach(el => {
      if (!el.textContent.trim()) return;
      if (el.children.length && !el.matches('li, p, span, button, h1, h2, h3, th, td, div.pv-cap, div.pv-foot')) return;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      if (size < 14 && cs.fontFamily.indexOf('Material Icons') === -1) {
        out.push({ cls: el.className || el.tagName, size });
      }
    });
    return out;
  });
  const nonChip = small.filter(s => String(s.cls).indexOf('status') === -1);
  ok('no authored text below 14px on the step', nonChip.length === 0);
  if (nonChip.length) console.log('  below 14px:', JSON.stringify(nonChip));
  ok('body text is 14px body2', await page.locator('#mode-pt .mode-desc')
    .evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 14));
  ok('card lines are 14px', await page.locator('#mode-pt .mode-lines li')
    .first().evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 14));
  ok('downside line is 14px', await page.locator('#mode-pt .mode-down')
    .evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 14));
  ok('switcher text is 14px', await page.locator('#md-1')
    .evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 14));
  // kit gap: .close-x sets no font-size, so the ✕ inherits the UA button default of 13.33px
  ok('modal close glyph is at least 14px', await page.locator('#pv-modal .close-x')
    .evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 14));

  // ── 4. Card body — three ticked lines plus the downside ──
  ok('three lines per card',
    (await page.locator('#mode-pt .mode-lines li').count()) === 3 &&
    (await page.locator('#mode-sum .mode-lines li').count()) === 3);
  ok('lines visible on both cards',
    await page.locator('#mode-pt .mode-lines').isVisible() &&
    await page.locator('#mode-sum .mode-lines').isVisible());
  ok('every line carries a tick', await page.evaluate(() =>
    [...document.querySelectorAll('.mode-lines li')]
      .every(li => li.querySelector('.material-icons') &&
                   li.querySelector('.material-icons').textContent.trim() === 'check')));
  ok('ticks are the kit green', await page.locator('#mode-pt .mode-lines .material-icons')
    .first().evaluate(el => {
      const c = getComputedStyle(el).color.match(/\d+/g).map(Number);
      return c[1] > c[0] && c[1] > c[2];
    }));
  ok('downside visible on both cards',
    await page.locator('#mode-pt .mode-down').isVisible() &&
    await page.locator('#mode-sum .mode-down').isVisible());
  ok('per-transaction downside is the row count',
    (await page.locator('#mode-pt .mode-down').textContent()).includes('412 entries'));
  ok('summary downside is the missing detail',
    (await page.locator('#mode-sum .mode-down').textContent()).includes('stay in Synder'));
  // accountant round DOM-2: matching a bank line is not reconciliation
  const pageText = (await page.locator('.ob-wrap').textContent()).replace(/\s+/g, ' ');
  ok('nothing claims the sync reconciles in one click', !/reconciles in one click/i.test(pageText));
  ok('the bank-match claim is phrased as matching, not reconciling',
    /matches your bank deposit in one line/i.test(pageText));

  // ── 4a. The reason is visible without hunting, with the tooltip for detail (review, 2026-09-16) ──
  const whyLine = page.locator('#mode-pt .mode-why');
  ok('a short reason is visible without interaction', await whyLine.isVisible());
  ok('the visible reason names the stack',
    /shopify/i.test(await whyLine.textContent()) && /quickbooks/i.test(await whyLine.textContent()));
  ok('the visible reason is short enough to read at a glance',
    (await whyLine.textContent()).trim().replace(/\s+/g, ' ').length <= 130);
  ok('only the recommended card carries a visible reason',
    (await page.locator('.mode-why').count()) === 1);
  ok('the visible reason is 14px',
    await whyLine.evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 14));

  // ── 4b. The tooltip on the Recommended chip keeps the detail (Ignat, 2026-09-15) ──
  const chip = page.locator('#mode-pt .why-chip');
  const tip = page.locator('#why-pt');
  ok('recommended chip visible', await chip.isVisible());
  ok('chip carries a question mark', (await chip.textContent()).includes('?'));
  ok('chip is a real button, so it is reachable', await chip.evaluate(el => el.tagName === 'BUTTON'));
  ok('chip is described by the tooltip', await page.evaluate(() => {
    const c = document.querySelector('#mode-pt .why-chip');
    return document.getElementById(c.getAttribute('aria-describedby')) !== null;
  }));
  ok('tooltip uses the kit tooltip component',
    await tip.evaluate(el => el.classList.contains('tooltip') &&
      el.parentElement.classList.contains('tooltip-wrap')));
  // .tooltip transitions opacity over 150ms — read after it settles, or the assertion races it
  const tipOpacity = () => tip.evaluate(el => parseFloat(getComputedStyle(el).opacity));
  async function opacitySettles(want) {
    for (let i = 0; i < 20; i++) {
      if ((await tipOpacity()) === want) return true;
      await page.waitForTimeout(50);
    }
    return false;
  }
  ok('tooltip hidden at rest', (await tipOpacity()) === 0);
  await chip.hover();
  ok('tooltip appears on hover', await opacitySettles(1));
  ok('tooltip explains the recommendation for this stack',
    /shopify/i.test(await tip.textContent()) && /quickbooks/i.test(await tip.textContent()));
  ok('tooltip gives a reason, not a restatement',
    /tax/i.test(await tip.textContent()) && /customer/i.test(await tip.textContent()));
  ok('tooltip is 14px, not the kit default 12px',
    await tip.evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 14));
  ok('tooltip stays inside the viewport on every edge', await tip.evaluate(el => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.right <= window.innerWidth &&
           r.top >= 0 && r.bottom <= window.innerHeight;
  }));
  // it shrink-to-fit against a chip-width wrapper before: ~130px wide and very tall
  ok('tooltip is wide enough to read', await tip.evaluate(el =>
    el.getBoundingClientRect().width >= 260));
  ok('tooltip is a tooltip, not a paragraph', await tip.evaluate(el =>
    el.getBoundingClientRect().height <= 120));
  ok('tooltip text is not clipped', await tip.evaluate(el =>
    el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1));
  ok('tooltip opens below the chip, away from the top of the window', await page.evaluate(() => {
    const t = document.getElementById('why-pt').getBoundingClientRect();
    const c = document.querySelector('#mode-pt .why-chip').getBoundingClientRect();
    return t.top >= c.bottom - 1;
  }));
  await page.locator('.ob-sub').hover();
  ok('tooltip hides again when the pointer leaves', await opacitySettles(0));
  await chip.focus();
  ok('tooltip also appears on keyboard focus — the kit reveals on hover only',
    await opacitySettles(1));
  await page.locator('#md-1').focus();
  ok('tooltip hides on blur', await opacitySettles(0));
  ok('clicking the chip does not change the selected mode', await (async () => {
    await page.locator('#mode-sum').click();
    await chip.click();
    return await page.locator('#mode-sum.sel').isVisible();
  })());
  await page.locator('#r-pt').click();
  ok('tooltip and visible line say the same thing, not different things',
    /per-state/i.test(await tip.textContent()) &&
    /per-state/i.test(await whyLine.textContent()));

  // ── 4c. Everything under the cards is gone (Ignat, 2026-09-15) ──
  ok('no permanence line under the cards', (await page.locator('.perm-under').count()) === 0);
  ok('no undecided nudge', (await page.locator('.perm-nudge').count()) === 0);
  ok('the actions row follows the cards directly', await page.evaluate(() => {
    const cards = document.querySelector('.modes');
    return cards.nextElementSibling && cards.nextElementSibling.classList.contains('ob-actions');
  }));
  ok('nothing on the step claims the choice is permanent',
    !/can't be changed later/i.test(await page.locator('.ob-wrap').textContent()));

  // ── 6. Preview is button + modal, and the button does not promise real books ──
  const btnPt = page.locator('#mode-pt .pv-btn button');
  const btnSum = page.locator('#mode-sum .pv-btn button');
  const labelPt = (await btnPt.textContent()).trim();
  ok('both cards offer a preview button', await btnPt.isVisible() && await btnSum.isVisible());
  ok('button calls it a preview', /preview/i.test(labelPt));
  ok('button says the data is a sample', /sample/i.test(labelPt));
  ok('button no longer promises real books',
    !/see it in/i.test(labelPt) && !/see it in/i.test(await btnSum.textContent()));
  ok('both buttons carry the same label', labelPt === (await btnSum.textContent()).trim());
  ok('no inline preview left in the cards', (await page.locator('.mode .table-wrap').count()) === 0);

  // ── 7. Modal — kit structure and measured padding ──
  await btnPt.click();
  ok('modal opens', await modalBg.isVisible());
  ok('modal uses the kit header/body/footer rows',
    await page.locator('#pv-modal > .modal-header').isVisible() &&
    await page.locator('#pv-modal > .modal-body').isVisible() &&
    await page.locator('#pv-modal > .modal-footer').isVisible());
  const mBox = await modal.boundingBox();
  const titleBox = await page.locator('#pv-modal-title').boundingBox();
  const pvBox = await page.locator('#pv-modal-body .pv-wrap').first().boundingBox();
  const footBox = await page.locator('#pv-modal > .modal-footer').boundingBox();
  ok('title has left padding', titleBox.x - mBox.x >= 20);
  ok('preview has left padding', pvBox.x - mBox.x >= 20);
  ok('preview has right padding', (mBox.x + mBox.width) - (pvBox.x + pvBox.width) >= 20);
  ok('preview is not flush against the header', pvBox.y - (titleBox.y + titleBox.height) >= 12);
  ok('footer is not flush against the preview', footBox.y - (pvBox.y + pvBox.height) >= 12);
  ok('modal fits inside the viewport', mBox.x >= 0 && mBox.x + mBox.width <= 1280);

  // ── 8. Sample-data disclosure, as a kit alert ──
  const alert = page.locator('#pv-modal .alert.alert-info');
  ok('disclosure is a kit alert', await alert.isVisible());
  ok('disclosure says nothing has synced yet', /nothing has synced yet/i.test(await alert.textContent()));
  ok('disclosure says when real data appears', /after the first sync/i.test(await alert.textContent()));
  ok('disclosure is 14px', await alert.evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 14));
  ok('modal title calls it a preview', /preview/i.test(await page.locator('#pv-modal-title').textContent()));
  ok('modal title is conditional, not a claim about existing books',
    /would look like/i.test(await page.locator('#pv-modal-title').textContent()));
  ok('register caption is marked as a sample',
    /sample/i.test(await page.locator('#pv-modal-body .pv-cap').first().textContent()));
  ok('disclosure sits above the register', (await alert.boundingBox()).y < pvBox.y);

  // ── 9. Modal content ──
  // Default is now variant 2 (side by side); switch to 1 for the single-register checks.
  ok('preview defaults to side by side', await page.evaluate(() =>
    document.body.classList.contains('md2') && document.getElementById('md-2').classList.contains('on')));
  ok('the side-by-side pair is what opens by default',
    await page.locator('#pair-pt').isVisible() && await page.locator('#pair-sum').isVisible());
  await page.keyboard.press('Escape');
  await page.click('#md-1');
  await btnPt.click();
  const mBoxSingle = await modal.boundingBox();
  const body1 = await page.locator('#pv-modal-body').textContent();
  ok('v1: register is a kit table',
    await page.locator('#pv-modal-body table.table.table--sm').isVisible());
  ok('v1: register cells are 14px', await page.locator('#pv-modal-body tbody td')
    .first().evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 14));
  ok('v1: modal names the mode it is showing',
    (await page.locator('#pv-modal-mode').textContent()).includes('Per transaction'));
  ok('v1: register shows customer names', body1.includes('Amelia Hart'));
  ok('v1: register has four columns', (await page.locator('#pv-modal-body th').count()) === 4);
  ok('v1: register names the QuickBooks accounts',
    body1.includes('Shopify Sales') && body1.includes('Merchant fees'));
  ok('v1: eight sample rows plus the grouping deposit',
    (await page.locator('#pv-modal-body tbody tr').count()) === 9);
  ok('v1: the bank deposit that groups the receipts is shown',
    await page.locator('#pv-modal-body tr.deposit').isVisible() &&
    /Bank Deposit/.test(await page.locator('#pv-modal-body tr.deposit').textContent()));
  ok('v1: the deposit lands in a bank account',
    /Checking/.test(await page.locator('#pv-modal-body tr.deposit').textContent()));
  ok('v1: the note names the clearing account the cash waits in',
    /Undeposited Funds/.test(await page.locator('#pv-modal-body .pv-note').textContent()));
  ok('v1: footer reconciles the sample to the real count',
    body1.includes('412 entries') && body1.includes('404 not shown'));
  ok('v1: a note explains the consequence, not just the rows',
    /groups them into the single line your bank feed shows/
      .test((await page.locator('#pv-modal-body .pv-note').textContent()).replace(/\s+/g, ' ')));
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
  const je = await page.locator('#pv-modal-body .pv-wrap').first().evaluate(el => {
    const num = t => { const v = parseFloat(t.replace(/,/g, '')); return isNaN(v) ? 0 : v; };
    const rows = [...el.querySelectorAll('tbody tr')];
    const head = { dr: num(rows[0].querySelector('.c-dr').textContent),
                   cr: num(rows[0].querySelector('.c-cr').textContent) };
    const lines = rows.slice(1).map(r => ({
      account: r.querySelector('.c-acct').textContent.trim(),
      dr: num(r.querySelector('.c-dr').textContent),
      cr: num(r.querySelector('.c-cr').textContent) }));
    const dr = lines.reduce((a, l) => a + l.dr, 0);
    const cr = lines.reduce((a, l) => a + l.cr, 0);
    const checking = lines.find(l => /checking/i.test(l.account));
    return { head, dr, cr, checking };
  });
  ok('v1: the journal entry balances — debits equal credits', Math.abs(je.dr - je.cr) < 0.005);
  ok('v1: the header total matches the posted lines',
    Math.abs(je.head.dr - je.dr) < 0.005 && Math.abs(je.head.cr - je.cr) < 0.005);
  ok('v1: the cash side is shown, not implied', !!je.checking);
  ok('v1: the Checking debit is the payout the bank feed shows',
    je.checking && Math.abs(je.checking.dr - 18432.67) < 0.005);
  ok('v1: summary preview has Debit and Credit columns',
    (await page.locator('#pv-modal-body th.c-dr').count()) === 1 &&
    (await page.locator('#pv-modal-body th.c-cr').count()) === 1);
  ok('v1: the note names the bank line rather than calling the total sales',
    /into Checking/.test(await page.locator('#pv-modal-body .pv-note').textContent()));
  await page.locator('#pv-modal .close-x').click();
  ok('v1: close button works', !(await modalBg.isVisible()));
  ok('v1: cards still interactive after closing',
    await cardPt.isVisible() && await btnSum.isVisible());
  ok('v1: opening a preview did not change the selected mode',
    await page.locator('#mode-pt.sel').isVisible());

  // ── 10. Modal content, variant 2 — both modes side by side ──
  await page.click('#md-2');
  await btnPt.click();
  const pairPt = page.locator('#pair-pt');
  const pairSum = page.locator('#pair-sum');
  ok('v2: both registers visible at once', await pairPt.isVisible() && await pairSum.isVisible());
  const pBox = await pairPt.boundingBox(), sBox = await pairSum.boundingBox();
  ok('v2: they sit side by side, not stacked', Math.abs(pBox.y - sBox.y) < 40 && sBox.x > pBox.x);
  ok('v2: both columns labelled',
    (await pairPt.locator('h3').textContent()).includes('Per transaction') &&
    (await pairSum.locator('h3').textContent()).includes('Summary'));
  ok('v2: the 412-vs-1 contrast is on screen together',
    (await pairPt.textContent()).includes('412 entries') &&
    (await pairSum.textContent()).includes('1 entry'));
  ok('v2: disclosure still shown', await page.locator('#pv-modal .alert-info').isVisible());
  ok('v2: both registers marked as samples',
    (await page.locator('#pv-modal-body .pv-cap').count()) === 2 &&
    (await page.locator('#pv-modal-body .pv-cap').first().textContent()).includes('Sample') &&
    (await page.locator('#pv-modal-body .pv-cap').last().textContent()).includes('Sample'));
  const m2 = await modal.boundingBox();
  ok('v2: modal widens for the pair', m2.width > mBoxSingle.width);
  ok('v2: modal still fits the viewport', m2.x >= 0 && m2.x + m2.width <= 1280);
  ok('v2: left padding survives the wider layout',
    (await pairPt.locator('.pv-wrap').boundingBox()).x - m2.x >= 20);
  const rBox = await pairSum.locator('.pv-wrap').boundingBox();
  ok('v2: right padding survives the wider layout',
    (m2.x + m2.width) - (rBox.x + rBox.width) >= 20);
  ok('v2: both tables are still kit tables',
    (await page.locator('#pv-modal-body table.table.table--sm').count()) === 2);
  await page.keyboard.press('Escape');
  await btnSum.click();
  ok('v2: opening from the summary card shows the same pair',
    await page.locator('#pair-pt').isVisible() && await page.locator('#pair-sum').isVisible());
  await page.keyboard.press('Escape');
  ok('v2: closes cleanly', !(await modalBg.isVisible()));

  await page.click('#md-1');
  await btnPt.click();
  ok('switching back to v1 restores the single register',
    (await page.locator('#pv-modal-body').textContent()).includes('Amelia Hart') &&
    (await page.locator('#pair-sum').count()) === 0);
  await page.keyboard.press('Escape');

  // ── 11. Choosing a mode — liveness, not just state ──
  await cardSum.click();
  ok('select: summary card marked selected', await page.locator('#mode-sum.sel').isVisible());
  ok('select: the kit radio followed the card click',
    await page.locator('#r-sum').isChecked() && await page.locator('#r-sum').isVisible());
  ok('select: per-transaction card still visible and clickable',
    await cardPt.isVisible() && await btnPt.isVisible());
  await page.locator('#r-pt').click();
  ok('select: clicking the radio itself selects that card',
    await page.locator('#mode-pt.sel').isVisible());
  ok('select: only one card selected at a time', (await page.locator('.mode.sel').count()) === 1);

  // ── 12. Keyboard / a11y ──
  await page.locator('#r-pt').focus();
  await page.keyboard.press('ArrowDown');
  ok('a11y: arrow key moves the radio selection', await page.locator('#mode-sum.sel').isVisible());
  ok('a11y: the radio label is clickable and bound', await page.evaluate(() => {
    const l = document.querySelector('label[for="r-pt"]');
    return !!l && document.getElementById(l.getAttribute('for')) !== null;
  }));
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
  await page.locator('#md-2').focus();
  ok('a11y: switcher buttons are focusable',
    await page.evaluate(() => document.activeElement.id === 'md-2'));
  await page.click('#md-1');

  // ── 13. Copy consistency ──
  const text = await page.locator('.ob-wrap').textContent();
  ok('copy: the same 412 is used on both sides of the comparison',
    (text.match(/412/g) || []).length >= 2);
  ok('copy: no jargon left from the old card',
    !text.includes('summarize all transactions together'));
  ok('copy: sample data is generic Shopify, not a real connected merchant',
    text.includes('Shopify') && !text.includes('Dasha Test Company'));

  await browser.close();

  console.log(`\nTarget: ${target}`);
  if (small.length) {
    const chips = small.filter(s => String(s.cls).indexOf('status') !== -1);
    if (chips.length) console.log(`Note: ${chips.length} kit <Status> chip(s) at ${chips[0].size}px — the kit's own published size, not an authored value.`);
  }
  console.log(`${pass} assertions passed, ${fails.length} failed`);
  if (fails.length) {
    fails.forEach(f => console.log('  FAIL  ' + f));
    process.exit(1);
  }
})();
