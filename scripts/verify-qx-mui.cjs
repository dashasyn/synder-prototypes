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
  // ── The login screen is a view too. The first restyle pass skipped it and
  //    this verifier dismissed it in one line without ever looking, so two
  //    real bugs shipped: outlined inputs, and an opaque page background
  //    mapped onto rgba(0,0,0,0.04) so the app showed through. Check it
  //    BEFORE logging in. (Both found by Ignat, 2026-09-14.)
  const login = await page.$('#view-login');
  if (login && await login.isVisible()) {
    const shell = await page.evaluate(() => {
      const parse = c => { const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
        return m ? { a: m[4] === undefined ? 1 : +m[4] } : null; };
      const v = document.querySelector('#view-login');
      const card = document.querySelector('.login-card');
      const cs = getComputedStyle(v);
      return {
        alpha: parse(cs.backgroundColor).a,
        cardRadius: getComputedStyle(card).borderTopLeftRadius,
        cardShadow: getComputedStyle(card).boxShadow,
      };
    });
    ok('the login page is opaque — the app must not show through it',
      shell.alpha === 1, shell.alpha);
    ok('the login card uses the 4px radius', shell.cardRadius === '4px', shell.cardRadius);
    ok('the login card is flat', shell.cardShadow === 'none', shell.cardShadow);

    const li = await page.$$eval('.login-field input', els => els.map(el => {
      const s = getComputedStyle(el);
      return { h: Math.round(el.getBoundingClientRect().height),
               bw: s.borderTopWidth, br: s.borderBottomLeftRadius,
               pt: parseFloat(s.paddingTop), fs: s.fontSize };
    }));
    ok('login has both fields', li.length === 2, li.length);
    ok('login inputs are filled, not outlined', li.every(f => f.bw === '0px'),
      [...new Set(li.map(f => f.bw))]);
    ok('login inputs are 48px (size=small)', li.every(f => Math.abs(f.h - 48) <= 1),
      [...new Set(li.map(f => f.h))]);
    ok('login inputs are square-bottomed', li.every(f => f.br === '0px'),
      [...new Set(li.map(f => f.br))]);
    ok('login inputs use the filled top padding (21px)',
      li.every(f => f.pt === 21), [...new Set(li.map(f => f.pt))]);

    const lb = await page.$eval('.btn-login', el => {
      const s = getComputedStyle(el);
      return { fs: s.fontSize, tt: s.textTransform, sh: s.boxShadow, fw: s.fontWeight };
    });
    ok('login button is MUI sizeSmall typography',
      lb.fs === '13px' && lb.tt === 'uppercase' && lb.fw === '500', lb);
    ok('login button is flat', lb.sh === 'none', lb.sh);

    // the error state must actually be reachable: submit empty
    await page.click('.btn-login');
    await page.waitForTimeout(200);
    const errShown = await page.evaluate(() => {
      const e = document.getElementById('login-error');
      const f = document.getElementById('login-email');
      return { visible: !!e && e.offsetParent !== null && e.textContent.trim().length > 0,
               marked: f.classList.contains('input-error'),
               underline: getComputedStyle(f).boxShadow };
    });
    ok('submitting empty marks the field', errShown.marked, errShown);
    ok('the invalid field gets the 2px error underline',
      errShown.underline.includes('211, 47, 47'), errShown.underline);

    // The full MUI error state, modelled on their Station details form:
    // red label + red underline + red helper line, fill UNCHANGED.
    const errState = await page.evaluate(() => {
      const f = document.getElementById('login-email');
      const lab = document.getElementById('login-email-label');
      const help = document.getElementById('login-email-helper');
      const cs = getComputedStyle(f);
      return {
        labelColour: getComputedStyle(lab).color,
        helperVisible: help.offsetParent !== null,
        helperText: help.textContent.trim(),
        helperColour: getComputedStyle(help).color,
        helperSize: getComputedStyle(help).fontSize,
        fill: cs.backgroundColor,
        ariaInvalid: f.getAttribute('aria-invalid'),
        describedBy: f.getAttribute('aria-describedby'),
      };
    });
    const ERR = 'rgb(211, 47, 47)';
    ok('the label turns error-red', errState.labelColour === ERR, errState.labelColour);
    ok('a helper line appears under the field', errState.helperVisible && errState.helperText.length > 0, errState);
    ok('the helper line is error-red', errState.helperColour === ERR, errState.helperColour);
    ok('the helper line is 0.75rem (MUI FormHelperText)', errState.helperSize === '12px', errState.helperSize);
    // Measured in their screenshot: the error field and an untouched field
    // both read #F0F0F0. The fill is never tinted red. 0.09 is the hover
    // fill, which is legitimately active right after clicking the button.
    ok('the field fill is NOT tinted red — it stays the filled grey',
      ['rgba(0, 0, 0, 0.06)', 'rgba(0, 0, 0, 0.09)'].includes(errState.fill), errState.fill);
    ok('the field is announced as invalid', errState.ariaInvalid === 'true', errState.ariaInvalid);
    ok('the helper is wired to the field via aria-describedby',
      errState.describedBy === 'login-email-helper', errState.describedBy);

    // A submit-time error must not outlive the value that caused it.
    await page.fill('#login-email', 'a@b.c');
    await page.waitForTimeout(150);
    const cleared = await page.evaluate(() => {
      const f = document.getElementById('login-email');
      const help = document.getElementById('login-email-helper');
      const lab = document.getElementById('login-email-label');
      return { marked: f.classList.contains('input-error'),
               helperVisible: help.offsetParent !== null,
               labelRed: getComputedStyle(lab).color === 'rgb(211, 47, 47)' };
    });
    ok('typing a value clears the error, helper and red label',
      !cleared.marked && !cleared.helperVisible && !cleared.labelRed, cleared);
    await page.fill('#login-email', '');

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

  // ── The other two error paths, driven end to end. All three must use the
  //    same treatment, and the error must survive/clear for the right reason.
  await page.evaluate(() => window.showView('wizard'));
  await page.waitForTimeout(200);
  const custom = await page.$('#btn-custom');
  if (custom) { await custom.click(); await page.waitForTimeout(200); }
  await page.fill('#date-from', '2026-03-10');
  await page.fill('#date-to', '2026-03-01');
  await page.waitForTimeout(250);
  const range = await page.evaluate(() => {
    const to = document.getElementById('date-to');
    const h = document.getElementById('date-to-helper');
    const l = document.getElementById('date-to-label');
    return { toMarked: to.classList.contains('input-error'),
             fromMarked: document.getElementById('date-from').classList.contains('input-error'),
             helperVisible: h.offsetParent !== null,
             helperColour: getComputedStyle(h).color,
             label: getComputedStyle(l).color };
  });
  ok('a reversed date range marks both fields', range.toMarked && range.fromMarked, range);
  ok('the range message hangs off the end date, in red',
    range.helperVisible && range.helperColour === 'rgb(211, 47, 47)', range);
  ok('the end-date label turns red too', range.label === 'rgb(211, 47, 47)', range.label);

  // An error ABOUT the value must NOT vanish just because the field has one.
  await page.fill('#date-to', '2026-03-05');
  await page.waitForTimeout(250);
  const stillBad = await page.evaluate(() => ({
    marked: document.getElementById('date-to').classList.contains('input-error'),
    helperVisible: document.getElementById('date-to-helper').offsetParent !== null,
  }));
  ok('the range error survives typing while the range is still reversed',
    stillBad.marked && stillBad.helperVisible, stillBad);

  await page.fill('#date-to', '2026-03-20');
  await page.waitForTimeout(250);
  const fixed = await page.evaluate(() => ({
    toMarked: document.getElementById('date-to').classList.contains('input-error'),
    fromMarked: document.getElementById('date-from').classList.contains('input-error'),
    helperVisible: document.getElementById('date-to-helper').offsetParent !== null,
  }));
  ok('correcting the range clears both fields and the message',
    !fixed.toMarked && !fixed.fromMarked && !fixed.helperVisible, fixed);

  await page.evaluate(() => window.showView('rohdaten'));
  await page.waitForTimeout(250);
  await page.evaluate(() => window.rdRun && window.rdRun());
  await page.waitForTimeout(250);
  const thr = await page.evaluate(() => {
    const t = document.getElementById('rd-threshold');
    const h = document.getElementById('rd-threshold-helper');
    const l = document.getElementById('rd-threshold-label');
    return { marked: t.classList.contains('input-error'),
             helperVisible: h.offsetParent !== null,
             helperText: h.textContent.trim(),
             helperColour: getComputedStyle(h).color,
             label: getComputedStyle(l).color };
  });
  ok('a missing threshold marks the field, not just a toast',
    thr.marked && thr.helperVisible && thr.helperText.length > 0, thr);
  ok('the threshold message and its label are red',
    thr.helperColour === 'rgb(211, 47, 47)' && thr.label === 'rgb(211, 47, 47)', thr);

  ok('no console errors', errors.length === 0, errors.slice(0, 4));

  await browser.close();
  console.log(`\n${pass} assertions passed, ${fails.length} failed`);
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
})();
