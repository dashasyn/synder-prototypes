const { chromium } = require('playwright');
const path = require('path');
const D = f => 'file://' + path.resolve('projects/settings-rework/' + f);
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const O = '.synder-state/settings-rework/hero';
  require('fs').mkdirSync(O, { recursive: true });

  let p = await ctx.newPage();
  await p.goto(D('proto-a.html')); await p.waitForTimeout(900);
  await p.click('text=Change plan & add-ons'); await p.waitForTimeout(700);
  const plus = p.locator('.arow').first().locator('.stepper button').last();
  await plus.click(); await plus.click(); await p.waitForTimeout(500);
  await p.screenshot({ path: `${O}/A.png` });
  await p.close();

  p = await ctx.newPage();
  await p.goto(D('proto-b.html')); await p.waitForTimeout(900);
  const bp = p.locator('#qtyBody tr').nth(1).locator('.stepper button').last();
  await bp.click(); await bp.click(); await bp.click(); await p.waitForTimeout(600);
  await p.screenshot({ path: `${O}/B.png` });
  await p.close();

  p = await ctx.newPage();
  await p.goto(D('proto-c.html')); await p.waitForTimeout(900);
  await p.click('#cPlan'); await p.waitForTimeout(600);
  await p.click('.planrow[data-plan="pro"]'); await p.waitForTimeout(300);
  await p.click('#planNext'); await p.waitForTimeout(500);
  const cp = p.locator('#addons .arow').first().locator('.stepper button').last();
  await cp.click(); await cp.click(); await p.waitForTimeout(400);
  await p.click('#planNext'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${O}/C.png` });
  await p.close();

  await b.close();
  console.log('hero shots done');
})();
