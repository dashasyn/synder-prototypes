/* Real-browser verification for projects/payment-application-v3/
   gsp.html (legacy .sds-* stack) hosting overlay.html (React/MUI kit) as a
   centred sheet in a transparent iframe, so assertions cross a frame boundary.
   Asserts visibility / clickability, never element state behind a closed panel.
   Carries the four automated gates from validator round 1. */
const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../projects/payment-application-v3/gsp.html');
let pass = 0, fail = 0;
const errors = [];
function ok(name, cond, extra) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
const ov = page => page.frameLocator('#ovf');
const saveBlocked = page => ov(page).locator('#ov-save').evaluate(el => el.getAttribute('aria-disabled') === 'true');
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
  await ov(page).locator('#c-on').check();
  await ov(page).locator('#c-cust').waitFor();
}

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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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
  ok('the entry block sits directly under its prerequisite', await page.evaluate(() => {
    const kids = [...document.getElementById('pane').children];
    return kids[0].classList.contains('set') && kids[1].classList.contains('pa');
  }));
  ok('assumptions start hidden', !(await page.locator('.asm').first().isVisible()));
  await page.check('#p-asm');
  ok('the bar can show them', await page.locator('.asm').first().isVisible());
  await page.uncheck('#p-asm');

  // plan gate
  await page.selectOption('#p-plan', 'starter');
  ok('Starter: the button is not clickable', await page.locator('#pane .pa button').isDisabled());
  ok('Starter: the gate offers a real upgrade action', await page.locator('#pane .pa a:has-text("Compare plans")').isVisible());
  await page.selectOption('#p-plan', 'pro');

  // ============================ the sheet ===================================
  await openOverlay(page);
  ok('the sheet opens over a scrim', await page.locator('#ovh').isVisible());
  ok('the React kit is the only stylesheet inside it', await ov(page).locator('body').evaluate(() =>
    [...document.styleSheets].filter(s => s.href && /synder-(design-system|ui-kit)/.test(s.href))
      .every(s => /ui-kit/.test(s.href))));
  ok('the page behind is inert', await page.locator('.gsp').evaluate(el => el.inert === true));
  ok('focus moves into the sheet on open',
     await ov(page).locator('body').evaluate(() => document.activeElement.id) === 'ov-close');

  // --- the size complaint this version exists to answer
  const sheet = await ov(page).locator('#sheet').evaluate(el => Math.round(el.getBoundingClientRect().width));
  ok('the sheet is a centred dialog, not a full-bleed page', sheet <= 820 && sheet >= 700, 'width=' + sheet);
  const offH = await ov(page).locator('#body').evaluate(el => el.scrollHeight);
  ok('the default state is short', offH < 320, 'content=' + offH + 'px');

  // --- default state: reference, retention, nothing pre-filled
  ok('the custom rule starts off', !(await ov(page).locator('#c-on').isChecked()));
  ok('the default matcher is labelled as non-editable reference',
     (await ov(page).locator('.lbl').first().innerText()).toLowerCase().includes('reference, not editable'));
  ok('no rule rows exist while it is off', (await ov(page).locator('#c-cust').count()) === 0);
  ok('retention is stated in five words, not a paragraph',
     (await ov(page).locator('#plain-body').innerText()).includes('stays on file'));
  ok('off state: Save is available', !(await saveBlocked(page)));
  ok('nothing user-facing says "engine"', !/\bengine\b/i.test(await ov(page).locator('#sheet').innerText()));

  await useCustom(page);
  ok('the chip flips to Custom rule', (await ov(page).locator('#chip').innerText()).trim() === 'Custom rule');
  ok('the override with no fallback is stated on the master row',
     (await ov(page).locator('#n-on').locator('xpath=..').innerText()).includes('never runs'));

  // --- his layout: small-caps section labels and AND dividers
  const labels = (await ov(page).locator('.lbl').allInnerTexts()).map(s => s.toLowerCase());
  ok('scope / conditions / application are section labels, not cards',
     labels.some(l => l.startsWith('scope')) && labels.includes('conditions') && labels.includes('application'), labels.join(' | '));
  ok('the scope label states the join', labels.find(l => l.startsWith('scope')).includes('all of these'));
  ok('AND dividers sit between the scope rows', (await ov(page).locator('.join').count()) === 2);
  ok('three scope rows, nothing pre-filled beyond them',
     (await ov(page).locator('.card').first().locator('.r').count()) === 3 &&
     (await ov(page).locator('[id^="cs-"]').count()) === 0);
  ok('an unsaved starting rule says so (R20)',
     (await ov(page).locator('#plain-body').innerText()).includes('Nothing changes until you press Save'));
  const onH = await ov(page).locator('#body').evaluate(el => el.scrollHeight);
  ok('the whole rule fits a 1080p screen without scrolling', onH < 1060, 'content=' + onH + 'px');

  // --- Customer, not Customer name (his answer 3)
  ok('the customer row says customer, not customer name',
     (await ov(page).locator('#n-cust').locator('xpath=..').innerText()).includes('payment’s customer') &&
     !/customer name/i.test(await ov(page).locator('#n-cust').locator('xpath=..').innerText()));

  // --- inheritance is automatic (A6), so no opt-in and no blocking error
  await ov(page).locator('#c-cust').uncheck();
  ok('customer off states the consequence instead of asking for a tick',
     (await ov(page).locator('.info').first().innerText()).includes('takes the customer from that invoice'));
  ok('there is no inheritance checkbox to forget', (await ov(page).locator('#c-inherit').count()) === 0);
  ok('and no blocking error for it', !(await saveBlocked(page)));
  ok('it is flagged as an assumption, not smuggled in',
     await ov(page).locator('body').evaluate(el => /A6\b/.test(el.textContent)));
  await ov(page).locator('#c-mop').selectOption('contains');
  ok('a loose comparison with customer off is warned about',
     (await ov(page).locator('.info').first().innerText()).includes('can match another customer’s invoice'));
  await ov(page).locator('#c-mop').selectOption('eq');
  await ov(page).locator('#c-cust').check();

  // --- the date window is symmetric, admin-locked, and states its range
  ok('the date row is a window either side, not a lookback',
     (await ov(page).locator('#c-days').locator('xpath=..').innerText()).includes('either side'));
  ok('and never says "look back"', !/look ?back/i.test(await ov(page).locator('#sheet').innerText()));
  ok('the default is 30', (await ov(page).locator('#c-days').inputValue()) === '30');
  ok('the window preview is derived', (await ov(page).locator('#d-win').innerText()).includes('2026-05-15'));
  ok('the date row cannot be unchecked without the admin flag', await ov(page).locator('#c-date').isDisabled());
  ok('a locked row still reads as on', await ov(page).locator('#c-date').isChecked());
  ok('and it says who can lift it', (await ov(page).locator('#date-hint').innerText()).includes('Ask Synder to enable it'));

  await ov(page).locator('#c-days').focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  ok('two ArrowUps step the day count to 32', (await ov(page).locator('#c-days').inputValue()) === '32');
  ok('focus stays on the field after stepping',
     await ov(page).locator('body').evaluate(() => document.activeElement.id) === 'c-days');
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
  ok('date off removes the day field', (await ov(page).locator('#c-days').count()) === 0);
  ok('date off warns about the cost', (await ov(page).locator('.warn').first().innerText()).includes('longer list to search'));
  await ov(page).locator('#c-date').check();
  await page.uncheck('#p-admin');
  await page.waitForTimeout(150);

  // --- operand split (R4/R5) and the 21-character maximum (R13)
  ok('the built-in match row offers only the 4 pushable operands',
     (await ov(page).locator('#c-mop option').count()) === 4);
  ok('the DocNumber limit is stated as a maximum', await (async () => {
    const t = await ov(page).locator('#sheet').innerText();
    return t.includes('at most 21 characters') && !/holds 21 characters/.test(t);
  })());
  await ov(page).locator('#c-add').click();
  ok('an added condition offers all 10 operands', (await ov(page).locator('#co-0 option').count()) === 10);
  ok('an added condition can target the statement memo', (await ov(page).locator('#ct-0 option').count()) === 2);
  ok('one condition needs no AND/OR control', (await ov(page).locator('#c-and').count()) === 0);
  await ov(page).locator('#c-add').click();
  ok('a second condition brings the AND/OR control (R12)', await ov(page).locator('#c-and').isVisible());
  ok('the second row shows the join word', (await ov(page).locator('.cr-j').nth(1).innerText()).trim() === 'AND');
  await ov(page).locator('#c-or').click();
  ok('switching to OR updates the row', (await ov(page).locator('.cr-j').nth(1).innerText()).trim() === 'OR');
  ok('plain terms follows the join', (await ov(page).locator('#plain-body').innerText()).includes('at least one'));
  await ov(page).locator('#c-and').click();
  await ov(page).locator('#cd-1').click();
  ok('a condition can be removed', (await ov(page).locator('[id^="cs-"]').count()) === 1);

  // --- "is empty" mutes the side nothing reads
  await ov(page).locator('#cs-0').selectOption('payment_meta');
  // measure the control row itself: one line is 32px tall, two lines is ~72
  await ov(page).locator('#ck-0').fill('order_id');
  const crH = await ov(page).locator('.cr-c').first().evaluate(el => Math.round(el.getBoundingClientRect().height));
  ok('a condition row with a Stripe-field box stays on one line', crH <= 40, 'controls=' + crH + 'px');
  ok('no select clips its widest option', await ov(page).locator('body').evaluate(() =>
    [...document.querySelectorAll('#body select')].every(s => s.scrollWidth <= s.clientWidth + 1)));
  await ov(page).locator('#co-0').selectOption('empty');
  ok('is empty: the payment side is disabled', await ov(page).locator('#cs-0').isDisabled());
  ok('is empty: the invoice target stays editable', await ov(page).locator('#ct-0').isEnabled());
  ok('is empty: no Stripe field name is demanded', !(await saveBlocked(page)));
  ok('is empty: the row says it reads the invoice only',
     (await ov(page).locator('.cr-note').last().innerText()).includes('Reads the invoice only'));
  await ov(page).locator('#co-0').selectOption('eq');
  await ov(page).locator('#cs-0').selectOption('invoice_note');

  // --- the metadata key in the user's vocabulary, announced and jumpable
  await ov(page).locator('#c-msrc').selectOption('payment_meta');
  ok('the key box appears', await ov(page).locator('#c-mkey').isVisible());
  ok('it asks in the user’s words',
     /stripe field/i.test(await ov(page).locator('#c-mkey').getAttribute('placeholder')));
  ok('it says where to find it', (await ov(page).locator('#sheet').innerText()).includes('open any payment'));
  ok('the known keys are offered', (await ov(page).locator('#meta-keys option').count()) > 0);
  ok('a blank field blocks Save', await saveBlocked(page));
  ok('the error is announced', await ov(page).locator('#err-scope-key').evaluate(el => el.getAttribute('role') === 'alert'));
  ok('the field points at its error', await ov(page).locator('#c-mkey').evaluate(el =>
    el.getAttribute('aria-describedby') === 'err-scope-key' && el.getAttribute('aria-invalid') === 'true'));
  ok('the footer names the first error, not just a count',
     (await ov(page).locator('#msg').innerText()).includes('Stripe field name is missing'));
  ok('and offers a jump', await ov(page).locator('#jump').isVisible());
  ok('a blocked Save keeps its tab position',
     !(await ov(page).locator('#ov-save').evaluate(el => el.hasAttribute('disabled'))));
  ok('a blocked Save is still clickable, not dead',
     await ov(page).locator('#ov-save').evaluate(el => getComputedStyle(el).pointerEvents !== 'none'));
  await ov(page).locator('#c-mkey').fill('invoices');
  ok('the typed value survives', (await ov(page).locator('#c-mkey').inputValue()) === 'invoices');
  ok('the field keeps focus while typing',
     await ov(page).locator('body').evaluate(() => document.activeElement.id) === 'c-mkey');
  ok('a named field unblocks Save', !(await saveBlocked(page)));

  // --- scope validity guard (R8)
  await ov(page).locator('#c-cust').uncheck();
  await ov(page).locator('#c-match').uncheck();
  ok('both bounding rows off: Save blocked', await saveBlocked(page));
  ok('the guard copy is the FDD copy verbatim',
     (await ov(page).locator('#err-guard').innerText()).includes('Keep either Customer or the invoice-number match on'));
  await ov(page).locator('#c-match').check();
  await ov(page).locator('#c-cust').check();
  ok('Save is available again', !(await saveBlocked(page)));

  // --- review aids live behind the bar, not in the sheet
  ok('the sheet does not carry the query panel by default', (await ov(page).locator('#d-sql').count()) === 0);
  ok('and says where they went', (await ov(page).locator('#protobar').innerText()).includes('Review aids hidden'));
  await page.check('#p-aids');
  await page.waitForTimeout(150);
  ok('the bar reveals them', await ov(page).locator('#d-sql').isVisible());

  // --- the query derives its literal from the engine's own resolve()
  await ensureOpen(page, 'd-sql');
  let sql = await ov(page).locator('pre.sql').innerText();
  ok('payment metadata resolves to the sample value', sql.includes("DocNumber = 'inv-1042'"), sql);
  await ov(page).locator('#c-msrc').selectOption('invoice_note');
  sql = await ov(page).locator('pre.sql').innerText();
  ok('a different source resolves differently', sql.includes("DocNumber = 'ord-88431'"), sql);
  await ov(page).locator('#c-msrc').selectOption('invoice_meta');
  await ov(page).locator('#c-mkey').fill('nope');
  ok('an unresolvable source drops the line entirely',
     !(await ov(page).locator('pre.sql').innerText()).includes('DocNumber'));
  ok('and says so rather than pretending', (await ov(page).locator('#sql-body').innerText()).includes('dropped entirely'));
  await ov(page).locator('#c-msrc').selectOption('invoice_number');
  sql = await ov(page).locator('pre.sql').innerText();
  ok('the window is symmetric in the query',
     sql.includes("TxnDate >= '2026-05-15'") && sql.includes("TxnDate <= '2026-07-14'"), sql);
  ok('the query sorts deterministically (R3)', sql.includes('ORDERBY TxnDate ASC, Id ASC'));
  ok('the query has no Balance filter (R2)', !sql.includes('Balance'));
  ok('and the panel says any balance qualifies',
     (await ov(page).locator('#sql-body').innerText()).includes('nothing left owing can still be a candidate'));

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
  await ov(page).locator('#sim-list .txn').nth(0).click();
  let out = await ov(page).locator('#sim-out').innerText();
  ok('example A applies to INV-1042, the older of two matches', out.includes('Applied to INV-1042'), out.slice(0, 140));
  ok('example A explains the tie-break (R26)', out.includes('tie-break'));

  await ov(page).locator('#sim-list .txn').nth(2).click();
  out = await ov(page).locator('#sim-out').innerText();
  ok('example C never falls back to first-in-list (R17)', out.includes('NOT the first invoice'), out.slice(0, 140));
  ok('example C with cancel-sync on: cancelled', out.includes('Sync cancelled'));
  await ov(page).locator('#c-cancel').uncheck();
  await page.waitForTimeout(120);
  out = await ov(page).locator('#sim-out').innerText();
  ok('example C with cancel-sync off: processed as usual', out.includes('Processed as usual'));
  ok('and it names the Sales Receipt', out.includes('Sales Receipt'));
  await ov(page).locator('#c-cancel').check();
  await page.waitForTimeout(120);

  await ov(page).locator('#c-match').check();
  await ov(page).locator('#c-msrc').selectOption('payment_meta');
  await ov(page).locator('#c-mkey').fill('invoices');
  await ov(page).locator('#sim-list .txn').nth(1).click();
  out = await ov(page).locator('#sim-out').innerText();
  ok('example B does not apply to TW-5510', !out.includes('Applied to TW-5510'));
  ok('example B skips the invoice-sourced condition (R14)', out.includes('not applicable'));

  await ov(page).locator('#sim-list .txn').nth(3).click();
  out = await ov(page).locator('#sim-out').innerText();
  ok('overpayment on: applied as an overpayment', out.includes('as an overpayment'));
  await ov(page).locator('#c-over').uncheck();
  out = await ov(page).locator('#sim-out').innerText();
  ok('overpayment off: sync cancelled', out.includes('Sync cancelled'));
  ok('and distinguished from cancel-on-no-match', out.includes('not cancel-on-no-match'));
  await ov(page).locator('#c-over').check();

  await ov(page).locator('#cd-0').click();
  await ov(page).locator('#sim-list .txn').nth(0).click();
  out = await ov(page).locator('#sim-out').innerText();
  ok('no conditions + candidates applies to the first (R16)', out.includes('Applied to'), out.slice(0, 140));
  await page.uncheck('#p-aids');
  await page.waitForTimeout(150);

  // --- outcomes: distinct, and the copy taken from his sketch
  ok('overpayment defaults on (R19)', await ov(page).locator('#c-over').isChecked());
  ok('the shared setting names the other surface and the direction',
     (await ov(page).locator('#n-cancel').locator('xpath=..').innerText()).includes('Same setting as Get & Send Payments'));

  // --- cancel-sync is ONE value across the frame (R18)
  ok('the sheet inherited the GSP value', await ov(page).locator('#c-cancel').isChecked());
  await ov(page).locator('#c-cancel').uncheck();
  await page.waitForTimeout(150);
  ok('changing it here lands on GSP with no Save',
     await page.locator('#g-cancel').evaluate(el => el.getAttribute('aria-checked') === 'false'));

  // --- exits ask; the scrim never discards silently
  await page.keyboard.press('Escape');
  ok('Escape on a dirty draft asks first', await ov(page).locator('#cfm').isVisible());
  await page.keyboard.press('Escape');
  ok('Escape dismisses the prompt, not the sheet',
     !(await ov(page).locator('#cfm').isVisible()) && await page.locator('#ovh').isVisible());
  await ov(page).locator('#c-mkey').focus();
  await page.keyboard.press('Escape');
  ok('Escape while editing a field does not close', await page.locator('#ovh').isVisible());
  ok('and does not raise the prompt', !(await ov(page).locator('#cfm').isVisible()));
  // click the scrim, outside the sheet
  await ov(page).locator('body').click({ position: { x: 20, y: 400 } });
  ok('clicking the scrim asks instead of discarding', await ov(page).locator('#cfm').isVisible());
  await ov(page).locator('#cfm-discard').click();
  ok('discard closes the sheet', await closed(page));
  ok('the page behind is interactive again', await page.locator('.gsp').evaluate(el => el.inert === false));
  ok('focus returns to the button that opened it',
     await page.evaluate(() => document.activeElement.id) === 'pa-open');
  ok('a discarded draft configured nothing', (await page.locator('#pane .pa').innerText()).includes('Synder default'));
  ok('but the shared value survived — it was never a draft',
     await page.locator('#g-cancel').evaluate(el => el.getAttribute('aria-checked') === 'false'));
  await page.click('#g-cancel');

  // --- saving reports back
  await openOverlay(page);
  ok('the sheet inherits the GSP value back', await ov(page).locator('#c-on').isChecked() === false);
  await useCustom(page);
  await ov(page).locator('#ov-save').click();
  ok('Save closes the sheet', await closed(page));
  ok('GSP shows the custom rule', (await page.locator('#pane .pa').innerText()).includes('Custom rule'));
  ok('GSP summarises what it now does', (await page.locator('#pane .pa-d').innerText()).includes('same customer'));
  ok('and the summary states the symmetric window', (await page.locator('#pane .pa-d').innerText()).includes('±30 days'));

  await openOverlay(page);
  ok('reopening lands on the saved rule', await ov(page).locator('#c-on').isChecked());
  await page.keyboard.press('Escape');
  ok('a clean draft closes with no prompt', await closed(page));

  // --- a retained error must never trap the integration on a custom rule
  await openOverlay(page);
  await ov(page).locator('#c-msrc').selectOption('payment_meta');
  ok('a blank field blocks Save while the rule is on', await saveBlocked(page));
  await ov(page).locator('#c-on').uncheck();
  ok('rule off: Save is available again', !(await saveBlocked(page)));
  ok('and the footer stops demanding a fix', !(await ov(page).locator('#msg').innerText()).includes('to fix'));
  await ov(page).locator('#ov-save').click();
  ok('saving an off rule closes the sheet', await closed(page));
  ok('the integration returns to the default matcher',
     (await page.locator('#pane .pa').innerText()).includes('Synder default'));

  // --- prerequisite off: inert everywhere
  await page.uncheck('#p-apply');
  await page.waitForTimeout(150);
  ok('GSP warns the prerequisite is off', (await page.locator('#pane .pa-warn').innerText()).includes('first'));
  await openOverlay(page);
  await useCustom(page);
  ok('the sheet states nothing runs yet', (await ov(page).locator('.warn').first().innerText()).includes('Nothing here runs yet'));
  ok('the warning carries the fix', await ov(page).locator('#c-prereq').isVisible());
  ok('plain terms switches to would', (await ov(page).locator('#plain-body').innerText()).includes('Once it is on'));
  ok('the footer says it is inert', (await ov(page).locator('#msg').innerText()).includes('inert'));
  ok('the chip is not green while inert', (await ov(page).locator('#chip').innerText()).includes('inactive'));
  await page.check('#p-aids');
  await page.waitForTimeout(150);
  await ensureOpen(page, 'd-sim');
  out = await ov(page).locator('#sim-out').innerText();
  ok('the simulator refuses to report success while inert',
     out.includes('Nothing runs') && !out.includes('Applied to'), out.slice(0, 140));
  ok('the query panel says would', (await ov(page).locator('#d-sql summary').innerText()).includes('would ask'));
  await page.uncheck('#p-aids');
  await page.waitForTimeout(150);
  await ov(page).locator('#c-prereq').click();
  await page.waitForTimeout(200);
  ok('the in-sheet switch turns the prerequisite on', await page.locator('#p-apply').isChecked());
  ok('and the banner that offered it is gone', (await ov(page).locator('#c-prereq').count()) === 0);
  ok('the chip goes green once it can run', (await ov(page).locator('#chip').innerText()).trim() === 'Custom rule');
  await ov(page).locator('#ov-save').click();
  await closed(page);

  // --- generic customer (R24)
  await page.check('#p-generic');
  await page.waitForTimeout(150);
  await openOverlay(page);
  ok('generic customer is surfaced at configuration time',
     (await ov(page).locator('#sheet').innerText()).includes('Generic customer is on') ||
     (await ov(page).locator('#sheet').innerText()).includes('generic customer'), 'not surfaced');
  await page.uncheck('#p-generic');
  await page.waitForTimeout(150);

  // ======================= automated gates (round 1) ========================
  await ov(page).locator('#c-add').click();
  await page.check('#p-asm');
  await page.waitForTimeout(500);   // let transitions settle before measuring colour

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
  ok('AUTO-1: every text node in the sheet meets WCAG AA', cFail.length === 0,
     cFail.slice(0, 5).map(f => `"${f.text}" ${f.r.toFixed(2)}:1`).join(' · '));

  const offGrid = await ov(page).locator('body').evaluate(() => {
    const out = [];
    document.querySelectorAll('.head, .body, .foot, .card, .r, .o, .cr, .err, .warn, .info, .ref, .plain, .out, .txn').forEach(el => {
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
    document.querySelectorAll('#body *').forEach(el => {
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
    document.querySelectorAll('#body select, #body input, #sheet button').forEach(el => {
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
  ok('no horizontal overflow inside the sheet',
     await ov(page).locator('body').evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0);
  const rawHex = await ov(page).locator('body').evaluate(() =>
    ([...document.querySelectorAll('style')].map(x => x.textContent).join('\n').match(/#[0-9a-fA-F]{3,6}\b/g) || [])
      .filter(h => !/%23/.test(h)));
  ok('no raw hex colours in the sheet CSS', rawHex.length === 0, rawHex.join(' '));
  ok('the presenter bar stays reachable above the scrim', await (async () => {
    const bar = await page.locator('#pbar').boundingBox();
    const host = await page.locator('#ovh').boundingBox();
    return host.y >= bar.y + bar.height - 1;
  })());

  ok('no JS errors', errors.length === 0, errors.join(' | '));

  const dir = path.resolve(__dirname, '../projects/payment-application-v3/');
  await page.screenshot({ path: dir + '/shot-rule.png' });
  await ov(page).locator('#ov-close').click();
  if (await ov(page).locator('#cfm').isVisible()) await ov(page).locator('#cfm-discard').click();
  await closed(page);
  await page.screenshot({ path: dir + '/shot-gsp.png' });

  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
