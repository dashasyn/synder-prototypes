/* Verify the MD2 rebuild of the ETC optic/timing prototype in real Chromium. */
const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../projects/etc-optic-timing/index.html');
let pass = 0, fail = 0;
const errs = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(400);

  console.log('\n— No starting screen —');
  ok('no .cover element in the document', await page.locator('.cover').count() === 0);
  ok('optics table rows visible on load', await page.locator('#o-body tr').first().isVisible());
  ok('6 optic rows rendered', await page.locator('#o-body tr').count() === 6);
  ok('page title reads "Aramis optics"', (await page.locator('#sc-optics .page-title').innerText()).trim() === 'Aramis optics');

  console.log('\n— Material Design 2 elements —');
  ok('Roboto is the rendered body font',
    (await page.evaluate(() => getComputedStyle(document.body).fontFamily)).includes('Roboto'));
  const btn = await page.evaluate(() => {
    const b = document.getElementById('o-add'), s = getComputedStyle(b);
    return { tt: s.textTransform, w: s.fontWeight, ls: s.letterSpacing, h: b.offsetHeight, bg: s.backgroundColor, sh: s.boxShadow };
  });
  ok('contained button is uppercase 500 with letter-spacing', btn.tt === 'uppercase' && btn.w === '500' && parseFloat(btn.ls) > 0.5, JSON.stringify(btn));
  ok('contained button is 36px high with elevation', btn.h === 36 && btn.sh !== 'none', JSON.stringify(btn));
  const card = await page.evaluate(() => getComputedStyle(document.querySelector('#sc-optics .card')).boxShadow);
  ok('card uses elevation rather than a border', card !== 'none');
  await page.click('#o-filters');
  const tf = await page.evaluate(() => {
    const el = document.querySelector('#o-filters-row .tf'), s = getComputedStyle(el);
    const lab = getComputedStyle(el.querySelector('label'));
    return { bg: s.backgroundColor, bb: s.borderBottomWidth, radius: s.borderTopLeftRadius, labSize: lab.fontSize, labPos: lab.position };
  });
  ok('filled text field: grey fill + bottom line + floating label',
    tf.bg === 'rgb(245, 245, 245)' && tf.bb === '1px' && tf.labPos === 'absolute' && parseFloat(tf.labSize) <= 12, JSON.stringify(tf));
  await page.focus('#o-station');
  ok('focus draws the 2px MD2 underline',
    await page.evaluate(() => getComputedStyle(document.querySelector('#o-filters-row .tf')).borderBottomWidth) === '2px');
  await page.evaluate(() => document.activeElement.blur());

  console.log('\n— Filters + pagination (functional, not decorative) —');
  await page.selectOption('#o-station', '1220');
  await page.waitForTimeout(120);
  ok('station filter narrows to 4 optics at 1220', await page.locator('#o-body tr').count() === 4);
  ok('filter count badge shows 1', (await page.locator('#o-fcount').innerText()).trim() === '1');
  await page.click('#o-clear');
  await page.waitForTimeout(120);
  ok('clear filters restores 6 rows', await page.locator('#o-body tr').count() === 6);
  ok('filter badge hidden with no filters', !(await page.locator('#o-fcount').isVisible()));
  await page.selectOption('#o-per', '5');
  await page.waitForTimeout(120);
  ok('rows per page 5 → 5 rows', await page.locator('#o-body tr').count() === 5);
  ok('range reads 1–5 of 6', (await page.locator('#o-range').innerText()).includes('1–5 of 6'));
  ok('prev/first disabled on page 1', await page.locator('#o-prev').isDisabled() && await page.locator('#o-first').isDisabled());
  await page.click('#o-next');
  await page.waitForTimeout(120);
  ok('next page shows the 6th row', await page.locator('#o-body tr').count() === 1);
  ok('range reads 6–6 of 6', (await page.locator('#o-range').innerText()).includes('6–6 of 6'));
  ok('next/last disabled on the last page', await page.locator('#o-next').isDisabled() && await page.locator('#o-last').isDisabled());
  await page.click('#o-first');
  await page.selectOption('#o-per', '25');
  await page.waitForTimeout(120);

  console.log('\n— Optic detail is a full page, not a side sheet —');
  await page.click('#o-add');
  await page.waitForTimeout(250);
  ok('optic screen is on', await page.locator('#sc-optic').isVisible());
  ok('optics list screen is hidden', !(await page.locator('#sc-optics').isVisible()));
  ok('no side sheet opened', await page.locator('.drawer.open').count() === 0);
  ok('no backdrop shown', !(await page.locator('#backdrop').evaluate(el => el.classList.contains('open'))));
  ok('breadcrumb Optics › New optic present', (await page.locator('.crumbs').innerText()).includes('Optics'));
  ok('title reads "New optic"', (await page.locator('#od-title').innerText()).trim() === 'New optic');
  ok('SAVE and CANCEL both offered', await page.locator('#od-save').isVisible() && await page.locator('#sc-optic [data-back-to-optics]').first().isVisible());
  ok('COPY OPTIC URL hidden on a new record', !(await page.locator('#od-copy').isVisible()));
  ok('new optic can enter station/platform/track', await page.locator('#od-station').isEnabled() && await page.locator('#od-platform').isEnabled());
  const detailW = await page.evaluate(() => document.querySelector('#od-body').getBoundingClientRect().width);
  ok('detail form is page-width, not 560px drawer-width', detailW > 700, 'width=' + detailW);

  console.log('\n— Create an optic —');
  await page.click('#od-save');
  await page.waitForTimeout(200);
  ok('missing ID is refused with a snackbar', (await page.locator('#toast').innerText()).includes('required'));
  await page.fill('#od-id', 'HA2 99T01');
  await page.click('#od-save');
  await page.waitForTimeout(200);
  ok('missing station is refused', (await page.locator('#toast').innerText()).includes('Station is required'));
  await page.selectOption('#od-station', '1500');
  await page.fill('#od-platform', '3');
  await page.fill('#od-track', '19');
  await page.fill('#od-loc', 'Approach, 500 m before platform');
  await page.selectOption('#od-dir', 'Westbound');
  await page.click('#od-save');
  await page.waitForTimeout(250);
  ok('returns to the list after saving', await page.locator('#sc-optics').isVisible());
  ok('new optic is in the table (7 rows)', await page.locator('#o-body tr').count() === 7);
  ok('snackbar confirms creation', (await page.locator('#toast').innerText()).includes('HA2 99T01'));
  await page.fill('#o-q', 'HA2 99T01');
  await page.waitForTimeout(120);
  ok('new optic is searchable', await page.locator('#o-body tr').count() === 1);
  await page.fill('#o-q', '');
  await page.waitForTimeout(120);

  console.log('\n— Existing optic: imported vs maintained —');
  await page.click('#o-body tr:first-child');
  await page.waitForTimeout(250);
  ok('title is the optic ID', (await page.locator('#od-title').innerText()).trim() === 'HA2 14T87');
  ok('COPY OPTIC URL offered on an existing record', await page.locator('#od-copy').isVisible());
  const dis = await page.locator('#sc-optic .tf.disabled').count();
  const en = await page.locator('#sc-optic .tf:not(.disabled)').count();
  ok('locked fields present (ID, source, status, station, platform, track)', dis === 6, 'disabled=' + dis);
  ok('maintained fields open (location, direction, properties)', en === 3, 'enabled=' + en);
  ok('FMSILA badges rendered', await page.locator('#sc-optic .c-import').count() >= 3);
  ok('Manual badges rendered', await page.locator('#sc-optic .c-manual').count() === 3);
  ok('lock icons only on imported fields', await page.locator('#sc-optic .tf.disabled label svg').count() === 3);
  ok('cross-link to the timing rows that use this optic', await page.locator('#sc-optic [data-goto-row]').count() === 1);
  await page.click('#od-del');
  await page.waitForTimeout(200);
  ok('delete blocked while a timing row uses the optic', (await page.locator('#toast').innerText()).includes('Cannot delete'));
  ok('still on the detail page after a blocked delete', await page.locator('#sc-optic').isVisible());
  await page.fill('#od-loc', 'Approach, 425 m before platform');
  await page.click('#od-save');
  await page.waitForTimeout(250);
  ok('edit saved back into the list',
    (await page.locator('#o-body tr:first-child').innerText()).includes('425 m'));

  console.log('\n— Timing screen —');
  await page.click('.side-item[data-screen="timing"]');
  await page.waitForTimeout(200);
  ok('one table only on the timing screen', await page.locator('#sc-timing table').count() === 1);
  ok('4 station rows', await page.locator('#tm-body tr.station-row').count() === 4);
  ok('1820 expanded by default with 2 triggers', await page.locator('#tm-body tr.sub.clickable').count() === 2);
  ok('Default/Override chips on the station rows', await page.locator('#tm-body .c-default').count() + await page.locator('#tm-body .c-override').count() === 12);
  await page.click('#tm-body tr.station-row:first-child');
  await page.waitForTimeout(150);
  ok('expanding 1500 adds its trigger', await page.locator('#tm-body tr.sub.clickable').count() === 3);

  console.log('\n— Shared "Based on" control (still a side sheet, by design) —');
  await page.click('#tm-body tr.sub.clickable >> nth=0');
  await page.waitForTimeout(300);
  ok('trigger editor side sheet open', await page.locator('#dr-row').evaluate(el => el.classList.contains('open')));
  ok('shared-control badge present', await page.locator('#dr-row .shared-badge').isVisible());
  ok('optic block revealed for an optic-based row', !(await page.locator('#r-optic-block').evaluate(el => el.classList.contains('hide'))));
  ok('preview sentence names the optic', (await page.locator('#r-preview-txt').innerText()).includes('HA2 14T87'));
  await page.click('#r-seg button[data-basis="est"]');
  await page.waitForTimeout(150);
  ok('switching to estimated time hides the optic block', await page.locator('#r-optic-block').evaluate(el => el.classList.contains('hide')));
  ok('preview follows the switch', (await page.locator('#r-preview-txt').innerText()).includes('estimated'));
  await page.click('#r-seg button[data-basis="optic"]');
  await page.fill('#r-offset', '-1:30');
  await page.waitForTimeout(150);
  ok('negative offset reads "before"', (await page.locator('#r-preview-txt').innerText()).includes('1:30 before'));
  await page.click('#dt-save');
  await page.waitForTimeout(250);
  ok('side sheet closed after save', await page.locator('.drawer.open').count() === 0);
  ok('offset written to the nested row', (await page.locator('#tm-body').innerText()).includes('-1:30'));

  console.log('\n— Cross-links and lead times —');
  await page.click('#tm-body [data-goto-optic] >> nth=0');
  await page.waitForTimeout(300);
  ok('optic link opens the full-page detail', await page.locator('#sc-optic').isVisible() && await page.locator('.drawer.open').count() === 0);
  await page.click('.crumbs [data-back-to-optics]');
  await page.waitForTimeout(200);
  ok('breadcrumb returns to the list', await page.locator('#sc-optics').isVisible());
  await page.click('.side-item[data-screen="timing"]');
  await page.click('#tm-body [data-station] >> nth=0');
  await page.waitForTimeout(300);
  ok('lead-time editor opens', await page.locator('#dr-station').evaluate(el => el.classList.contains('open')));
  ok('Reset enabled only for an override', await page.locator('#ds-body [data-reset="arrival"]').isEnabled() && await page.locator('#ds-body [data-reset="departure"]').isDisabled());
  await page.click('#ds-body [data-reset="arrival"]');
  await page.waitForTimeout(200);
  ok('reset switches the chip back to Default', (await page.locator('#tm-body tr.station-row:first-child').innerText()).includes('Default'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  ok('Escape closes the side sheet', await page.locator('.drawer.open').count() === 0);

  console.log('\n— Assumptions + layout —');
  await page.click('#p-assume');
  await page.waitForTimeout(150);
  ok('assumption notes appear on toggle', await page.locator('#sc-timing .assume').isVisible());
  ok('toggle label flips to Hide', (await page.locator('#p-assume').innerText()).toLowerCase().includes('hide'));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('no page-level horizontal overflow', overflow <= 0, 'overflow=' + overflow);

  console.log('\n— JS errors —');
  ok('no console/page errors', errs.length === 0, errs.join(' | '));

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
