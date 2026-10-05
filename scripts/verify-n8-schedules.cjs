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
  ok(await count('.apply-chip[data-state="partial"]') >= 1 && await count('.apply-chip[data-state="stale"]') >= 1, 'device rollout status: partial failure and needs re-apply are visible');
  ok(/23:30–05:00 \(\+1 day\)/.test(await txt('#s-table tr[data-schedule="s1"]')), 'overnight range reads with +1 day');
  await page.click('[data-reapply="s4"]'); await wait(300);
  ok(await page.locator('#s-table tr[data-schedule="s4"] .apply-chip').getAttribute('data-state') === 'ok', 'Re-apply clears "Needs re-apply"');
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
  ok(['#card-general', '#card-targets', '#card-timing', '#card-actions'].every(Boolean) && await vis('#card-actions'), 'cards: General · Targets · Timing · Scheduled actions');
  await page.click('#ed-save'); await wait(300);
  ok(await vis('#err-summary') && /nothing has been sent/.test(await txt('#err-summary')), 'save with blanks: summary says nothing was sent');
  ok(/required/.test(await txt('#ed-name-helper-text')), 'name error in place');
  ok(/station group/.test(await txt('#card-targets')), 'target error in place');
  ok(/at least one day/.test(await txt('#days-help')), 'days error in place');
  ok(await vis('#action-error'), 'no-action error');
  await page.fill('#ed-name', 'night mode — north line'); await page.click('#ed-save'); await wait(250);
  ok(/already exists/.test(await txt('#ed-name-helper-text')), 'duplicate name refused, case-insensitively');
  await page.fill('#ed-name', 'Weekend quiet — Akko');

  /* ── create: target, timing, actions ────────────────────────────── */
  section('create — targets, timing, actions');
  await page.click('#ed-mode input[value="group"]');
  await pickMenu('#ed-group', 'North line');
  ok(/Reaches/.test(await txt('#reach-summary')), 'the target resolves to a device count');
  await page.click('#ed-mode input[value="stations"]'); await wait(200);
  await page.click('#ed-stations'); await page.keyboard.type('Akko'); await wait(250);
  await page.click('.MuiAutocomplete-popper li:has-text("AKO - Akko")'); await page.keyboard.press('Escape'); await wait(250);
  ok(await count('#card-targets .MuiChip-root') >= 1, 'stations pick as chips');
  await page.click('#ed-mode input[value="group"]'); await wait(200);
  ok(/North line/.test(await txt('#ed-group')), 'switching target type keeps the group choice');
  await page.click('#ed-mode input[value="stations"]'); await wait(200);
  ok(/AKO - Akko/.test(await txt('#card-targets')), 'and keeps the station choice');
  await page.click('[data-day="fri"]'); await page.click('[data-day="sat"]');
  await page.click('#ed-holidays'); await wait(150);
  ok(await page.locator('#ed-holidays').getAttribute('aria-pressed') === 'true', 'Holidays is a day category beside the weekdays');
  await page.fill('#ed-start', '25:00'); await page.click('#ed-save'); await wait(200);
  ok(/24-hour/.test(await txt('#ed-start-helper-text')), 'an impossible time asks for 24-hour hh:mm');
  await page.fill('#ed-start', '18:00'); await page.fill('#ed-end', '18:00'); await page.click('#ed-save'); await wait(250);
  ok(/must differ/.test(await txt('#ed-end-helper-text')), 'start = end is refused');
  await page.fill('#ed-end', '06:00'); await wait(200);
  ok(await vis('#overnight') && /next day at 06:00/.test(await txt('#overnight')), 'an earlier end time is marked overnight');
  await page.click('#ed-pa input[value="adjust"]'); await wait(200);
  ok((await page.inputValue('#ed-pct')) === '0', 'the volume adjustment starts at 0% (DATNETISR-264)');
  await page.fill('#ed-pct', '50'); await wait(200);
  ok(/default 50%, max 80%/.test(await txt('#pa-help')) && /\+50% → 65%/.test(await txt('#pa-help')), '+50% runs halfway from the station default to its maximum, not ×1.5', await txt('#pa-help'));
  await page.fill('#ed-pct', '100'); await wait(150);
  ok(/\+100% → 80%/.test(await txt('#pa-help')), '+100% is the maximum configured amplification');
  await page.fill('#ed-pct', '-50'); await wait(200);
  ok(await vis('#overlap') && /Shabbat quiet/.test(await txt('#overlap')), 'overlap with another schedule on the same devices is warned');
  ok(/−50% → 25%/.test(await txt('#pa-help')), '−50% halves the station default');
  await page.fill('#ed-pct', '140'); await page.click('#ed-save'); await wait(250);
  ok(/−100 to \+100/.test(await txt('#pa-help')), 'volume outside −100…+100 is refused');
  await page.fill('#ed-pct', '-50');
  await page.click('#ed-display input[value="darken"]'); await wait(150);
  ok(await page.locator('#ed-display input[value="more"]').isDisabled() && /Tuan/.test(await txt('#ed-display')), 'further display actions are shown as "to confirm with Tuan", not selectable');
  ok(await vis('#base-audio-note') && /aren't part of a schedule/.test(await txt('#base-audio-note')), 'base audio settings are set apart from scheduled actions');
  ok((await count('#card-actions label:has-text("Leave unchanged")')) === 2 && /Displays keep running as usual/.test(await txt('#ed-display')), '"Leave unchanged" with a one-line description on both actions');
  ok(/turned off/.test(await txt('#ed-display')), 'Darken means the displays are turned off');
  ok(/system-wide holiday list/.test(await txt('#days-help')), 'Holidays = N8\'s system-wide holiday list');
  await page.click('#toggle-devices'); await wait(300);
  const elaRow = await txt('#reach-table tr[data-reach="ako-ela-1"]');
  ok(/To confirm with PaxLife/.test(elaRow) && !/Darken/.test(elaRow), 'ELA gets PA only — no display action — flagged for PaxLife', elaRow);
  ok(/Darken/.test(await txt('#reach-table tr[data-reach="ako-plat-1"]')) && !/Volume/.test(await txt('#reach-table tr[data-reach="ako-plat-1"]')), 'a display gets the display action only');

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
  ok(await count('#save-result [data-failed]') === 2 && /offline/.test(await txt('#save-result')) && /not supported/.test(await txt('#save-result')), 'each failed device is named with its reason');
  ok(/keeps its previous schedule/.test(await txt('#save-result')), 'says what a failed device is left running');
  await page.click('#retry-failed'); await page.waitForTimeout(2200);
  ok((await count('#save-result [data-failed]')) === 1, 'Retry failed re-sends only the failed ones; the offline one recovers');
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

  /* ── phase 1 variant ────────────────────────────────────────────── */
  section('phase 1 — per device');
  await page.click('#vs-2'); await wait(300);
  ok(await vis('#phase-line') && /PaxLife API/.test(await txt('#phase-line')), 'phase 1 says how it is applied');
  ok(/Holidays: phase 2/.test(await txt('#s-table tr[data-schedule="s2"]')), 'holiday schedules are flagged in the list');
  await page.click('#s-table tr[data-schedule="s2"] td:first-child'); await wait(400);
  ok(await page.locator('#ed-holidays').isDisabled() && await vis('#card-timing .phase-chip'), 'Holidays is disabled in phase 1 — shown, not hidden');
  await page.click('#toggle-devices'); await wait(300);
  ok(/Skipped — ELA not confirmed/.test(await txt('#reach-table tr[data-reach="ako-ela-1"]')), 'ELA speakers are skipped in phase 1');
  await page.click('#vs-1'); await wait(300);
  ok(await page.locator('#ed-holidays').isEnabled() && await screen() === 'schedule', 'switching back is in place — same editor, Holidays back');

  /* ── gaps ───────────────────────────────────────────────────────── */
  section('gaps');
  ok(await count('.gap') === 0, 'gap notes are hidden by default');
  await page.click('#p-gaps'); await wait(300);
  const ids = await page.$$eval('.gap', g => [...new Set(g.map(x => x.dataset.gap))]);
  ok(['G2', 'G3', 'G4', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11'].every(g => ids.includes(g)), 'the editor pins its gaps in place', ids);
  await page.click('#p-gaps');

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
  ok(await count('.api-fields') === 0, 'raw API fields are hidden by default');
  await page.click('#p-gaps'); await wait(250);
  ok(/API: volume=30/.test(await txt('#dv-entries')), 'Show gaps reveals the PaxLife fields behind each action');
  await page.click('#p-gaps'); await wait(200);
  ok(!(await count('#card-schedules input, #card-schedules [role="combobox"]')), 'no second schedule editor on the device');
  await page.click('#dv-scheds tr[data-sched] button'); await wait(400);
  ok(await screen() === 'schedule', 'a schedule link opens the one editor');
  await nav('devices');
  await page.click('#d-table tr[data-device="ako-ela-1"] td:first-child'); await wait(400);
  ok(await vis('#ela-note') && !/screen_on|Turn display/.test(await txt('main')), 'ELA: no display power anywhere on the page');
  ok(!/screen_on|Darken/.test(await txt('#card-schedules')), 'ELA schedules card shows no display action');
  await nav('devices');
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
  await page.fill('#sd-max', '40'); await wait(150);
  ok(/at least the default/.test(await txt('#sd-max-helper-text')) && await page.locator('#sd-save').isDisabled(), 'a maximum below the default is refused');
  await page.fill('#sd-max', '80'); await page.fill('#sd-vol', '60'); await wait(150);
  await nav('devices');
  ok(await vis('#leave-dialog'), 'unsaved station audio is guarded');
  await page.click('#leave-stay'); await wait(200);
  await page.click('#sd-save'); await wait(300);
  await nav('devices'); await page.click('#d-table tr[data-device="ako-barix-1"] td:first-child'); await wait(400);
  ok((await page.inputValue('#dv-vol')) === '60%' && /Set volume to 36%/.test(await txt('#dv-entries')), 'the station default reaches every audio device at it: 60% → −40% = 36%');
  await page.click('#dv-station-audio'); await wait(400);
  ok(await screen() === 'station', 'the device links to its station for volume');
  await page.click('#add-for-station'); await wait(400);
  ok(await screen() === 'schedule' && /AKO - Akko/.test(await txt('#card-targets')), 'Add schedule for Akko opens the one editor, prefilled');

  /* ── device types ────────────────────────────────────────────────── */
  section('device types');
  await nav('types');
  const nTypes = await page.evaluate(() => new Set(DEVICES.map(d => d.type)).size);
  ok(await screen() === 'types' && await count('#types-table tr[data-type]') === nTypes, `one row per device type (${nTypes})`);
  const ela = await txt('#types-table tr[data-type="ELA speaker"]');
  ok(/Adjust volume/.test(ela) && !/Darken/.test(ela) && /PaxLife/.test(ela), 'ELA: volume only, no display action, flagged for PaxLife', ela);
  const tft = await txt('#types-table tr[data-type="Platform TFT"]');
  ok(/Darken all displays/.test(tft) && !/Adjust volume/.test(tft), 'a display type: Darken only');
  ok(/Equalizer \(on the device\) · volume per station/.test(await txt('#types-table tr[data-type="Barix audio"]')), 'Barix: equalizer on the device, volume per station');
  await nav('schedules');
  await page.click('#s-table tr[data-schedule="s1"] td:first-child'); await wait(400);
  await page.click('#types-link'); await wait(350);
  ok(await screen() === 'types', 'the editor links to Device types');

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
  await page.fill('#ed-name', 'Split test'); await pickMenu('#ed-group', 'Airport');
  await page.click('[data-day="mon"]'); await page.fill('#ed-start', '02:00'); await page.fill('#ed-end', '03:00');
  await page.click('#ed-display input[value="darken"]'); await page.click('#ed-save');
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
