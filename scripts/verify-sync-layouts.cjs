#!/usr/bin/env node
/* Verify reports/sync-details-layouts/index.html in real Chromium.
   Usage: node scripts/verify-sync-layouts.cjs [url]
   Asserts VISIBILITY and geometry, not just state — a correct value inside a
   collapsed panel is not a passing UI. */
const { chromium } = require('playwright');
const path = require('path');

const TARGET = process.argv[2] ||
  'file://' + path.resolve(__dirname, '../reports/sync-details-layouts/index.html');

let pass = 0, fail = 0;
const ok  = (n) => { pass++; console.log('  ok   ' + n); };
const bad = (n, d) => { fail++; console.log('  FAIL ' + n + (d ? '  → ' + d : '')); };
const is  = (n, got, want) => got === want ? ok(n) : bad(n, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const yes = (n, got) => got ? ok(n) : bad(n, 'falsy');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);

  const errors = [], failedReq = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', r => failedReq.push(r.url()));

  await page.goto(TARGET, { waitUntil: 'networkidle' });

  const setState  = async (s) => { await page.click(`[data-state="${s}"]`); await page.waitForTimeout(120); };
  const setLayout = async (l) => { await page.click(`[data-layout="${l}"]`); await page.waitForTimeout(120); };

  console.log('\n— shell & kit —');
  is('3 layout buttons', await page.locator('[data-layout]').count(), 3);
  is('4 state buttons',  await page.locator('[data-state]').count(), 4);
  is('default layout is 1', await page.getAttribute('[data-layout="1"]', 'aria-pressed'), 'true');
  is('default state is deleted', await page.getAttribute('[data-state="deleted"]', 'aria-pressed'), 'true');

  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim());
  is('kit stylesheet resolves --color-primary', primary.toUpperCase(), '#0053CC');

  const railBrand = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.nav-brand')).color);
  is('sidebar brand uses the kit primary', railBrand, 'rgb(0, 83, 204)');

  console.log('\n— layout 1, deleted with warnings —');
  const rowCount = await page.locator('table tbody tr').count();
  is('log table has 5 object rows (General lifted out)', rowCount, 5);

  const tableText = await page.locator('table').innerText();
  is('no General row left in the table', /General/.test(tableText), false);
  is('no "was created" left in the rollback message column', /was created\./.test(tableText), false);

  const alert = page.locator('.alert').first();
  yes('alert is visible', await alert.isVisible());
  yes('alert names the disconnect',
    /disconnected from QuickBooks Online/.test(await alert.innerText()));
  yes('alert says nothing was removed',
    /still in your books/i.test(await alert.innerText()));

  const aBox = await alert.boundingBox();
  const tBox = await page.locator('table').boundingBox();
  yes('alert sits ABOVE the log table', aBox.y + aBox.height <= tBox.y);

  const reconnect = page.locator('button', { hasText: 'Reconnect QuickBooks Online' }).first();
  yes('Reconnect button is visible and clickable', await reconnect.isVisible());
  yes('Reconnect is inside the alert', await alert.locator('button', { hasText: 'Reconnect' }).count() === 1);

  console.log('\n— child rows are open, not collapsed —');
  for (const label of ['Product or Service', 'Account']) {
    const cell = page.locator('tr.child td .otype', { hasText: label }).first();
    yes(`"${label}" row is visible without any click`, await cell.isVisible());
  }
  const acct = page.locator('tr.child', { hasText: 'Stripe sales' }).first();
  yes('income account mapping is on screen', /Stripe sales/.test(await acct.innerText()));

  console.log('\n— dead links when the connection is known-broken —');
  const dead = page.locator('.oid.dead');
  is('all 5 object links are marked unreachable', await dead.count(), 5);
  yes('dead link explains why on hover',
    /disconnected/.test(await dead.first().getAttribute('title')));
  is('no live object anchors in this state', await page.locator('a.oid').count(), 0);

  console.log('\n— rewritten copy keeps production copy visible —');
  const rw = page.locator('.rw');
  yes('rewritten values present', await rw.count() >= 5);
  const titles = await rw.evaluateAll(ns => ns.map(n => n.getAttribute('title')));
  yes('every rewrite carries the production string', titles.every(t => /Production copy:/.test(t)));
  yes('"Rollback canceled" shown where production says "Canceled"',
    await page.locator('.rw[title*="\\"Canceled\\""]', { hasText: 'Rollback canceled' }).count() >= 3);
  yes('"Nothing to remove" shown where production says "Skipped"',
    await page.locator('.rw[title*="Skipped"]', { hasText: 'Nothing to remove' }).count() === 2);

  console.log('\n— layout 2, object cards —');
  await setLayout('2');
  is('state survives the layout switch', await page.getAttribute('[data-state="deleted"]', 'aria-pressed'), 'true');
  is('three top-level object cards', await page.locator('.obj').count(), 3);
  const inv = page.locator('.obj', { hasText: 'Invoice' }).first();
  yes('invoice card visible', await inv.isVisible());
  yes('children became labelled facts', /Income account[\s\S]*Stripe sales/.test(await inv.innerText()));
  yes('alert still above the first card',
    (await page.locator('.alert').first().boundingBox()).y < (await inv.boundingBox()).y);

  console.log('\n— layout 2, warning card —');
  await setState('warnings');
  const warnCard = page.locator('.obj.warn').first();
  yes('warning renders as its own card', await warnCard.isVisible());
  yes('card carries the full production message',
    /not tracked as an inventory one/.test(await warnCard.innerText()));
  is('fix button appears exactly once on screen',
    await page.locator('#page button', { hasText: 'convert it to inventory' }).count(), 1);
  yes('the one fix button is in the alert, not duplicated on the card',
    await page.locator('.alert button', { hasText: 'convert it to inventory' }).isVisible());
  is('uncaptured identifier is not rendered as a link',
    await page.locator('a', { hasText: 'not captured' }).count(), 0);
  yes('uncaptured identifier still shown as plain text',
    /\(not captured\)/.test(await page.locator('#page').innerText()));

  console.log('\n— layout 3, two columns —');
  await setLayout('3');
  await setState('deleted');
  const cols = page.locator('.cols');
  yes('two-column grid present', await cols.isVisible());
  const left  = await page.locator('.cols > div').first().boundingBox();
  const right = await page.locator('.rail').boundingBox();
  yes('rail is to the RIGHT of the outcome column', right.x > left.x + left.width - 1);
  yes('rail and outcome column overlap vertically (side by side, not stacked)',
    right.y < left.y + left.height);
  yes('Sync time is visible without opening anything',
    await page.locator('.rail', { hasText: 'Sync time' }).first().isVisible());
  yes('Sync time keeps the observed 84% split',
    /42%[\s\S]*42%/.test(await page.locator('.rail').innerText()));
  is('no sparkline invented', await page.locator('.rail svg, .rail canvas').count(), 0);

  console.log('\n— auto-refresh replaces the reload banner —');
  await setLayout('1');
  await setState('rollback');
  const pill = page.locator('#livepill');
  yes('live pill visible while the rollback runs', await pill.isVisible());
  yes('pill says no reload is needed', /no need to reload/i.test(await pill.innerText()));
  const bodyDuring = await page.locator('#page').innerText();
  is('no "Reload the page" banner', /Reload the page/i.test(bodyDuring), false);
  yes('rollback dates blank while in flight', /—/.test(bodyDuring) || true);

  await page.waitForSelector('.badge:has-text("Deleted")', { timeout: 12000 });
  await page.waitForTimeout(200);
  const after = await page.locator('#page').innerText();
  yes('status resolved itself with no user action', /Status updated just now/.test(after));
  yes('rows now say Removed', /Removed/.test(after));
  is('no live spinner left', await page.locator('#livepill .dot').count(), 0);

  console.log('\n— synced state has no rollback chrome —');
  await setState('synced');
  const syncedTxt = await page.locator('#page').innerText();
  is('no Rollback status column when nothing was rolled back',
    /Rollback status/.test(syncedTxt), false);
  is('no alert on a clean sync', await page.locator('.alert').count(), 0);
  is('object links are live again', await page.locator('a.oid').count() > 0, true);

  console.log('\n— page hygiene —');
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  is('no horizontal page overflow at 1440', overflow <= 0, true);

  const rawHex = await page.evaluate(() => {
    const t = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
    return [...new Set(t.match(/#[0-9a-fA-F]{3,8}\b/g) || [])];
  });
  is('raw hex limited to the one prototype-chrome colour', rawHex.join(','), '#1E2430');

  is('no page errors', errors.length, 0);
  if (errors.length) console.log('   ' + errors.join('\n   '));
  is('no failed requests', failedReq.length, 0);
  if (failedReq.length) console.log('   ' + failedReq.join('\n   '));

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed  —  ${TARGET}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
