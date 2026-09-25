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

  const h1 = page.locator('.page-title');
  const cardPt = page.locator('#mode-pt');
  const cardSum = page.locator('#mode-sum');
  const modalBg = page.locator('#pv-modal-bg');
  const modal = page.locator('#pv-modal');

  // ── 1. Opens on the work, no intro screen, switcher first and full width ──
  ok('step heading visible on load', await h1.isVisible());
  ok('heading matches production wording',
    (await h1.textContent()).trim() === 'Choose how Synder organizes your transactions');
  // Ignat 2026-09-16: many integrations, not only Shopify — the step intro must stay generic.
  const intro = (await h1.textContent()) + ' ' + (await page.locator('.ob-sub').textContent());
  ok('the intro names no single sales channel', !/shopify|stripe|amazon|paypal|etsy/i.test(intro));
  ok('the intro names no single accounting platform', !/quickbooks|xero|sage|netsuite/i.test(intro));
  ok('the intro states the choice in product terms',
    /record every transaction individually/i.test(intro) &&
    /group them into\s+summary entries/i.test(intro.replace(/\s+/g, ' ')));
  // One variant left, so there is no switcher — AGENTS.md: one variant = no switcher.
  ok('no variant switcher on the page', (await page.locator('.variant-switch').count()) === 0);
  ok('the page opens directly on the product chrome',
    await page.evaluate(() => document.body.firstElementChild.classList.contains('ob-top')));
  ok('no prototype-only control left behind',
    (await page.locator('#md-1, #md-2, .vs-note').count()) === 0);
  ok('no chevron band / stepper on this step', await page.evaluate(() => {
    const labels = ['Import', 'Organize', 'Customize', 'Sync'];
    const exact = [...document.querySelectorAll('.ob-wrap *')]
      .filter(el => !el.children.length && labels.includes(el.textContent.trim()));
    return exact.length === 0 && document.querySelectorAll('.stepper, .chevron-band').length === 0;
  }));
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
  ok('page actions use the kit primary + outlined pair',
    (await page.locator('.ob-actions .btn').count()) === 2 &&
    (await page.locator('.ob-actions .btn-outlined').count()) === 1);

  // ── 3. Type scale — nothing authored below 14px ──
  const small = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.ob-wrap *, #pv-modal *').forEach(el => {
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
  ok('per-transaction downside names the cost without inventing a volume',
    /grows with your order volume/i.test(await page.locator('#mode-pt .mode-down').textContent()));
  ok('summary downside is the missing detail',
    (await page.locator('#mode-sum .mode-down').textContent()).includes('stay in Synder'));
  // Ignat 2026-09-16: Summary is not payout-only — daily is the more common grouping.
  const sumCard = (await page.locator('#mode-sum').textContent()).replace(/\s+/g, ' ');
  ok('summary copy does not claim payout is the only grouping',
    /daily/i.test(sumCard) && /per payout/i.test(sumCard));
  ok('summary copy no longer says each payout becomes one entry',
    !/each payout arrives/i.test(sumCard));
  // Ignat 2026-09-16: sales tax follows the tax code, not the state — one state holds many codes.
  const ptCard = (await page.locator('#mode-pt').textContent()).replace(/\s+/g, ' ');
  ok('sales tax is described by tax code', /tax code/i.test(ptCard));
  ok('sales tax copy no longer says per state', !/per state/i.test(ptCard));
  ok('the tax line names the granularity below state level',
    /county|city/i.test(ptCard));
  // Ignat 2026-09-16: QuickBooks is not connected at this step, so the cards cannot claim a
  // transaction count. Specific figures belong only inside the sample-labelled preview.
  const cardsText = (await page.locator('.modes').textContent()).replace(/\s+/g, ' ');
  ok('no invented transaction count on the cards', !/\b412\b/.test(cardsText));
  ok('no figure on the cards is presented as the user\'s own data',
    !/\d[\d,]{2,}/.test(cardsText));
  ok('both card downsides are abstract, not numeric', await page.evaluate(() =>
    [...document.querySelectorAll('.mode-down')].every(el => !/\d/.test(el.textContent))));
  // accountant round DOM-2: matching a bank line is not reconciliation
  const pageText = (await page.locator('.ob-wrap').textContent()).replace(/\s+/g, ' ');
  ok('nothing claims the sync reconciles in one click', !/reconciles in one click/i.test(pageText));
  ok('the bank-match claim is phrased as matching, not reconciling',
    /matches your bank deposit in one line/i.test(pageText));

  // ── 4a. The reason lives only in the chip tooltip (Ignat, 2026-09-16) ──
  ok('no reason line in the card body', (await page.locator('.mode-why').count()) === 0);
  ok('the card body is description, lines and downside only', await page.evaluate(() => {
    const kids = [...document.querySelectorAll('#mode-pt .mode-body > *')].map(el => el.className);
    return kids.length === 3 && kids[0] === 'mode-desc' && kids[1] === 'mode-lines' &&
           kids[2] === 'mode-down';
  }));
  ok('both cards have the same body structure', await page.evaluate(() => {
    const a = [...document.querySelectorAll('#mode-pt .mode-body > *')].map(el => el.className);
    const b = [...document.querySelectorAll('#mode-sum .mode-body > *')].map(el => el.className);
    return JSON.stringify(a) === JSON.stringify(b);
  }));

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
  ok('tooltip points at the answers the suggestion came from',
    /role/i.test(await tip.textContent()) && /industry/i.test(await tip.textContent()));
  ok('tooltip says the choice is still the user\'s',
    /you can pick either mode/i.test(await tip.textContent()));
  ok('tooltip invents no accounting rationale',
    !/per-state/i.test(await tip.textContent()) && !/tax filing/i.test(await tip.textContent()));
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
  await page.locator('#r-sum').focus();
  ok('tooltip hides on blur', await opacitySettles(0));
  ok('clicking the chip does not change the selected mode', await (async () => {
    await page.locator('#mode-sum').click();
    await chip.click();
    return await page.locator('#mode-sum.sel').isVisible();
  })());
  await page.locator('#r-pt').click();
  ok('the reason is reachable only through the chip',
    (await page.locator('.mode-why').count()) === 0 && await chip.isVisible());

  // ── 4c. Nothing under the cards (Ignat, 2026-09-16) ──
  ok('no permanence line', (await page.locator('.perm-under').count()) === 0);
  ok('no undecided nudge', (await page.locator('.perm-nudge').count()) === 0);
  ok('only the preview trigger sits between the cards and the actions',
    await page.evaluate(() => {
      const cards = document.querySelector('.modes');
      const next = cards.nextElementSibling;
      return next.classList.contains('pv-link-row') &&
             next.nextElementSibling.classList.contains('ob-actions');
    }));
  ok('the step makes no claim about changing the mode later',
    !/changed later|can't be changed|another organization|second organization/i
      .test(await page.locator('.ob-wrap').textContent()));

  // ── 6. Preview is button + modal, and the button does not promise real books ──
  // Ignat 2026-09-16: two outlined preview buttons competed with Continue. One low-weight trigger.
  const pvLink = page.locator('.pv-link');
  const label = (await pvLink.textContent()).trim();
  ok('one preview trigger, not two', (await page.locator('.pv-link').count()) === 1);
  ok('no preview button inside either card', (await page.locator('.mode .pv-btn').count()) === 0);
  ok('preview trigger is visible', await pvLink.isVisible());
  ok('trigger calls it a preview', /preview/i.test(label));
  ok('trigger says the data is a sample', /sample/i.test(label));
  ok('trigger does not promise real books', !/see it in/i.test(label));
  ok('trigger says it shows both modes', /both/i.test(label));
  ok('the trigger is a link, not a bordered button', await pvLink.evaluate(el => {
    const cs = getComputedStyle(el);
    return !el.classList.contains('btn') && parseFloat(cs.borderTopWidth) === 0 &&
           cs.backgroundColor === 'rgba(0, 0, 0, 0)';
  }));
  // Ignat 2026-09-16: no underline at rest, underline on hover.
  ok('trigger is not underlined at rest',
    await pvLink.evaluate(el => getComputedStyle(el).textDecorationLine === 'none'));
  await pvLink.hover();
  ok('trigger underlines on hover',
    await pvLink.evaluate(el => getComputedStyle(el).textDecorationLine === 'underline'));
  await page.locator('.page-title').hover();
  ok('underline goes away again',
    await pvLink.evaluate(el => getComputedStyle(el).textDecorationLine === 'none'));
  ok('Continue is the only filled button on the step',
    (await page.locator('.ob-wrap .btn:not(.btn-outlined):not(.btn-text-plain)').count()) === 1);
  ok('the step carries exactly two buttons plus the link',
    (await page.locator('.ob-wrap .btn').count()) === 2);
  ok('the trigger sits below the cards, before the actions', await page.evaluate(() => {
    const row = document.querySelector('.pv-link-row');
    return row.previousElementSibling.classList.contains('modes') &&
           row.nextElementSibling.classList.contains('ob-actions');
  }));
  ok('no inline preview left in the cards', (await page.locator('.mode .table-wrap').count()) === 0);
  const btnPt = pvLink, btnSum = pvLink;

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

  // ── 9. The preview always shows both modes side by side (Ignat, 2026-09-16) ──
  const pairPt = page.locator('#pair-pt');
  const pairSum = page.locator('#pair-sum');
  ok('both registers visible at once', await pairPt.isVisible() && await pairSum.isVisible());
  const pBox = await pairPt.boundingBox(), sBox = await pairSum.boundingBox();
  ok('they sit side by side, not stacked', Math.abs(pBox.y - sBox.y) < 40 && sBox.x > pBox.x);
  ok('both columns labelled',
    (await pairPt.locator('h3').textContent()).includes('Per transaction') &&
    (await pairSum.locator('h3').textContent()).includes('Summary'));
  ok('the many-vs-one contrast is on screen together',
    /412 entries/.test(await pairPt.textContent()) && /1 entry/.test(await pairSum.textContent()));
  ok('both registers are kit tables',
    (await page.locator('#pv-modal-body table.table.table--sm').count()) === 2);
  ok('both registers marked as samples',
    (await page.locator('#pv-modal-body .pv-cap').count()) === 2 &&
    (await page.locator('#pv-modal-body .pv-cap').first().textContent()).includes('Sample') &&
    (await page.locator('#pv-modal-body .pv-cap').last().textContent()).includes('Sample'));
  ok('the modal names the sample, not a chosen mode',
    /both ways/i.test(await page.locator('#pv-modal-mode').textContent()));

  // per-transaction column: customer names, the deposit that groups them, the clearing account
  const ptText = await pairPt.textContent();
  ok('per-transaction register shows customer names', ptText.includes('Amelia Hart'));
  ok('per-transaction register names the QuickBooks accounts',
    ptText.includes('Shopify Sales') && ptText.includes('Merchant fees'));
  ok('eight sample rows plus the grouping deposit',
    (await pairPt.locator('tbody tr').count()) === 9);
  ok('the bank deposit that groups the receipts is shown',
    /Bank Deposit/.test(await pairPt.locator('tr.deposit').textContent()) &&
    /Checking/.test(await pairPt.locator('tr.deposit').textContent()));
  ok('the note names the clearing account the cash waits in',
    /Undeposited Funds/.test(await pairPt.locator('.pv-note').textContent()));
  ok('footer reconciles the sample to the sample count',
    ptText.includes('412 entries') && ptText.includes('404 not shown'));

  // summary column: a balanced journal entry with the cash side shown
  const sumText = await pairSum.textContent();
  ok('summary register shows the journal entry', sumText.includes('Journal Entry'));
  ok('summary lines name real QuickBooks accounts',
    sumText.includes('Sales of Product Income') && sumText.includes('Sales Tax Payable'));
  ok('summary preview has Debit and Credit columns',
    (await pairSum.locator('th.c-dr').count()) === 1 && (await pairSum.locator('th.c-cr').count()) === 1);
  const je = await pairSum.locator('.pv-wrap').evaluate(el => {
    const num = t => { const v = parseFloat(t.replace(/,/g, '')); return isNaN(v) ? 0 : v; };
    const rows = [...el.querySelectorAll('tbody tr')];
    const head = { dr: num(rows[0].querySelector('.c-dr').textContent),
                   cr: num(rows[0].querySelector('.c-cr').textContent) };
    const lines = rows.slice(1).map(r => ({
      account: r.querySelector('.c-acct').textContent.trim(),
      dr: num(r.querySelector('.c-dr').textContent),
      cr: num(r.querySelector('.c-cr').textContent) }));
    return { head, dr: lines.reduce((a, l) => a + l.dr, 0), cr: lines.reduce((a, l) => a + l.cr, 0),
             checking: lines.find(l => /checking/i.test(l.account)) };
  });
  ok('the journal entry balances — debits equal credits', Math.abs(je.dr - je.cr) < 0.005);
  ok('the header total matches the posted lines',
    Math.abs(je.head.dr - je.dr) < 0.005 && Math.abs(je.head.cr - je.cr) < 0.005);
  ok('the cash side is shown, not implied', !!je.checking);
  ok('the Checking debit is the payout the bank feed shows',
    je.checking && Math.abs(je.checking.dr - 18432.67) < 0.005);
  ok('the note names the bank line rather than calling the total sales',
    /into Checking/.test(await pairSum.locator('.pv-note').textContent()));
  ok('the sample says it is one of the groupings, not the only one',
    /can also group/i.test((await pairSum.locator('.pv-note').textContent()).replace(/\s+/g, ' ')));

  // ── 9b. Width and truncation (Ignat, 2026-09-25: 1040px, min supported viewport 1280) ──
  const mGeo = await modal.boundingBox();
  ok('preview modal is 1040px wide at the 1280 minimum', Math.round(mGeo.width) === 1040);
  ok('it is centred with room either side', Math.round(mGeo.x) === 120);
  ok('no cell in either register is truncated', await page.evaluate(() =>
    [...document.querySelectorAll('#pv-modal-body td, #pv-modal-body th')]
      .every(td => td.scrollWidth <= td.clientWidth + 1)));
  ok('no ellipsis anywhere in the preview', await page.evaluate(() =>
    [...document.querySelectorAll('#pv-modal-body td')]
      .every(td => getComputedStyle(td).textOverflow !== 'ellipsis')));
  ok('figures and dates are never broken across lines', await page.evaluate(() =>
    [...document.querySelectorAll('#pv-modal-body .c-amt, #pv-modal-body .c-dr, #pv-modal-body .c-cr, #pv-modal-body .c-date')]
      .every(td => getComputedStyle(td).whiteSpace === 'nowrap')));
  ok('neither register scrolls sideways', await page.evaluate(() =>
    [...document.querySelectorAll('#pv-modal-body .pv-wrap')].every(w => w.scrollWidth <= w.clientWidth + 1)));
  ok('the whole modal fits the 1280×900 window',
    mGeo.y >= 0 && mGeo.y + mGeo.height <= 900 && mGeo.x + mGeo.width <= 1280);

  // opening from either card gives the same pair
  await page.keyboard.press('Escape');
  ok('Escape closes', !(await modalBg.isVisible()));
  await pvLink.click();
  ok('reopening shows the same pair',
    await page.locator('#pair-pt').isVisible() && await page.locator('#pair-sum').isVisible());
  ok('no single-mode path left', (await page.locator('#pv-modal-body > .pv-wrap').count()) === 0);
  await page.locator('#pv-modal .close-x').click();
  ok('close button works', !(await modalBg.isVisible()));
  ok('cards still interactive after closing',
    await cardPt.isVisible() && await pvLink.isVisible());
  ok('opening a preview did not change the selected mode',
    await page.locator('#mode-pt.sel').isVisible());

  // ── 11. Choosing a mode — liveness, not just state ──
  await cardSum.click();
  ok('select: summary card marked selected', await page.locator('#mode-sum.sel').isVisible());
  ok('select: the kit radio followed the card click',
    await page.locator('#r-sum').isChecked() && await page.locator('#r-sum').isVisible());
  ok('select: per-transaction card still visible and clickable',
    await cardPt.isVisible() && await page.locator('#r-pt').isVisible());
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

  // ── 13. Copy consistency ──
  const text = await page.locator('.ob-wrap').textContent();
  ok('copy: the sample figure appears only inside the sample preview, never on the step',
    !/412/.test(text));
  ok('copy: no jargon left from the old card',
    !text.includes('summarize all transactions together'));
  await pvLink.click();
  const sampleText = await page.locator('#pv-modal-body').textContent();
  ok('copy: the sample names a generic store, not a real connected merchant',
    sampleText.includes('Shopify') && !sampleText.includes('Dasha Test Company'));
  ok('copy: the integration name appears only inside the sample, not on the step',
    !/shopify/i.test(text));
  await page.keyboard.press('Escape');

  // ── 14. Short-window check: 1280×720 must still show the modal's header and footer ──
  const short = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await short.goto(target, { waitUntil: 'networkidle' });
  await short.locator('.pv-link').click();
  const sGeo = await short.locator('#pv-modal').boundingBox();
  ok('at 1280×720 the modal stays inside the window', sGeo.y >= 0 && sGeo.y + sGeo.height <= 720);
  ok('at 1280×720 the close button is on screen',
    await short.locator('#pv-modal .close-x').isVisible() &&
    (await short.locator('#pv-modal .close-x').boundingBox()).y >= 0);
  ok('at 1280×720 the footer Close is on screen', await short.evaluate(() => {
    const r = document.querySelector('#pv-modal .modal-footer').getBoundingClientRect();
    return r.bottom <= window.innerHeight;
  }));
  ok('at 1280×720 the body scrolls instead of overflowing', await short.evaluate(() => {
    const b = document.querySelector('#pv-modal .modal-body');
    return b.scrollHeight > b.clientHeight && getComputedStyle(b).overflowY === 'auto';
  }));
  await short.close();

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
