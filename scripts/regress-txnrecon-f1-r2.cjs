/**
 * Regression check — do the round-1 fixes actually hold on the LIVE page?
 * One assertion per round-1 theme. Liveness/visibility, never element state alone.
 * Read-only: touches nothing, changes nothing.
 */
const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const URL = process.env.F1_URL || 'https://dashasyn.github.io/synder-prototypes/projects/txnrecon-setup/finalist-1-sketch.html';

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n          -> ' + x : '')); } };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL, { waitUntil: 'networkidle' }); if ((await p.locator('#f-int').inputValue())==='') { await p.selectOption('#f-int','stripe'); await p.selectOption('#f-acc','clearing'); await p.waitForTimeout(250); }

  const vis = s => p.locator(s).first().isVisible().catch(() => false);
  const txt = async s => (await p.locator(s).first().count()) ? (await p.locator(s).first().innerText()).trim() : null;
  const active = () => p.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return 'body (focus lost)';
    return a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (a.className && typeof a.className === 'string' ? '.' + a.className.trim().split(/\s+/).join('.') : '');
  });
  const inViewport = s => p.locator(s).first().evaluate(el => {
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.top < window.innerHeight && r.bottom > 0;
  }).catch(() => false);

  console.log('\nTHEME 1 — a blocked Run names its blocker');
  await p.locator('#mode-toggle').click();
  await p.waitForTimeout(300);
  await p.selectOption('#manual-panel select[data-side="books"]', 'Manual');
  await p.waitForTimeout(300);
  ok('Run is NOT pre-disabled (stays in the tab order)', !(await p.locator('#run').isDisabled()));
  await p.locator('#run').click();
  await p.waitForTimeout(300);
  const msg = await txt('#run-error');
  ok('clicking Run surfaces a visible message', await vis('#run-error'), 'message text: ' + JSON.stringify(msg));
  ok('the message names the missing thing', /upload the required file/i.test(msg || ''), 'got: ' + JSON.stringify(msg));
  ok('the blocking field is marked invalid', (await p.locator('.drop.field-invalid').count()) > 0);
  ok('focus moves to the first invalid field', !/focus lost/.test(await active()), 'focus = ' + await active());
  ok('the message is in the viewport with the Run button', await inViewport('#run-error'));

  console.log('\nTHEME 1b — integration with no automatic option explains itself');
  await p.goto(URL, { waitUntil: 'networkidle' }); if ((await p.locator('#f-int').inputValue())==='') { await p.selectOption('#f-int','stripe'); await p.selectOption('#f-acc','clearing'); await p.waitForTimeout(250); }
  await p.selectOption('#f-int', 'paypal'); await p.selectOption('#f-acc', 'pp');
  await p.waitForTimeout(400);
  const body = (await p.locator('body').innerText()).toLowerCase();
  const explains = /(doesn.t|does not|no|not) (support |available|automatic)/.test(body) || /automatic.*(unavailable|not available|isn.t available)/.test(body);
  ok('PayPal state says why automatic retrieval is gone', explains,
    'no explanatory string found; toggle visible=' + (await vis('#mode-toggle')) + ', auto card visible=' + (await vis('#auto-panel')));

  console.log('\nTHEME 2 — the mode controls agree with each other');
  await p.goto(URL, { waitUntil: 'networkidle' }); if ((await p.locator('#f-int').inputValue())==='') { await p.selectOption('#f-int','stripe'); await p.selectOption('#f-acc','clearing'); await p.waitForTimeout(250); }
  const t0 = await txt('#mode-toggle');
  await p.locator('#mode-toggle').click();
  await p.waitForTimeout(350);
  const booksM = await p.locator('#manual-panel select[data-side="books"]').inputValue();
  const intM = await p.locator('#manual-panel select[data-side="integration"]').inputValue();
  ok('toggle no longer claims "Upload manually" for a hybrid state', t0 === 'Set import methods',
    'toggle label = ' + JSON.stringify(t0) + ' (books=' + booksM + ', integration=' + intM + ')');
  await p.selectOption('#manual-panel select[data-side="integration"]', 'Automated');
  await p.waitForTimeout(350);
  const blocks = await p.locator('#manual-panel .need').count();
  await p.locator('#run').click();
  await p.waitForTimeout(300);
  ok('both-Automated inside the panel is a runnable state, not a dead end',
    (await p.locator('#run').getAttribute('data-running')) === '1' || /running/i.test(await txt('#run') || ''),
    'upload blocks=' + blocks + ', run label=' + JSON.stringify(await txt('#run')) + ', error=' + JSON.stringify(await txt('#run-error')));

  console.log('\nTHEME 3 — uploaded files are not silently destroyed');
  await p.goto(URL, { waitUntil: 'networkidle' }); if ((await p.locator('#f-int').inputValue())==='') { await p.selectOption('#f-int','stripe'); await p.selectOption('#f-acc','clearing'); await p.waitForTimeout(250); }
  await p.locator('#mode-toggle').click();
  await p.waitForTimeout(300);
  await p.selectOption('#manual-panel select[data-side="books"]', 'Manual');
  await p.waitForTimeout(300);
  let guard = 0;
  while (await p.locator('#manual-panel [data-pick]').count() > 0 && guard++ < 12) {
    await p.locator('#manual-panel [data-pick]').first().click();
    await p.waitForTimeout(120);
  }
  const chipsBefore = await p.locator('#manual-panel .chip').count();
  let dialogMsg = null;
  p.once('dialog', async d => { dialogMsg = d.message(); await d.dismiss(); });
  await p.locator('#mode-toggle').click();
  await p.waitForTimeout(400);
  ok('a confirmation appears before clearing uploads', !!dialogMsg, 'dialog = ' + JSON.stringify(dialogMsg));
  const chipsAfter = await p.locator('#manual-panel .chip').count();
  ok('cancelling the confirmation keeps the files', chipsAfter === chipsBefore,
    'chips before=' + chipsBefore + ' after dismiss=' + chipsAfter);

  console.log('\nTHEME 4 — the custom date range is validated');
  await p.goto(URL, { waitUntil: 'networkidle' }); if ((await p.locator('#f-int').inputValue())==='') { await p.selectOption('#f-int','stripe'); await p.selectOption('#f-acc','clearing'); await p.waitForTimeout(250); }
  await p.selectOption('#f-per', 'custom');
  await p.waitForTimeout(200);
  await p.fill('#d-from', '2026-08-31');
  await p.fill('#d-to', '2026-08-01');
  await p.locator('#d-to').dispatchEvent('change');
  await p.waitForTimeout(250);
  await p.locator('#run').click();
  await p.waitForTimeout(300);
  const dmsg = await txt('#run-error');
  ok('a reversed range is refused', await vis('#run-error'), 'error = ' + JSON.stringify(dmsg));
  ok('the message names the date problem', /end date must be on or after/i.test(dmsg || ''), 'got: ' + JSON.stringify(dmsg));
  ok('the date inputs are marked invalid', (await p.locator('#d-from.field-invalid').count()) > 0);
  ok('the run did not start', !/running/i.test(await txt('#run') || ''));
  // future-only range
  await p.fill('#d-from', '2027-01-01');
  await p.fill('#d-to', '2027-12-31');
  await p.locator('#d-to').dispatchEvent('change');
  await p.waitForTimeout(250);
  await p.locator('#run').click();
  await p.waitForTimeout(400);
  ok('a range entirely in the future is refused', !(await p.$eval('#running', e => e.classList.contains('on'))) && !/running/i.test(await txt('#run') || ''),
    'run label=' + JSON.stringify(await txt('#run')) + ', error=' + JSON.stringify(await txt('#run-error')));

  console.log('\nTHEME 5 — accounts that cannot be reconciled');
  await p.goto(URL, { waitUntil: 'networkidle' }); if ((await p.locator('#f-int').inputValue())==='') { await p.selectOption('#f-int','stripe'); await p.selectOption('#f-acc','clearing'); await p.waitForTimeout(250); }
  const accOpts = await p.locator('#f-acc option').allInnerTexts();
  ok('P&L accounts removed from "Account to reconcile"',
    !accOpts.some(o => /fees|sales/i.test(o)), 'options still offered: ' + JSON.stringify(accOpts));
  const tip = await p.evaluate(() => {
    const t = [...document.querySelectorAll('.tip-bubble')].map(e => e.textContent.trim());
    return t.find(x => /account/i.test(x)) || null;
  });
  ok('the "any account can be reconciled" claim is gone',
    !/any quickbooks account can be reconciled/i.test(tip || ''), 'tooltip = ' + JSON.stringify(tip));

  console.log('\nTHEME 6 — the form is frozen once the run starts');
  await p.goto(URL, { waitUntil: 'networkidle' }); if ((await p.locator('#f-int').inputValue())==='') { await p.selectOption('#f-int','stripe'); await p.selectOption('#f-acc','clearing'); await p.waitForTimeout(250); }
  await p.locator('#run').click();
  await p.waitForTimeout(500);
  ok('run actually started', /running/i.test(await txt('#run') || '') || await vis('#running'), 'run label = ' + JSON.stringify(await txt('#run')));
  ok('period select is disabled after the run starts', await p.locator('#f-per').isDisabled());
  ok('integration select is disabled after the run starts', await p.locator('#f-int').isDisabled());
  const summary = (await p.locator('#running').innerText().catch(() => '')) || '';
  ok('the status states which period/integration/account was submitted',
    /aug|stripe|last month|2026/i.test(summary), 'status text = ' + JSON.stringify(summary.trim()));

  console.log('\nTHEME 7 — accessibility (never claimed fixed; checking anyway)');
  await p.goto(URL, { waitUntil: 'networkidle' }); if ((await p.locator('#f-int').inputValue())==='') { await p.selectOption('#f-int','stripe'); await p.selectOption('#f-acc','clearing'); await p.waitForTimeout(250); }
  await p.locator('#mode-toggle').click();
  await p.waitForTimeout(300);
  await p.selectOption('#manual-panel select[data-side="books"]', 'Manual');
  await p.waitForTimeout(300);
  await p.locator('#manual-panel .acc-h').first().click();
  await p.waitForTimeout(300);
  ok('focus survives expanding the how-to accordion', !/focus lost/.test(await active()), 'focus = ' + await active());
  await p.locator('#manual-panel [data-pick]').first().click();
  await p.waitForTimeout(300);
  ok('focus survives attaching a file', !/focus lost/.test(await active()), 'focus = ' + await active());
  const nameOf = await p.evaluate(() => {
    const s = document.querySelector('#manual-panel select[data-side="books"]');
    if (!s) return null;
    const lab = s.id ? document.querySelector('label[for="' + s.id + '"]') : null;
    return { id: s.id || '(none)', ariaLabel: s.getAttribute('aria-label'), labelFor: lab ? lab.textContent.trim() : null };
  });
  ok('the "Import method" select has an accessible name',
    !!(nameOf && (nameOf.ariaLabel || nameOf.labelFor)), JSON.stringify(nameOf));
  await p.locator('#manual-panel a.match-open').first().click();
  await p.waitForTimeout(400);
  const inDialog = await p.evaluate(() => {
    const d = document.querySelector('.match-modal');
    return !!d && d.contains(document.activeElement);
  });
  ok('focus moves into the Matching rules dialog', inDialog, 'focus = ' + await active());

  console.log('\n' + '─'.repeat(58));
  console.log(`  ${pass} passed · ${fail} failed · page JS errors: ${errs.length}`);
  if (errs.length) errs.forEach(e => console.log('    js error: ' + e));
  console.log('─'.repeat(58) + '\n');
  await b.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
