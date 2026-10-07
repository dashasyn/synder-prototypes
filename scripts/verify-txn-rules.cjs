/* Transactions prototype — 2026-10-07 fixes, real Chromium.
   1. Variant switcher is the first element in <body>, full viewport width, above the sidebar,
      and still swaps the variant in place.
   2. Every data table is the kit's table.synder-table and its cells take the kit's styling
      (white rows, one full-width divider under every cell, 14px) — nothing hand-written on top.
   3. "1000 syncs left" lives only in the top bar, not the sidebar.
   Liveness via isVisible()/clicks, not element state. */
const { chromium } = require('playwright');
const path = require('path');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../reports/transactions-prototype/index.html');

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + x : '')); } };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  /* 1 — switcher */
  const sw = await page.evaluate(() => {
    const vs = document.querySelector('.variant-switch'), r = vs.getBoundingClientRect();
    const sb = document.querySelector('.sidebar').getBoundingClientRect();
    const tb = document.querySelector('.topbar').getBoundingClientRect();
    const sizes = [vs, ...vs.querySelectorAll('*')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
      .map(e => parseFloat(getComputedStyle(e).fontSize));
    return { first: document.body.firstElementChild === vs, insideMain: !!vs.closest('.main'),
      x: r.left, y: r.top, w: Math.round(r.width), vw: document.documentElement.clientWidth,
      bottom: Math.round(r.bottom), sbTop: Math.round(sb.top), tbTop: Math.round(tb.top), minFont: Math.min(...sizes),
      bodyH: document.body.scrollHeight, vh: innerHeight };
  });
  ok('switcher is the first element in <body>', sw.first);
  ok('switcher is not inside .main', !sw.insideMain);
  ok('switcher spans the full viewport width from x=0', sw.x === 0 && sw.w === sw.vw, `${sw.x}/${sw.w}/${sw.vw}`);
  ok('switcher sits at the very top', sw.y === 0, sw.y);
  ok('sidebar starts under the switcher', sw.sbTop === sw.bottom, `${sw.sbTop} vs ${sw.bottom}`);
  ok('top bar starts under the switcher', sw.tbTop === sw.bottom, `${sw.tbTop} vs ${sw.bottom}`);
  ok('page does not grow past the viewport (no double scroll)', sw.bodyH <= sw.vh, `${sw.bodyH} > ${sw.vh}`);
  ok('switcher text is ≥14px', sw.minFont >= 14, sw.minFont);
  await page.click('#vs-2');
  ok('variant 2 button is on after click', await page.locator('#vs-2.on').isVisible());
  await page.click('#vs-1');
  ok('variant 1 button is on after switching back', await page.locator('#vs-1.on').isVisible());

  /* 3 — syncs left */
  ok('sidebar has no "syncs left"', !(await page.locator('.sidebar').innerText()).includes('syncs left'));
  ok('top bar still shows "syncs left"', await page.locator('.topbar-balance').isVisible() &&
     (await page.locator('.topbar-balance').innerText()).includes('syncs left'));
  ok('"syncs left" appears exactly once on the page', await page.locator('text=syncs left').count() === 1,
     await page.locator('text=syncs left').count());

  /* 2 — tables */
  const checkTable = async (label) => page.evaluate(() => {
    const out = [];
    for (const t of document.querySelectorAll('table')) {
      if (t.getBoundingClientRect().height === 0) continue;
      if (!t.tHead) continue; // kv-table is a key/value list, not a data table
      const tw = Math.round(t.getBoundingClientRect().width);
      const cells = [...t.querySelectorAll('th,td')];
      const bad = [];
      for (const c of cells) {
        const cs = getComputedStyle(c);
        if (cs.backgroundColor !== 'rgb(255, 255, 255)' && !c.closest('tr:hover')) bad.push('bg ' + cs.backgroundColor);
        if (cs.borderBottomWidth !== '1px' || cs.borderBottomStyle !== 'solid') bad.push('divider ' + cs.borderBottomWidth);
        if (cs.borderBottomColor !== 'rgb(223, 228, 236)') bad.push('divider colour ' + cs.borderBottomColor);
        if (cs.borderLeftWidth !== '0px' || cs.borderRightWidth !== '0px') bad.push('vertical border');
      }
      const small = [...t.querySelectorAll('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
        .filter(e => !e.classList.contains('plat-logo') && parseFloat(getComputedStyle(e).fontSize) < 14)
        .map(e => e.tagName + '.' + e.className + ' ' + getComputedStyle(e).fontSize);
      // every row's divider runs the full table width
      const rowWidths = [...t.rows].map(r => Math.round([...r.cells].reduce((a, c) => a + c.getBoundingClientRect().width, 0)));
      out.push({ id: t.id || t.className, kit: t.classList.contains('synder-table'), bad: [...new Set(bad)], small: [...new Set(small)],
        fullRows: rowWidths.every(w => Math.abs(w - tw) <= 1), th: t.tHead.rows[0].cells[1] && getComputedStyle(t.tHead.rows[0].cells[1]).height });
    }
    return out;
  });

  const list = await checkTable();
  // dashboard is the landing page — go to the list
  await page.evaluate(() => showPage('list'));
  await page.waitForTimeout(300);
  const tl = (await checkTable()).find(t => t.id === 'main-table');
  ok('main table is rendered', !!tl);
  if (tl) {
    ok('main table is table.synder-table', tl.kit);
    ok('main table cells: white, one 1px kit divider, no vertical borders', tl.bad.length === 0, tl.bad.join('; '));
    ok('main table dividers run the full table width', tl.fullRows);
    ok('main table has no text under 14px (logo glyph exempt)', tl.small.length === 0, tl.small.join('; '));
    ok('main table header is the kit 56px height', tl.th === '56px', tl.th);
  }
  ok('main table rows render', await page.locator('#txn-tbody tr').first().isVisible());
  // selection still highlights a row in the kit's way and the bulk toolbar still opens
  await page.locator('#txn-tbody input[type=checkbox]').first().check();
  ok('selected row takes the kit selected background', await page.evaluate(() => {
    const td = document.querySelector('#txn-tbody tr td'); return getComputedStyle(td).backgroundColor !== 'rgb(255, 255, 255)';
  }));
  ok('bulk toolbar visible after selecting', await page.locator('#bulk-toolbar').isVisible());
  await page.locator('#txn-tbody input[type=checkbox]').first().uncheck();

  // detail page: open via a row click
  await page.locator('#txn-tbody tr').first().click({ position: { x: 300, y: 20 } });
  await page.waitForTimeout(300);
  let det = (await checkTable()).filter(t => /log-table|time-table/.test(t.id));
  if (det.length < 2) { await page.evaluate(() => showPage('detail')); await page.waitForTimeout(300); det = (await checkTable()).filter(t => /log-table|time-table/.test(t.id)); }
  ok('detail page shows the sync log and sync time tables', det.length === 2, det.map(d => d.id).join(','));
  for (const d of det) {
    ok(`${d.id}: table.synder-table`, d.kit);
    ok(`${d.id}: kit cells and dividers`, d.bad.length === 0, d.bad.join('; '));
    ok(`${d.id}: no text under 14px`, d.small.length === 0, d.small.join('; '));
  }

  ok('no page errors', errs.length === 0, errs.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
