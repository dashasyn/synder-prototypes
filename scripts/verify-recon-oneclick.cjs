// recon-oneclick: V2 "one click" empty state + V1 kept, switcher swaps in place,
// custom link carries Stripe + clearing + last month into Finalist 1.
const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const BASE = process.env.OC_BASE || 'https://dashasyn.github.io/synder-prototypes';
const PAGE = BASE + '/projects/recon-oneclick/index.html';
let pass = 0, fail = 0;
const ok = (c, n, info) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + n + (c || info === undefined ? '' : '\n         -> ' + info)); };
(async () => {
  const b = await chromium.launch();
  for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
    console.log(`\n== ${vp.width}x${vp.height}`);
    const p = await b.newPage({ viewport: vp }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const hit = s => p.evaluate(s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return false; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!h && (h === e || e.contains(h)); }, s);
    const vis = s => p.$eval(s, e => !!e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').catch(() => false);
    await p.goto(PAGE, { waitUntil: 'networkidle' });

    console.log(' switcher contract');
    const sw = await p.evaluate(() => { const f = document.body.firstElementChild; const r = f.getBoundingClientRect(); return { cls: f.className, w: r.width, vw: innerWidth, top: r.top, bg: getComputedStyle(f).backgroundColor }; });
    ok(sw.cls === 'variant-switch', 'switcher is the first element in <body>', sw.cls);
    ok(Math.abs(sw.w - sw.vw) < 20 && sw.top === 0, 'switcher is full width at the top', JSON.stringify(sw));
    ok(sw.bg === 'rgb(26, 27, 36)', 'switcher is the dark bar', sw.bg);
    ok(!(await p.$('.strip')), 'no prototype explanation strip');
    ok(await vis('#v2') && !(await vis('#v1')), 'opens on variant 2');
    ok(await p.evaluate(() => scrollY) === 0, 'loads scrolled to the top', await p.evaluate(() => scrollY));

    console.log(' variant 2 · one click');
    ok((await p.innerText('#oc-title')).trim() === 'Reconcile August for Stripe mzkt.by', 'catchy header names month and connection', await p.innerText('#oc-title'));
    ok(/1,200\s+transactions ready to reconcile/.test(await p.innerText('.oc-ready')), 'shows 1,200 transactions ready to reconcile');
    ok((await p.innerText('#oc-acc')).includes('Stripe mzkt.by (required for Synder)'), 'preselected account is the automated one');
    ok((await p.innerText('#oc-per')).includes('Aug 1 – 31'), 'period is last month');
    ok(/QuickBooks and Stripe/.test(await p.innerText('.oc-facts')), 'says both sides are imported automatically');
    ok(await vis('#oc-unsynced') && /aren’t synced to QuickBooks yet/.test(await p.innerText('#oc-unsynced')), 'not-synced warning shown');
    ok(await p.$$eval('#v2 select, #v2 input', x => x.length) === 0, 'no form fields at all — one button');
    const btn = await p.$eval('#oc-run', e => { const c = getComputedStyle(e); return { bg: c.backgroundColor, h: c.height, kit: getComputedStyle(document.documentElement).getPropertyValue('--btn-height-lg').trim() }; });
    ok(btn.bg === 'rgb(0, 83, 204)' && btn.h === btn.kit, 'Run uses the kit primary large button', JSON.stringify(btn));
    ok(await hit('#oc-run'), 'Run is hittable');
    ok(await hit('#oc-custom'), 'custom link is hittable');
    ok(/few hours/.test(await p.innerText('.oc-time')), 'hours line under the button');
    ok(await p.$eval('.page-title', e => getComputedStyle(e).fontSize) === '28px', 'page title uses the kit H1');
    await p.click('#oc-run'); await p.waitForTimeout(100);
    ok(await vis('#oc-started') && /Reconciliation started/.test(await p.innerText('#oc-started')), 'Run → started state');
    ok(!(await vis('#oc-run')) && !(await vis('#oc-custom')), 'button and custom link gone once started');
    ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'oc-started'), 'focus moves to the started status');

    console.log(' switch in place');
    const path0 = new URL(p.url()).pathname;
    await p.click('#vs-1'); await p.waitForTimeout(80);
    ok(await vis('#v1') && !(await vis('#v2')) && new URL(p.url()).pathname === path0, 'variant 1 swaps in place, same page');
    ok(await p.$eval('#vs-1', e => e.classList.contains('on')), 'switcher marks variant 1');
    ok((await p.innerText('#v1')).includes('Last month (Aug 1 – 31)'), 'variant 1 dates moved on to August');
    const v1 = await p.$eval('#v1 .v1-card', e => getComputedStyle(e).display);
    ok(v1 === 'flex', 'variant 1 layout intact (card still two columns)', v1);
    ok(await hit('#go'), 'variant 1 Run hittable');
    await p.click('#vs-2'); await p.waitForTimeout(80);
    ok(await vis('#v2'), 'back to variant 2');

    console.log(' custom → Finalist 1 with choices carried over');
    await p.goto(PAGE, { waitUntil: 'networkidle' });
    await Promise.all([p.waitForNavigation(), p.click('#oc-custom')]);
    await p.waitForTimeout(250);
    ok(/finalist-1-sketch\.html/.test(p.url()), 'custom link opens Finalist 1', p.url());
    const f = await p.evaluate(() => ({ int: document.getElementById('f-int').value, acc: document.getElementById('f-acc').value, per: document.getElementById('f-per').value, data: !document.getElementById('grp-data').classList.contains('hidden'), auto: !document.getElementById('auto-panel').classList.contains('hidden') }));
    ok(f.int === 'stripe' && f.acc === 'clearing' && f.per === 'last_month', 'Stripe + clearing + last month preselected', JSON.stringify(f));
    ok(f.data && f.auto, 'lands on the automatic card', JSON.stringify(f));
    await p.goto(BASE + '/projects/txnrecon-setup/finalist-1-sketch.html', { waitUntil: 'load' });
    ok(await p.$eval('#f-int', e => e.value) === '' && await p.$eval('#f-acc', e => e.value) === '', 'Finalist 1 without parameters still preselects nothing');

    ok(errs.length === 0, 'no JS errors', errs.join(' | '));
    await p.close();
  }
  await b.close(); console.log(`\n${pass} passed · ${fail} failed`); process.exit(fail ? 1 : 0);
})();
