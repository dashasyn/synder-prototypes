const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve('projects/settings-rework/proto-b.html'));
  await p.waitForTimeout(800);
  await p.locator('.tabs button').nth(1).click();
  await p.waitForTimeout(600);
  console.log('org pane on:', await p.locator('#org').isVisible(), '| bill pane on:', await p.locator('#bill').isVisible());
  console.log('totalbar visible on org tab:', await p.locator('#tbar').isVisible());
  console.log('title:', await p.locator('#ttl').innerText());
  await p.screenshot({ path: '.synder-state/settings-rework/shots/B-4-org.png', fullPage: true });
  // premium seats label
  await p.locator('.tabs button').nth(0).click(); await p.waitForTimeout(500);
  const row = await p.locator('#qtyBody tr').nth(2).innerText();
  console.log('users row:', row.replace(/\n/g, ' | '));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
