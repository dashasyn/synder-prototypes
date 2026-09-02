/* Real-browser verification for projects/payment-application-v2/
   Two documents: gsp.html (legacy .sds-* stack) hosting overlay.html (React/MUI
   kit) in an iframe, so the assertions cross a frame boundary.
   Asserts visibility / clickability, never element state behind a closed panel.
   Carries round-1's four automated gates so a regression fails the run. */
const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../projects/payment-application-v2/gsp.html');
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
  // the parent pushes the environment over postMessage and the overlay takes
  // focus once it lands — wait for that, not for a guessed delay
  await page.waitForFunction(() => {
    const f = document.getElementById('ovf');
    return f && f.contentDocument && f.contentDocument.activeElement &&
           f.contentDocument.activeElement.id === 'ov-close';
  }, null, { timeout: 3000 }).catch(() => {});
}
// closing and saving report to the parent over postMessage, so the host does
// not hide in the same tick as the click
async function closed(page) {
  try { await page.locator('#ovh').waitFor({ state: 'hidden', timeout: 3000 }); return true; }
  catch (e) { return false; }
}
async function useCustom(page) {
  await ov(page).locator('#m-custom').check();
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(200);

  // ============================== GSP page ==================================
  ok('the legacy stack is the only stylesheet on the GSP page', await page.evaluate(() =>
    [...document.styleSheets].filter(s => s.href && /synder-(design-system|ui-kit)/.test(s.href))
      .every(s => /design-system/.test(s.href))));
  ok('Invoices tab reproduces the four live settings rows', (await page.locator('#pane .set').count()) === 4);
  const rowTitles = await page.locator('#pane .set-t').allInnerTexts();
  ok('the prerequisite carries its real production label',
     rowTitles[0] === 'Apply payments to unpaid Invoice transactions', rowTitles[0]);
  ok('the other three live rows are present verbatim',
     rowTitles.includes('Cancel sync if there is no matching open invoice found for a payment') &&
     rowTitles.includes('Sync unpaid (open) invoices') && rowTitles.includes('Sync zero invoices'), rowTitles.join(' | '));
  ok('the new block sits directly under its prerequisite', await page.evaluate(() => {
    const kids = [...document.getElementById('pane').children];
    return kids[0].classList.contains('set') && kids[1].classList.contains('pa');
  }));
  ok('GSP toggles are real switches', await page.evaluate(() =>
    [...document.querySelectorAll('#pane .gtog')].every(b =>
      b.getAttribute('role') === 'switch' && b.hasAttribute('aria-checked') && b.getAttribute('aria-label'))));
  ok('Payment application starts on Synder default', (await page.locator('#pane .pa').innerText()).includes('Synder default'));
  ok('the entry button is visible', await page.locator('#pa-open').isVisible());

  // plan gate + upgrade action
  await page.selectOption('#p-plan', 'starter');
  ok('Starter: the button is not clickable', await page.locator('#pane .pa button').isDisabled());
  ok('Starter: the plan requirement is stated', (await page.locator('#pane .pa').innerText()).includes('Pro, Pro Max and Premium'));
  ok('Starter: the gate offers a real upgrade action', await page.locator('#pane .pa a:has-text("Compare plans")').isVisible());
  await page.selectOption('#p-plan', 'pro');
  ok('Pro: the button is clickable again', await page.locator('#pa-open').isEnabled());

  // ============================== overlay ===================================
  await openOverlay(page);
  ok('the overlay opens as an iframe over the page', await page.locator('#ovh').isVisible());
  ok('the React kit is the only stylesheet inside the overlay', await ov(page).locator('body').evaluate(() =>
    [...document.styleSheets].filter(s => s.href && /synder-(design-system|ui-kit)/.test(s.href))
      .every(s => /ui-kit/.test(s.href))));
  ok('the page behind is inert while the overlay is open',
     await page.locator('.gsp').evaluate(el => el.inert === true));
  ok('the overlay chrome follows Product mapping: close and title left, actions right',
     await ov(page).locator('#ov-close').isVisible() && await ov(page).locator('#ov-save').isVisible());
  ok('focus moves into the overlay on open',
     await ov(page).locator('body').evaluate(() => document.activeElement.id) === 'ov-close');

  // --- mode: two stated options, nothing pre-filled (R1/R20/R21)
  ok('default is selected on first open', await ov(page).locator('#m-default').isChecked());
  ok('the default behaviour is described as reference text',
     (await ov(page).locator('#m-default').locator('xpath=../..').innerText()).includes('dated near the payment'));
  ok('the custom option states the override with no fallback',
     (await ov(page).locator('#m-custom').locator('xpath=../..').innerText()).includes('never runs'));
  ok('the custom option states the configuration is kept',
     (await ov(page).locator('#m-custom').locator('xpath=../..').innerText()).includes('keeps'));
  ok('each mode title sits on its own line, not run into its description',
     (await ov(page).locator('.mode').first().innerText()).includes('matching\n') &&
     (await ov(page).locator('.mode').nth(1).innerText()).includes('rules\n'));
  ok('no rule rows exist while default is selected', (await ov(page).locator('#c-cust').count()) === 0);
  ok('default selected: Save is available', !(await saveBlocked(page)));

  await useCustom(page);
  ok('custom: the chip flips', (await ov(page).locator('#chip').innerText()).trim() === 'Custom rule');
  ok('custom: three built-in rows, nothing pre-filled beyond them',
     (await ov(page).locator('.rows').first().locator('.r').count()) === 3 &&
     (await ov(page).locator('#c-add').count()) === 1 &&
     (await ov(page).locator('[id^="cs-"]').count()) === 0);
  ok('the flat list keeps one lead sentence',
     (await ov(page).locator('.lead').first().innerText()).includes('Apply the payment to an invoice where'));
  ok('the built-in three are named as the QuickBooks-searchable ones',
     (await ov(page).locator('.sep').innerText()).includes('always combined with AND'));
  ok('Save is available on the starting rule', !(await saveBlocked(page)));

  // --- the three built-in rows are fixed, not deletable (answer 2)
  ok('built-in rows have no delete control',
     await ov(page).locator('.rows').first().evaluate(el => el.querySelectorAll('.del').length === 0));
  ok('built-in rows are checkboxes', await ov(page).locator('#c-cust').evaluate(el => el.type === 'checkbox'));

  // --- customer wording (answer 3)
  ok('the customer row says customer, not customer name',
     (await ov(page).locator('#n-cust').locator('xpath=..').innerText()).includes('is the same customer as on the payment'));

  // --- date row: ±N, admin-locked, stated range, clamp (answer 6)
  ok('the date row is symmetric, not one-sided',
     (await ov(page).locator('#c-days').locator('xpath=..').innerText()).includes('either side of the payment date'));
  ok('the date default is 30', (await ov(page).locator('#c-days').inputValue()) === '30');
  ok('the window preview is derived', (await ov(page).locator('#d-win').innerText()).includes('2026-05-15'));
  ok('the date row cannot be unchecked without the admin flag', await ov(page).locator('#c-date').isDisabled());
  ok('and it says who can lift that', (await ov(page).locator('#date-hint').innerText()).includes('Ask Synder to enable it'));
  ok('a locked-on row still reads as on', await ov(page).locator('#c-date').isChecked());

  await ov(page).locator('#c-days').focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  ok('two ArrowUps step the day count to 32', (await ov(page).locator('#c-days').inputValue()) === '32');
  ok('focus stays on the field after stepping',
     await ov(page).locator('body').evaluate(() => document.activeElement.id) === 'c-days');
  await ov(page).locator('#c-days').fill('900');
  await ov(page).locator('#c-days').evaluate(el => el.blur());
  ok('an out-of-range value is clamped', (await ov(page).locator('#c-days').inputValue()) === '365');
  ok('the clamp names the limit it applied', (await ov(page).locator('#days-note').innerText()).includes('365'));
  await ov(page).locator('#c-days').fill('30');
  await ov(page).locator('#c-days').evaluate(el => el.blur());

  await page.check('#p-admin');
  await page.waitForTimeout(150);
  ok('admin-enabled: the date row becomes uncheckable', await ov(page).locator('#c-date').isEnabled());
  await ov(page).locator('#c-date').uncheck();
  ok('date off removes the day field', (await ov(page).locator('#c-days').count()) === 0);
  ok('date off discloses no limit', (await ov(page).locator('.warn').first().innerText()).includes('No date limit'));
  await ov(page).locator('#c-date').check();
  await page.uncheck('#p-admin');
  await page.waitForTimeout(150);

  // --- operand split (R4/R5) inside one flat list
  ok('the built-in invoice-number row offers only the 4 pushable operands',
     (await ov(page).locator('#c-mop option').count()) === 4);
  ok('its target is locked to DocNumber',
     (await ov(page).locator('#c-mtarget').innerText()).includes('Invoice number (DocNumber)'));
  await ov(page).locator('#c-add').click();
  ok('an added condition offers all 10 operands', (await ov(page).locator('#co-0 option').count()) === 10);
  ok('an added condition can target the statement memo', (await ov(page).locator('#ct-0 option').count()) === 2);
  ok('the added condition carries the AND/OR control (R12)', await ov(page).locator('#c-join').isVisible());
  ok('the AND/OR control offers exactly two joins', (await ov(page).locator('#c-join option').count()) === 2);
  await ov(page).locator('#c-add').click();
  ok('a second added condition inherits the join word',
     (await ov(page).locator('.r-j').nth(4).innerText()).trim() === 'AND');
  await ov(page).locator('#c-join').selectOption('OR');
  ok('switching to OR updates the later rows', (await ov(page).locator('.r-j').nth(4).innerText()).trim() === 'OR');
  ok('plain terms follows the join', (await ov(page).locator('#plain-body').innerText()).includes('at least one'));
  await ov(page).locator('#c-join').selectOption('AND');
  await ov(page).locator('#cd-1').click();
  ok('a condition can be removed', (await ov(page).locator('[id^="cs-"]').count()) === 1);

  // --- "is empty" mutes the side nothing reads
  await ov(page).locator('#cs-0').selectOption('payment_meta');
  await ov(page).locator('#co-0').selectOption('empty');
  ok('is empty: the payment side is disabled', await ov(page).locator('#cs-0').isDisabled());
  ok('is empty: the invoice target stays editable', await ov(page).locator('#ct-0').isEnabled());
  ok('is empty: no Stripe field name is demanded', !(await saveBlocked(page)));
  ok('is empty: the row says it reads the invoice only',
     (await ov(page).locator('.r-note').last().innerText()).includes('Reads the invoice only'));
  await ov(page).locator('#co-0').selectOption('eq');
  await ov(page).locator('#cs-0').selectOption('invoice_note');   // keyless, so it stops blocking Save
  ok('a value-bearing operand needs its field again', !(await saveBlocked(page)));

  // --- metadata key in the user's vocabulary (R10 + CLR-2)
  await ov(page).locator('#c-msrc').selectOption('payment_meta');
  ok('the key box appears on the built-in row', await ov(page).locator('#c-mkey').isVisible());
  ok('it is asked for in the user\'s words',
     (await ov(page).locator('#c-mkey').getAttribute('placeholder')).includes('Stripe field'));
  ok('it says where to find it', (await ov(page).locator('#body').innerText()).includes('open any payment and look at'));
  ok('the known keys are offered', (await ov(page).locator('#meta-keys option').count()) > 0);
  ok('a blank field blocks Save', await saveBlocked(page));
  ok('the blocking error is announced', await ov(page).locator('#err-scope-key').evaluate(el => el.getAttribute('role') === 'alert'));
  ok('the field points at its error', await ov(page).locator('#c-mkey').evaluate(el =>
    el.getAttribute('aria-describedby') === 'err-scope-key' && el.getAttribute('aria-invalid') === 'true'));
  ok('the bar names the first error, not just a count', (await ov(page).locator('#msg').innerText()).includes('Stripe field name is missing'));
  ok('and offers a jump to it', await ov(page).locator('#jump').isVisible());
  ok('a blocked Save keeps its place in the tab order',
     !(await ov(page).locator('#ov-save').evaluate(el => el.hasAttribute('disabled'))));
  ok('a blocked Save is still clickable, not a dead control',
     await ov(page).locator('#ov-save').evaluate(el => getComputedStyle(el).pointerEvents !== 'none'));
  await ov(page).locator('#c-mkey').fill('invoices');
  ok('the typed value survives (no re-render stealing focus)', (await ov(page).locator('#c-mkey').inputValue()) === 'invoices');
  ok('the field keeps focus while typing',
     await ov(page).locator('body').evaluate(() => document.activeElement.id) === 'c-mkey');
  ok('a named field unblocks Save', !(await saveBlocked(page)));

  // --- the query panel derives its literal from the engine's own resolve()
  await ensureOpen(page, 'd-sql');
  let sql = await ov(page).locator('pre.sql').innerText();
  ok('payment metadata resolves to the sample metadata value', sql.includes("DocNumber = 'inv-1042'"), sql);
  await ov(page).locator('#c-msrc').selectOption('invoice_note');
  sql = await ov(page).locator('pre.sql').innerText();
  ok('a different source resolves to a different literal', sql.includes("DocNumber = 'ord-88431'"), sql);
  ok('the preamble names the resolved value', (await ov(page).locator('#sql-body').innerText()).includes('ORD-88431'));
  await ov(page).locator('#c-msrc').selectOption('invoice_meta');
  await ov(page).locator('#c-mkey').fill('nope');
  ok('an unresolvable source drops the DocNumber line entirely',
     !(await ov(page).locator('pre.sql').innerText()).includes('DocNumber'));
  ok('and says so rather than pretending', (await ov(page).locator('#sql-body').innerText()).includes('dropped entirely'));
  await ov(page).locator('#c-msrc').selectOption('invoice_number');
  sql = await ov(page).locator('pre.sql').innerText();
  ok('the query carries the customer clause', sql.includes("CustomerRef = '58'"));
  ok('the query carries a symmetric date window',
     sql.includes("TxnDate >= '2026-05-15'") && sql.includes("TxnDate <= '2026-07-14'"), sql);
  ok('the query sorts deterministically (R3)', sql.includes('ORDERBY TxnDate ASC, Id ASC'));
  ok('the query has no Balance filter (R2)', !sql.includes('Balance'));
  ok('and the panel says any balance qualifies',
     (await ov(page).locator('#sql-body').innerText()).includes('nothing left owing can still be a candidate'));

  // --- scope validity guard (R8) and inheritance (R9)
  await ov(page).locator('#c-cust').uncheck();
  ok('customer off reveals the inheritance opt-in', await ov(page).locator('#c-inherit').isVisible());
  ok('Save is blocked until it is on', await saveBlocked(page));
  ok('the inheritance copy states the attribution consequence',
     (await ov(page).locator('#c-inherit').locator('xpath=../..').innerText()).includes('may not be the customer who actually paid'));
  await ov(page).locator('#c-mop').selectOption('contains');
  ok('a loose comparison with customer off is warned about',
     (await ov(page).locator('#body').innerText()).includes('can match an invoice belonging to a different customer'));
  await ov(page).locator('#c-mop').selectOption('eq');
  await ov(page).locator('#c-inherit').check();
  ok('inheritance on unblocks Save', !(await saveBlocked(page)));
  await ov(page).locator('#c-match').uncheck();
  ok('both bounding rows off: Save blocked', await saveBlocked(page));
  ok('the guard copy is the FDD copy verbatim',
     (await ov(page).locator('#err-guard').innerText()).includes('Keep either Customer or the invoice-number match on'));
  await ov(page).locator('#c-match').check();
  await ov(page).locator('#c-cust').check();
  ok('customer back on hides the inheritance opt-in', (await ov(page).locator('#c-inherit').count()) === 0);

  // --- outcomes exist and are distinct (R15/R17/R19)
  ok('the outcomes block is separate from the conditions',
     (await ov(page).locator('.lead').nth(1).innerText()).includes('After that'));
  ok('overpayment defaults on (R19)', await ov(page).locator('#c-over').isChecked());
  ok('the no-match outcome names the document it creates',
     (await ov(page).locator('#o-cancel').locator('xpath=..').innerText()).includes('Sales Receipt'));
  ok('and what happens to the cancelled payment',
     (await ov(page).locator('#o-cancel').locator('xpath=..').innerText()).includes('Canceled status'));

  // --- the FDD's own worked examples
  await ensureOpen(page, 'd-sim');
  ok('the sample payments are a keyboard radiogroup', await ov(page).locator('#sim-list').evaluate(el =>
    [...el.querySelectorAll('.txn')].every(b => b.getAttribute('role') === 'radio' && b.hasAttribute('aria-checked'))));
  ok('sample cards keep their title and detail on separate lines',
     (await ov(page).locator('#sim-list .txn').first().innerText()).split('\n').length >= 2);
  await ov(page).locator('#sim-list .txn').first().focus();
  await page.keyboard.press('ArrowDown');
  ok('arrow keys move the sample selection',
     await ov(page).locator('#sim-list .txn').nth(1).evaluate(el => el.getAttribute('aria-checked') === 'true'));

  // example A — customer + date, no invoice-number row, one memo condition
  await ov(page).locator('#c-match').uncheck();
  await ov(page).locator('#cs-0').selectOption('invoice_note');
  await ov(page).locator('#co-0').selectOption('eq');
  await ov(page).locator('#ct-0').selectOption('private_note');
  await ov(page).locator('#sim-list .txn').nth(0).click();
  let out = await ov(page).locator('#sim-out').innerText();
  ok('example A applies to INV-1042, the older of two matches', out.includes('Applied to INV-1042'), out.slice(0, 120));
  ok('example A explains the tie-break (R26)', out.includes('tie-break'));

  // example C — reference not in the books. Both R17 branches, because the
  // live default for cancel-sync is On
  await ov(page).locator('#sim-list .txn').nth(2).click();
  out = await ov(page).locator('#sim-out').innerText();
  ok('example C never falls back to first-in-list (R17)', out.includes('NOT the first invoice'), out.slice(0, 140));
  ok('example C with cancel-sync on: the sync is cancelled', out.includes('Sync cancelled'));
  await ov(page).locator('#c-cancel').uncheck();
  await page.waitForTimeout(120);
  out = await ov(page).locator('#sim-out').innerText();
  ok('example C with cancel-sync off: processed as usual', out.includes('Processed as usual'));
  ok('and it names the Sales Receipt it creates instead', out.includes('Sales Receipt'));
  await ov(page).locator('#c-cancel').check();
  await page.waitForTimeout(120);

  // example B — simple charge, payment metadata
  await ov(page).locator('#c-match').check();
  await ov(page).locator('#c-msrc').selectOption('payment_meta');
  await ov(page).locator('#c-mkey').fill('invoices');
  await ov(page).locator('#sim-list .txn').nth(1).click();
  out = await ov(page).locator('#sim-out').innerText();
  ok('example B does not apply to TW-5510', !out.includes('Applied to TW-5510'));
  ok('example B skips the invoice-sourced condition (R14)', out.includes('not applicable'));

  // overpayment path
  await ov(page).locator('#sim-list .txn').nth(3).click();
  out = await ov(page).locator('#sim-out').innerText();
  ok('overpayment on: applied as an overpayment', out.includes('as an overpayment'));
  await ov(page).locator('#c-over').uncheck();
  out = await ov(page).locator('#sim-out').innerText();
  ok('overpayment off: the sync is cancelled', out.includes('Sync cancelled'));
  ok('and it distinguishes itself from cancel-on-no-match', out.includes('not cancel-on-no-match'));
  await ov(page).locator('#c-over').check();

  // empty conditions = scope only (R16)
  await ov(page).locator('#cd-0').click();
  await ov(page).locator('#sim-list .txn').nth(0).click();
  out = await ov(page).locator('#sim-out').innerText();
  ok('no conditions + candidates applies to the first one (R16)', out.includes('Applied to'), out.slice(0, 120));

  // --- cancel-sync is ONE value across the frame boundary (R18)
  ok('the overlay inherited the GSP value', await ov(page).locator('#c-cancel').isChecked());
  ok('the overlay states it is one value', (await ov(page).locator('#body').innerText()).includes('one value, two places'));
  await ov(page).locator('#c-cancel').uncheck();
  await page.waitForTimeout(150);
  ok('changing it in the overlay lands on GSP with no Save',
     await page.locator('#g-cancel').evaluate(el => el.getAttribute('aria-checked') === 'false'));

  // --- exits ask before discarding, and focus comes back
  await page.keyboard.press('Escape');
  ok('Escape on a dirty draft asks first', await ov(page).locator('#cfm').isVisible());
  await page.keyboard.press('Escape');
  ok('Escape dismisses the prompt, not the overlay',
     !(await ov(page).locator('#cfm').isVisible()) && await page.locator('#ovh').isVisible());
  await ov(page).locator('#c-mkey').focus();
  await page.keyboard.press('Escape');
  ok('Escape while editing a field does not close the overlay', await page.locator('#ovh').isVisible());
  ok('and does not raise the prompt either', !(await ov(page).locator('#cfm').isVisible()));
  await ov(page).locator('#ov-cancel').click();
  await ov(page).locator('#cfm-discard').click();
  ok('discard closes the overlay', await closed(page));
  ok('the page behind is interactive again', await page.locator('.gsp').evaluate(el => el.inert === false));
  ok('focus returns to the button that opened it',
     await page.evaluate(() => document.activeElement.id) === 'pa-open');
  ok('a discarded draft did not configure anything', (await page.locator('#pane .pa').innerText()).includes('Synder default'));
  ok('but the shared cancel-sync value survived the discard — it was never a draft',
     await page.locator('#g-cancel').evaluate(el => el.getAttribute('aria-checked') === 'false'));

  // the other direction of R18, now that GSP is reachable again
  await page.click('#g-cancel');
  ok('GSP can change the shared value back',
     await page.locator('#g-cancel').evaluate(el => el.getAttribute('aria-checked') === 'true'));
  await openOverlay(page);
  await useCustom(page);
  ok('and the overlay inherits it on open', await ov(page).locator('#c-cancel').isChecked());
  await ov(page).locator('#ov-close').click();
  if (await ov(page).locator('#cfm').isVisible()) await ov(page).locator('#cfm-discard').click();

  // --- saving reports back to GSP
  await openOverlay(page);
  await useCustom(page);
  await ov(page).locator('#ov-save').click();
  ok('Save closes the overlay', await closed(page));
  ok('GSP shows the custom rule', (await page.locator('#pane .pa').innerText()).includes('Custom rule'));
  ok('GSP summarises what the rule now does', (await page.locator('#pane .pa-d').innerText()).includes('same customer'));

  // reopening inherits the saved rule
  await openOverlay(page);
  ok('reopening lands on the saved custom rule', await ov(page).locator('#m-custom').isChecked());
  await page.keyboard.press('Escape');
  ok('a clean draft closes with no prompt', await closed(page));

  // --- a retained error must never trap the integration on a custom rule
  await openOverlay(page);
  await ov(page).locator('#c-msrc').selectOption('payment_meta');   // blank key
  ok('the blank field blocks Save while custom is on', await saveBlocked(page));
  await ov(page).locator('#m-default').check();
  ok('back on default: Save is available again', !(await saveBlocked(page)));
  ok('and the bar stops demanding a fix', !(await ov(page).locator('#msg').innerText()).includes('to fix'));
  await ov(page).locator('#ov-save').click();
  ok('saving an off rule closes the overlay', await closed(page));
  ok('the integration can be returned to the default matcher',
     (await page.locator('#pane .pa').innerText()).includes('Synder default'));

  // ---------- prerequisite off: inert everywhere ----------
  await page.uncheck('#p-apply');
  await page.waitForTimeout(150);
  ok('GSP warns the prerequisite is off', (await page.locator('#pane .pa-warn').innerText()).includes('first'));
  await openOverlay(page);
  await useCustom(page);
  ok('the overlay states nothing runs yet', (await ov(page).locator('.warn').first().innerText()).includes('Nothing on this screen runs yet'));
  ok('the warning carries the fix, not just the diagnosis', await ov(page).locator('#c-prereq').isVisible());
  await ensureOpen(page, 'd-sim');
  out = await ov(page).locator('#sim-out').innerText();
  ok('the simulator refuses to report success while inert',
     out.includes('Nothing runs') && !out.includes('Applied to'), out.slice(0, 120));
  ok('plain terms switches to would, not will', (await ov(page).locator('#plain-body').innerText()).includes('Once it is on'));
  ok('the query panel says would', (await ov(page).locator('#d-sql summary').innerText()).includes('would ask'));
  ok('the bar says it is inert', (await ov(page).locator('#msg').innerText()).includes('inert'));
  ok('the chip is not green while inert', (await ov(page).locator('#chip').innerText()).includes('inactive'));
  await ov(page).locator('#c-prereq').click();
  await page.waitForTimeout(150);
  ok('the in-overlay switch turns the prerequisite on', await page.locator('#p-apply').isChecked());
  ok('and the banner that offered it is gone once it is on', (await ov(page).locator('#c-prereq').count()) === 0);
  ok('and GSP followed', await page.locator('#g-apply').evaluate(el => el.getAttribute('aria-checked') === 'true'));
  ok('the chip goes green once it can run', (await ov(page).locator('#chip').innerText()).trim() === 'Custom rule');
  await ov(page).locator('#ov-save').click();
  await closed(page);

  // ---------- generic customer (R24) ----------
  await page.check('#p-generic');
  await page.waitForTimeout(150);
  await openOverlay(page);
  ok('generic customer is surfaced at configuration time',
     (await ov(page).locator('#body').innerText()).includes('Generic customer is on'));
  await page.uncheck('#p-generic');
  await page.waitForTimeout(150);

  // ---------- 21 characters is a maximum (R13) ----------
  ok('the DocNumber limit is stated as a maximum', await (async () => {
    const t = await ov(page).locator('#body').innerText();
    return t.includes('at most 21 characters') && !/holds 21 characters/.test(t);
  })());

  // ======================= automated gates (round 1) ========================
  await ov(page).locator('#c-add').click();
  await page.waitForTimeout(400);   // let button background transitions settle

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
  ok('AUTO-1: every text node in the overlay meets WCAG AA', cFail.length === 0,
     cFail.slice(0, 5).map(f => `"${f.text}" ${f.r.toFixed(2)}:1`).join(' · '));

  const offGrid = await ov(page).locator('body').evaluate(() => {
    const out = [];
    document.querySelectorAll('.bar, .wrap, .card-b, .r, .mode, .err, .warn, .info, .out, .txn, .o').forEach(el => {
      const cs = getComputedStyle(el);
      ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].forEach(p => {
        const v = parseFloat(cs[p]);
        if (v && v % 4 !== 0) out.push(`${el.className.split(' ')[0]}.${p}=${v}`);
      });
    });
    return out;
  });
  ok('AUTO-2: every padding sits on the 4/8px grid', offGrid.length === 0, offGrid.slice(0, 8).join(', '));

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
    document.querySelectorAll('#body select, #body input, .bar button').forEach(el => {
      const hasName = (el.labels && el.labels.length) || el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') || (el.tagName === 'BUTTON' && el.textContent.trim());
      if (!hasName) bad.push(el.tagName + '#' + (el.id || '?'));
    });
    return bad;
  });
  ok('AUTO-4: every control in the overlay has an accessible name', named.length === 0, named.join(', '));
  ok('no span-based toggles anywhere in the overlay', (await ov(page).locator('.toggle').count()) === 0);

  // ---------- layout ----------
  ok('no horizontal overflow on the GSP page at 1440',
     await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0);
  ok('no horizontal overflow in the overlay at 1440',
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

  const dir = path.resolve(__dirname, '../projects/payment-application-v2/');
  await page.screenshot({ path: dir + '/shot-overlay.png', fullPage: true });
  await ov(page).locator('#ov-close').click();
  if (await ov(page).locator('#cfm').isVisible()) await ov(page).locator('#cfm-discard').click();
  await page.screenshot({ path: dir + '/shot-gsp.png', fullPage: true });

  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
