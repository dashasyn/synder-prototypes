const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve('projects/settings-rework/organization.html'));
  await p.waitForTimeout(800);
  await p.click('#tabs button[data-t="conn"]'); await p.waitForTimeout(500);
  const h = await p.$$eval('#integTable tbody tr:not(.cfoot)', rs => rs.map(r => Math.round(r.getBoundingClientRect().height)));
  console.log('integration row heights (single-line ~50px):', h.join(' · '));
  const ah = await p.$$eval('#acctTable tbody tr:not(.cfoot)', rs => rs.map(r => Math.round(r.getBoundingClientRect().height)));
  console.log('accounting row height:', ah.join(' · '));
  console.log('errors:', errs.length ? errs : 'none');
  await p.screenshot({ path: '.synder-state/settings-rework/org/d1-connections.png', fullPage: true });
  await b.close();
})();
