/* Real-browser verification for projects/payment-application-engine/index.html
   Asserts visibility / clickability, never element state behind a closed panel.
   Round-1 fix pass: also re-runs the four automated gates (AUTO-1..4) that the
   validator round raised, so a regression fails the build instead of a report. */
const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../projects/payment-application-engine/index.html');
let pass = 0, fail = 0;
const errors = [];
function ok(name, cond, extra) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
// disclosures persist their open state across re-renders, so only click when closed
async function ensureOpen(page, id) {
  const d = page.locator('#' + id);
  if (!(await d.evaluate(el => el.open))) await d.locator('summary').click();
}
const saveBlocked = page => page.locator('#ov-save').evaluate(el => el.getAttribute('aria-disabled') === 'true');

function lum(rgb) {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) { const l1 = lum(a), l2 = lum(b); const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]; return (hi + 0.05) / (lo + 0.05); }
// computed colours arrive as rgb() or, for color-mix values, color(srgb 0..1)
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

  // ---------- GSP page ----------
  ok('GSP shows the three settings rows', (await page.locator('#gsp-rows .row').count()) === 3);
  ok('Configure button is visible', await page.locator('#g-open').isVisible());
  ok('Payment application starts on Synder default', (await page.locator('#gsp-rows').innerText()).includes('Synder default'));

  // plan gate + upgrade action (polish UX-5)
  await page.selectOption('#p-plan', 'starter');
  ok('Starter: Configure is not clickable', await page.locator('#gsp-rows button:has-text("Configure")').isDisabled());
  ok('Starter: plan requirement stated', (await page.locator('#gsp-rows').innerText()).includes('Pro plan and above'));
  ok('Starter: the gate offers a real upgrade action', await page.locator('#gsp-rows a:has-text("Compare plans")').isVisible());
  await page.selectOption('#p-plan', 'pro');
  ok('Pro: Configure clickable again', await page.locator('#g-open').isEnabled());

  // ---------- open overlay ----------
  await page.click('#g-open');
  ok('overlay is visible', await page.locator('#ov').isVisible());
  ok('overlay is a dialog', await page.locator('#ov').evaluate(el =>
    el.getAttribute('role') === 'dialog' && el.getAttribute('aria-modal') === 'true' && !!el.getAttribute('aria-labelledby')));
  ok('focus moves into the dialog on open', await page.evaluate(() => document.activeElement.id) === 'ov-close');
  ok('engine starts off', (await page.locator('#ov-state-chip').innerText()).trim() === 'Default matching');
  ok('default behaviour reference text is visible', await page.locator('#ov-body .ref').first().isVisible());
  ok('no scope section while engine is off', (await page.locator('#c-cust').count()) === 0);
  ok('engine off: Save is available (a retained rule can always be switched off)', !(await saveBlocked(page)));

  // --- theme 1: the master switch is reachable and operable by keyboard alone
  const focusables = await page.evaluate(() => [...document.querySelectorAll(
    '#ov a[href],#ov button:not([disabled]),#ov input:not([disabled]),#ov select:not([disabled]),#ov summary,#ov [tabindex]:not([tabindex="-1"])')].map(e => e.id || e.tagName));
  ok('engine-off dialog has more than close/cancel/save to focus', focusables.length > 3, focusables.join(','));
  await page.focus('#c-engine');
  ok('the master switch can take focus', await page.evaluate(() => document.activeElement.id) === 'c-engine');
  await page.keyboard.press('Space');
  ok('Space on the master switch turns the rule on', (await page.locator('#ov-state-chip').innerText()).trim() === 'Custom rule');
  ok('engine on: three scope rows visible', (await page.locator('#ov-body .rr').count()) === 3);
  ok('every switch is a real switch input', await page.evaluate(() =>
    [...document.querySelectorAll('#ov-body input.switch')].every(i => i.getAttribute('role') === 'switch')));
  ok('no span-based toggles left anywhere', (await page.locator('.toggle').count()) === 0);
  ok('every select in the dialog has an accessible name', await page.evaluate(() =>
    [...document.querySelectorAll('#ov-body select')].every(s => s.labels.length > 0 || s.getAttribute('aria-label'))));

  const s1 = await page.locator('#ov-body .panel-t').nth(0).innerText();
  const s2 = await page.locator('#ov-body .panel-t').nth(1).innerText();
  ok('section 1 heading is an instruction, not a question about plumbing', s1.includes('Only consider invoices that'), s1);
  ok('section 2 heading names the action, no battle metaphor', s2.includes('Then apply the payment to the invoice where') && !/wins/i.test(s2), s2);
  const rowLabels = await page.locator('#ov-body .rr .rr-t').allInnerTexts();
  ok('row labels state constraints, not field names',
     rowLabels[0].includes('same customer') && rowLabels[1].includes('dated within') && rowLabels[2].includes('invoice number'), rowLabels.join(' | '));
  ok('date row label carries the live day count', rowLabels[1].includes('90 days'), rowLabels[1]);
  ok('match row label carries the live operand and source',
     rowLabels[2].includes('is equal to') && rowLabels[2].includes('invoice number'), rowLabels[2]);
  ok('nothing in the overlay says "wins"', !/\bwins\b/i.test(await page.locator('#ov-body').innerText()));
  ok('lead line uses "existing invoices"', (await page.locator('#ov-body').innerText()).includes('existing invoices'));
  ok('tie-break warns that several matches means loose conditions',
     (await page.locator('#ov-body').innerText()).includes('conditions are too loose'));
  ok('customer switch clickable', await page.locator('#c-cust').isVisible());
  ok('days field visible', await page.locator('#c-days').isVisible());
  ok('scope operand list has exactly 4 pushable operands', (await page.locator('#c-mop option').count()) === 4);
  ok('scope target is locked to Invoice number', (await page.locator('#c-mtarget').innerText()).includes('Invoice number'));

  // --- theme 2: the first turn-on must not smuggle in a condition
  ok('first turn-on has an empty condition box', (await page.locator('#ov-body .cond-row').count()) === 0);
  ok('the empty box is explained as scope-only', (await page.locator('#ov-body .ref').first().innerText()).includes('first invoice it found'));
  ok('Save is available on the suggested starting rule', !(await saveBlocked(page)));

  // --- theme 8: the admin-gated date switch is visibly unavailable, not a dead click
  ok('gated date switch is disabled, not silently inert', await page.locator('#c-date').isDisabled());
  ok('gated date switch is dimmed like the plan-gated one',
     await page.locator('#c-date').evaluate(el => parseFloat(getComputedStyle(el.closest('.tog')).opacity) < 1));
  ok('gated date switch says who can lift it', (await page.locator('#date-hint').innerText()).includes('Ask Synder to enable it'));
  ok('no-limit gate explained', (await page.locator('#ov-body').innerText()).includes('no date limit at all'));
  await page.check('#p-admin');
  ok('admin-enabled: date switch becomes operable', await page.locator('#c-date').isEnabled());
  await page.click('#c-date');
  ok('admin-enabled: date row turns off', (await page.locator('#c-days').count()) === 0);
  ok('date off discloses no limit', (await page.locator('#ov-body .warn').first().innerText()).includes('No date limit'));
  await page.click('#c-date');
  ok('date row turns back on', await page.locator('#c-days').isVisible());

  // --- live bug: the day count must be steppable by keyboard without losing focus
  await page.focus('#c-days');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  ok('two ArrowUps step the day count to 92', (await page.inputValue('#c-days')) === '92', await page.inputValue('#c-days'));
  ok('focus stays on the day count after stepping', await page.evaluate(() => document.activeElement.id) === 'c-days');
  ok('the derived window text followed the stepper', (await page.locator('#d-win').innerText()).includes('2026-09-14'));
  // polish UX-5: clamping is stated, not silent
  await page.fill('#c-days', '900');
  await page.locator('#c-days').evaluate(el => el.blur());
  ok('out-of-range value is clamped', (await page.inputValue('#c-days')) === '365');
  ok('the clamp names the limit it applied', (await page.locator('#days-note').innerText()).includes('365'));
  ok('the accepted range is stated on the field', (await page.locator('label[for="c-days"]').innerText()).includes('1–365'));
  await page.fill('#c-days', '90');
  await page.locator('#c-days').evaluate(el => el.blur());

  // ---------- scope validity guard ----------
  await page.click('#c-cust');
  ok('customer off reveals inheritance checkbox', await page.locator('#c-inherit').isVisible());
  ok('save blocked until inheritance is on', await saveBlocked(page));
  ok('the blocking error is announced', await page.locator('#err-inherit').evaluate(el => el.getAttribute('role') === 'alert'));
  ok('the field points at its error', await page.locator('#c-inherit').evaluate(el =>
    el.getAttribute('aria-describedby') === 'err-inherit' && el.getAttribute('aria-invalid') === 'true'));
  ok('the footer names the first error, not just a count', (await page.locator('#ov-f-msg').innerText()).includes('customer source'));
  ok('the footer offers a jump to it', await page.locator('#ov-jump').isVisible());
  ok('a blocked Save is still clickable, not a dead control',
     await page.locator('#ov-save').evaluate(el => getComputedStyle(el).pointerEvents !== 'none'));
  // aria-disabled, not disabled: still focusable, still announced as unavailable
  await page.focus('#ov-save');
  ok('Save keeps its place in the tab order while blocked',
     (await page.evaluate(() => document.activeElement.id)) === 'ov-save' &&
     !(await page.locator('#ov-save').evaluate(el => el.hasAttribute('disabled'))));
  // theme 7: the inheritance helper states the consequence, not just completeness
  ok('inheritance copy states the attribution consequence',
     (await page.locator('#c-inherit').locator('xpath=../..').innerText()).includes('may not be the customer who actually paid'));
  await page.selectOption('#c-mop', 'contains');
  ok('loose comparison with Customer off is warned about',
     (await page.locator('#ov-body').innerText()).includes('can match an invoice belonging to a different customer'));
  await page.selectOption('#c-mop', 'eq');
  await page.check('#c-inherit');
  ok('inheritance on unblocks save', !(await saveBlocked(page)));
  await page.click('#c-match');           // both bounding rows off
  ok('both bounding rows off: save blocked', await saveBlocked(page));
  ok('guard copy is the FDD copy',
     (await page.locator('#err-guard').innerText()).includes('Keep either Customer or the invoice-number match on'));
  await page.click('#c-match');
  await page.click('#c-cust');
  ok('customer back on hides inheritance', (await page.locator('#c-inherit').count()) === 0);
  ok('save enabled again', !(await saveBlocked(page)));

  // ---------- theme 11: the metadata key in the user's vocabulary ----------
  await page.selectOption('#c-msrc', 'payment_meta');
  ok('metadata key field appears', await page.locator('#c-mkey').isVisible());
  ok('the key field is labelled in the user\'s terms',
     /which stripe field/i.test(await page.locator('label[for="c-mkey"]').innerText()));
  ok('it says where to find the value', (await page.locator('#ov-body').innerText()).includes('open any payment and look at'));
  ok('it offers the known keys', (await page.locator('#meta-keys option').count()) > 0);
  ok('blank key blocks save', await saveBlocked(page));
  ok('metadata error avoids the word "key"', !(await page.locator('#err-scope-key').innerText()).toLowerCase().includes('metadata key'));
  await page.fill('#c-mkey', 'invoices');
  ok('typed key survives (no re-render stealing focus)', (await page.inputValue('#c-mkey')) === 'invoices');
  ok('key field still focused after typing', await page.evaluate(() => document.activeElement.id) === 'c-mkey');
  ok('key entered unblocks save', !(await saveBlocked(page)));

  // --- theme 3: the query panel proves the value it actually resolves
  await ensureOpen(page, 'd-sql');
  let sql = await page.locator('pre.sql').innerText();
  ok('payment metadata resolves to the sample metadata value', sql.includes("DocNumber = 'inv-1042'"), sql);
  await page.selectOption('#c-msrc', 'invoice_note');
  sql = await page.locator('pre.sql').innerText();
  ok('invoice note resolves to a different literal', sql.includes("DocNumber = 'ord-88431'"), sql);
  ok('the preamble names the resolved value', (await page.locator('#sql-body').innerText()).includes('ORD-88431'));
  await page.selectOption('#c-msrc', 'invoice_id');
  sql = await page.locator('pre.sql').innerText();
  ok('invoice id resolves to its own literal', sql.includes("DocNumber = 'in_9f2c'"), sql);
  await page.selectOption('#c-msrc', 'invoice_meta');
  await page.fill('#c-mkey', 'nope');
  ok('an unresolvable source drops the DocNumber line entirely', !(await page.locator('pre.sql').innerText()).includes('DocNumber'));
  ok('and says so instead of pretending', (await page.locator('#sql-body').innerText()).includes('dropped entirely'));
  await page.selectOption('#c-msrc', 'invoice_number');

  sql = await page.locator('pre.sql').innerText();
  ok('query has CustomerRef clause', sql.includes("CustomerRef = '58'"));
  ok('query has both date bounds', sql.includes("TxnDate >= '2026-03-16'") && sql.includes("TxnDate <= '2026-09-12'"));
  ok('query is sorted deterministically', sql.includes('ORDERBY TxnDate ASC, Id ASC'));
  ok('query has no Balance filter', !sql.includes('Balance'));
  // theme 7: the candidate set is named honestly
  ok('the query panel says any balance qualifies',
     (await page.locator('#sql-body').innerText()).includes('nothing left owing can still be a candidate'));
  ok('section 1 states that paid invoices are candidates too',
     (await page.locator('#ov-body').innerText()).includes('Unpaid, partly paid and fully paid invoices are all candidates'));

  await page.click('#c-date');
  await ensureOpen(page, 'd-sql');
  ok('date off drops the date clauses', !(await page.locator('pre.sql').innerText()).includes('TxnDate >='));
  await page.click('#c-date');

  // ---------- condition box ----------
  await page.click('#c-add');
  ok('add condition gives 1 row', (await page.locator('#ov-body .cond-row').count()) === 1);
  ok('condition operand list has all 10', (await page.locator('#co-0 option').count()) === 10);
  ok('condition target offers both targets', (await page.locator('#ct-0 option').count()) === 2);
  ok('every condition row is labelled, not just the first', await page.evaluate(() =>
    [...document.querySelectorAll('#ov-body .cond-row select')].every(s => s.labels.length && s.labels[0].textContent.trim().length > 0)));
  await page.click('#c-add');
  ok('add condition gives 2 rows', (await page.locator('#ov-body .cond-row').count()) === 2);
  ok('second row shows the AND joiner', (await page.locator('.cond-row').nth(1).locator('.cond-join').innerText()).trim() === 'AND');
  ok('second row labels are present but hidden', await page.evaluate(() =>
    [...document.querySelectorAll('#ov-body .cond-row')][1].querySelectorAll('label.fld-l.sr-only').length > 0));
  await page.click('#c-or');
  ok('switching to ANY updates the joiner', (await page.locator('.cond-row').nth(1).locator('.cond-join').innerText()).trim() === 'OR');
  ok('the combinator reports its pressed state', await page.locator('#c-or').evaluate(el => el.getAttribute('aria-pressed') === 'true'));
  await page.click('#c-and');
  await page.click('#cd-1');
  ok('back to 1 condition row', (await page.locator('#ov-body .cond-row').count()) === 1);
  ok('remaining source select still usable', await page.locator('#cs-0').isEnabled());

  // --- theme 5: "is empty" mutes the side nothing reads
  await page.selectOption('#cs-0', 'payment_meta');
  await page.selectOption('#co-0', 'empty');
  ok('is empty: the payment side is disabled', await page.locator('#cs-0').isDisabled());
  ok('is empty: the invoice target stays editable', await page.locator('#ct-0').isEnabled());
  ok('is empty: the metadata field no longer blocks Save', !(await saveBlocked(page)));
  ok('is empty: the row says it reads the invoice only',
     (await page.locator('#ov-body .cond').innerText()).includes('Reads the invoice only'));
  ok('is empty: plain terms drops the payment side',
     (await page.locator('#plain-body').innerText()).includes('nothing on the payment is read'));
  await page.selectOption('#ct-0', 'private_note');
  await page.locator('#sim-list').isVisible().catch(() => {});
  await ensureOpen(page, 'd-sim');
  let out = await page.locator('#sim-out').innerText();
  ok('is empty: the row is applied, not skipped as not applicable', !out.includes('not applicable'), out.slice(0, 120));
  ok('is empty: the log says it always applies', out.includes('always applies'));
  await page.selectOption('#co-0', 'eq');
  await page.selectOption('#cs-0', 'invoice_note');

  // ---------- plain terms ----------
  const plain = page.locator('#d-plain');
  ok('In plain terms is open by default', await plain.locator('.plain').isVisible());
  ok('plain terms names the day window', (await plain.innerText()).includes('90 days'));
  ok('plain terms names the no-match document', (await plain.innerText()).includes('Sales Receipt'));
  ok('all-invoice-sourced rule warns about simple charges', (await plain.innerText()).includes('simple charge'));

  // ---------- simulator: the FDD's own worked examples ----------
  await ensureOpen(page, 'd-sim');
  ok('the SQL panel stayed open through a re-render', await page.locator('#d-sql').evaluate(el => el.open));
  ok('simulator lists 4 sample transactions', (await page.locator('#sim-list .txn').count()) === 4);
  ok('sample payments are a keyboard radiogroup', await page.evaluate(() =>
    [...document.querySelectorAll('#sim-list .txn')].every(b => b.getAttribute('role') === 'radio' && b.hasAttribute('aria-checked'))));
  await page.locator('#sim-list .txn').first().focus();
  await page.keyboard.press('ArrowDown');
  ok('arrow keys move the sample selection', await page.locator('#sim-list .txn').nth(1).evaluate(el => el.getAttribute('aria-checked') === 'true'));
  ok('focus follows the arrow-key selection', await page.evaluate(() => document.activeElement.dataset.t) === 't2');

  // Example A: customer on, date on, match off, one condition invoice note = memo
  await page.click('#c-match');
  await page.selectOption('#cs-0', 'invoice_note');
  await page.selectOption('#co-0', 'eq');
  await page.selectOption('#ct-0', 'private_note');
  await page.locator('#sim-list .txn').nth(0).click();
  out = await page.locator('#sim-out').innerText();
  ok('example A applies to INV-1042 (oldest of two matches)', out.includes('Applied to INV-1042'));
  ok('example A explains the tie-break', out.includes('tie-break'));

  // Example C: same config, reference not in the books
  await page.locator('#sim-list .txn').nth(2).click();
  out = await page.locator('#sim-out').innerText();
  ok('example C processes as usual, not first-in-snapshot', out.includes('Processed as usual'));
  ok('example C names the document it creates instead', out.includes('Sales Receipt'));
  ok('example C says the box failed', out.includes('NOT the first invoice'));

  // cancel-sync flips the same case to cancelled
  await page.click('#c-cancel');
  out = await page.locator('#sim-out').innerText();
  ok('cancel-sync on cancels the unmatched case', out.includes('Sync cancelled'));
  ok('cancel-sync commits immediately on the GSP row too', await page.locator('#g-cancel').isChecked());

  // Example B: simple charge, scope match on payment metadata, condition on invoice note
  await page.click('#c-match');
  await page.selectOption('#c-msrc', 'payment_meta');
  await page.fill('#c-mkey', 'invoices');
  await page.click('#c-cancel');   // back off
  await page.locator('#sim-list .txn').nth(1).click();
  out = await page.locator('#sim-out').innerText();
  ok('example B does NOT apply to TW-5510', !out.includes('Applied to TW-5510'));
  ok('example B skips the invoice-sourced condition', out.includes('not applicable'));
  ok('example B processes as usual', out.includes('Processed as usual'));

  // Overpayment path
  await page.locator('#sim-list .txn').nth(3).click();
  out = await page.locator('#sim-out').innerText();
  ok('overpayment on: applied as overpayment', out.includes('as an overpayment'));
  await page.click('#c-over');
  out = await page.locator('#sim-out').innerText();
  ok('overpayment off: sync cancelled', out.includes('Sync cancelled'));
  ok('overpayment copy distinguishes itself from cancel-on-no-match', out.includes('not cancel-on-no-match'));
  await page.click('#c-over');

  // empty box = scope only
  await page.click('#cd-0');
  ok('empty box explained as scope-only', (await page.locator('#ov-body .ref').first().innerText()).includes('first invoice it found'));
  await page.locator('#sim-list .txn').nth(0).click();
  out = await page.locator('#sim-out').innerText();
  ok('empty box + candidates applies to the first candidate', out.includes('Applied to'));

  // ---------- theme 6: one value, one commit model ----------
  ok('overlay states the shared value', (await page.locator('#ov-body').innerText()).toLowerCase().includes('one value, two places'));
  ok('overlay states the commit model', (await page.locator('#ov-body').innerText()).includes('saves the moment you flip it'));
  ok('overlay states what happens to a cancelled payment', (await page.locator('#ov-body').innerText()).includes('Canceled status'));
  await page.click('#c-cancel');
  ok('flipping cancel-sync in the overlay lands on GSP without Save', await page.locator('#g-cancel').isChecked());
  await page.click('#ov-cancel');
  ok('a discard prompt appears for the rest of the draft', await page.locator('#cfm').isVisible());
  await page.click('#cfm-discard');
  ok('overlay closed after discard', !(await page.locator('#ov').isVisible()));
  ok('cancel-sync survived the discard (it was never a draft)', await page.locator('#g-cancel').isChecked());
  await page.click('#g-cancel');   // back off for the rest of the run

  // theme 6b: an off rule with a retained validation error is still saveable
  await page.click('#g-open');
  await page.click('#c-engine');
  await page.selectOption('#c-msrc', 'payment_meta');   // blank key = blocking error
  ok('the blank field blocks Save while the rule is on', await saveBlocked(page));
  await page.click('#c-engine');                        // switch the rule off, error retained
  ok('rule off: Save is available again', !(await saveBlocked(page)));
  ok('rule off: the footer stops demanding a fix', !(await page.locator('#ov-f-msg').innerText()).includes('to fix'));
  await page.click('#ov-save');
  ok('an off rule can be saved back to the default matcher', !(await page.locator('#ov').isVisible()));
  ok('GSP is back on Synder default', (await page.locator('#gsp-rows').innerText()).includes('Synder default'));
  // clear the retained error so the later scenarios start from a valid saved rule
  await page.click('#g-open'); await page.click('#c-engine');
  await page.selectOption('#c-msrc', 'invoice_number');
  await page.click('#c-engine'); await page.click('#ov-save');

  // ---------- theme 9: exits ask, and focus comes back ----------
  await page.click('#g-open');
  await page.click('#c-engine');
  await page.keyboard.press('Escape');
  ok('Escape on a dirty draft asks before discarding', await page.locator('#cfm').isVisible());
  await page.keyboard.press('Escape');
  ok('Escape dismisses the prompt, not the dialog', !(await page.locator('#cfm').isVisible()) && await page.locator('#ov').isVisible());
  // Escape while editing a field belongs to the field
  await page.selectOption('#c-msrc', 'payment_meta');
  await page.focus('#c-mkey');
  await page.keyboard.press('Escape');
  ok('Escape while editing a text field does not close the dialog', await page.locator('#ov').isVisible());
  ok('and does not raise the discard prompt either', !(await page.locator('#cfm').isVisible()));
  await page.selectOption('#c-msrc', 'invoice_number');
  await page.click('#ov-close');
  await page.click('#cfm-discard');
  ok('focus returns to the button that opened the dialog', await page.evaluate(() => document.activeElement.id) === 'g-open');

  // a clean draft closes without a prompt
  await page.click('#g-open');

  // Tab is contained inside the dialog
  await page.focus('#ov-save');
  await page.keyboard.press('Tab');
  ok('Tab from the last control wraps back inside the dialog',
     await page.evaluate(() => !!document.activeElement.closest('#ov')));
  await page.focus('#ov-close');
  await page.keyboard.press('Shift+Tab');
  ok('Shift+Tab from the first control stays inside the dialog',
     await page.evaluate(() => !!document.activeElement.closest('#ov')));

  await page.keyboard.press('Escape');
  ok('a clean draft closes without asking', !(await page.locator('#ov').isVisible()) && !(await page.locator('#cfm').isVisible()));

  // ---------- theme 4: prerequisite off = inert everywhere ----------
  await page.uncheck('#p-apply');
  ok('GSP tells you to turn Apply payments on first', (await page.locator('#gsp-rows').innerText()).includes('Apply payments to invoices” first'));
  await page.click('#g-open');
  ok('overlay states payments are not being applied at all',
     (await page.locator('#ov-body .warn').first().innerText()).includes('not being applied to invoices at all'));
  ok('the warning carries the fix, not just the diagnosis', await page.locator('#c-prereq').isVisible());
  await page.click('#c-engine');
  await ensureOpen(page, 'd-sim');
  out = await page.locator('#sim-out').innerText();
  ok('the simulator refuses to report success while inert', out.includes('Nothing runs') && !out.includes('Applied to'), out.slice(0, 120));
  ok('plain terms is written as would, not will', (await page.locator('#plain-body').innerText()).includes('Once it is on'));
  ok('the query panel says would send', (await page.locator('#d-sql summary').innerText()).includes('would send'));
  ok('the footer says it is inert', (await page.locator('#ov-f-msg').innerText()).includes('inert'));
  ok('the header chip is not green while inert', (await page.locator('#ov-state-chip').innerText()).includes('inactive'));
  await page.click('#ov-save');
  ok('GSP chip reads inactive, not a green Custom rule', (await page.locator('#gsp-rows').innerText()).includes('Custom rule (inactive)'));
  // and turning the prerequisite on from inside the banner clears it
  await page.click('#g-open');
  await page.click('#c-prereq');
  ok('the in-banner switch turns the prerequisite on', await page.locator('#p-apply').isChecked());
  ok('the chip goes green once it can run', (await page.locator('#ov-state-chip').innerText()).trim() === 'Custom rule');
  await page.click('#ov-close');
  if (await page.locator('#cfm').isVisible()) await page.click('#cfm-discard');

  // ---------- generic customer (Q4) ----------
  await page.check('#p-generic');
  await page.click('#g-open');
  ok('generic customer surfaced at configuration time', (await page.locator('#ov-body').innerText()).includes('Generic customer is on'));
  await page.click('#ov-close');
  if (await page.locator('#cfm').isVisible()) await page.click('#cfm-discard');
  await page.uncheck('#p-generic');

  // ---------- assumptions toggle ----------
  ok('assumptions visible by default', await page.locator('.asm').first().isVisible());
  await page.uncheck('#p-asm');
  ok('assumptions hidden when switched off', !(await page.locator('.asm').first().isVisible()));
  await page.check('#p-asm');

  // ---------- polish: the 21-character limit is a maximum ----------
  await page.click('#g-open');
  const body = await page.locator('#ov-body').innerText();
  ok('the DocNumber limit is stated as a maximum', body.includes('at most 21 characters') && !/holds 21 characters/.test(body));

  // ============================================================================
  // AUTOMATED GATES — AUTO-1..4 from validator round 1
  // ============================================================================
  await page.click('#c-add');   // widest possible surface: every control on screen
  await page.waitForTimeout(400);   // let the button background transition settle before measuring
  const contrast = await page.evaluate(() => {
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
      if (el.closest('#pbar')) return;              // presenter bar is prototype chrome
      const t = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
      if (!t) return;
      const cs = getComputedStyle(el);
      out.push({ text: t.slice(0, 40), color: cs.color, bg: bgOf(el), size: parseFloat(cs.fontSize), weight: cs.fontWeight });
    });
    return out;
  });
  const cFail = contrast.map(c => ({ ...c, r: ratio(parse(c.color), parse(c.bg)) }))
    .filter(c => c.r < ((c.size >= 24 || (c.size >= 18.66 && Number(c.weight) >= 700)) ? 3 : 4.5));
  ok('AUTO-1: every text node meets WCAG AA contrast', cFail.length === 0,
     cFail.slice(0, 5).map(f => `"${f.text}" ${f.r.toFixed(2)}:1`).join(' · '));

  const offGrid = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.panel-b, .panel-h, .rr, .cond-row, .ov-b-in, .ov-h, .ov-f, .row, .err, .warn, .info, .ref, .asm, .out, .txn, .cond, .crumb').forEach(el => {
      const cs = getComputedStyle(el);
      ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].forEach(p => {
        const v = parseFloat(cs[p]);
        if (v && v % 4 !== 0) out.push(`${el.className.split(' ')[0]}.${p}=${v}`);
      });
    });
    return out;
  });
  ok('AUTO-2: every padding sits on the 4/8px grid', offGrid.length === 0, offGrid.slice(0, 8).join(', '));

  const dead = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#ov-body *, #gsp-rows *').forEach(el => {
      if (getComputedStyle(el).cursor !== 'pointer') return;
      if (/^(BUTTON|A|SELECT|INPUT|LABEL|SUMMARY|OPTION)$/.test(el.tagName)) return;
      if (el.onclick || el.getAttribute('onclick')) return;
      if (el.closest('label,button,a,summary')) return;
      out.push((el.className || el.tagName) + ' :: ' + (el.textContent || '').trim().slice(0, 30));
    });
    return out;
  });
  ok('AUTO-3: nothing shows a pointer cursor without being operable', dead.length === 0, dead.slice(0, 6).join(' | '));

  const switches = await page.evaluate(() => {
    const all = [...document.querySelectorAll('#ov-body input.switch, #gsp-rows input.switch')];
    return {
      total: all.length,
      broken: all.filter(i => i.getAttribute('role') !== 'switch' ||
        !(i.labels.length || i.getAttribute('aria-label') || i.getAttribute('aria-labelledby'))).length,
      legacy: document.querySelectorAll('.toggle').length
    };
  });
  ok('AUTO-4: every switch is a named, focusable switch input',
     switches.total >= 7 && switches.broken === 0 && switches.legacy === 0, JSON.stringify(switches));

  // ---------- layout ----------
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('no page-level horizontal overflow at 1440', overflow <= 0, 'overflow=' + overflow);
  const rawHex = await page.evaluate(() => {
    const s = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n');
    return (s.match(/#[0-9a-fA-F]{3,6}\b/g) || []).filter(h => !/%23/.test(h));
  });
  ok('no raw hex colours in prototype CSS', rawHex.length === 0, rawHex.join(' '));

  // the presenter bar must stay reachable while the overlay is open
  const bar = await page.locator('#pbar').boundingBox();
  const ovh = await page.locator('#ov').boundingBox();
  ok('overlay does not sit under the presenter bar', ovh.y >= bar.y + bar.height - 1,
     'pbar bottom=' + (bar.y + bar.height) + ' ov top=' + ovh.y);
  ok('overlay header title is visible with the bar present', await page.locator('.ov-t').isVisible());

  ok('no JS errors', errors.length === 0, errors.join(' | '));

  await page.screenshot({ path: path.resolve(__dirname, '../projects/payment-application-engine/shot-overlay.png'), fullPage: true });
  await page.click('#ov-close');
  if (await page.locator('#cfm').isVisible()) await page.click('#cfm-discard');
  await page.screenshot({ path: path.resolve(__dirname, '../projects/payment-application-engine/shot-gsp.png'), fullPage: true });

  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
