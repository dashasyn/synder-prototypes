#!/usr/bin/env node
/**
 * verify-mui-sample.cjs — asserts the Q-Explorer MUI style sample against
 * MUI v5 defaults, at size="small" with disableElevation buttons
 * (Ignat, 2026-09-14: "We usually use small. Buttons without shadows please").
 *
 * Usage: node scripts/verify-mui-sample.cjs [url-or-path]
 */
const { chromium } = require('playwright');
const path = require('path');

const target = process.argv[2] ||
  'file://' + path.resolve(__dirname, '../projects/q-explorer-prototype/mui-sample/index.html');

let pass = 0; const fails = [];
const ok = (name, cond, got) => cond ? pass++ : fails.push(`${name}${got !== undefined ? ` — got ${JSON.stringify(got)}` : ''}`);
const near = (name, actual, expected, tol = 0.6) =>
  ok(name, Math.abs(actual - expected) <= tol, actual);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(target, { waitUntil: 'networkidle' });

  // ── Buttons: size="small" + no elevation, ever ───────────────
  const btns = await page.$$eval('.btn', els => els.map(el => {
    const s = getComputedStyle(el);
    return {
      cls: el.className, shadow: s.boxShadow, fs: s.fontSize,
      pt: parseFloat(s.paddingTop), pb: parseFloat(s.paddingBottom),
      pl: parseFloat(s.paddingLeft), pr: parseFloat(s.paddingRight),
      h: el.getBoundingClientRect().height, tt: s.textTransform, fw: s.fontWeight,
    };
  }));
  // The sample mirrors the real page, so it carries 2 text + 1 contained button.
  // The outlined variant isn't exercised here; the full restyle covers it.
  ok('buttons present (2 text + 1 contained)', btns.length >= 3, btns.length);
  ok('NO button carries a box-shadow at rest',
    btns.every(b => b.shadow === 'none'),
    btns.filter(b => b.shadow !== 'none').map(b => b.cls));
  ok('every button is 0.8125rem (13px), MUI sizeSmall',
    btns.every(b => b.fs === '13px'), [...new Set(btns.map(b => b.fs))]);
  ok('every button stays uppercase w500',
    btns.every(b => b.tt === 'uppercase' && b.fw === '500'));

  const contained = btns.filter(b => b.cls.includes('btn-contained'));
  ok('contained small padding 4px 10px',
    contained.every(b => b.pt === 4 && b.pb === 4 && b.pl === 10 && b.pr === 10),
    contained.map(b => [b.pt, b.pr, b.pb, b.pl]));
  contained.forEach((b, i) => near(`contained button ${i} height ~30.75px (small)`, b.h, 30.75, 1.2));

  const outlined = btns.filter(b => b.cls.includes('btn-outlined'));
  ok('outlined small padding 3px 9px (border makes up the 1px)',
    outlined.length === 0 || outlined.every(b => b.pt === 3 && b.pl === 9),
    outlined.map(b => [b.pt, b.pl]));

  const text = btns.filter(b => b.cls.includes('btn-text'));
  ok('text small padding 4px 5px',
    text.every(b => b.pt === 4 && b.pl === 5), text.map(b => [b.pt, b.pl]));

  // hover must not grow a shadow back
  const firstContained = await page.$('.btn-contained');
  if (firstContained) {
    await firstContained.hover();
    await page.waitForTimeout(350);
    const hv = await firstContained.evaluate(el => getComputedStyle(el).boxShadow);
    ok('contained button has no shadow on hover either', hv === 'none', hv);
  }

  ok('button icons are 18px (MUI iconSizeSmall)',
    await page.$$eval('.btn .material-icons',
      els => els.every(e => getComputedStyle(e).fontSize === '18px')));

  // ── IconButton size="small" → 30px box, 20px glyph ──────────
  const ib = await page.$$eval('.icon-button', els => els.map(el => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height),
             icon: getComputedStyle(el.querySelector('.material-icons')).fontSize };
  }));
  ok('every icon button is a 30px box', ib.every(b => b.w === 30 && b.h === 30),
    [...new Set(ib.map(b => `${b.w}x${b.h}`))]);
  ok('icon button glyphs are 20px', ib.every(b => b.icon === '20px'),
    [...new Set(ib.map(b => b.icon))]);

  // ── Filled TextField size="small" → 48px, padding 21/12/4 ───
  const fields = await page.$$eval('.field-input', els => els.map(el => {
    const s = getComputedStyle(el);
    return { h: el.getBoundingClientRect().height, pt: parseFloat(s.paddingTop),
             pb: parseFloat(s.paddingBottom), pl: parseFloat(s.paddingLeft), fs: s.fontSize };
  }));
  ok('at least 4 filled fields', fields.length >= 4, fields.length);
  ok('every filled field is 48px tall (small), not 56px (medium)',
    fields.every(f => Math.abs(f.h - 48) < 0.6), [...new Set(fields.map(f => Math.round(f.h)))]);
  ok('filled small padding 21/12/4',
    fields.every(f => f.pt === 21 && f.pb === 4 && f.pl === 12),
    fields.map(f => [f.pt, f.pb, f.pl]));
  ok('input font stays 1rem at small size', fields.every(f => f.fs === '16px'));

  // label geometry: rests centred, shrinks to 4px from the top
  const lbl = await page.$$eval('.field-label', els => els.map(el => ({
    top: parseFloat(getComputedStyle(el).top),
  })));
  ok('label rests at 13px (centred in a 48px field)',
    lbl.every(l => l.top === 13), [...new Set(lbl.map(l => l.top))]);

  const search = await page.$('.w-search .field-input');
  if (search) {
    const before = await page.$eval('.w-search .field-label',
      el => el.getBoundingClientRect().top);
    await search.click();
    await page.waitForTimeout(300);
    const after = await page.$eval('.w-search .field-label',
      el => el.getBoundingClientRect().top);
    ok('label lifts on focus (shrink animates)', after < before - 5, { before, after });
    const underline = await page.$eval('.w-search .field-root',
      el => getComputedStyle(el, '::after').transform);
    ok('focus underline scales to 2px primary',
      underline === 'none' || underline.startsWith('matrix(1,'), underline);
    await page.keyboard.press('Escape');
  }

  // ── Table size="small" (dense) → 6px 16px ───────────────────
  const cell = await page.$eval('.mui-table td', el => {
    const s = getComputedStyle(el);
    return { pt: parseFloat(s.paddingTop), pl: parseFloat(s.paddingLeft), fs: s.fontSize };
  });
  ok('dense table cell padding 6px 16px', cell.pt === 6 && cell.pl === 16, cell);
  ok('table cell font 0.875rem', cell.fs === '14px', cell.fs);

  // ── Regression: the centre of a filled filter must OPEN the list,
  //    never clear it (Critical #1, review 2026-08-27). ──────────
  const filter = await page.$('.field.w-md');
  if (filter) {
    await page.$eval('.field.w-md .field-input', el => { el.value = el.value || ''; });
    const box = await filter.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(250);
    const state = await page.$eval('.field.w-md', el => ({
      listOpen: !!el.querySelector('.field-root.open'),
      value: el.querySelector('.field-input').value,
    }));
    ok('centre-click opens the listbox (does not clear)', state.listOpen, state);
    await page.keyboard.press('Escape');
  }

  // ── Clear ✕ still pinned right and hidden when empty ────────
  const clear = await page.$('.clear-indicator');
  if (clear) {
    const [fb, cb] = await Promise.all([
      page.$eval('.field.w-md .field-root', el => el.getBoundingClientRect()),
      page.$eval('.field.w-md .clear-indicator', el => el.getBoundingClientRect()),
    ]);
    ok('clear ✕ sits in the right third of the field, never centred',
      cb.x > fb.x + fb.width * 0.66, { fieldRight: fb.x + fb.width, clearX: cb.x });
  }

  ok('no "Alle" option anywhere',
    (await page.$$eval('.option', els => els.filter(e => /^alle$/i.test(e.textContent.trim())).length)) === 0);

  ok('no console errors', errors.length === 0, errors);

  await browser.close();
  console.log(`\n${pass} assertions passed, ${fails.length} failed`);
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
})();
