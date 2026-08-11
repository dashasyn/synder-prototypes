const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 2 })).newPage();
  await p.goto('file://' + path.resolve('projects/settings-rework/organization.html'));
  await p.waitForTimeout(800);
  const t = await p.locator('#factbar').innerText();
  console.log('factbar:', t.replace(/\n/g, ' '));
  console.log('stray space before comma:', / ,/.test(t));
  console.log('card height:', Math.round(await p.evaluate(() => document.querySelector('.card.compact').getBoundingClientRect().height)) + 'px');
  await p.screenshot({ path: '.synder-state/settings-rework/org/c1-billing.png', fullPage: true });
  await p.screenshot({ path: '.synder-state/settings-rework/org/c1-billing-fold.png' });
  await b.close();
})();
