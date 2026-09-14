#!/usr/bin/env node
/**
 * verify-qx-mui.cjs — checks the Q-Explorer prototype after the MUI restyle.
 *
 * Walks every view, not just the landing one, because the restyle touched
 * 16 screens and a regression on view 12 is invisible from view 1.
 *
 * Asserts VISIBILITY, never element state (AGENTS.md): a control inside a
 * collapsed panel reports perfect state and zero liveness.
 *
 * Usage: node scripts/verify-qx-mui.cjs [url-or-path]
 */
const { chromium } = require('playwright');
const path = require('path');

const target = process.argv[2] ||
  'file://' + path.resolve(__dirname, '../projects/q-explorer-prototype/index.html');

let pass = 0; const fails = [];
const ok = (n, c, got) => c ? pass++ : fails.push(`${n}${got !== undefined ? ` — got ${JSON.stringify(got)}` : ''}`);
const rgb = h => { const n = parseInt(h.slice(1), 16);
  return `rgb(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255})`; };

const VIEWS = ['type-selection', 'wizard', 'reports-list', 'scheduled',
  'report-connection', 'chart-connection', 'raw-connection', 'report-fa',
  'chart-fa', 'ausfallmaske', 'report-punct', 'report-dqi', 'rohdaten',
  'chart-punct', 'raw-punct'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(`${e.message}`));
  await page.goto(target, { waitUntil: 'networkidle' });

  // The prototype opens on a login view that VALIDATES, so clicking the
  // button with empty fields does nothing and every later click is silently
  // intercepted by the still-present overlay. Drive the real flow.
  const login = await page.$('#view-login');
  if (login && await login.isVisible()) {
    await page.fill('#login-email', 'dasha@etc-solutions.test');
    await page.fill('#login-password', 'prototype');
    await page.click('.btn-login');
    await page.waitForTimeout(400);
    ok('login dismisses the overlay', !(await login.isVisible()));
  }

  // ── AppBar: dense 48, navy, flat ─────────────────────────────
  const bar = await page.$eval('#topbar', el => {
    const s = getComputedStyle(el);
    return { h: el.getBoundingClientRect().height, bg: s.backgroundColor, sh: s.boxShadow };
  });
  ok('AppBar is a dense 48px toolbar', Math.abs(bar.h - 48) < 1, bar.h);
  ok('AppBar is brand navy #1C2848', bar.bg === rgb('#1C2848'), bar.bg);
  ok('AppBar is flat', bar.sh === 'none', bar.sh);

  // Nothing may hide under the bar. Asserting a wrapper's top is useless --
  // the wrapper legitimately starts at 0 and offsets its children. Ask the
  // real question instead: is any visible, laid-out element overlapped?
  const underBar = await page.evaluate(() => {
    const bar = document.querySelector('#topbar');
    return [...document.querySelectorAll('body *')].filter(e => {
      if (e === bar || bar.contains(e) || e.offsetParent === null) return false;
      if (getComputedStyle(e).position === 'fixed') return false;
      const r = e.getBoundingClientRect();
      return r.top < 48 && r.height > 4 && r.width > 40;
    }).slice(0, 5).map(e => `${e.tagName}.${String(e.className).slice(0, 30)}`);
  });
  ok('nothing is hidden under the 48px bar', underBar.length === 0, underBar);

  // ── Per-view sweep ───────────────────────────────────────────
  const seen = { buttons: 0, shadowed: [], bigRadius: [], rawHex: [] };

  for (const v of VIEWS) {
    await page.evaluate(n => window.showView && window.showView(n), v);
    await page.waitForTimeout(150);

    const view = await page.$(`#view-${v}`);
    if (!view) { fails.push(`view #view-${v} missing`); continue; }
    ok(`view ${v} renders`, await view.isVisible());

    // every visible button is MUI small and flat
    const btns = await page.$$eval(
      `#view-${v} .btn, #view-${v} .btn-back, #view-${v} .cf-btn, #view-${v} .fa-infoblatt-btn`, els =>
      els.filter(e => e.offsetParent !== null).map(el => {
        const s = getComputedStyle(el);
        return { cls: el.className, fs: s.fontSize, sh: s.boxShadow,
                 tt: s.textTransform, r: s.borderTopLeftRadius };
      }));
    seen.buttons += btns.length;
    if (btns.length) seen.viewsWithButtons = (seen.viewsWithButtons || 0) + 1;
    const shadowed = btns.filter(b => b.sh !== 'none');
    if (shadowed.length) seen.shadowed.push(`${v}: ${shadowed.map(b => b.cls).join(', ')}`);
    ok(`${v}: every button is 13px (MUI sizeSmall)`,
      btns.every(b => b.fs === '13px'), [...new Set(btns.map(b => b.fs))]);
    ok(`${v}: every button is uppercase`,
      btns.every(b => b.tt === 'uppercase'), [...new Set(btns.map(b => b.tt))]);
    ok(`${v}: every button uses the 4px radius`,
      btns.every(b => b.r === '4px'), [...new Set(btns.map(b => b.r))]);

    // no visible surface may carry a shadow (overlays are hidden here)
    const surf = await page.$$eval(`#view-${v} *`, els =>
      els.filter(e => e.offsetParent !== null)
         .filter(e => { const s = getComputedStyle(e).boxShadow;
                        return s !== 'none' && !s.includes('inset'); })
         .map(e => `${e.tagName}.${(e.className || '').toString().slice(0, 30)}`));
    if (surf.length) seen.shadowed.push(`${v} surfaces: ${surf.slice(0, 3).join(', ')}`);

    // filled fields, where the view has any
    const fields = await page.$$eval(
      `#view-${v} .filter-select, #view-${v} .form-input, #view-${v} .search-input-wrapper input`,
      els => els.filter(e => e.offsetParent !== null).map(el => {
        const s = getComputedStyle(el);
        return { h: Math.round(el.getBoundingClientRect().height),
                 bg: s.backgroundColor, br: s.borderBottomLeftRadius,
                 bw: s.borderTopWidth };
      }));
    if (fields.length) {
      ok(`${v}: filled fields are 48px (size=small)`,
        fields.every(f => Math.abs(f.h - 48) <= 1), [...new Set(fields.map(f => f.h))]);
      ok(`${v}: filled fields are square-bottomed (the underline is the edge)`,
        fields.every(f => f.br === '0px'), [...new Set(fields.map(f => f.br))]);
      ok(`${v}: filled fields have no outline border`,
        fields.every(f => f.bw === '0px'), [...new Set(fields.map(f => f.bw))]);
    }

    // table heads carry the measured band and are not uppercase
    const ths = await page.$$eval(`#view-${v} thead th`, els =>
      els.filter(e => e.offsetParent !== null).map(el => {
        const s = getComputedStyle(el);
        return { bg: s.backgroundColor, tt: s.textTransform, fw: s.fontWeight };
      }));
    if (ths.length) {
      ok(`${v}: table headers are not uppercase (matches their product)`,
        ths.every(t => t.tt === 'none'), [...new Set(ths.map(t => t.tt))]);
      ok(`${v}: table headers are weight 500`,
        ths.every(t => t.fw === '500'), [...new Set(ths.map(t => t.fw))]);
    }
  }

  // A raw count is the wrong bar: most actions in this prototype are icon
  // buttons, and the detail views are unpopulated until a report is opened.
  // What matters is that text buttons were found and checked in many views.
  ok('text buttons were checked in at least 8 views',
    (seen.viewsWithButtons || 0) >= 8, { views: seen.viewsWithButtons, total: seen.buttons });

  // Detail views are empty shells until a report is opened from the list, so
  // sweeping them cold asserts nothing. Drive the app the way a user does.
  await page.evaluate(() => window.showView('reports-list'));
  await page.waitForTimeout(250);
  const preview = await page.$('#view-reports-list .action-preview');
  ok('the reports list offers a preview action', !!preview);
  if (preview) {
    await preview.click();
    await page.waitForTimeout(500);
    const opened = await page.evaluate(() => {
      const v = [...document.querySelectorAll('.view')].find(e => e.classList.contains('active'));
      return v ? { id: v.id, visible: [...v.querySelectorAll('*')].filter(e => e.offsetParent !== null).length } : null;
    });
    ok('opening a report lands on a populated detail view',
      opened && opened.id !== 'view-reports-list' && opened.visible > 60, opened);

    // and that populated view must obey the same rules
    const live = await page.evaluate(() => {
      const v = [...document.querySelectorAll('.view')].find(e => e.classList.contains('active'));
      const els = [...v.querySelectorAll('*')].filter(e => e.offsetParent !== null);
      const shadow = els.filter(e => { const s = getComputedStyle(e).boxShadow;
        return s !== 'none' && !s.includes('inset'); }).length;
      const ths = [...v.querySelectorAll('thead th')].filter(e => e.offsetParent !== null)
        .map(e => getComputedStyle(e).textTransform);
      const icons = [...v.querySelectorAll('.rpt-act-btn, .punct-act-btn, .action-icon')]
        .filter(e => e.offsetParent !== null)
        .map(e => { const r = e.getBoundingClientRect();
                    return `${Math.round(r.width)}x${Math.round(r.height)}`; });
      return { shadow, ths: [...new Set(ths)], icons: [...new Set(icons)], iconCount: icons.length };
    });
    ok('the opened report carries no drop shadows', live.shadow === 0, live.shadow);
    ok('the opened report has non-uppercase table headers',
      live.ths.every(t => t === 'none'), live.ths);
    if (live.iconCount) ok('row icon buttons in the opened report are 30px',
      live.icons.every(i => i === '30x30'), live.icons);
  }

  // Icon buttons are a different MUI component: sizeSmall is a 30px circular
  // box with a 20px glyph, so they are exempt from the 13px/uppercase rules.
  let iconBtns = 0;
  for (const v of VIEWS) {
    await page.evaluate(n => window.showView && window.showView(n), v);
    await page.waitForTimeout(80);
    const ibs = await page.$$eval(
      `#view-${v} .rpt-act-btn, #view-${v} .punct-act-btn, #view-${v} .action-icon`, els =>
      els.filter(e => e.offsetParent !== null).map(el => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), br: s.borderTopLeftRadius, sh: s.boxShadow };
      }));
    iconBtns += ibs.length;
    if (ibs.length) {
      ok(`${v}: icon buttons are a 30px circular box`,
        ibs.every(b => b.w === 30 && b.h === 30 && b.br === '50%'),
        [...new Set(ibs.map(b => `${b.w}x${b.h} r${b.br}`))]);
      ok(`${v}: icon buttons are flat`, ibs.every(b => b.sh === 'none'));
    }
  }
  ok('icon buttons were exercised too', iconBtns > 0, iconBtns);
  ok('no visible element carries a drop shadow', seen.shadowed.length === 0, seen.shadowed.slice(0, 6));

  // ── the old palette must be entirely gone from computed styles ──
  const OLD = ['#2563EB', '#E5E7EB', '#374151', '#9CA3AF', '#6B7280', '#111827'];
  await page.evaluate(n => window.showView && window.showView(n), 'reports-list');
  await page.waitForTimeout(150);
  const stale = await page.evaluate(olds => {
    const hit = [];
    for (const el of document.querySelectorAll('*')) {
      if (el.offsetParent === null) continue;
      const s = getComputedStyle(el);
      for (const p of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor']) {
        if (olds.includes(s[p])) { hit.push(`${el.tagName} ${p} ${s[p]}`); break; }
      }
    }
    return hit;
  }, OLD.map(rgb));
  ok('no element still renders a Tailwind-palette colour', stale.length === 0, stale.slice(0, 5));

  ok('no console errors', errors.length === 0, errors.slice(0, 4));

  await browser.close();
  console.log(`\n${pass} assertions passed, ${fails.length} failed`);
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
})();
