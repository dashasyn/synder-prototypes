/* Finalist 1 — nothing preselected; the import section waits for integration + account. */
const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const URL = process.env.F1_URL || 'https://dashasyn.github.io/synder-prototypes/projects/txnrecon-setup/finalist-1-sketch.html';
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  -> ' + x : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const vp of [{ width: 1440, height: 1000 }, { width: 1280, height: 720 }]) {
    console.log('\n--- ' + vp.width + 'x' + vp.height);
    const p = await b.newPage({ viewport: vp });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL, { waitUntil: 'networkidle' });
    const vis = s => p.locator(s).first().isVisible();
    const txt = async s => (await p.locator(s).first().innerText()).trim();
    const hittable = s => p.locator(s).first().evaluate(el => { const r = el.getBoundingClientRect(); if (!r.width) return false;
      const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (el === t || el.contains(t)); });

    ok('integration starts empty', (await p.locator('#f-int').inputValue()) === '');
    ok('integration shows the production placeholder "Select..."', (await p.locator('#f-int option:checked').innerText()).trim() === 'Select...');
    ok('account starts empty', (await p.locator('#f-acc').inputValue()) === '');
    ok('account is disabled until an integration is chosen', await p.locator('#f-acc').isDisabled());
    ok('…and says why, not just disabled', (await txt('#h-acc')) === 'Select an integration first');
    ok('import section hidden before anything is chosen', !(await vis('#grp-data')));
    ok('no automatic-retrieval card on load', !(await vis('#auto-panel')));

    // Run with nothing chosen -> the validation that was unreachable before
    await p.locator('#run').click(); await p.waitForTimeout(250);
    ok('Run names the first blocker', (await txt('#run-error')) === 'Select an integration');
    ok('integration marked invalid', (await p.locator('#f-int.field-invalid').count()) === 1);

    // integration only
    await p.selectOption('#f-int', 'stripe'); await p.waitForTimeout(250);
    ok('account enables once an integration is picked', !(await p.locator('#f-acc').isDisabled()));
    ok('account is NOT auto-picked', (await p.locator('#f-acc').inputValue()) === '');
    ok('integration hint shows the timezone', (await txt('#h-int')).startsWith('Timezone:'));
    ok('import section still hidden with only the integration', !(await vis('#grp-data')));
    await p.locator('#run').click(); await p.waitForTimeout(250);
    ok('Run now asks for the account', (await txt('#run-error')) === 'Select an account');

    // both chosen
    await p.locator('#f-acc').focus();
    await p.selectOption('#f-acc', 'clearing'); await p.waitForTimeout(350);
    ok('import section appears once both are chosen', await vis('#grp-data'));
    ok('Stripe lands on automatic retrieval', await vis('#auto-panel'));
    ok('"Set import methods" toggle is live', await hittable('#mode-toggle'));
    ok('account hint shows the currency', (await txt('#h-acc')).startsWith('Currency:'));
    ok('focus stays on the account field (not stolen by the reveal)', await p.evaluate(() => document.activeElement && document.activeElement.id === 'f-acc'));
    ok('the reveal is animated, not a jump', await p.evaluate(() => document.getElementById('grp-data').classList.contains('reveal')));

    // switching integration clears the account and hides the section again
    await p.selectOption('#f-int', 'paypal'); await p.waitForTimeout(300);
    ok('changing integration clears the account', (await p.locator('#f-acc').inputValue()) === '');
    ok('…and hides the import section again', !(await vis('#grp-data')));
    await p.selectOption('#f-acc', { index: 1 }); await p.waitForTimeout(300);
    ok('PayPal + account shows the upload path', await vis('#grp-data') && await vis('#manual-panel'));

    // clearing the integration
    await p.selectOption('#f-int', ''); await p.waitForTimeout(300);
    ok('clearing the integration disables the account again', await p.locator('#f-acc').isDisabled());
    ok('…and hides the import section', !(await vis('#grp-data')));

    // happy path still runs
    await p.selectOption('#f-int', 'stripe'); await p.selectOption('#f-acc', 'clearing'); await p.waitForTimeout(300);
    await p.locator('#run').click(); await p.waitForTimeout(400);
    ok('Stripe + clearing still runs', /running/i.test(await txt('#run')) && await vis('#running'));

    ok('no horizontal overflow', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    ok('no JS errors', errs.length === 0, errs.join('; '));
    await p.close();
  }
  console.log('\n' + pass + ' passed · ' + fail + ' failed');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
