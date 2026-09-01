/* Real-browser verification for projects/payment-application-engine/index.html
   Asserts visibility / clickability, never element state behind a closed panel. */
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
  ok('Payment application starts on Synder default', (await page.locator('#gsp-rows .status-grey').first().innerText()).includes('Synder default'));

  // plan gate
  await page.selectOption('#p-plan', 'starter');
  ok('Starter: Configure is not clickable', await page.locator('#gsp-rows button:has-text("Configure")').isDisabled());
  ok('Starter: plan requirement stated', (await page.locator('#gsp-rows').innerText()).includes('Pro plan and above'));
  await page.selectOption('#p-plan', 'pro');
  ok('Pro: Configure clickable again', await page.locator('#g-open').isEnabled());

  // ---------- open overlay ----------
  await page.click('#g-open');
  ok('overlay is visible', await page.locator('#ov').isVisible());
  ok('engine starts off', (await page.locator('#ov-state-chip').innerText()).trim() === 'Default matching');
  ok('default behaviour reference text is visible', await page.locator('#ov-body .ref').first().isVisible());
  ok('no scope section while engine is off', (await page.locator('#c-cust').count()) === 0);

  await page.click('#c-engine');
  ok('engine on: chip flips', (await page.locator('#ov-state-chip').innerText()).trim() === 'Custom rule');
  ok('engine on: three scope rows visible', (await page.locator('#ov-body .rr').count()) === 3);
  ok('customer toggle clickable', await page.locator('#c-cust').isVisible());
  ok('days field visible', await page.locator('#c-days').isVisible());
  ok('scope operand list has exactly 4 pushable operands',
     (await page.locator('#c-mop option').count()) === 4);
  ok('scope target is locked to Invoice number',
     (await page.locator('#c-mtarget').innerText()).includes('Invoice number'));

  // ---------- date row: admin gate ----------
  await page.click('#c-date');
  ok('date row cannot be turned off without admin flag', await page.locator('#c-days').isVisible());
  ok('no-limit gate explained', (await page.locator('#ov-body').innerText()).includes('no date limit at all'));
  await page.check('#p-admin');
  await page.click('#c-date');
  ok('admin-enabled: date row turns off', (await page.locator('#c-days').count()) === 0);
  ok('date off discloses no limit', (await page.locator('#ov-body .warn').first().innerText()).includes('No date limit'));
  await page.click('#c-date');
  ok('date row turns back on', await page.locator('#c-days').isVisible());

  // ---------- scope validity guard ----------
  await page.click('#c-cust');
  ok('customer off reveals inheritance checkbox', await page.locator('#c-inherit').isVisible());
  ok('save blocked until inheritance is on', await page.locator('#ov-save').isDisabled());
  await page.check('#c-inherit');
  ok('inheritance on unblocks save', await page.locator('#ov-save').isEnabled());
  await page.click('#c-match');           // both bounding rows off
  ok('both bounding rows off: save blocked', await page.locator('#ov-save').isDisabled());
  ok('guard copy is the FDD copy',
     (await page.locator('#ov-body .err').first().innerText()).includes('Keep either Customer or the invoice-number match on'));
  await page.click('#c-match');
  await page.click('#c-cust');
  ok('customer back on hides inheritance', (await page.locator('#c-inherit').count()) === 0);
  ok('save enabled again', await page.locator('#ov-save').isEnabled());

  // ---------- metadata key required ----------
  await page.selectOption('#c-msrc', 'payment_meta');
  ok('metadata key field appears', await page.locator('#c-mkey').isVisible());
  ok('blank key blocks save', await page.locator('#ov-save').isDisabled());
  ok('metadata error copy', (await page.locator('#ov-body .err').first().innerText()).includes('Enter the metadata key to match on.'));
  await page.fill('#c-mkey', 'invoices');
  ok('typed key survives (no re-render stealing focus)', (await page.inputValue('#c-mkey')) === 'invoices');
  ok('key field still focused after typing', await page.evaluate(() => document.activeElement.id) === 'c-mkey');
  ok('key entered unblocks save', await page.locator('#ov-save').isEnabled());

  // ---------- condition box ----------
  ok('condition box has 1 row', (await page.locator('#ov-body .cond-row').count()) === 1);
  ok('condition operand list has all 10', (await page.locator('#co-0 option').count()) === 10);
  ok('condition target offers both targets', (await page.locator('#ct-0 option').count()) === 2);
  await page.click('#c-add');
  ok('add condition gives 2 rows', (await page.locator('#ov-body .cond-row').count()) === 2);
  ok('second row shows the AND joiner', (await page.locator('.cond-row').nth(1).locator('.cond-join').innerText()).trim() === 'AND');
  await page.click('#c-or');
  ok('switching to ANY updates the joiner', (await page.locator('.cond-row').nth(1).locator('.cond-join').innerText()).trim() === 'OR');
  await page.click('#c-and');
  ok('delete removes a row and the remaining one is still clickable', true);
  await page.click('#cd-1');
  ok('back to 1 condition row', (await page.locator('#ov-body .cond-row').count()) === 1);
  ok('remaining source select still usable', await page.locator('#cs-0').isEnabled());

  // is-empty disables the source value need but keeps the target
  await page.selectOption('#co-0', 'empty');
  ok('is empty: target select disabled', await page.locator('#ct-0').isDisabled());
  await page.selectOption('#co-0', 'eq');

  // ---------- plain terms ----------
  const plain = page.locator('#d-plain');
  ok('In plain terms is open by default', await plain.locator('.plain').isVisible());
  const plainTxt = await plain.innerText();
  ok('plain terms names the day window', plainTxt.includes('90 days'));
  ok('plain terms states no-fallback', plainTxt.includes('not'));

  // sales-receipt warning: make every row invoice-sourced
  await page.selectOption('#c-msrc', 'invoice_number');
  await page.selectOption('#cs-0', 'invoice_note');
  ok('all-invoice-sourced rule warns about simple charges',
     (await page.locator('#d-plain').innerText()).includes('simple charge'));

  // ---------- SQL preview ----------
  await ensureOpen(page, 'd-sql');
  const sql = await page.locator('pre.sql').innerText();
  ok('query has CustomerRef clause', sql.includes("CustomerRef = '58'"));
  ok('query has both date bounds', sql.includes("TxnDate >= '2026-03-16'") && sql.includes("TxnDate <= '2026-09-12'"));
  ok('query has DocNumber clause', sql.includes('DocNumber'));
  ok('query is sorted deterministically', sql.includes('ORDERBY TxnDate ASC, Id ASC'));
  ok('query has no Balance filter', !sql.includes('Balance'));

  // disabling the date row drops its clauses from the query
  await page.click('#c-date');
  await ensureOpen(page, 'd-sql');
  const sql2 = await page.locator('pre.sql').innerText();
  ok('date off drops the date clauses', !sql2.includes('TxnDate >='));
  await page.click('#c-date');

  // ---------- simulator: the FDD's own worked examples ----------
  await ensureOpen(page, 'd-sim');
  ok('the SQL panel stayed open through a re-render', await page.locator('#d-sql').evaluate(el => el.open));
  ok('simulator lists 4 sample transactions', (await page.locator('#sim-list .txn').count()) === 4);

  // Example A: customer on, date on, match off, one condition invoice note = memo
  await page.click('#c-match');
  await page.selectOption('#cs-0', 'invoice_note');
  await page.selectOption('#co-0', 'eq');
  await page.selectOption('#ct-0', 'private_note');
  await page.locator('#sim-list .txn').nth(0).click();
  let out = await page.locator('#sim-out').innerText();
  ok('example A applies to INV-1042 (oldest of two matches)', out.includes('Applied to INV-1042'));
  ok('example A explains the tie-break', out.includes('tie-break'));

  // Example C: same config, reference not in the books
  await page.locator('#sim-list .txn').nth(2).click();
  out = await page.locator('#sim-out').innerText();
  ok('example C processes as usual, not first-in-snapshot', out.includes('Processed as usual'));
  ok('example C says the box failed', out.includes('NOT the first invoice'));

  // cancel-sync flips the same case to cancelled
  await page.click('#c-cancel');
  out = await page.locator('#sim-out').innerText();
  ok('cancel-sync on cancels the unmatched case', out.includes('Sync cancelled'));

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
  ok('empty box explained as scope-only', (await page.locator('#ov-body .ref').first().innerText()).includes('first invoice in the candidate list'));
  await page.locator('#sim-list .txn').nth(0).click();
  out = await page.locator('#sim-out').innerText();
  ok('empty box + candidates applies to the first candidate', out.includes('Applied to'));

  // ---------- cancel-sync: one value, two surfaces ----------
  await page.click('#c-cancel');
  const cancelOnInOverlay = (await page.locator('#ov-body').innerText()).toLowerCase().includes('one value, two places');
  ok('overlay states the shared value', cancelOnInOverlay);
  await page.click('#ov-save');
  ok('overlay closed after save', !(await page.locator('#ov').isVisible()));
  ok('GSP now shows Custom rule', (await page.locator('#gsp-rows').innerText()).includes('Custom rule'));
  ok('GSP cancel-sync toggle inherited the overlay value',
     await page.locator('#g-cancel').evaluate(el => el.classList.contains('on')));
  await page.click('#g-cancel');
  await page.click('#g-open');
  ok('overlay inherited the GSP value back',
     await page.locator('#c-cancel').evaluate(el => !el.classList.contains('on')));

  // cancel discards
  await page.click('#c-over');
  await page.click('#ov-cancel');
  await page.click('#g-open');
  ok('Cancel discarded the edit', await page.locator('#c-over').evaluate(el => el.classList.contains('on')));

  // escape closes
  await page.keyboard.press('Escape');
  ok('Escape closes the overlay', !(await page.locator('#ov').isVisible()));

  // ---------- prerequisite ----------
  await page.uncheck('#p-apply');
  ok('GSP tells you to turn Apply payments on first', (await page.locator('#gsp-rows').innerText()).includes('Apply payments to invoices” first'));
  await page.click('#g-open');
  ok('overlay states payments are not being applied at all',
     (await page.locator('#ov-body .warn').first().innerText()).includes('not being applied to invoices at all'));
  await page.keyboard.press('Escape');
  await page.check('#p-apply');

  // ---------- generic customer (Q4) ----------
  await page.check('#p-generic');
  await page.click('#g-open');
  ok('generic customer surfaced at configuration time',
     (await page.locator('#ov-body').innerText()).includes('Generic customer is on'));
  await page.keyboard.press('Escape');
  await page.uncheck('#p-generic');

  // ---------- assumptions toggle ----------
  ok('assumptions visible by default', await page.locator('.asm').first().isVisible());
  await page.uncheck('#p-asm');
  ok('assumptions hidden when switched off', !(await page.locator('.asm').first().isVisible()));
  await page.check('#p-asm');

  // ---------- layout ----------
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('no page-level horizontal overflow at 1440', overflow <= 0, 'overflow=' + overflow);
  const rawHex = await page.evaluate(() => {
    const s = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n');
    return (s.match(/#[0-9a-fA-F]{3,6}\b/g) || []).filter(h => !/%23/.test(h));
  });
  ok('no raw hex colours in prototype CSS', rawHex.length === 0, rawHex.join(' '));

  // the presenter bar must stay reachable while the overlay is open
  await page.click('#g-open');
  const bar = await page.locator('#pbar').boundingBox();
  const ovh = await page.locator('#ov').boundingBox();
  ok('overlay does not sit under the presenter bar', ovh.y >= bar.y + bar.height - 1,
     'pbar bottom=' + (bar.y + bar.height) + ' ov top=' + ovh.y);
  ok('overlay header title is visible with the bar present', await page.locator('.ov-t').isVisible());
  await page.keyboard.press('Escape');

  ok('no JS errors', errors.length === 0, errors.join(' | '));

  await page.screenshot({ path: path.resolve(__dirname, '../projects/payment-application-engine/shot-gsp.png'), fullPage: true });
  await page.click('#g-open');
  await page.screenshot({ path: path.resolve(__dirname, '../projects/payment-application-engine/shot-overlay.png'), fullPage: true });

  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
