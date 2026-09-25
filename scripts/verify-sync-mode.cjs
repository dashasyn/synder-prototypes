#!/usr/bin/env node
/**
 * verify-sync-mode.cjs — real Chromium checks for reports/onboarding-sync-mode/index.html
 *
 * Usage:  node scripts/verify-sync-mode.cjs [url]
 * Default target is the local file; pass the published URL to check the deployed copy.
 *
 * Rewritten 2026-09-25 for the neutral-names preview. Standing rules carried over:
 *  - Liveness, not state (AGENTS.md): assert isVisible() / hittability after interaction.
 *  - Modal padding: the kit pads .modal-header / .modal-body / .modal-footer, never .modal.
 *  - Kit components, not lookalikes: input.radio, table.table, .alert, .status, kit modal rows.
 *  - 14px floor on every authored style; kit components keep their published sizes.
 *  - Nothing in the preview is truncated; the modal fits 1280×900 and 1280×720.
 *  - Cards state mechanics, never magnitudes — nothing is connected at this step.
 *  - The preview teaches one thing: many entries vs one grouped entry. It uses neutral
 *    transaction names and carries no accounting machinery (accounts, debit/credit, bank or
 *    clearing lines), because every factual error in this build came from that machinery.
 */
const { chromium } = require('playwright');
const path = require('path');

const target = process.argv[2] ||
  'file://' + path.resolve(__dirname, '../reports/onboarding-sync-mode/index.html');

let pass = 0;
const fails = [];
function ok(name, cond) { if (cond) { pass++; } else { fails.push(name); } }
const norm = t => (t || '').replace(/\s+/g, ' ').trim();

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));
  await page.goto(target, { waitUntil: 'networkidle' });

  const h1 = page.locator('.page-title');
  const cardPt = page.locator('#mode-pt');
  const cardSum = page.locator('#mode-sum');
  const modalBg = page.locator('#pv-modal-bg');
  const modal = page.locator('#pv-modal');
  const pvLink = page.locator('.pv-link');

  // ── 1. Opens on the work ──
  ok('no JavaScript errors on load', jsErrors.length === 0);
  ok('step heading visible', await h1.isVisible());
  ok('heading matches production wording',
    norm(await h1.textContent()) === 'Choose how Synder organizes your transactions');
  const intro = norm((await h1.textContent()) + ' ' + (await page.locator('.ob-sub').textContent()));
  ok('intro names no sales channel', !/shopify|stripe|amazon|paypal|etsy/i.test(intro));
  ok('intro names no accounting platform', !/quickbooks|xero|sage|netsuite/i.test(intro));
  ok('intro states the choice in product terms',
    /record every transaction individually/i.test(intro) && /group them into summary entries/i.test(intro));
  ok('no variant switcher (one variant)', (await page.locator('.variant-switch').count()) === 0);
  ok('page opens on the product chrome',
    await page.evaluate(() => document.body.firstElementChild.classList.contains('ob-top')));
  ok('no stepper on this step', await page.evaluate(() => {
    const labels = ['Import', 'Organize', 'Customize', 'Sync'];
    return [...document.querySelectorAll('.ob-wrap *')]
      .filter(el => !el.children.length && labels.includes(el.textContent.trim())).length === 0;
  }));
  ok('UI kit is the canonical stylesheet', await page.evaluate(() => !!document.querySelector(
    'link[href="https://dashasyn.github.io/synder-prototypes/ui-kit/synder-ui-kit.css"]')));
  ok('both cards visible', await cardPt.isVisible() && await cardSum.isVisible());
  ok('modal closed on load', !(await modalBg.isVisible()));

  // ── 2. Kit components ──
  ok('heading is the kit page-title', await h1.evaluate(el => el.classList.contains('page-title')));
  ok('radios are kit radios, visible',
    await page.locator('#r-pt.radio').isVisible() && await page.locator('#r-sum.radio').isVisible());
  ok('radio is the kit 20px circle', await page.evaluate(() => {
    const r = document.querySelector('#r-pt').getBoundingClientRect();
    return Math.round(r.width) === 20 && Math.round(r.height) === 20;
  }));
  ok('page actions are the kit primary + outlined pair',
    (await page.locator('.ob-actions .btn').count()) === 2 &&
    (await page.locator('.ob-actions .btn-outlined').count()) === 1);

  // ── 3. Recommended is a plain label (Ignat, 2026-09-25: we won't explain why) ──
  const chip = page.locator('#mode-pt .status.status-green');
  ok('Recommended chip visible on the Per transaction card', await chip.isVisible());
  ok('chip reads exactly "Recommended"', norm(await chip.textContent()) === 'Recommended');
  ok('no question mark on the chip', !/\?/.test(await chip.textContent()));
  ok('no tooltip anywhere on the step',
    (await page.locator('.tooltip, .tooltip-wrap, [role="tooltip"]').count()) === 0);
  ok('chip is a label, not a button', await chip.evaluate(el => el.tagName !== 'BUTTON'));
  ok('chip does not claim to be interactive',
    await chip.evaluate(el => !el.hasAttribute('aria-describedby') && getComputedStyle(el).cursor !== 'help'));
  ok('Summary card carries no chip', (await page.locator('#mode-sum .status').count()) === 0);
  ok('no recommendation rationale anywhere',
    !/your answers earlier|role and industry|retail store/i.test(await page.locator('body').textContent()));

  // ── 4. Type scale ──
  const small = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.ob-wrap *, #pv-modal *').forEach(el => {
      if (!el.textContent.trim()) return;
      if (el.children.length && !el.matches('li, p, span, button, h1, h2, h3, th, td, div.pv-cap, div.pv-foot')) return;
      const cs = getComputedStyle(el);
      if (parseFloat(cs.fontSize) < 14 && cs.fontFamily.indexOf('Material Icons') === -1)
        out.push({ cls: el.className || el.tagName, size: parseFloat(cs.fontSize) });
    });
    return out;
  });
  const nonChip = small.filter(s => String(s.cls).indexOf('status') === -1);
  ok('no authored text below 14px', nonChip.length === 0);
  if (nonChip.length) console.log('  below 14px:', JSON.stringify(nonChip));
  ok('modal close glyph is at least 14px', await page.locator('#pv-modal .close-x')
    .evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 14));

  // ── 5. Card copy: mechanics, platform-neutral, no magnitudes ──
  const ptText = norm(await cardPt.textContent());
  const sumText = norm(await cardSum.textContent());
  const cardsText = norm(await page.locator('.modes').textContent());
  ok('Per description is platform-neutral',
    /every order, refund and fee is recorded as its own entry/i.test(ptText));
  ok('Summary description is platform-neutral',
    /your sales are grouped into one summarized entry/i.test(sumText));
  ok('cards name no accounting platform', !/quickbooks|xero|sage|netsuite/i.test(cardsText));
  ok('Summary groups daily or per payout', /daily/i.test(sumText) && /per payout/i.test(sumText));
  ok('sales tax is by tax code, not by state', /tax code/i.test(ptText) && !/per state/i.test(ptText));
  ok('tax granularity names county or city', /county|city/i.test(ptText));
  ok('Per downside names the cost without a figure',
    /grow with your order volume/i.test(norm(await page.locator('#mode-pt .mode-down').textContent())));
  ok('Summary downside keeps detail on each transaction in Synder',
    /stay on each transaction in Synder/i.test(norm(await page.locator('#mode-sum .mode-down').textContent())));
  ok('Summary downside says summary entries show totals only',
    /summary entries show totals only/i.test(norm(await page.locator('#mode-sum .mode-down').textContent())));
  ok('no invented transaction count on the cards', !/\b412\b/.test(cardsText));
  ok('no multi-digit figure on the cards', !/\d[\d,]{2,}/.test(cardsText));
  ok('downsides carry no digits', await page.evaluate(() =>
    [...document.querySelectorAll('.mode-down')].every(el => !/\d/.test(el.textContent))));
  ok('the unconfirmed bank-match claim is gone',
    !/bank deposit|bank payout|reconcil/i.test(cardsText));
  ok('no word "register" (a QuickBooks term)', !/\bregister\b/i.test(cardsText));
  ok('Per card has three ticked lines', (await page.locator('#mode-pt .mode-lines li').count()) === 3);
  ok('Summary card has two ticked lines (line 3 removed, unconfirmed)',
    (await page.locator('#mode-sum .mode-lines li').count()) === 2);
  ok('every line carries a green tick', await page.evaluate(() =>
    [...document.querySelectorAll('.mode-lines li')].every(li => {
      const i = li.querySelector('.material-icons');
      if (!i || i.textContent.trim() !== 'check') return false;
      const c = getComputedStyle(i).color.match(/\d+/g).map(Number);
      return c[1] > c[0] && c[1] > c[2];
    })));
  ok('card body is description, lines and downside', await page.evaluate(() =>
    ['#mode-pt', '#mode-sum'].every(id => {
      const k = [...document.querySelectorAll(id + ' .mode-body > *')].map(el => el.className);
      return k.join(',') === 'mode-desc,mode-lines,mode-down';
    })));
  ok('nothing about changing the mode later',
    !/changed later|can't be changed|another organization|second organization/i
      .test(norm(await page.locator('.ob-wrap').textContent())));
  ok('no CSV mention on the step', !/\bcsv\b/i.test(await page.locator('.ob-wrap').textContent()));

  // ── 6. One low-weight preview trigger ──
  const label = norm(await pvLink.textContent());
  ok('one preview trigger', (await page.locator('.pv-link').count()) === 1);
  ok('no preview button inside a card', (await page.locator('.mode button').count()) === 0);
  ok('trigger reads "Preview both with sample data"', label === 'Preview both with sample data');
  ok('trigger is a link, not a bordered button', await pvLink.evaluate(el => {
    const cs = getComputedStyle(el);
    return !el.classList.contains('btn') && parseFloat(cs.borderTopWidth) === 0 &&
           cs.backgroundColor === 'rgba(0, 0, 0, 0)';
  }));
  ok('trigger not underlined at rest',
    await pvLink.evaluate(el => getComputedStyle(el).textDecorationLine === 'none'));
  await pvLink.hover();
  ok('trigger underlines on hover',
    await pvLink.evaluate(el => getComputedStyle(el).textDecorationLine === 'underline'));
  await h1.hover();
  ok('underline goes away again',
    await pvLink.evaluate(el => getComputedStyle(el).textDecorationLine === 'none'));
  ok('Continue is the only filled button',
    (await page.locator('.ob-wrap .btn:not(.btn-outlined)').count()) === 1);
  ok('trigger sits between the cards and the actions', await page.evaluate(() => {
    const row = document.querySelector('.pv-link-row');
    return row.previousElementSibling.classList.contains('modes') &&
           row.nextElementSibling.classList.contains('ob-actions');
  }));

  // ── 7. Modal: kit rows, padding, width, no truncation ──
  await pvLink.click();
  ok('modal opens', await modalBg.isVisible());
  ok('modal uses the kit header/body/footer rows',
    await page.locator('#pv-modal > .modal-header').isVisible() &&
    await page.locator('#pv-modal > .modal-body').isVisible() &&
    await page.locator('#pv-modal > .modal-footer').isVisible());
  const mGeo = await modal.boundingBox();
  const titleBox = await page.locator('#pv-modal-title').boundingBox();
  const firstPv = await page.locator('#pv-modal-body .pv-wrap').first().boundingBox();
  const lastPv = await page.locator('#pv-modal-body .pv-wrap').last().boundingBox();
  ok('modal is 1040px at the 1280 minimum', Math.round(mGeo.width) === 1040);
  ok('modal centred with 120px either side', Math.round(mGeo.x) === 120);
  ok('title has left padding', titleBox.x - mGeo.x >= 20);
  ok('left register has left padding', firstPv.x - mGeo.x >= 20);
  ok('right register has right padding', (mGeo.x + mGeo.width) - (lastPv.x + lastPv.width) >= 20);
  ok('modal fits the 1280×900 window', mGeo.y >= 0 && mGeo.y + mGeo.height <= 900);
  ok('no cell is truncated', await page.evaluate(() =>
    [...document.querySelectorAll('#pv-modal-body td, #pv-modal-body th')]
      .every(td => td.scrollWidth <= td.clientWidth + 1)));
  ok('figures and dates never break across lines', await page.evaluate(() =>
    [...document.querySelectorAll('#pv-modal-body .c-amt, #pv-modal-body .c-date')]
      .every(td => getComputedStyle(td).whiteSpace === 'nowrap')));
  ok('focus moves into the modal', await page.evaluate(() =>
    document.querySelector('#pv-modal').contains(document.activeElement)));
  ok('modal is a labelled dialog', await page.evaluate(() => {
    const m = document.querySelector('#pv-modal-bg');
    return m.getAttribute('role') === 'dialog' && m.getAttribute('aria-modal') === 'true' &&
           !!document.getElementById(m.getAttribute('aria-labelledby'));
  }));
  ok('close control has an accessible name',
    (await page.locator('#pv-modal .close-x').getAttribute('aria-label')) === 'Close');

  // ── 8. Modal wording (Ignat, 2026-09-25) ──
  ok('title: "Preview — how transactions are grouped"',
    norm(await page.locator('#pv-modal-title').textContent()) === 'Preview — how transactions are grouped');
  const alertText = norm(await page.locator('#pv-modal .alert.alert-info').textContent());
  ok('disclosure is a kit alert', await page.locator('#pv-modal .alert.alert-info').isVisible());
  ok('disclosure says sample, nothing synced', /Sample data\. Nothing has synced yet\./.test(alertText));
  ok('both captions read "Sample · Shopify payout, three days"', await page.evaluate(() =>
    [...document.querySelectorAll('#pv-modal-body .pv-cap')].length === 2 &&
    [...document.querySelectorAll('#pv-modal-body .pv-cap')]
      .every(c => c.textContent.trim() === 'Sample · Shopify payout, three days')));
  const modalText = norm(await modal.textContent());
  ok('no CSV mention in the preview', !/\bcsv\b/i.test(modalText));
  ok('no accounting platform named in the preview', !/quickbooks|xero|sage|netsuite/i.test(modalText));

  // ── 9. Neutral names, no accounting machinery ──
  const pairPt = page.locator('#pair-pt');
  const pairSum = page.locator('#pair-sum');
  ok('both registers visible side by side', await pairPt.isVisible() && await pairSum.isVisible() &&
    Math.abs((await pairPt.boundingBox()).y - (await pairSum.boundingBox()).y) < 40);
  ok('columns labelled Per transaction and Summary',
    norm(await pairPt.locator('h3').textContent()) === 'Per transaction' &&
    norm(await pairSum.locator('h3').textContent()) === 'Summary');
  ok('both registers have exactly Date · Transaction · Amount', await page.evaluate(() =>
    ['#pair-pt', '#pair-sum'].every(id =>
      [...document.querySelectorAll(id + ' thead th')].map(t => t.textContent.trim()).join('|') ===
      'Date|Transaction|Amount')));
  ok('both registers are kit tables',
    (await page.locator('#pv-modal-body table.table.table--sm').count()) === 2);
  ok('no platform-specific transaction types',
    !/Sales Receipt|Refund Receipt|Journal Entry|Manual Journal|Spend Money|Receive Money|Credit Note|Expense|Bank Deposit|Transfer/.test(modalText));
  ok('no accounts, debits, credits, bank or clearing lines',
    !/Debit|Credit\b|Checking|Undeposited|clearing|Payable|Income\b|Account\b/.test(modalText));
  ok('no reconciliation claims', !/reconcil|bank feed|bank deposit/i.test(modalText));

  const ptTypes = await pairPt.locator('tbody .c-entry').allTextContents();
  ok('Per register uses Sale / Refund / Fee', ptTypes.every(t => /^(Sale|Refund|Fee) · /.test(t.trim())));
  ok('Per register shows each type at least once',
    ['Sale · ', 'Refund · ', 'Fee · '].every(k => ptTypes.some(t => t.trim().startsWith(k))));
  ok('Per register shows customer names', ptTypes.some(t => /Amelia Hart/.test(t)));
  ok('Per register shows eight sample rows', ptTypes.length === 8);
  ok('Per footer: 412 entries · 404 not shown',
    norm(await pairPt.locator('.pv-foot').textContent()) === '412 entries · 404 not shown');

  const sumHead = norm(await pairSum.locator('tbody tr').first().locator('.c-entry').textContent());
  ok('Summary register leads with one "Summary entry"', sumHead === 'Summary entry · Shopify payout');
  ok('Summary lines are Sales, Shipping, Tax, Discounts and refunds, Fees', await page.evaluate(() =>
    [...document.querySelectorAll('#pair-sum tbody tr.je-line .c-entry')].map(t => t.textContent.trim())
      .join('|') === 'Sales|Shipping|Tax|Discounts and refunds|Fees'));
  const sums = await pairSum.evaluate(el => {
    const num = t => parseFloat(t.replace(/−/g, '-').replace(/,/g, ''));
    const rows = [...el.querySelectorAll('tbody tr')];
    const head = num(rows[0].querySelector('.c-amt').textContent);
    const total = rows.slice(1).reduce((a, r) => a + num(r.querySelector('.c-amt').textContent), 0);
    return { head, total };
  });
  ok('Summary lines add up to the entry total', Math.abs(sums.head - sums.total) < 0.005);
  ok('Summary entry total is 18,432.67', Math.abs(sums.head - 18432.67) < 0.005);
  ok('Summary footer: 1 entry · the same 412 orders',
    norm(await pairSum.locator('.pv-foot').textContent()) === '1 entry · the same 412 orders');
  ok('Summary note says daily grouping exists',
    norm(await pairSum.locator('.pv-note').textContent()) ===
    'This sample groups by payout. Summary can also group daily.');
  ok('Per column carries no note', (await pairPt.locator('.pv-note').count()) === 0);

  // ── 10. Close paths and liveness ──
  await page.keyboard.press('Escape');
  ok('Escape closes', !(await modalBg.isVisible()));
  await pvLink.click();
  ok('reopening shows the same pair',
    await page.locator('#pair-pt').isVisible() && await page.locator('#pair-sum').isVisible());
  await page.locator('#pv-modal .close-x').click();
  ok('✕ closes', !(await modalBg.isVisible()));
  await pvLink.click();
  await page.locator('#pv-modal .modal-footer .btn').click();
  ok('footer Close closes', !(await modalBg.isVisible()));
  ok('cards and trigger still live after closing',
    await cardPt.isVisible() && await cardSum.isVisible() && await pvLink.isVisible());
  ok('opening the preview did not change the selection', await page.locator('#mode-pt.sel').isVisible());

  // ── 11. Choosing a mode ──
  await cardSum.click();
  ok('clicking the Summary card selects it', await page.locator('#mode-sum.sel').isVisible());
  ok('the kit radio follows the card', await page.locator('#r-sum').isChecked());
  ok('Per card still visible and clickable', await cardPt.isVisible() && await page.locator('#r-pt').isVisible());
  await page.locator('#r-pt').click();
  ok('clicking the radio itself selects that card', await page.locator('#mode-pt.sel').isVisible());
  ok('only one card selected', (await page.locator('.mode.sel').count()) === 1);
  await page.locator('#r-pt').focus();
  await page.keyboard.press('ArrowDown');
  ok('arrow key moves the selection', await page.locator('#mode-sum.sel').isVisible());
  ok('radio labels are bound', await page.evaluate(() =>
    ['r-pt', 'r-sum'].every(id => !!document.querySelector(`label[for="${id}"]`))));

  // ── 12. Short window: 1280×720 ──
  const short = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await short.goto(target, { waitUntil: 'networkidle' });
  await short.locator('.pv-link').click();
  const sGeo = await short.locator('#pv-modal').boundingBox();
  ok('at 1280×720 the modal stays inside the window', sGeo.y >= 0 && sGeo.y + sGeo.height <= 720);
  ok('at 1280×720 ✕ is on screen', (await short.locator('#pv-modal .close-x').boundingBox()).y >= 0);
  ok('at 1280×720 footer Close is on screen', await short.evaluate(() =>
    document.querySelector('#pv-modal .modal-footer').getBoundingClientRect().bottom <= window.innerHeight));
  ok('at 1280×720 no cell is truncated', await short.evaluate(() =>
    [...document.querySelectorAll('#pv-modal-body td, #pv-modal-body th')]
      .every(td => td.scrollWidth <= td.clientWidth + 1)));
  await short.close();

  ok('no JavaScript errors after every interaction', jsErrors.length === 0);
  if (jsErrors.length) console.log('  JS errors:', jsErrors);

  await browser.close();
  console.log(`\nTarget: ${target}`);
  console.log(`${pass} assertions passed, ${fails.length} failed`);
  if (fails.length) { fails.forEach(f => console.log('  FAIL  ' + f)); process.exit(1); }
})();
