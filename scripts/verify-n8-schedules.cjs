#!/usr/bin/env node
/**
 * verify-n8-schedules.cjs — gates for projects/n8-device-schedules
 * (DATNETISR-264, output device schedules).
 *
 *   node scripts/verify-n8-schedules.cjs <URL>
 *
 * Layout gate first and it stops the run; visibility, not state.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR = path.resolve(process.env.N8_DIR || path.resolve(__dirname, '../projects/n8-device-schedules'));
const URL = process.argv[2] || 'http://localhost:8794/projects/n8-device-schedules/index.html';
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
  const small = [...app.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)(?!\d)/g)].map(m => Number(m[1])).filter(n => n < 14);
  const smallIcons = [...app.matchAll(/<\$\{Icon\} sx=\$\{\{ fontSize: (\d+)/g)].map(m => Number(m[1])).filter(n => n < 14);
  ok(small.length === smallIcons.length, 'no text below 14px (only icon glyphs may be smaller)', small);
}

async function run() {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.MuiAppBar-root', { timeout: 15000 });
  await page.waitForTimeout(400);

  const count = async sel => page.locator(sel).count();
  const txt = async sel => (await page.locator(sel).first().innerText()).trim();
  const vis = async sel => page.locator(sel).first().isVisible().catch(() => false);
  const wait = ms => page.waitForTimeout(ms);
  const screen = async () => page.getAttribute('main', 'data-screen');
  const nav = async key => { await page.click('#nav-systems'); await page.waitForSelector('#systems-menu .MuiMenu-list'); await page.click(`#systems-menu li[data-nav="${key}"]`); await wait(350); };
  const pickMenu = async (selector, text) => { await page.click(selector); await page.waitForSelector('.MuiMenu-list'); await page.click(`.MuiMenu-list li:has-text("${text}")`); await wait(250); };

  /* ── layout gate ─────────────────────────────────────────────────── */
  section('layout gate');
  const before = fails.length;
  const L = await page.evaluate(() => {
    const r = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
    return { vw: innerWidth, sw: r('#variant-switch'), first: document.getElementById('root').firstElementChild === document.getElementById('variant-switch'),
             bar: r('.MuiAppBar-root'), barBg: getComputedStyle(document.querySelector('.MuiAppBar-root')).backgroundColor,
             rail: r('nav[aria-label="Sections"]'), overflow: document.documentElement.scrollWidth - innerWidth };
  });
  ok(L.first && Math.round(L.sw.width) === L.vw && Math.round(L.sw.top) === 0, 'variant bar is the first element, top, full width');
  ok(L.bar && Math.round(L.bar.height) === 48 && L.barBg === 'rgb(28, 40, 72)', 'N8 navy 48px app bar');
  ok(L.rail && Math.round(L.rail.width) === 56, 'icon rail');
  ok(L.overflow <= 0, 'no horizontal page overflow at 1440', L.overflow);
  if (fails.length > before) { console.log('\nLAYOUT GATE FAILED'); fails.slice(before).forEach(f => console.log('  ✗ ' + f)); await browser.close(); process.exit(1); }
  console.log('  layout gate passes');

  /* ── placement ───────────────────────────────────────────────────── */
  section('placement — one place');
  ok(await screen() === 'schedules' && /Output device schedules/.test(await txt('#page-title')), 'opens straight on the schedules list — no intro');
  await page.click('#nav-systems'); await page.waitForSelector('#systems-menu .MuiMenu-list');
  const items = await page.$$eval('#systems-menu li', ls => ls.map(l => l.textContent.replace('chevron_right', '').trim()));
  ok(items[items.indexOf('Devices') + 1] === 'Output device schedules', 'Systems › Output device schedules, right below Devices', items);
  await page.keyboard.press('Escape'); await wait(250);

  /* ── list ────────────────────────────────────────────────────────── */
  section('list');
  const nS = await page.evaluate(() => SCHEDULES.length);
  ok(await count('#s-table tbody tr[data-schedule]') === nS, `every schedule is a row (${nS})`);
  ok(await count('#s-table [data-toggle]') === nS, 'each row has an Active switch');
  ok(await count('.apply-chip[data-state="partial"]') >= 1 && await count('.apply-chip[data-state="stale"]') >= 1, 'device status: partial failure and out of date are visible');
  const statusText = await page.$$eval('#s-table .apply-chip', c => c.map(x => x.textContent).join(' | '));
  ok(!/appl/i.test(statusText) && /(\d+) of \1 devices/.test(statusText) && /Out of date/.test(statusText), 'statuses speak of devices, never "apply"', statusText);
  ok(!(await count('[data-reapply]')), 'no separate Re-apply action in the list');
  ok(/23:30–05:00 \(\+1 day\)/.test(await txt('#s-table tr[data-schedule="s1"]')), 'overnight range reads with +1 day');
  await page.click('#s-table tr[data-schedule="s4"] td:first-child'); await wait(400);
  ok(await vis('#stale-alert') && /B\. Sheva Uni/.test(await txt('#stale-alert [data-stale="added"]')) && /ASK Barix PH2/.test(await txt('#stale-alert [data-stale="removed"]')),
     'an out-of-date schedule opens with an orange alert: which stations were added, which devices removed');
  ok(/Save to update the devices/.test(await txt('#stale-alert')), 'and says Save updates them');
  await page.click('#ed-save'); await page.waitForSelector('#save-result', { timeout: 6000 });
  ok(!(await vis('#stale-alert')) && /devices? updated/.test(await txt('#save-result')), 'Save updates the devices and clears the alert');
  await page.click('.MuiBreadcrumbs-root button'); await wait(350);
  ok(await page.locator('#s-table tr[data-schedule="s4"] .apply-chip').getAttribute('data-state') === 'ok', 'back in the list it is up to date');
  await page.click('#s-table [data-toggle="s3"] input'); await wait(300);
  ok(/is active/.test(await txt('.MuiSnackbar-root')), 'the Active switch says what it did to the devices');
  await page.click('#ls-empty'); await wait(300);
  ok(await vis('#list-empty') && await vis('#list-empty #add-btn'), 'empty state with ADD SCHEDULE');
  await page.click('#ls-loading'); await wait(300);
  ok(await vis('#list-loading') && await count('#list-loading .MuiSkeleton-root') > 4, 'loading state: skeleton rows');
  await page.click('#ls-error'); await wait(300);
  ok(await vis('#list-error') && /Couldn't load/.test(await txt('#list-error')), 'load error with Retry');
  await page.click('#list-error button'); await wait(300);
  ok(await vis('#s-table'), 'Retry brings the list back');

  /* ── create: validation ─────────────────────────────────────────── */
  section('create — validation');
  await page.click('#add-btn'); await wait(400);
  ok(await screen() === 'schedule' && await txt('#ed-title') === 'New schedule', 'ADD SCHEDULE opens the editor');
  ok(/^Stations/.test(await txt('#card-targets h6')) && /^Schedule$/.test(await txt('#card-timing h6')) && /^Actions$/.test(await txt('#card-actions h6')), 'cards: Stations · Schedule · Actions');
  const tb = await page.locator('#card-targets').boundingBox(), sb = await page.locator('#card-timing').boundingBox();
  ok(tb.x + tb.width < sb.x && Math.abs(tb.y - sb.y) < 4, 'Stations and Schedule sit side by side, like Event details');
  ok(!(await count('#card-general h6')) && await vis('#ed-active'), 'name and Active switch in one untitled row');
  ok(/^Schedule active$/.test(await txt('#ed-active-label')), 'switch label: "Schedule active"');
  await page.click('#ed-active'); await wait(150);
  ok(/^Schedule active$/.test(await txt('#ed-active-label')), 'the label does not change with the switch');
  await page.click('#ed-active'); await wait(150);
  const ge = await page.locator('#card-general').boundingBox(), mn = await page.locator('main').boundingBox();
  ok(ge.width > mn.width - 60, 'details use the full width', [ge.width, mn.width]);
  const helpers = await page.$$eval('main .MuiFormHelperText-root', h => h.map(x => x.textContent.trim()).filter(Boolean));
  ok(helpers.length === 0, 'no explanatory helper text under fields', helpers);
  ok(!/Kept here|Shown in this list|single stations together|24-hour|holiday list|have no display|Barix, ELA/.test(await txt('main')), 'the removed sentences are gone');
  await page.click('#ed-save'); await wait(300);
  ok(await vis('#err-summary') && /nothing has been sent/.test(await txt('#err-summary')), 'save with blanks: summary says nothing was sent');
  ok(/required/.test(await txt('#ed-name-helper-text')), 'name error in place');
  ok(/station or station group/.test(await txt('#card-targets')), 'target error in place');
  ok(/at least one day/.test(await txt('#days-help')), 'days error in place');
  ok(await vis('#action-error'), 'no-action error');
  await page.fill('#ed-name', 'night mode — north line'); await page.click('#ed-save'); await wait(250);
  ok(/already exists/.test(await txt('#ed-name-helper-text')), 'duplicate name refused, case-insensitively');
  await page.fill('#ed-name', 'Weekend quiet — Akko');

  /* ── create: target, timing, actions ────────────────────────────── */
  section('create — targets, timing, actions');
  // one Stations field: groups and single stations together (N8 Event details pattern)
  const openPicker = async () => { await page.click('#ed-stations'); await page.waitForSelector('.MuiAutocomplete-popper'); };
  await openPicker();
  const optKeys = await page.$$eval('.MuiAutocomplete-popper [data-opt]', o => o.map(x => x.dataset.opt));
  const firstStation = optKeys.findIndex(k => k.startsWith('s:'));
  ok(firstStation > 0 && optKeys.slice(0, firstStation).every(k => k.startsWith('g:')), 'groups first, then single stations, in one list', optKeys.slice(0, 6));
  ok(/\(5\)/.test(await txt('.MuiAutocomplete-popper [data-opt="g:north"]')), 'each group shows its station count');
  await page.click('.MuiAutocomplete-popper [data-expand="north"]'); await wait(250);
  ok(await count('.MuiAutocomplete-popper [data-opt^="m:north:"]') === 5 && await vis('.MuiAutocomplete-popper'), 'the chevron shows the group\'s stations without closing the list');
  await page.click('.MuiAutocomplete-popper [data-opt="s:AKO"]'); await wait(250);
  ok(await page.locator('.MuiAutocomplete-popper [data-opt="g:north"] .MuiCheckbox-indeterminate').count() === 1, 'a single station of a group marks the group as partly picked');
  await page.click('.MuiAutocomplete-popper [data-opt="g:north"]'); await wait(250);
  ok(await page.locator('.MuiAutocomplete-popper [data-opt="m:north:ATL"]').getAttribute('aria-disabled') === 'true', 'with the group picked, its stations are covered (greyed)');
  await page.keyboard.press('Escape'); await wait(250);
  ok(/North line \(5\)/.test(await txt('#card-targets [data-chip="g:north"]')) && /Akko/.test(await txt('#card-targets [data-chip="s:AKO"]')), 'chips: "North line (5)" and "Akko"');
  ok(/^Stations \(5\)/.test(await txt('#card-targets h6')), 'card title counts the stations reached, without double-counting', await txt('#card-targets h6'));
  ok(/Reaches/.test(await txt('#reach-summary')), 'the target resolves to a device count');
  await page.click('#card-targets [data-chip="g:north"] .MuiChip-deleteIcon'); await wait(250);
  ok(await count('#card-targets [data-chip]') === 1 && /^Stations \(1\)/.test(await txt('#card-targets h6')), 'removing the group chip leaves Akko');
  await page.click('[data-day="fri"]'); await page.click('[data-day="sat"]');
  await page.click('#ed-holidays'); await wait(150);
  ok(await page.locator('#ed-holidays').getAttribute('aria-pressed') === 'true', 'Holidays is a day category beside the weekdays');
  await page.fill('#ed-start', '25:00'); await page.click('#ed-save'); await wait(200);
  ok(/hh:mm/.test(await txt('#ed-start-helper-text')), 'an impossible time is refused in place');
  await page.fill('#ed-start', '18:00'); await page.fill('#ed-end', '18:00'); await page.click('#ed-save'); await wait(250);
  ok(/must differ/.test(await txt('#ed-end-helper-text')), 'start = end is refused');
  await page.fill('#ed-end', '06:00'); await wait(200);
  ok(await vis('#overnight') && /next day 06:00/.test(await txt('#overnight')), 'an earlier end time is marked overnight');
  await pickMenu('#ed-pa', 'Set volume');
  ok(await vis('#ed-vol') && !(await count('#ed-pct')), 'PA action is a dropdown; Set volume shows a slider, no number input');
  ok(/Volume 50%/.test(await txt('#vol-value')), 'starts at 50%');
  await page.focus('#ed-vol input'); await page.keyboard.press('Home'); await wait(150);
  ok(/Mute \(0%\)/.test(await txt('#vol-value')), '0 is silence');
  await page.keyboard.press('End'); await wait(150);
  ok(/Volume 100%/.test(await txt('#vol-value')), 'up to 100%');
  for (let i = 0; i < 14; i++) await page.keyboard.press('ArrowLeft');
  await wait(150);
  ok(/Volume 30%/.test(await txt('#vol-value')), 'steps of 5', await txt('#vol-value'));
  ok(!(await count('#conflict')), 'no conflict while no entry lands on the same minute');
  await page.keyboard.press('Home'); await wait(100);
  await page.fill('#ed-start', '06:00'); await page.fill('#ed-end', '16:00'); await wait(250);
  ok(await vis('#conflict') && /Shabbat quiet/.test(await txt('#conflict')) && /Fri 16:00/.test(await txt('#conflict')),
     'same device, same day and time, different value (unmute vs mute) → conflict', await txt('#conflict').catch(() => ''));
  await page.click('#ed-save'); await wait(250);
  ok(await vis('#err-summary') && !(await vis('#applying')), 'a conflict blocks Save, as the PaxLife API would reject it');
  await page.fill('#ed-start', '18:00'); await page.fill('#ed-end', '06:00');
  await page.focus('#ed-vol input'); await page.keyboard.press('End');
  for (let i = 0; i < 14; i++) await page.keyboard.press('ArrowLeft');
  await wait(200);
  ok(!(await count('#conflict')) && /Volume 30%/.test(await txt('#vol-value')), 'conflict clears when the times differ again');
  await pickMenu('#ed-display', 'Darken all displays');
  await page.click('#ed-display'); await page.waitForSelector('.MuiMenu-list');
  ok(await count('.MuiMenu-list li') === 2 && !/Tuan/.test(await txt('.MuiMenu-list')), 'display action: No action / Darken all displays only');
  await page.keyboard.press('Escape'); await wait(250);
  await page.click('#toggle-devices'); await wait(300);
  ok(/Volume 50% → 30%/.test(await txt('#reach-table tr[data-reach="ako-barix-1"]')) && !/Darken/.test(await txt('#reach-table tr[data-reach="ako-barix-1"]')), 'Barix gets the PA action only');
  ok(!/ELA/.test(await txt('#reach')), 'no ELA anywhere — not in this project');
  ok(/Darken/.test(await txt('#reach-table tr[data-reach="ako-plat-1"]')) && !/Volume/.test(await txt('#reach-table tr[data-reach="ako-plat-1"]')), 'a display gets the display action only');
  ok(/Volume 50% → 30%/.test(await txt('#reach-table tr[data-reach="ako-barix-1"]')), 'Barix: station default 50% → 30%');

  /* ── unsaved changes ────────────────────────────────────────────── */
  section('unsaved changes');
  await page.click('.MuiBreadcrumbs-root button'); await wait(300);
  ok(await vis('#leave-dialog'), 'leaving with unsaved changes asks first');
  await page.click('#leave-stay'); await wait(250);
  ok(await screen() === 'schedule' && (await page.inputValue('#ed-name')) === 'Weekend quiet — Akko', 'Keep editing keeps everything');
  await nav('devices');
  ok(await vis('#leave-dialog'), 'the menu is guarded too');
  await page.click('#leave-stay'); await wait(250);

  /* ── save: partial failure → retry ──────────────────────────────── */
  section('save — partial failure, retry');
  await page.click('#sv-partial'); await wait(100);
  await page.click('#ed-save'); await wait(150);
  ok(await vis('#applying'), 'saving shows progress per device');
  await page.waitForSelector('#save-result', { timeout: 6000 });
  ok(await page.getAttribute('#save-result', 'data-result') === 'partial', 'partial failure is reported');
  ok(await count('#save-result [data-failed]') === 2 && /404/.test(await txt('#save-result')) && /No response/.test(await txt('#save-result')), 'each failed device is named with its API reason');
  ok(/keeps its previous schedule/.test(await txt('#save-result')), 'says what a failed device is left running');
  await page.click('#retry-failed'); await page.waitForTimeout(2200);
  ok((await count('#save-result [data-failed]')) === 1, 'Retry failed re-sends only the failed ones; the timeout recovers, the 404 stays');
  ok(await txt('#ed-title') === 'Weekend quiet — Akko', 'the new schedule is saved');
  await nav('schedules');
  ok(!(await vis('#leave-dialog')) && await count('#s-table tbody tr[data-schedule]') === nS + 1, 'no prompt after saving; it is in the list');

  /* ── save: error keeps changes ──────────────────────────────────── */
  section('save — error');
  await page.click('#sv-error');
  await page.click('#s-table tr[data-schedule="s1"] td:first-child'); await wait(400);
  await page.fill('#ed-start', '23:00'); await page.click('#ed-save'); await page.waitForSelector('#save-error', { timeout: 4000 });
  ok(/Nothing was sent/.test(await txt('#save-error')) && (await page.inputValue('#ed-start')) === '23:00', 'a failed save says nothing was sent and keeps the edit');
  await page.click('#sv-ok');
  await page.click('.MuiBreadcrumbs-root button'); await wait(300);
  ok(await vis('#leave-dialog'), 'still guarded after a failed save');
  await page.click('#leave-discard'); await wait(300);
  ok(await screen() === 'schedules' && /23:30/.test(await txt('#s-table tr[data-schedule="s1"]')), 'Discard leaves the saved schedule untouched');

  /* ── one design ─────────────────────────────────────────────────── */
  section('one design, no variant switch');
  ok(!(await count('#vs-1, #vs-2')) && !/Variant|Phase 1/.test(await txt('#variant-switch')), 'no Target / Phase 1 switch');
  ok(!(await count('#phase-line, .phase-chip')), 'no phase-1 lines or chips anywhere');
  await page.click('#s-table tr[data-schedule="s2"] td:first-child'); await wait(400);
  ok(await page.locator('#ed-holidays').isEnabled(), 'Holidays is a normal day choice');

  ok(!(await count('#p-gaps, .gap')) && !/gaps/i.test(await txt('#variant-switch')), 'no Show gaps toggle and no gap notes — managers see the result only');

  /* ── contextual: device ─────────────────────────────────────────── */
  section('device-level view');
  await nav('devices');
  ok(await count('#d-table tr[data-device]') === await page.evaluate(() => DEVICES.length), 'Device list');
  await page.click('#d-table tr[data-device="ako-barix-1"] td:first-child'); await wait(400);
  ok(await vis('#card-base') && /Persistent — not scheduled/.test(await txt('#card-base')), 'Barix: base audio settings in their own, marked card');
  ok(await page.locator('#dv-vol').isDisabled() && (await page.inputValue('#dv-vol')) === '50%' && await vis('#dv-eq'), 'volume comes from the station (view only); the equalizer stays on the device');
  ok(await count('#dv-scheds tr[data-sched]') >= 1, 'the schedules reaching the device are listed');
  ok(await vis('#dv-entries') && /Set volume to 30%/.test(await txt('#dv-entries')) && /Mute/.test(await txt('#dv-entries')) && !/Turn display|screen_on/.test(await txt('#dv-entries')),
     'device schedule in plain words — audio actions only');
  ok(/Sun–Thu/.test(await txt('#dv-entries')), 'entries with the same time and action merge their days');
  ok(!/API:|volume=/.test(await txt('#dv-entries')), 'no raw API fields on the device');
  ok(!(await count('#card-schedules input, #card-schedules [role="combobox"]')), 'no second schedule editor on the device');
  await page.click('#dv-scheds tr[data-sched] button'); await wait(400);
  ok(await screen() === 'schedule', 'a schedule link opens the one editor');
  await nav('devices');
  ok(!/ELA/.test(await txt('#d-table')), 'Device list has no ELA devices');
  await page.click('#d-table tr[data-device="ako-plat-1"] td:first-child'); await wait(400);
  ok(!(await vis('#card-base')) && /Turn display off/.test(await txt('#dv-entries')) && /Turn display on/.test(await txt('#dv-entries')) && !/volume|Mute/i.test(await txt('#dv-entries')), 'a display: no base audio card, display on/off only');

  /* ── contextual: station ────────────────────────────────────────── */
  section('station context');
  await nav('stations');
  ok(await count('#st-table tr[data-station]') === await page.evaluate(() => STATIONS.length), 'Stations list');
  await page.click('#st-table tr[data-station="AKO"] td:first-child'); await wait(400);
  ok(await vis('#station-schedules') && await count('#station-schedules tr[data-sched]') >= 2, 'Station details › Schedules lists group and direct schedules');
  ok(/Group · North line/.test(await txt('#station-schedules')) && /This station/.test(await txt('#station-schedules')), 'says how each one reaches the station');
  ok(await vis('#card-station-audio') && (await page.inputValue('#sd-vol')) === '50', 'Station details: base audio per station — default 50%');
  ok(await page.locator('#sd-save').isDisabled(), 'Save waits for a change');
  await page.fill('#sd-vol', '140'); await wait(150);
  ok(/0–100/.test(await txt('#sd-vol-helper-text')) && await page.locator('#sd-save').isDisabled(), 'a default outside 0–100 is refused');
  await page.fill('#sd-vol', '60'); await wait(150);
  await nav('devices');
  ok(await vis('#leave-dialog'), 'unsaved station audio is guarded');
  await page.click('#leave-stay'); await wait(200);
  await page.click('#sd-save'); await wait(300);
  await nav('devices'); await page.click('#d-table tr[data-device="ako-barix-1"] td:first-child'); await wait(400);
  ok((await page.inputValue('#dv-vol')) === '60%' && /Set volume back to 60% \(default\)/.test(await txt('#dv-entries')) && /Set volume to 30%/.test(await txt('#dv-entries')),
     'the station default reaches every audio device at it; the scheduled level stays 30%');
  await page.click('#dv-station-audio'); await wait(400);
  ok(await screen() === 'station', 'the device links to its station for volume');
  await page.click('#add-for-station'); await wait(400);
  ok(await screen() === 'schedule' && await count('#card-targets [data-chip="s:AKO"]') === 1, 'Add schedule for Akko opens the one editor, prefilled');

  /* ── device types ────────────────────────────────────────────────── */
  section('device types');
  await nav('types');
  const nTypes = await page.evaluate(() => new Set(DEVICES.map(d => d.type)).size);
  ok(await screen() === 'types' && await count('#types-table tr[data-type]') === nTypes, `one row per device type (${nTypes})`);
  ok(!(await count('#types-table tr[data-type="ELA speaker"]')), 'no ELA type');
  const tft = await txt('#types-table tr[data-type="Platform TFT"]');
  ok(/Darken all displays/.test(tft) && !/Set volume/.test(tft), 'a display type: Darken only');
  ok(/Equalizer \(on the device\) · volume per station/.test(await txt('#types-table tr[data-type="Barix audio"]')), 'Barix: equalizer on the device, volume per station');

  /* ── layout B: list + editor ─────────────────────────────────────── */
  section('layout B — list + editor');
  await nav('schedules');
  await page.click('#lay-split'); await wait(400);
  const nS2 = await page.evaluate(() => SCHEDULES.length);
  ok(await vis('#split') && await count('#rail [data-rail]') === nS2, `list on the left, every schedule (${nS2})`);
  const rb = await page.locator('#rail').boundingBox(), eb = await page.locator('#split-editor').boundingBox();
  ok(rb.x + rb.width < eb.x && Math.abs(rb.y - eb.y) < 4, 'editor sits beside the list, same row');
  ok(await page.locator('#rail [data-rail]').first().getAttribute('aria-current') === 'true' && await vis('#ed-name'), 'the first schedule opens straight away');
  ok(!(await vis('.MuiBreadcrumbs-root')), 'no breadcrumbs in the split editor');
  const second = await page.locator('#rail [data-rail]').nth(2).getAttribute('data-rail');
  await page.fill('#ed-name', 'Edited, not saved');
  await page.click(`#rail [data-rail="${second}"]`); await wait(300);
  ok(await vis('#leave-dialog'), 'picking another schedule with unsaved changes asks first');
  await page.click('#leave-stay'); await wait(250);
  ok((await page.inputValue('#ed-name')) === 'Edited, not saved', 'Keep editing keeps the edit');
  await page.click('#lay-full'); await wait(300);
  ok(await vis('#leave-dialog'), 'switching layout with unsaved changes asks too');
  await page.click('#leave-stay'); await wait(250);
  await page.click(`#rail [data-rail="${second}"]`); await wait(300);
  await page.click('#leave-discard'); await wait(400);
  ok(await page.getAttribute(`#rail [data-rail="${second}"]`, 'aria-current') === 'true'
     && (await page.inputValue('#ed-name')) === await page.evaluate(id => SCHEDULES.find(s => s.id === id).name, second), 'Discard opens the picked schedule and highlights it');
  await page.click(`#rail [data-toggle="${second}"] input`); await wait(300);
  ok(/is (in)?active/.test(await txt('.MuiSnackbar-root')), 'the Active switch works from the list');
  await page.click('#add-btn'); await wait(400);
  ok(await txt('#ed-title') === 'New schedule' && await count('#rail [aria-current="true"]') === 0, 'Add schedule opens a blank editor beside the list');
  await page.fill('#ed-name', 'Split test');
  await page.click('#ed-stations'); await page.waitForSelector('.MuiAutocomplete-popper');
  await page.click('.MuiAutocomplete-popper [data-opt="g:airport"]'); await page.keyboard.press('Escape'); await wait(200);
  await page.click('[data-day="mon"]'); await page.fill('#ed-start', '02:00'); await page.fill('#ed-end', '03:00');
  await pickMenu('#ed-display', 'Darken all displays'); await page.click('#ed-save');
  await page.waitForSelector('#save-result', { timeout: 6000 });
  ok(await count('#rail [data-rail]') === nS2 + 1 && await count('#rail [aria-current="true"]') === 1 && /Split test/.test(await txt('#rail [aria-current="true"]')),
     'after saving, the new schedule is in the list and highlighted — result still on screen');
  await page.click('#ls-empty'); await wait(300);
  ok(await vis('#rail #list-empty'), 'empty state in the list column');
  await page.click('#ls-loading'); await wait(300);
  ok(await count('#rail .MuiSkeleton-root') > 4, 'loading state in the list column');
  await page.click('#ls-data'); await wait(300);
  await page.click('#lay-full'); await wait(300);
  ok(await vis('#s-table'), 'layout A is back in place');

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
