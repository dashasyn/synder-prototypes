/* Real-browser verification for projects/payment-application-v4/
   gsp.html (legacy .sds-* stack) hosting overlay.html (React/MUI kit) as a
   FULL-SCREEN overlay, the way Product mapping opens. Assertions cross a frame
   boundary. Asserts visibility / clickability, never state behind a closed panel.
   Carries the automated gates from validator round 1 plus this round's layout
   gates: one left edge per tier, every rule row on one line, nothing clipped. */
const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../projects/payment-application-v4/gsp.html');
let pass = 0, fail = 0;
const errors = [];
function ok(name, cond, extra) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
const ov = page => page.frameLocator('#ovf');
const saveBlocked = page => ov(page).locator('#ov-save').evaluate(el => el.getAttribute('aria-disabled') === 'true');
const readout = page => ov(page).locator('#plain-body').innerText();
async function ensureOpen(page, id) {
  const d = ov(page).locator('#' + id);
  if (!(await d.evaluate(el => el.open))) await d.locator('summary').click();
}
async function openOverlay(page) {
  await page.click('#pa-open');
  await ov(page).locator('#ov-save').waitFor();
  for (let i = 0; i < 30; i++) {
    const ready = await ov(page).locator('body')
      .evaluate(() => document.activeElement && document.activeElement.id === 'ov-close').catch(() => false);
    if (ready) return;
    await page.waitForTimeout(100);
  }
}
async function closed(page) {
  try { await page.locator('#ovh').waitFor({ state: 'hidden', timeout: 3000 }); return true; }
  catch (e) { return false; }
}
async function useCustom(page) {
  await ov(page).locator('#c-default').uncheck();
  await ov(page).locator('#c-cust').waitFor();
}
// a row is on one line when its control strip is a single control tall
const rowLines = (page, sel) => ov(page).locator(sel)
  .evaluate(el => Math.round(el.closest('.r-c').getBoundingClientRect().height));

function lum(rgb) {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) { const l1 = lum(a), l2 = lum(b); const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]; return (hi + 0.05) / (lo + 0.05); }
const parse = s => {
  const n = (s.match(/-?\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  return /^color\(/.test(s.trim()) ? n.map(v => v * 255) : n;
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(300);

  // ============================== GSP page ==================================
  ok('the legacy stack is the only stylesheet on the GSP page', await page.evaluate(() =>
    [...document.styleSheets].filter(s => s.href && /synder-(design-system|ui-kit)/.test(s.href))
      .every(s => /design-system/.test(s.href))));
  const rowTitles = await page.locator('#pane .set-t').allInnerTexts();
  ok('the prerequisite carries its real production label',
     rowTitles[0] === 'Apply payments to unpaid Invoice transactions', rowTitles[0]);
  ok('the other three live rows are present verbatim',
     rowTitles.includes('Cancel sync if there is no matching open invoice found for a payment') &&
     rowTitles.includes('Sync unpaid (open) invoices') && rowTitles.includes('Sync zero invoices'), rowTitles.join(' | '));
  await page.selectOption('#p-plan', 'starter');
  ok('Starter: the entry button is not clickable', await page.locator('#pane .pa button').isDisabled());
  ok('Starter: the gate offers a real upgrade action', await page.locator('#pane .pa a:has-text("Compare plans")').isVisible());
  await page.selectOption('#p-plan', 'pro');

  // ============================ the overlay =================================
  await openOverlay(page);
  ok('the overlay is full screen, not a centred sheet', await (async () => {
    const host = await page.locator('#ovh').boundingBox();
    return host.width >= 1400;
  })());
  ok('its content column uses the width', await ov(page).locator('.page')
     .evaluate(el => Math.round(el.getBoundingClientRect().width)) >= 1000);
  ok('the React kit is the only stylesheet inside it', await ov(page).locator('body').evaluate(() =>
    [...document.styleSheets].filter(s => s.href && /synder-(design-system|ui-kit)/.test(s.href))
      .every(s => /ui-kit/.test(s.href))));
  ok('the page behind is inert', await page.locator('.gsp').evaluate(el => el.inert === true));
  ok('focus moves into the overlay on open',
     await ov(page).locator('body').evaluate(() => document.activeElement.id) === 'ov-close');
  ok('the chrome follows Product mapping: close left, action right',
     await ov(page).locator('#ov-close').isVisible() && await ov(page).locator('#ov-save').isVisible());
  ok('the primary action is Update, as on the GSP page',
     (await ov(page).locator('#ov-save').innerText()).trim() === 'Update');

  // --- default matching carries information, unlike v3's bare toggle
  ok('default matching is on at first open', await ov(page).locator('#c-default').isChecked());
  const dflt = await ov(page).locator('.dflt').innerText();
  ok('the default card says what the default actually does, in one line',
     dflt.includes('Same customer') && dflt.includes('invoice number matches') &&
     dflt.split('\n').filter(l => l.trim()).length <= 2, JSON.stringify(dflt));
  ok('no rule rows while default is on', (await ov(page).locator('#c-cust').count()) === 0);
  ok('default on: Update is available', !(await saveBlocked(page)));
  ok('nothing user-facing says "engine"', !/\bengine\b/i.test(await ov(page).locator('body').innerText()));

  await useCustom(page);
  ok('the chip flips to Custom rules', (await ov(page).locator('#chip').innerText()).trim() === 'Custom rules');
  ok('unchecking it still states the override and the retention',
     (await ov(page).locator('.dflt').innerText()).includes('never runs here') &&
     (await ov(page).locator('.dflt').innerText()).includes('keeps your rules'));

  // --- his structure: two labelled groups in one card
  const grps = await ov(page).locator('.grp-t').allInnerTexts();
  ok('the rules are Narrow the search / Then refine',
     grps[0] === 'Narrow the search' && grps[1] === 'Then refine', grps.join(' | '));
  // the operand rule is no longer explained in a paragraph — it is enforced by
  // the control and demonstrated by the row gutters, both of which are asserted
  ok('the scope sub-line is one short line', await (async () => {
     const d = await ov(page).locator('.grp-d').first().innerText();
     return d.length < 70 && d.includes('must be true');
  })(), await ov(page).locator('.grp-d').first().innerText());
  ok('every scope row gutter shows its AND, so the join needs no paragraph',
     (await ov(page).locator('.grp').first().locator('.r-j').allInnerTexts())
       .map(s => s.trim()).join(',') === 'WHEN,AND,AND');
  ok('three scope rows, no refine rows pre-filled',
     (await ov(page).locator('.grp').first().locator('.r').count()) === 3 &&
     (await ov(page).locator('[id^="cs-"]').count()) === 0);

  // --- the alignment complaint this version exists to answer
  const edges = await ov(page).locator('body').evaluate(() => {
    const x = s => [...document.querySelectorAll(s)].map(e => Math.round(e.getBoundingClientRect().left));
    const uniq = a => [...new Set(a)];
    return {
      headings: uniq([...x('.left .grp-t'), ...x('.left .r-j')]),
      ctlTitles: uniq([...x('.left .dflt-t'), ...x('.left .o-t')]),
      rowContent: uniq(x('.left .r-c')),
      centred: [...document.querySelectorAll('.left *')]
        .filter(e => e.tagName !== 'BUTTON' && getComputedStyle(e).textAlign === 'center')
        .map(e => e.className)
    };
  });
  ok('group headings and row gutters share one left edge', edges.headings.length === 1, JSON.stringify(edges.headings));
  ok('every control-row title shares one left edge', edges.ctlTitles.length === 1, JSON.stringify(edges.ctlTitles));
  ok('every rule row shares one content edge', edges.rowContent.length === 1, JSON.stringify(edges.rowContent));
  ok('nothing in the rules column is centre-aligned', edges.centred.length === 0, edges.centred.join(', '));

  // --- checkboxes for rule rows, switches only for real product settings
  const controls = await ov(page).locator('body').evaluate(() => ({
    rowBoxes: document.querySelectorAll('.left .r-cb input[type="checkbox"]:not(.switch)').length,
    switches: document.querySelectorAll('.left input.switch').length,
    rowSwitches: document.querySelectorAll('.left .r input.switch').length
  }));
  ok('rule rows are checkboxes', controls.rowBoxes === 3, JSON.stringify(controls));
  ok('only the two outcome settings are switches', controls.switches === 2, JSON.stringify(controls));
  ok('no rule row uses a switch', controls.rowSwitches === 0);

  // --- Customer, not Customer name
  const custRow = await ov(page).locator('#n-cust').innerText();
  ok('the customer row says Customer matches the payment’s customer',
     custRow.includes('matches the payment’s customer') && !/customer name/i.test(custRow), custRow);

  ok('the scope match row offers only the 4 pushable operands (R4)',
     (await ov(page).locator('#c-mop option').count()) === 4);

  // --- the date row: greyed is fine, but it must say why
  ok('the date row is locked without the admin flag', await ov(page).locator('#c-date').isDisabled());
  ok('a locked row still reads as on', await ov(page).locator('#c-date').isChecked());
  ok('and the reason is stated next to it, not hidden in a tooltip',
     (await ov(page).locator('#date-hint').innerText()).includes('Ask Synder to enable it'));
  ok('the checkbox points at that reason', await ov(page).locator('#c-date')
     .evaluate(el => el.getAttribute('aria-describedby') === 'date-hint'));
  ok('the window is either side, never a lookback',
     (await ov(page).locator('#n-date').innerText()).includes('either side') &&
     !/look ?back/i.test(await ov(page).locator('body').innerText()));
  ok('the default is 30', (await ov(page).locator('#c-days').inputValue()) === '30');
  ok('the 21-character limit is stated as a maximum on the field',
     (await ov(page).locator('.tip').innerText()).includes('at most') &&
     (await ov(page).locator('.tip').innerText()).includes('21 characters'));

  await ov(page).locator('#c-days').focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  ok('two ArrowUps step the day count to 32', (await ov(page).locator('#c-days').inputValue()) === '32');
  ok('focus stays on the field', await ov(page).locator('body')
     .evaluate(() => document.activeElement.id) === 'c-days');
  await ov(page).locator('#c-days').fill('900');
  await ov(page).locator('#c-days').evaluate(el => el.blur());
  ok('out-of-range is clamped', (await ov(page).locator('#c-days').inputValue()) === '365');
  ok('and the clamp names the limit', (await ov(page).locator('#days-note').innerText()).includes('365'));
  await ov(page).locator('#c-days').fill('30');
  await ov(page).locator('#c-days').evaluate(el => el.blur());

  await page.check('#p-admin');
  await page.waitForTimeout(150);
  ok('admin-enabled: the date row becomes uncheckable', await ov(page).locator('#c-date').isEnabled());
  await ov(page).locator('#c-date').uncheck();
  ok('date off warns about the cost', (await ov(page).locator('.warn').first().innerText()).includes('longer list to search'));
  await ov(page).locator('#c-date').check();
  await page.uncheck('#p-admin');
  await page.waitForTimeout(150);

  // --- ONE chevron, on the first refine row, governing all of them
  await ov(page).locator('#c-add').click();
  ok('a single refine row has no combinator to choose', (await ov(page).locator('select.join').count()) === 0);
  ok('its gutter reads WHERE', (await ov(page).locator('.grp').nth(1).locator('.r-j').first().innerText()).trim() === 'WHERE');
  await ov(page).locator('#c-add').click();
  ok('two rows bring exactly one chevron', (await ov(page).locator('select.join').count()) === 1);
  ok('the chevron is on the first refine row', await ov(page).locator('body').evaluate(() => {
    const rows = [...document.querySelectorAll('.grp')][1].querySelectorAll('.r');
    return !!rows[0].querySelector('select.join') && !rows[1].querySelector('select.join');
  }));
  ok('later rows show the word statically',
     (await ov(page).locator('.grp').nth(1).locator('.r-j').nth(1).innerText()).trim() === 'AND');
  await ov(page).locator('#c-join').selectOption('OR');
  ok('switching it changes every later row',
     (await ov(page).locator('.grp').nth(1).locator('.r-j').nth(1).innerText()).trim() === 'OR');
  ok('the refine sub-line stays short', (await ov(page).locator('.grp-d').nth(1).innerText()).length < 50,
     await ov(page).locator('.grp-d').nth(1).innerText());
  await ov(page).locator('#c-add').click();
  ok('a third row still shows only one chevron', (await ov(page).locator('select.join').count()) === 1);
  ok('and the third row is joined too, never blank',
     (await ov(page).locator('.grp').nth(1).locator('.r-j').nth(2).innerText()).trim() === 'OR');
  await ov(page).locator('#c-join').selectOption('AND');
  await ov(page).locator('#cd-2').click();

  // --- no row wraps, nothing clips
  await ov(page).locator('#cs-0').selectOption('payment_meta');
  await ov(page).locator('#ck-0').fill('order_id');
  await ov(page).locator('#co-0').selectOption('nstarts');
  await ov(page).locator('#ct-0').selectOption('private_note');
  await page.waitForTimeout(200);
  ok('the scope match row stays on one line', (await rowLines(page, '#c-mop')) <= 36, 'height=' + await rowLines(page, '#c-mop'));
  ok('a full refine row stays on one line', (await rowLines(page, '#co-0')) <= 36, 'height=' + await rowLines(page, '#co-0'));
  ok('no select clips its widest option', await ov(page).locator('body').evaluate(() =>
    [...document.querySelectorAll('select')].every(s => s.scrollWidth <= s.clientWidth + 1)));
  await ov(page).locator('#co-0').selectOption('contains');
  await ov(page).locator('#cs-0').selectOption('invoice_note');

  // --- the read-out is generated, so it can never contradict the rules
  ok('the read-out sits in the right column, costing the rules no height',
     await ov(page).locator('#plain-body').evaluate(el => !!el.closest('.right')));
  let ro = await readout(page);
  ok('the read-out is scannable lines, not prose', await ov(page).locator('#plain-body')
     .evaluate(el => el.querySelectorAll('li').length >= 4));
  ok('and it is short enough to read', ro.length < 420, 'chars=' + ro.length);
  ok('it states the live day window', ro.includes('±30 days'));
  ok('it counts the refine rows it actually has', await ov(page).locator('body').evaluate(() => {
    const rows = document.querySelectorAll('.grp')[1].querySelectorAll('.r').length;
    return document.getElementById('plain-body').innerText.includes(rows + ' refine row');
  }));
  await ov(page).locator('#c-join').selectOption('OR');
  ok('changing the join changes the read-out', (await readout(page)).includes('any'));
  await ov(page).locator('#c-join').selectOption('AND');
  ok('and back', (await readout(page)).includes('all'));
  await ov(page).locator('#c-days').fill('45');
  await page.waitForTimeout(150);
  ok('changing the window changes the read-out', (await readout(page)).includes('±45 days'));
  await ov(page).locator('#c-days').fill('30');
  await page.waitForTimeout(150);
  ok('the read-out never says the payment "may" sync', !/may still sync|may sync/i.test(await readout(page)));
  ok('with cancel-sync on it says the sync is cancelled',
     (await ov(page).locator('#c-cancel').isChecked()) && (await readout(page)).includes('sync cancelled'));
  await ov(page).locator('#c-cancel').uncheck();
  await page.waitForTimeout(150);
  ok('with it off it names the Sales Receipt instead', (await readout(page)).includes('Sales Receipt'));
  ok('and GSP followed, because it is one value (R18)',
     await page.locator('#g-cancel').evaluate(el => el.getAttribute('aria-checked') === 'false'));
  await ov(page).locator('#c-cancel').check();
  await page.waitForTimeout(150);
  ok('an unsaved rule says so (R20)', (await readout(page)).includes('Nothing changes until you press Update'));
  ok('the no-fallback guarantee is stated on the mode card (R1)',
     (await ov(page).locator('.dflt').innerText()).includes('never runs here'));

  // --- inheritance automatic (A6), guard (R8), metadata key (R10)
  await ov(page).locator('#c-cust').uncheck();
  ok('customer off states the consequence, no checkbox to forget',
     (await ov(page).locator('.info').first().innerText()).includes('takes the customer from that invoice') &&
     (await ov(page).locator('#c-inherit').count()) === 0);
  ok('and it does not block Update', !(await saveBlocked(page)));
  ok('it is flagged as an assumption',
     await ov(page).locator('body').evaluate(el => /A6\b/.test(el.textContent)));
  ok('the read-out mentions the inherited customer', (await readout(page)).includes('taken from the matched invoice'));
  await ov(page).locator('#c-mop').selectOption('contains');
  ok('a loose comparison with customer off is warned about',
     (await ov(page).locator('.info').first().innerText()).includes('another customer’s invoice'));
  await ov(page).locator('#c-mop').selectOption('eq');
  await ov(page).locator('#c-match').uncheck();
  ok('both bounding rows off: Update blocked', await saveBlocked(page));
  ok('the guard copy is the FDD copy verbatim',
     (await ov(page).locator('#err-guard').innerText()).includes('Keep either Customer or the invoice-number match on'));
  await ov(page).locator('#c-match').check();
  await ov(page).locator('#c-cust').check();

  await ov(page).locator('#c-msrc').selectOption('payment_meta');
  ok('the key box appears', await ov(page).locator('#c-mkey').isVisible());
  ok('asked in the user’s words', /stripe field/i.test(await ov(page).locator('#c-mkey').getAttribute('placeholder')));
  ok('it says where to find it', (await ov(page).locator('body').innerText()).includes('open any payment'));
  ok('the known keys are offered', (await ov(page).locator('#meta-keys option').count()) > 0);
  ok('a blank field blocks Update', await saveBlocked(page));
  ok('the error is announced', await ov(page).locator('#err-scope-key').evaluate(el => el.getAttribute('role') === 'alert'));
  ok('the field points at its error', await ov(page).locator('#c-mkey').evaluate(el =>
    el.getAttribute('aria-describedby') === 'err-scope-key' && el.getAttribute('aria-invalid') === 'true'));
  ok('the bar names the first error, not just a count',
     (await ov(page).locator('#msg').innerText()).includes('Stripe field name is missing'));
  ok('and offers a jump', await ov(page).locator('#jump').isVisible());
  ok('a blocked Update keeps its tab position',
     !(await ov(page).locator('#ov-save').evaluate(el => el.hasAttribute('disabled'))));
  ok('a blocked Update is still clickable, not dead',
     await ov(page).locator('#ov-save').evaluate(el => getComputedStyle(el).pointerEvents !== 'none'));
  await ov(page).locator('#c-mkey').fill('invoices');
  ok('the typed value survives', (await ov(page).locator('#c-mkey').inputValue()) === 'invoices');
  ok('the field keeps focus', await ov(page).locator('body')
     .evaluate(() => document.activeElement.id) === 'c-mkey');
  ok('a named field unblocks Update', !(await saveBlocked(page)));
  await ov(page).locator('#c-msrc').selectOption('invoice_number');

  // --- "is empty" mutes the side nothing reads
  await ov(page).locator('#co-0').selectOption('empty');
  ok('is empty: the payment side is disabled', await ov(page).locator('#cs-0').isDisabled());
  ok('is empty: the invoice target stays editable', await ov(page).locator('#ct-0').isEnabled());
  ok('is empty: no Stripe field is demanded', !(await saveBlocked(page)));
  // scope the assertion to the row that has the operand — a later row's empty
  // error slot is also an .r-note
  ok('is empty: the row says it reads the invoice only',
     (await ov(page).locator('.grp').nth(1).locator('.r').first().innerText()).includes('Reads the invoice only'));
  ok('the row itself carries the detail, so the read-out need not repeat it',
     (await readout(page)).includes('refine row'));
  await ov(page).locator('#co-0').selectOption('contains');

  // --- outcomes (R15/R17/R19) and the copy taken from his sketch
  ok('overpayment defaults on (R19)', await ov(page).locator('#c-over').isChecked());
  ok('the shared setting names the other surface and the direction',
     (await ov(page).locator('#n-cancel').locator('xpath=..').innerText()).includes('Same setting as Get & Send Payments'));
  ok('the overpayment row says it only fires after a match',
     (await ov(page).locator('#n-over').locator('xpath=..').innerText()).includes('after'));

  // --- review aids live behind the bar
  ok('the overlay does not carry the query panel by default', (await ov(page).locator('#d-sql').count()) === 0);
  ok('and says where they went', (await ov(page).locator('#protobar').innerText()).includes('Review aids hidden'));
  await page.check('#p-aids');
  await page.waitForTimeout(150);
  await ensureOpen(page, 'd-sql');
  let sql = await ov(page).locator('pre.sql').innerText();
  ok('the query is symmetric around the payment date',
     sql.includes("TxnDate >= '2026-05-15'") && sql.includes("TxnDate <= '2026-07-14'"), sql);
  ok('the query sorts deterministically (R3)', sql.includes('ORDERBY TxnDate ASC, Id ASC'));
  ok('the query has no Balance filter (R2)', !sql.includes('Balance'));
  await ov(page).locator('#c-msrc').selectOption('invoice_note');
  ok('the literal comes from the engine’s own resolve()',
     (await ov(page).locator('pre.sql').innerText()).includes("DocNumber = 'ord-88431'"));
  await ov(page).locator('#c-msrc').selectOption('invoice_meta');
  await ov(page).locator('#c-mkey').fill('nope');
  ok('an unresolvable source drops the line entirely',
     !(await ov(page).locator('pre.sql').innerText()).includes('DocNumber'));
  ok('and says so rather than pretending', (await ov(page).locator('#sql-body').innerText()).includes('dropped entirely'));
  await ov(page).locator('#c-msrc').selectOption('invoice_number');

  // --- the FDD's worked examples
  await ensureOpen(page, 'd-sim');
  ok('the samples are a keyboard radiogroup', await ov(page).locator('#sim-list').evaluate(el =>
    [...el.querySelectorAll('.txn')].every(b => b.getAttribute('role') === 'radio' && b.hasAttribute('aria-checked'))));
  await ov(page).locator('#sim-list .txn').first().focus();
  await page.keyboard.press('ArrowDown');
  ok('arrow keys move the selection',
     await ov(page).locator('#sim-list .txn').nth(1).evaluate(el => el.getAttribute('aria-checked') === 'true'));

  await ov(page).locator('#c-match').uncheck();
  await ov(page).locator('#cs-0').selectOption('invoice_note');
  await ov(page).locator('#co-0').selectOption('eq');
  await ov(page).locator('#ct-0').selectOption('private_note');
  await ov(page).locator('#cd-1').click();
  await ov(page).locator('#sim-list .txn').nth(0).click();
  let out = await ov(page).locator('#sim-out').innerText();
  ok('example A applies to INV-1042, the older of two matches', out.includes('Applied to INV-1042'), out.slice(0, 140));
  ok('example A explains the tie-break (R26)', out.includes('tie-break'));
  await ov(page).locator('#sim-list .txn').nth(2).click();
  out = await ov(page).locator('#sim-out').innerText();
  ok('example C never falls back to first-in-list (R17)', out.includes('NOT the first invoice'), out.slice(0, 140));
  await ov(page).locator('#sim-list .txn').nth(3).click();
  await ov(page).locator('#c-match').check();
  await ov(page).locator('#c-msrc').selectOption('payment_meta');
  await ov(page).locator('#c-mkey').fill('invoices');
  out = await ov(page).locator('#sim-out').innerText();
  ok('overpayment on: applied as an overpayment', out.includes('as an overpayment'), out.slice(0, 140));
  await ov(page).locator('#c-over').uncheck();
  out = await ov(page).locator('#sim-out').innerText();
  ok('overpayment off: sync cancelled', out.includes('Sync cancelled'));
  ok('and distinguished from cancel-on-no-match', out.includes('not cancel-on-no-match'));
  await ov(page).locator('#c-over').check();
  await ov(page).locator('#cd-0').click();
  await ov(page).locator('#sim-list .txn').nth(0).click();
  out = await ov(page).locator('#sim-out').innerText();
  ok('no refine rows + candidates applies to the first (R16)', out.includes('Applied to'), out.slice(0, 140));
  await page.uncheck('#p-aids');
  await page.waitForTimeout(150);

  // --- exits ask before discarding
  await ov(page).locator('#ov-close').focus();
  await page.keyboard.press('Escape');
  ok('Escape on a dirty draft asks first', await ov(page).locator('#cfm').isVisible());
  await page.keyboard.press('Escape');
  ok('Escape dismisses the prompt, not the overlay',
     !(await ov(page).locator('#cfm').isVisible()) && await page.locator('#ovh').isVisible());
  await ov(page).locator('#c-mkey').focus();
  await page.keyboard.press('Escape');
  ok('Escape while editing a field does not close', await page.locator('#ovh').isVisible());
  await ov(page).locator('#ov-close').click();
  await ov(page).locator('#cfm-discard').click();
  ok('discard closes it', await closed(page));
  ok('the page behind is interactive again', await page.locator('.gsp').evaluate(el => el.inert === false));
  ok('focus returns to the button that opened it',
     await page.evaluate(() => document.activeElement.id) === 'pa-open');
  ok('a discarded draft configured nothing', (await page.locator('#pane .pa').innerText()).includes('Synder default'));

  // --- saving reports back
  await openOverlay(page);
  await useCustom(page);
  await ov(page).locator('#ov-save').click();
  ok('Update closes the overlay', await closed(page));
  ok('GSP shows the custom rule', (await page.locator('#pane .pa').innerText()).includes('Custom rule'));
  ok('and summarises the symmetric window', (await page.locator('#pane .pa-d').innerText()).includes('±30 days'));
  await openOverlay(page);
  ok('reopening lands on the saved rules', !(await ov(page).locator('#c-default').isChecked()));
  await page.keyboard.press('Escape');
  ok('a clean draft closes with no prompt', await closed(page));

  // --- a retained error must never trap the integration
  await openOverlay(page);
  await ov(page).locator('#c-msrc').selectOption('payment_meta');
  ok('a blank field blocks Update while the rules are on', await saveBlocked(page));
  await ov(page).locator('#c-default').check();
  ok('back on default: Update is available again', !(await saveBlocked(page)));
  await ov(page).locator('#ov-save').click();
  ok('the integration returns to the default matcher',
     (await closed(page)) && (await page.locator('#pane .pa').innerText()).includes('Synder default'));

  // --- prerequisite off: inert everywhere
  await page.uncheck('#p-apply');
  await page.waitForTimeout(150);
  await openOverlay(page);
  await useCustom(page);
  ok('the overlay states nothing runs yet', (await ov(page).locator('.warn').first().innerText()).includes('Nothing here runs yet'));
  ok('the warning carries the fix', await ov(page).locator('#c-prereq').isVisible());
  ok('the read-out switches to would', (await readout(page)).includes('Once it is on'));
  ok('the bar says it is inert', (await ov(page).locator('#msg').innerText()).includes('inert'));
  ok('the chip is not green while inert', (await ov(page).locator('#chip').innerText()).includes('inactive'));
  await ov(page).locator('#c-prereq').click();
  await page.waitForTimeout(200);
  ok('the in-overlay switch turns the prerequisite on', await page.locator('#p-apply').isChecked());
  ok('and the banner that offered it is gone', (await ov(page).locator('#c-prereq').count()) === 0);
  ok('the chip goes green once it can run', (await ov(page).locator('#chip').innerText()).trim() === 'Custom rules');

  // --- generic customer (R24)
  await page.check('#p-generic');
  await page.waitForTimeout(200);
  ok('generic customer is surfaced at configuration time',
     (await ov(page).locator('body').innerText()).includes('Generic customer is on'));
  await page.uncheck('#p-generic');
  await page.waitForTimeout(200);

  // ======================= automated gates (round 1) ========================
  await ov(page).locator('#c-add').click();
  await page.check('#p-asm');
  await page.waitForTimeout(500);

  const contrast = await ov(page).locator('body').evaluate(() => {
    const bgOf = el => {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
        n = n.parentElement;
      }
      return 'rgb(255,255,255)';
    };
    const out = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.offsetParent === null && el.tagName !== 'BODY') return;
      const t = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
      if (!t) return;
      const cs = getComputedStyle(el);
      out.push({ text: t.slice(0, 40), color: cs.color, bg: bgOf(el), size: parseFloat(cs.fontSize), weight: cs.fontWeight });
    });
    return out;
  });
  const cFail = contrast.map(c => ({ ...c, r: ratio(parse(c.color), parse(c.bg)) }))
    .filter(c => c.r < ((c.size >= 24 || (c.size >= 18.66 && Number(c.weight) >= 700)) ? 3 : 4.5));
  ok('AUTO-1: every text node meets WCAG AA', cFail.length === 0,
     cFail.slice(0, 5).map(f => `"${f.text}" ${f.r.toFixed(2)}:1`).join(' · '));

  const offGrid = await ov(page).locator('body').evaluate(() => {
    const out = [];
    document.querySelectorAll('.bar, .page, .card, .card-b, .grp, .r, .o, .err, .warn, .info, .tip, .ro').forEach(el => {
      const cs = getComputedStyle(el);
      ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].forEach(p => {
        const v = parseFloat(cs[p]);
        if (v && v % 2 !== 0) out.push(`${el.className.split(' ')[0]}.${p}=${v}`);
      });
    });
    return out;
  });
  ok('AUTO-2: paddings stay on an even scale', offGrid.length === 0, offGrid.slice(0, 8).join(', '));

  const dead = await ov(page).locator('body').evaluate(() => {
    const out = [];
    document.querySelectorAll('.left *, .right *').forEach(el => {
      if (getComputedStyle(el).cursor !== 'pointer') return;
      if (/^(BUTTON|A|SELECT|INPUT|LABEL|SUMMARY|OPTION)$/.test(el.tagName)) return;
      if (el.onclick || el.getAttribute('onclick')) return;
      if (el.closest('label,button,a,summary')) return;
      out.push((el.className || el.tagName) + ' :: ' + (el.textContent || '').trim().slice(0, 30));
    });
    return out;
  });
  ok('AUTO-3: nothing shows a pointer cursor without being operable', dead.length === 0, dead.slice(0, 6).join(' | '));

  const named = await ov(page).locator('body').evaluate(() => {
    const bad = [];
    document.querySelectorAll('.left select, .left input, .bar button, .left button').forEach(el => {
      const hasName = (el.labels && el.labels.length) || el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') || (el.tagName === 'BUTTON' && el.textContent.trim());
      if (!hasName) bad.push(el.tagName + '#' + (el.id || '?'));
    });
    return bad;
  });
  ok('AUTO-4: every control has an accessible name', named.length === 0, named.join(', '));
  ok('no span-based toggles anywhere', (await ov(page).locator('.toggle').count()) === 0);
  await page.uncheck('#p-asm');

  // ---------- layout ----------
  ok('no horizontal overflow on the GSP page',
     await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0);
  ok('no horizontal overflow in the overlay',
     await ov(page).locator('body').evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0);
  const rawHex = await ov(page).locator('body').evaluate(() =>
    ([...document.querySelectorAll('style')].map(x => x.textContent).join('\n').match(/#[0-9a-fA-F]{3,6}\b/g) || [])
      .filter(h => !/%23/.test(h)));
  ok('no raw hex colours in the overlay CSS', rawHex.length === 0, rawHex.join(' '));
  ok('the presenter bar stays reachable above the overlay', await (async () => {
    const bar = await page.locator('#pbar').boundingBox();
    const host = await page.locator('#ovh').boundingBox();
    return host.y >= bar.y + bar.height - 1;
  })());

  ok('no JS errors', errors.length === 0, errors.join(' | '));

  const dir = path.resolve(__dirname, '../projects/payment-application-v4/');
  await page.screenshot({ path: dir + '/shot-rules.png' });
  await ov(page).locator('#ov-close').click();
  if (await ov(page).locator('#cfm').isVisible()) await ov(page).locator('#cfm-discard').click();
  await closed(page);
  await page.screenshot({ path: dir + '/shot-gsp.png' });

  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
