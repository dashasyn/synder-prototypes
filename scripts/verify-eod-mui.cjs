#!/usr/bin/env node
/**
 * verify-eod-mui.cjs — gates for projects/etc-optics-devices-mui
 * (optics with one offset per device, two options).
 *
 *   node scripts/verify-eod-mui.cjs <URL>
 *
 * Layout gate first and it stops the run; visibility, not state; counts
 * read from the page's own data, never typed in.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR = path.resolve(process.env.EOD_DIR || path.resolve(__dirname, '../projects/etc-optics-devices-mui'));
const URL = process.argv[2] || 'http://localhost:8792/projects/etc-optics-devices-mui/index.html';
const CHROME = os.homedir() + '/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';

let pass = 0; const fails = [];
const ok = (cond, label, got) => { if (cond) pass++; else fails.push(label + (got !== undefined ? `  — got ${JSON.stringify(got)}` : '')); };
const section = s => console.log(`\n── ${s}`);
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

function sourceGates() {
  section('source');
  const app = strip(fs.readFileSync(path.join(DIR, 'app.js'), 'utf8'));
  const lit = [...app.matchAll(/\w+=\{(?!\$)[^}]*\}/g)].map(m => m[0]);
  ok(lit.length === 0, 'no htm prop written as a text literal', lit.slice(0, 4));
  ok(!/<select[\s>]/i.test(app), 'no native <select>');
  ok(!/Planned|Forecast|Business rule|lead time|trigger/i.test(app.replace(/triggers this optic|triggers the optic/g, '')),
     'nothing per rule is left: no triggers, rules, lead times or time sources');
}

async function run() {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.MuiAppBar-root', { timeout: 15000 });
  await page.waitForTimeout(400);

  const count = async sel => page.locator(sel).count();
  const txt = async sel => (await page.locator(sel).first().innerText()).trim();
  const vis = async sel => page.locator(sel).first().isVisible().catch(() => false);
  const wait = ms => page.waitForTimeout(ms);
  const pick = async (selectId, optionText) => {
    await page.click(`#${selectId}`); await page.waitForSelector('.MuiMenu-list');
    await page.click(`.MuiMenu-list li:has-text("${optionText}")`); await wait(250);
  };
  const menu = async () => {
    await page.click('#nav-systems'); await page.waitForSelector('#systems-menu .MuiMenu-list');
    const items = await page.$$eval('#systems-menu .MuiMenu-list li', ls => ls.map(l => l.textContent.replace('chevron_right', '').trim()));
    return items;
  };
  const nav = async key => { await page.click('#nav-systems'); await page.waitForSelector('#systems-menu .MuiMenu-list'); await page.click(`#systems-menu li[data-nav="${key}"]`); await wait(350); };
  const errorOn = async id => page.locator('#' + id).evaluate(el => el.closest('.MuiFormControl-root').querySelector('.Mui-error') !== null);
  const url0 = page.url();

  /* ── GATE 0 — layout ─────────────────────────────────────────────── */
  section('layout gate');
  const before = fails.length;
  const L = await page.evaluate(() => {
    const r = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
    return {
      vw: innerWidth, sw: r('#variant-switch'),
      first: document.getElementById('root').firstElementChild === document.getElementById('variant-switch'),
      bar: r('.MuiAppBar-root'), barBg: getComputedStyle(document.querySelector('.MuiAppBar-root')).backgroundColor,
      rail: r('nav[aria-label="Sections"]'), overflow: document.documentElement.scrollWidth - innerWidth,
      text: document.body.innerText.length,
    };
  });
  ok(L.first && Math.round(L.sw.width) === L.vw && Math.round(L.sw.top) === 0, 'variant switcher is the first element, top, full width', L.sw);
  ok(L.bar && Math.round(L.bar.width) === L.vw && Math.round(L.bar.height) === 48, 'navy 48px app bar spans the viewport', L.bar);
  ok(L.barBg === 'rgb(28, 40, 72)', "app bar is ETC's navy", L.barBg);
  ok(L.rail && Math.round(L.rail.width) === 56, '56px icon rail');
  ok(L.overflow <= 0, 'no horizontal overflow at 1440', L.overflow);
  ok(L.text > 200, 'the page rendered');
  if (fails.length > before) { console.log('\nLAYOUT GATE FAILED'); fails.slice(before).forEach(f => console.log('  ✗ ' + f)); await browser.close(); process.exit(1); }
  console.log('  layout gate passes');

  /* ── option 1: separate optics list ──────────────────────────────── */
  section('option 1 · menu');
  ok(await page.getAttribute('main', 'data-variant') === '1' && await page.getAttribute('main', 'data-screen') === 'optics', 'opens on option 1, the Optics list — no intro screen');
  let items = await menu();
  const di = items.indexOf('Devices');
  ok(di >= 0 && items[di + 1] === 'Optics list', '"Optics list" is the line right below Devices', items);
  ok(['Identity', 'Stations', 'Timetables', 'Schema editor', 'Message templates'].every(x => items.includes(x)), 'the rest of the Systems menu as captured', items);
  await page.keyboard.press('Escape'); await wait(250);

  section('option 1 · optics list');
  const nOptics = await page.evaluate(() => OPTICS.length);
  ok(await count('#o-table tbody tr[data-optic]') === nOptics, `every optic is a row (${nOptics}, from the data)`);
  const heads = await page.$$eval('#o-table thead th', t => t.map(x => x.textContent.trim()).filter(Boolean));
  ok(JSON.stringify(heads) === JSON.stringify(['Optic ID', 'Station', 'Platform', 'Aramis track', 'Offset', 'Status']), 'simple columns: ID, station, platform, track, offset, status', heads);
  ok(await txt('#o-table tr[data-optic="HA2 24T45"] [data-offset]') === '1:00', 'the offset shows in the list');
  const up = await page.locator('#upload-btn').boundingBox(), add = await page.locator('#add-btn').boundingBox();
  ok(up && add && up.x < add.x && Math.abs(up.y - add.y) < 2 && add.x + add.width > 1440 - 60, 'UPLOAD then ADD OPTIC, top right');
  await page.fill('#q', '131121'); await wait(250);
  ok(await count('#o-table tbody tr[data-optic]') === 1, 'search narrows');
  await page.fill('#q', ''); await wait(200);
  ok(!(await vis('#filters')), 'filters are closed until FILTERS is pressed');
  await page.click('#filters-btn'); await wait(250);
  ok(await vis('#f-station'), 'FILTERS opens station + platform');
  await pick('f-station', '1220');
  ok(await count('#o-table tbody tr[data-optic]') === 4 && /Filters \(1\)/i.test(await txt('#filters-btn')), 'station filter narrows to 1220 and the button counts it');
  await page.click('button[aria-label="Clear Station"]'); await wait(250);
  ok(await count('#o-table tbody tr[data-optic]') === nOptics, '✕ clears it');

  section('option 1 · optic details');
  await page.click('#o-table tr[data-optic="HA2 14T87"] td:first-child'); await wait(400);
  ok(await page.getAttribute('main', 'data-screen') === 'detail' && await txt('#dd-title') === 'HA2 14T87', 'a row opens the optic page');
  ok(/Optics list/.test(await txt('.MuiBreadcrumbs-root')) && /Optic details/.test(await txt('.MuiBreadcrumbs-root')), 'breadcrumb Optics list › Optic details');
  const hdr = await page.evaluate(() => ['dd-del', 'dd-copy', 'dd-save'].map(i => document.getElementById(i).getBoundingClientRect()));
  ok(hdr.every(b => Math.abs(b.top - hdr[2].top) < 2) && hdr[0].right < hdr[1].left && hdr[2].right > 1440 - 60, 'DELETE · COPY URL · SAVE, top right, one row');
  ok(await vis('#card-general') && await vis('#card-location') && await vis('#card-offset') && !(await vis('#card-hardware')), 'cards: General · Location · Offset — no Hardware');
  ok(await page.locator('#dd-id').isDisabled() && await page.locator('#dd-platform').isDisabled(), 'ID and imported location are view only');
  ok(await page.locator('#dd-offset').isEditable(), 'the offset is editable');
  await page.fill('#dd-offset', '-0:30'); await wait(200);
  ok(await errorOn('dd-offset') && /Can't be negative/.test(await txt('#dd-offset-helper-text')) && await page.locator('#dd-save').isDisabled(), 'a negative offset is refused in place and SAVE is off');
  await page.fill('#dd-offset', '2:5'); await wait(200);
  ok(/m:ss/.test(await txt('#dd-offset-helper-text')), 'a malformed offset says the format');
  await page.fill('#dd-offset', '2:15'); await wait(200);
  await page.click('#dd-save'); await wait(400);
  ok(await page.getAttribute('main', 'data-screen') === 'optics' && await txt('#o-table tr[data-optic="HA2 14T87"] [data-offset]') === '2:15', 'save returns to the list with the new offset');

  section('option 1 · add + delete');
  await page.click('#add-btn'); await wait(400);
  ok(await txt('#dd-title') === 'New optic' && !(await vis('#dd-del')), 'ADD OPTIC opens an empty page, no Delete yet');
  ok(await page.locator('#dd-platform').isEditable(), 'location is editable on a new optic');
  await page.click('#dd-save'); await wait(250);
  ok(/required/.test(await txt('#dd-id-helper-text')), 'blank ID is refused in place');
  await page.fill('#dd-id', 'ha2 24t45'); await page.click('#dd-save'); await wait(250);
  ok(/already exists/.test(await txt('#dd-id-helper-text')), 'a duplicate ID is refused, case-insensitively');
  await page.fill('#dd-id', 'HA2 99T01'); await pick('dd-station', 'AKO - Akko');
  await page.fill('#dd-platform', '1'); await page.fill('#dd-offset', '0:45');
  await page.click('#dd-save'); await wait(400);
  ok(await count('#o-table tbody tr[data-optic]') === nOptics + 1 && await txt('#o-table tr[data-optic="HA2 99T01"] [data-offset]') === '0:45', 'the new optic is in the list with its offset');
  await page.click('#o-table tr[data-optic="HA2 99T01"] td:first-child'); await wait(400);
  await page.click('#dd-del'); await wait(300);
  ok(await vis('#del-confirm'), 'DELETE asks first — nothing blocks it any more');
  await page.click('#del-confirm'); await wait(400);
  ok(await page.getAttribute('main', 'data-screen') === 'optics' && await count('#o-table tbody tr[data-optic]') === nOptics, 'deleted, back on the list');

  section('option 1 · upload popup');
  await page.click('#upload-btn'); await wait(400);
  ok(await vis('#up-dialog') && await page.locator('#up-go').isDisabled(), 'UPLOAD opens the popup; its Upload waits for a file');
  await page.click('#up-choose'); await wait(250);
  ok(await count('#up-preview [data-up]') === 5, 'preview: new · changed · unchanged · not in file · skipped');
  ok(/Offsets are set here and never overwritten/.test(await txt('#up-dialog')), 'it says offsets are protected');
  await page.click('#up-go'); await wait(500);
  ok(!(await vis('#up-dialog')) && /uploaded/.test(await txt('.MuiSnackbar-root')), 'Upload closes it and confirms');
  ok(await count('#o-table tbody tr[data-optic]') === nOptics, 'no real upload logic — the list is untouched');

  section('option 1 · Device list unchanged');
  await nav('devices');
  const nDevices = await page.evaluate(() => DEVICES.length);
  ok(await count('#d-table tbody tr[data-device]') === nDevices && await count('#d-table tr[data-kind="optic"]') === 0, 'Device list holds only the captured devices');
  const dheads = await page.$$eval('#d-table thead th', t => t.map(x => x.textContent.trim()).filter(Boolean));
  ok(JSON.stringify(dheads) === JSON.stringify(['Device Name', 'Device ID', 'Device Type', 'Version', 'Status', 'Network Address (Primary)', 'Station', 'Output Zone']), 'the captured Device list columns, no Offset', dheads);
  ok(!(await vis('#upload-btn')), 'no upload on the Device list in option 1');

  /* ── option 2: optics inside the Device list ─────────────────────── */
  section('option 2 · switch in place');
  await page.click('#vs-2'); await wait(400);
  ok(page.url() === url0, 'switching variants keeps the same page');
  ok(await page.getAttribute('main', 'data-variant') === '2' && await page.getAttribute('main', 'data-screen') === 'devices', 'option 2 lands on the Device list');
  items = await menu();
  ok(!items.includes('Optics list'), 'no "Optics list" in the menu', items);
  await page.keyboard.press('Escape'); await wait(250);

  section('option 2 · device list');
  const nOpt2 = await page.evaluate(() => OPTICS.length);
  ok(await count('#d-table tbody tr[data-device]') === nDevices + nOpt2, `devices + optics in one table (${nDevices}+${nOpt2})`);
  const dheads2 = await page.$$eval('#d-table thead th', t => t.map(x => x.textContent.trim()).filter(Boolean));
  ok(dheads2[dheads2.length - 1] === 'Offset', 'an Offset column is added at the end', dheads2);
  ok(/Optic/.test(await txt('#d-table tr[data-device="HA2 24T45"]')) && await txt('#d-table tr[data-device="HA2 24T45"] [data-offset]') === '1:00', 'optic rows: type Optic, their offset');
  ok(await txt('#d-table tr[data-device="hga-plat-2"] [data-offset]') === '–', 'other devices show – for offset');
  ok(await vis('#upload-btn') && /Upload optics/i.test(await txt('#upload-btn')), 'UPLOAD OPTICS sits by ADD DEVICE');
  await page.click('#filters-btn'); await wait(250);
  await pick('f-type', 'Optic');
  ok(await count('#d-table tbody tr[data-device]') === nOpt2, 'Device Type = Optic narrows to the optics');
  await page.click('button[aria-label="Clear Device Type"]'); await wait(250);

  section('option 2 · optic vs device details');
  await page.click('#d-table tr[data-device="HA2 24T45"] td:first-child'); await wait(400);
  ok(/Devices/.test(await txt('.MuiBreadcrumbs-root')) && /Device details/.test(await txt('.MuiBreadcrumbs-root')), 'an optic opens Device details');
  ok(/Delete device/i.test(await txt('#dd-del')) && /Copy device URL/i.test(await txt('#dd-copy')), 'device wording on the corner buttons');
  ok(await vis('#card-offset') && !(await vis('#card-hardware')) && !(await vis('#dd-name')), 'optic details: Offset card, no Hardware, no separate name');
  ok((await txt('#dd-type')) === 'Optic' && await page.locator('#dd-type').getAttribute('aria-disabled') === 'true', 'type is Optic and locked');
  await page.fill('#dd-offset', '1:30'); await page.click('#dd-save'); await wait(400);
  ok(await txt('#d-table tr[data-device="HA2 24T45"] [data-offset]') === '1:30', 'saved offset shows in the Device list');
  await page.click('#d-table tr[data-device="hga-plat-2"] td:first-child'); await wait(400);
  ok(await vis('#card-hardware') && !(await vis('#card-offset')) && await vis('#dd-name'), 'a display keeps General · Hardware · Location, no Offset');
  ok(/View only\. You can apply location in Station details\./.test(await txt('#card-location')), 'captured Location copy for other devices');
  await page.click('.MuiBreadcrumbs-root button'); await wait(350);

  section('option 2 · add device → Optic swaps the cards');
  await page.click('#add-btn'); await wait(400);
  ok(await vis('#card-hardware') && !(await vis('#card-offset')), 'a new device starts with the usual cards');
  await pick('dd-type', 'Optic');
  ok(await vis('#card-offset') && !(await vis('#card-hardware')) && await page.locator('#dd-platform').isEditable(), 'choosing Optic swaps to Location (editable) + Offset');
  await page.fill('#dd-id', 'HA2 77T10'); await pick('dd-station', 'AHI - Ahihud');
  await page.fill('#dd-platform', '1'); await page.fill('#dd-offset', '0:20');
  await page.click('#dd-save'); await wait(400);
  ok(await txt('#d-table tr[data-device="HA2 77T10"] [data-offset]') === '0:20', 'the new optic lands in the Device list with its offset');
  await page.click('#vs-1'); await wait(400);
  ok(await count('#o-table tr[data-optic="HA2 77T10"]') === 1, 'same data in option 1 — one set of optics, two ways to show it');

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
