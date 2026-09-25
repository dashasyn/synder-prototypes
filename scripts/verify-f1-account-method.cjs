/* Finalist 1 — the import method follows the ACCOUNT, not just the integration. */
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
    const groups = () => p.evaluate(() => [...document.querySelectorAll('#f-acc optgroup')].map(g =>
      ({ label: g.label, ids: [...g.querySelectorAll('option')].map(o => o.value) })));
    const methods = side => p.evaluate(s => { const sel = document.querySelector('#manual-panel select[data-side="' + s + '"]');
      return sel ? [...sel.options].map(o => o.value) : null; }, side);

    await p.selectOption('#f-int', 'stripe'); await p.waitForTimeout(250);
    const g = await groups();
    ok('Stripe accounts are split into two groups', g.length === 2, JSON.stringify(g.map(x => x.label)));
    ok('first group uses the production label', g[0] && g[0].label === 'Synder accounts (automated data retrieval)');
    ok('second group uses the production label', g[1] && g[1].label === 'Synder accounts (manual file upload required)');
    ok('only the clearing accounts are in the automated group', g[0] && g[0].ids.join() === 'clearing,clearing_eur', g[0] && g[0].ids.join());
    ok('fees, sales, payouts and checking are manual', g[1] && ['fees','sales','payouts','checking'].every(id => g[1].ids.includes(id)), g[1] && g[1].ids.join());

    // clearing -> automated
    await p.selectOption('#f-acc', 'clearing'); await p.waitForTimeout(300);
    ok('Stripe clearing lands on automatic retrieval', await vis('#auto-panel'));
    ok('…with the option to set import methods', await vis('#mode-toggle'));

    // non-clearing -> manual on both sides
    await p.selectOption('#f-acc', 'fees'); await p.waitForTimeout(300);
    ok('Stripe fees does NOT offer automatic retrieval', !(await vis('#auto-panel')));
    ok('…goes straight to uploads', await vis('#manual-panel'));
    ok('…and there is no toggle back to automatic', !(await vis('#mode-toggle')));
    ok('integration side offers Manual only', JSON.stringify(await methods('integration')) === '["Manual"]', JSON.stringify(await methods('integration')));
    ok('accounting side offers Manual only', JSON.stringify(await methods('books')) === '["Manual"]', JSON.stringify(await methods('books')));
    ok('an upload is asked for on both sides', (await p.locator('#manual-panel .drop').count()) >= 2, await p.locator('#manual-panel .drop').count());
    await p.locator('#run').click(); await p.waitForTimeout(250);
    ok('Run names the missing uploads', /Upload the required files/.test(await p.locator('#run-error').innerText()), await p.locator('#run-error').innerText());

    // back to clearing restores automated and forgets files
    await p.locator('#manual-panel [data-pick]').first().click(); await p.waitForTimeout(200);
    await p.selectOption('#f-acc', 'clearing'); await p.waitForTimeout(300);
    ok('switching back to the clearing account restores automatic retrieval', await vis('#auto-panel'));
    await p.selectOption('#f-acc', 'checking'); await p.waitForTimeout(300);
    ok('files picked for another account are not carried over', (await p.locator('#manual-panel .chip').count()) === 0);

    // PayPal has no automated mode -> single manual group; clearing still offers Assisted
    await p.selectOption('#f-int', 'paypal'); await p.waitForTimeout(250);
    const gp = await groups();
    ok('PayPal shows only the manual group', gp.length === 1 && gp[0].label === 'Synder accounts (manual file upload required)', JSON.stringify(gp.map(x => x.label)));
    await p.selectOption('#f-acc', 'pp'); await p.waitForTimeout(300);
    ok('PayPal clearing still offers Assisted', (await methods('integration') || []).includes('Assisted'), JSON.stringify(await methods('integration')));
    await p.selectOption('#f-acc', 'pp_fees'); await p.waitForTimeout(300);
    ok('PayPal fees is Manual only', JSON.stringify(await methods('integration')) === '["Manual"]');

    // happy path still runs
    await p.selectOption('#f-int', 'stripe'); await p.selectOption('#f-acc', 'clearing'); await p.waitForTimeout(300);
    await p.locator('#run').click(); await p.waitForTimeout(400);
    ok('Stripe + clearing still runs automatically', /running/i.test(await p.locator('#run').innerText()));
    ok('no JS errors', errs.length === 0, errs.join('; '));
    await p.close();
  }
  console.log('\n' + pass + ' passed · ' + fail + ' failed');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
