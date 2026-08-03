const { chromium } = require('playwright');
const path = require('path');
const O = '.synder-state/settings-rework/hero';
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 });
  const F = 'file://' + path.resolve('projects/settings-rework/manage-subscription-v2.html');

  // 1. the screen with the usage insight
  let p = await ctx.newPage(); await p.goto(F); await p.waitForTimeout(1000);
  await p.screenshot({ path: `${O}/v2-overview.png` });
  await p.close();

  // 2. guardrails firing on a downgrade
  p = await ctx.newPage(); await p.goto(F); await p.waitForTimeout(1000);
  await p.click('#scenarios button[data-sc="pro3"]'); await p.waitForTimeout(600);
  await p.click('text=Compare plans'); await p.waitForTimeout(400);
  await p.click('.plancard:has-text("Essential")'); await p.waitForTimeout(500);
  await p.click('#tGo'); await p.waitForTimeout(800);
  await p.screenshot({ path: `${O}/v2-guardrails.png` });
  await p.close();

  // 3. past-due state
  p = await ctx.newPage(); await p.goto(F); await p.waitForTimeout(1000);
  await p.click('#states button[data-s="past_due"]'); await p.waitForTimeout(700);
  await p.screenshot({ path: `${O}/v2-pastdue.png` });
  await p.close();

  await b.close(); console.log('done');
})();
