#!/usr/bin/env node
/**
 * verify-eo-mui.cjs — gates for the ETC optics & timing React/MUI port.
 *
 *   node scripts/verify-eo-mui.cjs                 (local, needs the :8777 server)
 *   node scripts/verify-eo-mui.cjs <published URL>
 *
 * MUI_PORT_BRIEF.md §5: layout gate first and it stops the run; visibility,
 * not state; counts compared against the page's own data, never typed in.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR = path.resolve(process.env.EO_DIR || path.resolve(__dirname, '../projects/etc-optic-timing-mui'));
const URL = process.argv[2] || 'http://localhost:8777/projects/etc-optic-timing-mui/index.html';
const CHROME = os.homedir() + '/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';

let pass = 0; const fails = [];
const ok = (cond, label, got) => { if (cond) pass++; else fails.push(label + (got !== undefined ? `  — got ${JSON.stringify(got)}` : '')); };
const section = s => console.log(`\n── ${s}`);
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

/* ── source gates ─────────────────────────────────────────────────── */
function sourceGates() {
  section('source');
  const app = strip(fs.readFileSync(path.join(DIR, 'app.js'), 'utf8'));
  const lit = [...app.matchAll(/\w+=\{(?!\$)[^}]*\}/g)].map(m => m[0]);
  ok(lit.length === 0, 'no htm prop written as a text literal (prop={x} renders the string "{x}")', lit.slice(0, 4));
  ok(!/<select[\s>]/i.test(app), 'no native <select> — menus are MUI Menus');
  const idx = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  const style = (idx.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
  const sel = [...strip(style).matchAll(/^\s*([.#a-z][^{@\n]*)\{/gm)].map(m => m[1].trim()).filter(s => !/^html|^body|#root/.test(s));
  ok(sel.length === 0, '<style> styles no component', sel);
  ok(/GENERATED — do not edit/.test(fs.readFileSync(path.join(DIR, 'data.js'), 'utf8')), 'data.js is still the generated file');
}

async function run() {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.MuiAppBar-root', { timeout: 15000 });
  await page.waitForTimeout(500);

  const count = async sel => page.locator(sel).count();
  const txt = async sel => (await page.locator(sel).first().innerText()).trim();
  const vis = async sel => page.locator(sel).first().isVisible();
  const pick = async (selectId, optionText) => {       // a real MUI Select: open the menu, click the option
    await page.click(`#${selectId}`);
    await page.waitForSelector('.MuiMenu-list');
    await page.click(`.MuiMenu-list li:has-text("${optionText}")`);
    await page.waitForTimeout(250);
  };
  const clearOverlays = async () => {
    for (let i = 0; i < 3; i++) {
      if (!(await page.$('.MuiDrawer-root, .MuiMenu-root, .MuiDialog-root'))) break;
      await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    }
  };

  /* ── GATE 0 — layout, first, and it stops the run ─────────────── */
  section('layout gate');
  const before = fails.length;
  const L = await page.evaluate(() => {
    const r = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
    const bar = document.querySelector('.MuiAppBar-root');
    return {
      vw: window.innerWidth,
      presenter: r('#presenter'), presenterFirst: document.getElementById('root').firstElementChild === document.getElementById('presenter'),
      bar: r('.MuiAppBar-root'), barBg: bar && getComputedStyle(bar).backgroundColor,
      rail: r('nav[aria-label="Sections"]'), main: r('main'),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      bg: getComputedStyle(document.body).backgroundColor,
      text: document.body.innerText.length,
    };
  });
  ok(L.presenterFirst && Math.round(L.presenter.width) === L.vw && Math.round(L.presenter.top) === 0,
     'presenter bar is the first element, at the top, full width', L.presenter);
  ok(L.bar && Math.round(L.bar.width) === L.vw, 'app bar spans the viewport', L.bar && L.bar.width);
  ok(L.barBg === 'rgb(28, 40, 72)', "app bar is ETC's navy #1C2848", L.barBg);
  ok(L.bar && Math.round(L.bar.height) === 48, 'dense 48px toolbar', L.bar && L.bar.height);
  ok(L.rail && Math.round(L.rail.width) === 56, 'the 56px icon rail is there', L.rail && L.rail.width);
  ok(L.main && L.main.width > L.vw - 80, 'content fills the rest of the width', L.main && L.main.width);
  ok(L.overflow <= 0, 'no horizontal overflow at 1440', L.overflow);
  ok(L.bg !== 'rgba(0, 0, 0, 0)' && L.bg !== 'transparent', 'page background is opaque');
  ok(L.text > 200, 'the page rendered text', L.text);
  if (fails.length > before) {
    console.log('\nLAYOUT GATE FAILED — the rest of the run is meaningless.');
    fails.slice(before).forEach(f => console.log('  ✗ ' + f));
    await browser.close(); process.exit(1);
  }
  console.log('  layout gate passes');

  /* ── theme + the table look Ignat asked for ───────────────────── */
  section('theme and tables');
  const T = await page.evaluate(() => {
    const cs = s => { const e = document.querySelector(s); return e ? getComputedStyle(e) : null; };
    const head = document.querySelector('#o-table thead');
    const th = [...document.querySelectorAll('#o-table thead th')];
    const td = document.querySelector('#o-table tbody td');
    const btn = cs('#o-add');
    const paper = document.querySelector('#o-table').closest('.MuiPaper-root');
    const icon = document.querySelector('#o-table tbody td:last-child button');
    return {
      headBg: head && getComputedStyle(head).backgroundColor,
      dividers: th.slice(0, -1).map(h => getComputedStyle(h, '::after').width),
      lastDivider: th.length ? getComputedStyle(th[th.length - 1], '::after').content : null,
      bodyDivider: td ? getComputedStyle(td, '::after').content : null,
      headWeight: th[0] && getComputedStyle(th[0]).fontWeight,
      primary: btn && btn.backgroundColor, btnShadow: btn && btn.boxShadow,
      paperBorder: paper && getComputedStyle(paper).borderTopColor, paperShadow: paper && getComputedStyle(paper).boxShadow,
      iconColor: icon && getComputedStyle(icon).color,
      pagination: !!document.querySelector('.MuiTablePagination-root'),
      firstLast: document.querySelectorAll('.MuiTablePagination-actions button').length,
    };
  });
  ok(T.headBg === 'rgb(244, 244, 244)', 'table header carries the #F4F4F4 band', T.headBg);
  ok(T.dividers.length > 0 && T.dividers.every(w => w === '1px'), 'a 1px divider between every pair of header cells', T.dividers);
  ok(T.lastDivider === 'none' || T.lastDivider === 'normal', 'no divider after the last header cell', T.lastDivider);
  ok(T.bodyDivider === 'none' || T.bodyDivider === 'normal', 'body rows carry no column dividers', T.bodyDivider);
  ok(Number(T.headWeight) >= 500, 'header labels are medium weight', T.headWeight);
  ok(T.primary === 'rgb(33, 150, 243)', 'primary is #2196F3', T.primary);
  ok(T.btnShadow === 'none', 'buttons carry no shadow', T.btnShadow);
  ok(T.paperBorder === 'rgb(231, 231, 231)' && T.paperShadow === 'none', 'tables sit in a flat #E7E7E7 outline', [T.paperBorder, T.paperShadow]);
  ok(T.iconColor === 'rgba(0, 0, 0, 0.54)', 'row icons are the classic MUI grey', T.iconColor);
  ok(T.pagination && T.firstLast === 4, 'MUI pagination with first / prev / next / last', T.firstLast);

  /* ── optics list ──────────────────────────────────────────────── */
  section('optics list');
  const opticCount = await page.evaluate(() => OPTICS.length);
  ok(await count('#o-table tbody tr[data-optic]') === opticCount, `every optic is a row (${opticCount}, read from the data)`);
  await page.fill('#o-q', '131121');
  await page.waitForTimeout(250);
  ok(await count('#o-table tbody tr[data-optic]') === 1, 'search narrows to one optic');
  await page.fill('#o-q', 'zzzz'); await page.waitForTimeout(250);
  ok(/No optics match/.test(await txt('#o-table tbody')), 'a search with no match says so');
  await page.fill('#o-q', ''); await page.waitForTimeout(250);
  await page.click('#o-station');
  await page.waitForSelector('.MuiMenu-list');
  const stOpts = await page.$$eval('.MuiMenu-list li', ls => ls.map(l => l.textContent.trim()));
  ok(!stOpts.some(o => /^all\b/i.test(o)), 'no "All" option in the Station filter', stOpts);
  await page.click('.MuiMenu-list li:has-text("1220")'); await page.waitForTimeout(250);
  ok(await count('#o-table tbody tr[data-optic]') === 4, 'Station filter narrows to station 1220\'s four optics');
  ok(await vis('button[aria-label="Clear Station"]'), 'the ✕ appears once a station is chosen');
  await page.click('button[aria-label="Clear Station"]'); await page.waitForTimeout(250);
  ok(await count('#o-table tbody tr[data-optic]') === opticCount, 'the ✕ clears the filter');
  // pagination, driven
  await page.click('.MuiTablePagination-select'); await page.waitForSelector('.MuiMenu-list');
  await page.click('.MuiMenu-list li[data-value="5"]'); await page.waitForTimeout(250);
  ok(await count('#o-table tbody tr[data-optic]') === 5, 'five rows per page');
  await page.click('.MuiTablePagination-actions button[aria-label="Go to next page"]'); await page.waitForTimeout(250);
  ok(await count('#o-table tbody tr[data-optic]') === opticCount - 5, 'next page shows the rest');
  ok(/6–6 of 6|6-6 of 6/.test(await txt('.MuiTablePagination-displayedRows')), 'range label follows', await txt('.MuiTablePagination-displayedRows'));
  await page.click('.MuiTablePagination-actions button[aria-label="Go to first page"]'); await page.waitForTimeout(200);
  await page.click('.MuiTablePagination-select'); await page.waitForSelector('.MuiMenu-list');
  await page.click('.MuiMenu-list li[data-value="25"]'); await page.waitForTimeout(250);

  /* ── optic detail ─────────────────────────────────────────────── */
  section('optic detail — full page');
  await page.click('#o-table tbody tr[data-optic="HA2 14T87"] td:first-child'); await page.waitForTimeout(400);
  ok(await page.getAttribute('main', 'data-screen') === 'optic', 'a row click opens the full page, not a drawer');
  ok(await txt('#od-title') === 'HA2 14T87', 'the title is the optic ID');
  ok(await vis('.MuiBreadcrumbs-root') && /Aramis optics/.test(await txt('.MuiBreadcrumbs-root')), 'breadcrumbs, no back button');
  ok(await vis('#od-copy') && await vis('#od-save'), 'COPY OPTIC URL + SAVE in the corner, as on Device details');
  const disabled = await page.$$eval('main input:disabled', els => els.length);
  ok(disabled >= 6, 'imported and identity fields are disabled (view only)', disabled);
  ok(await page.locator('#od-loc').isEditable() && await page.locator('#od-props').isEditable(), 'location and properties stay editable');
  await page.fill('#od-loc', 'Approach, 500 m before platform');
  await page.click('#od-save'); await page.waitForTimeout(400);
  ok(await page.getAttribute('main', 'data-screen') === 'optics', 'save returns to the list');
  ok(/500 m before platform/.test(await txt('#o-table tbody tr[data-optic="HA2 14T87"]')), 'the saved location shows in the list');

  // new optic: MUI error + helperText on the field that is wrong
  await page.click('#o-add'); await page.waitForTimeout(400);
  ok(await txt('#od-title') === 'New optic', 'Add optic opens an empty full page');
  await page.click('#od-save'); await page.waitForTimeout(250);
  ok(await page.locator('#od-id').evaluate(el => el.closest('.MuiFormControl-root').querySelector('.Mui-error') !== null),
     'saving blank marks Optic ID as an error in place');
  ok(/required/i.test(await txt('#od-id-helper-text')), 'and says why under the field', await txt('#od-id-helper-text'));
  await page.fill('#od-id', 'hA2 14t87'); await page.click('#od-save'); await page.waitForTimeout(250);
  ok(/already exists/.test(await txt('#od-id-helper-text')), 'a duplicate ID is refused, case-insensitively');
  await page.fill('#od-id', 'HA2 99T01');
  await pick('od-station', '1500 (Acre)');
  await page.fill('#od-platform', '1');
  await page.click('#od-save'); await page.waitForTimeout(400);
  ok(await count('#o-table tbody tr[data-optic]') === opticCount + 1, 'the new optic is in the list');

  // delete: refused while used, confirmed otherwise
  await page.click('#o-table tbody tr[data-optic="HA2 14T87"] button[aria-label^="Delete"]'); await page.waitForTimeout(300);
  ok(/Cannot delete/.test(await txt('.MuiSnackbar-root')), 'deleting an optic a timing row uses is refused, and says so');
  ok(!(await page.$('.MuiDialog-root')), 'no confirm dialog for a refused delete');
  await page.keyboard.press('Escape');
  await page.click('#o-table tbody tr[data-optic="HA2 99T01"] button[aria-label^="Delete"]'); await page.waitForTimeout(300);
  ok(await vis('#del-confirm'), 'an unused optic asks before deleting');
  await page.click('#del-confirm'); await page.waitForTimeout(400);
  ok(await count('#o-table tbody tr[data-optic]') === opticCount, 'and the row is gone once confirmed');

  /* ── upload popup (no real logic — Ignat, 09-28) ──────────────── */
  section('upload popup');
  const upBox = await page.locator('#o-upload').boundingBox(), addBox = await page.locator('#o-add').boundingBox();
  ok(await vis('#o-upload') && upBox.x < addBox.x && Math.abs(upBox.y - addBox.y) < 2, 'UPLOAD sits just left of ADD OPTIC, same row');
  await page.click('#o-upload'); await page.waitForTimeout(400);
  ok(await vis('#up-dialog'), 'UPLOAD opens a popup');
  ok(await page.locator('#up-go').isDisabled(), 'its Upload button waits for a file');
  ok(/FMSILA\.XML/.test(await txt('#up-dialog')), 'it names FMSILA.XML as the file');
  await page.click('#up-choose'); await page.waitForTimeout(250);
  ok(await vis('#up-file') && await vis('#up-preview'), 'choosing a file shows it and a preview');
  ok(await count('#up-preview [data-up]') === 5, 'preview: new · changed · unchanged · not in file · skipped');
  ok(/never overwritten/.test(await txt('#up-dialog')) && /Nothing is deleted/.test(await txt('#up-preview')), 'it says what is protected and that nothing is deleted');
  await page.click('#up-go'); await page.waitForTimeout(500);
  ok(!(await page.locator('#up-dialog').isVisible().catch(() => false)), 'clicking Upload closes the popup');
  ok(/uploaded/.test(await txt('.MuiSnackbar-root')), 'and confirms');
  ok(await count('#o-table tbody tr[data-optic]') === opticCount, 'the list is untouched — no real upload logic');

  /* ── position correction + Delete top right ───────────────────── */
  section('position correction · Delete in the corner');
  await page.click('#o-table tbody tr[data-optic="HA2 14T87"] td:first-child'); await page.waitForTimeout(400);
  const hdr = await page.evaluate(() => {
    const b = id => document.getElementById(id).getBoundingClientRect();
    return { del: b('od-del'), save: b('od-save'), title: b('od-title'), vw: innerWidth };
  });
  ok(Math.abs(hdr.del.top - hdr.save.top) < 2 && hdr.del.right < hdr.save.left && hdr.save.right > hdr.vw - 60,
     'DELETE OPTIC sits top right, in the row with SAVE', hdr);
  ok(hdr.del.bottom < hdr.title.bottom + 40, 'and not at the bottom of the page', hdr.del);
  await page.click('#od-del'); await page.waitForTimeout(300);
  ok(/Cannot delete/.test(await txt('.MuiSnackbar-root')), 'the header Delete keeps the used-by-timing refusal');
  await page.click('.MuiBreadcrumbs-root button'); await page.waitForTimeout(400);
  await page.click('#o-table tbody tr[data-optic="HA2 24T45"] td:first-child'); await page.waitForTimeout(400);
  ok(await page.inputValue('#od-corr') === '+1:00', 'HA2 24T45 carries a +1:00 position correction');
  ok((await txt('[data-fires]')) === '3:00', 'its trigger fires after 2:00 offset + 1:00 = 3:00', await txt('[data-fires]'));
  await page.fill('#od-corr', '-1:00'); await page.waitForTimeout(200);
  ok(/Can't be negative/.test(await txt('#od-corr-helper-text')) && await page.locator('#od-save').isDisabled(), 'a negative correction is refused and Save is off');
  await page.fill('#od-corr', '+2:00'); await page.waitForTimeout(200);
  ok((await txt('[data-fires]')) === '4:00', 'the fires-after column follows the correction live');
  await page.click('#od-save'); await page.waitForTimeout(400);

  /* ── timing ───────────────────────────────────────────────────── */
  section('station announcements timing');
  await page.click('#p-timing'); await page.waitForTimeout(400);
  const stationCount = await page.evaluate(() => STATIONS.length);
  ok(await count('#tm-table tr.station-row') === stationCount, `one row per station (${stationCount}, from the data)`);
  ok(await count('.trigger-row') === 2, '1820 is open by default with its two triggers');
  await page.click('#tm-table tr[data-station-row="1500"] td:nth-child(2)'); await page.waitForTimeout(400);
  ok(await count('.trigger-row') === 3, 'expanding 1500 shows its trigger');
  ok(await page.locator('#tm-table tr.station-row .MuiChip-label:has-text("Override")').count() > 0, 'Default / Override chips on the lead times');
  ok(await page.locator('#d-arr').isDisabled(), 'system defaults are view-only fields, like Device details "Location"');

  // the shared "Based on" control
  await page.click('.trigger-row[data-row="0"]'); await page.waitForTimeout(500);
  ok(await vis('#dr-row'), 'a trigger opens the side sheet');
  ok(await count('#r-source') === 0, 'no Planned / Forecast / Actual — optics are always actual (Ignat, 09-28)');
  ok(await vis('#r-fallback-note'), 'the fixed fallback is stated');
  ok(/actually triggers/.test(await txt('#r-preview-txt')) && /fall back to the estimated/.test(await txt('#r-preview-txt')),
     'the preview counts from the actual movement and states the fallback');
  await page.fill('#r-offset', '-1:30'); await page.waitForTimeout(200);
  ok(await page.locator('#r-offset').evaluate(el => el.closest('.MuiFormControl-root').querySelector('.Mui-error') !== null),
     'a negative offset on an optic trigger is an error in place');
  ok(/Can't be negative/.test(await txt('#r-offset-helper-text')), 'and the helper line says why');
  ok(await page.locator('#dt-save').isDisabled(), 'Save is disabled while it is negative');
  await page.click('#r-seg button[value="est"]'); await page.waitForTimeout(250);
  ok(!(await page.locator('#r-offset').evaluate(el => el.closest('.MuiFormControl-root').querySelector('.Mui-error') !== null))
     && await page.locator('#dt-save').isEnabled(), 'the same -1:30 is fine on an estimated-time trigger');
  ok(/1:30 before/.test(await txt('#r-preview-txt')), 'and reads "before"');
  await page.click('#r-seg button[value="optic"]'); await page.waitForTimeout(200);
  await page.fill('#r-offset', '+1:30'); await page.waitForTimeout(200);
  ok(/1:30 after/.test(await txt('#r-preview-txt')), 'a positive offset reads "after"');
  await page.click('#dt-save'); await page.waitForTimeout(400);
  ok(!(await page.$('#dr-row')), 'the side sheet closes on save');
  ok(/\+1:30/.test(await txt('#tm-table')), 'the offset is written to the trigger row');

  ok(/\+ 2:00 optic = 4:00/.test(await txt('#tm-table tr.trigger-row[data-row="2"]')), 'the timing row shows offset + correction = total', await txt('#tm-table tr.trigger-row[data-row="2"]'));
  await page.click('.trigger-row[data-row="2"] td:first-child'); await page.waitForTimeout(500);
  ok(await vis('#r-corr-note'), 'the trigger editor names the optic\'s correction');
  ok(/4:00 after/.test(await txt('#r-preview-txt')) && /2:00 offset \+ 2:00 position correction/.test(await txt('#r-preview-txt')),
     'the preview reads the total and how it adds up', await txt('#r-preview-txt'));
  await clearOverlays();

  // lead times: Reset only for an override
  await page.click('#edit-lead-1500'); await page.waitForTimeout(400);
  ok(await vis('#dr-station'), 'the pen opens the lead-time editor');
  ok(await page.locator('#dr-station [data-reset="arrival"]').isEnabled() && await page.locator('#dr-station [data-reset="departure"]').isDisabled(),
     'Reset is enabled only for an override');
  await page.click('#dr-station [data-reset="arrival"]'); await page.waitForTimeout(250);
  await page.click('#ds-save'); await page.waitForTimeout(400);
  ok(!/-3:00/.test(await txt('#tm-table tr[data-station-row="1500"]')), 'reset takes 1500 back to the default');

  // optic link from a trigger lands on its full page
  await page.click('[data-goto-optic]'); await page.waitForTimeout(400);
  ok(await page.getAttribute('main', 'data-screen') === 'optic', 'an optic link in the timing table opens the optic');
  await clearOverlays();

  /* ── assumptions toggle ───────────────────────────────────────── */
  section('assumptions');
  await page.click('#p-timing'); await page.waitForTimeout(300);
  ok(await count('.assume') === 0, 'assumption notes are hidden by default');
  await page.click('#p-assume'); await page.waitForTimeout(250);
  ok(await vis('.assume'), 'and appear on the toggle');
  ok(/Hide/.test(await txt('#p-assume')), 'the toggle label flips');

  section('runtime');
  ok(errors.length === 0, 'no JS errors or failed requests', errors.slice(0, 4));
  await browser.close();
}

(async () => {
  sourceGates();
  await run();
  console.log(`\n${pass} passed, ${fails.length} failed`);
  fails.forEach(f => console.log('  ✗ ' + f));
  process.exit(fails.length ? 1 : 0);
})();
