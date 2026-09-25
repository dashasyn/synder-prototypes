// Finalist 1 — demo import-method model (2026-09-25):
// QuickBooks stays Automated|Manual for every account; "Set import methods" opens on
// Automated/Automated; a line says why automatic retrieval isn't on offer; no period
// may reach today. Real Chromium, two viewports, liveness via elementFromPoint.
const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const URL = process.env.F1_URL || 'https://dashasyn.github.io/synder-prototypes/projects/txnrecon-setup/finalist-1-sketch.html';
const iso = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
let pass = 0, fail = 0;
const ok = (c, name, info) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + name + (c || info === undefined ? '' : '\n         -> ' + info)); };
(async () => {
  const b = await chromium.launch();
  for (const vp of [{ width: 1440, height: 1000 }, { width: 1280, height: 720 }]) {
    console.log(`\n== ${vp.width}x${vp.height}`);
    const p = await b.newPage({ viewport: vp }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const load = async (int, acc) => { await p.goto(URL, { waitUntil: 'load' }); if (int) await p.selectOption('#f-int', int); if (acc) await p.selectOption('#f-acc', acc); await p.waitForTimeout(150); };
    const sel = side => p.$eval(`.msel select[data-side=${side}]`, s => ({ v: s.value, o: [...s.options].map(x => x.value) })).catch(() => null);
    const drops = side => p.$$eval('#sources .src', (srcs, side) => { const i = side === 'books' ? 0 : 1; return srcs[i] ? srcs[i].querySelectorAll('[data-pick],.chip').length : -1; }, side);
    const hit = s => p.evaluate(s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return false; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!h && (h === e || e.contains(h)); }, s);
    const note = () => p.$eval('#manual-note', e => e.classList.contains('hidden') ? '' : e.innerText.trim()).catch(() => null);
    const run = async () => { await p.click('#run'); await p.waitForTimeout(150); return { err: (await p.innerText('#run-error')).trim(), started: await p.$eval('#running', e => e.classList.contains('on')) }; };

    console.log(' QuickBooks stays Automated for non-clearing accounts');
    for (const acc of ['fees', 'checking']) {
      await load('stripe', acc);
      const bk = await sel('books'), it = await sel('integration');
      ok(bk && bk.v === 'Automated', `${acc}: QuickBooks method is Automated`, JSON.stringify(bk));
      ok(bk && bk.o.join('/') === 'Automated/Manual', `${acc}: QuickBooks offers Automated and Manual`, JSON.stringify(bk));
      ok(await drops('books') === 0, `${acc}: no QuickBooks upload asked for`, await drops('books'));
      ok(it && it.o.join('/') === 'Manual', `${acc}: Stripe side is Manual only`, JSON.stringify(it));
      ok(await drops('integration') === 1, `${acc}: exactly one Stripe upload`, await drops('integration'));
      const n = await note();
      ok(!!n && /only available for the Stripe clearing account/.test(n) && /Stripe mzkt\.by \(required for Synder\)/.test(n), `${acc}: a line says why, and names the clearing account`, n);
      ok(await hit('#manual-note'), `${acc}: that line is visible and on top`);
      await p.click('#sources [data-pick]'); await p.waitForTimeout(100);
      const r = await run(); ok(r.started && !r.err, `${acc}: runs with only the Stripe file`, JSON.stringify(r));
    }
    await load('stripe', 'fees');
    await p.selectOption('.msel select[data-side=books]', 'Manual'); await p.waitForTimeout(100);
    ok(await drops('books') === 1, 'fees: QuickBooks Manual still available and asks for its file', await drops('books'));

    console.log(' "Set import methods" opens on Automated / Automated');
    await load('stripe', 'clearing');
    ok(await note() === '', 'clearing: no reason line on the automatic card', await note());
    await p.click('#mode-toggle'); await p.waitForTimeout(150);
    const bk = await sel('books'), it = await sel('integration');
    ok(bk && bk.v === 'Automated', 'QuickBooks stays Automated after opening', JSON.stringify(bk));
    ok(it && it.v === 'Automated', 'Stripe stays Automated after opening', JSON.stringify(it));
    ok(it && it.o.join('/') === 'Automated/Assisted/Manual', 'Assisted and Manual are still offered and visible', JSON.stringify(it));
    ok(await hit('.msel select[data-side=integration]'), 'Stripe method select is hittable');
    ok(await p.$$eval('#sources [data-pick]', x => x.length) === 0, 'no uploads appear just from opening');
    ok(await note() === '', 'no reason line when automatic is available', await note());
    let r = await run(); ok(r.started && !r.err, 'Run works straight after opening, no upload needed', JSON.stringify(r));
    await load('stripe', 'clearing'); await p.click('#mode-toggle'); await p.selectOption('.msel select[data-side=integration]', 'Assisted'); await p.waitForTimeout(100);
    ok(await p.$$eval('#sources [data-pick]', x => x.length) === 2, 'picking Assisted then asks for its two files');

    console.log(' integrations with no automatic retrieval explain themselves');
    for (const [int, short] of [['paypal', 'PayPal'], ['shopify', 'Shopify']]) {
      await load(int, int === 'paypal' ? 'pp' : 'sh');
      const n = await note();
      ok(!!n && n.includes(`isn’t available for ${short}`), `${short}: a line says automatic retrieval isn't available`, n);
      ok((await sel('books') || {}).v === 'Automated', `${short}: QuickBooks on Automated`);
    }

    console.log(' the period can’t reach today');
    await load('stripe', 'clearing'); await p.selectOption('#f-per', 'custom');
    ok(await p.$eval('#d-to', e => e.max) === iso(-1) && await p.$eval('#d-from', e => e.max) === iso(-1), 'date inputs stop at yesterday', await p.$eval('#d-to', e => e.max));
    const custom = async (f, t) => { await load('stripe', 'clearing'); await p.selectOption('#f-per', 'custom'); await p.fill('#d-from', f); await p.fill('#d-to', t); await p.dispatchEvent('#d-to', 'change'); return run(); };
    r = await custom(iso(30), iso(45)); ok(!r.started && r.err === 'The period must end before today', 'a future-only range is refused with a named reason', JSON.stringify(r));
    ok(await p.$eval('#d-to', e => e.classList.contains('field-invalid')), 'the end date is marked invalid');
    r = await custom(iso(-20), iso(0)); ok(!r.started && r.err === 'The period must end before today', 'a range ending today is refused', JSON.stringify(r));
    r = await custom(iso(-20), iso(-1)); ok(r.started && !r.err, 'a range ending yesterday runs', JSON.stringify(r));
    r = await custom('2026-08-31', '2026-08-01'); ok(!r.started && /on or after/.test(r.err), 'a reversed range is still refused', JSON.stringify(r));
    await load('stripe', 'clearing'); r = await run(); ok(r.started, 'the default Last month still runs');

    ok(errs.length === 0, 'no JS errors', errs.join(' | '));
    await p.close();
  }
  await b.close();
  console.log(`\n${pass} passed · ${fail} failed`); process.exit(fail ? 1 : 0);
})();
