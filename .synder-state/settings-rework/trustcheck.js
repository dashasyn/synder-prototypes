/* Trust lens, run mechanically: can any of the four round-2 prototypes display a
   price or state that disagrees with the actual selection? */
const { chromium } = require('playwright');
const path = require('path');
const D = f => 'file://' + path.resolve('projects/settings-rework/' + f);
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
  const T = (p,s) => p.locator(s).first().innerText().catch(()=>'?');

  console.log('== A: does the on-page receipt go stale after a confirmed plan change? ==');
  let p = await ctx.newPage(); await p.goto(D('proto-a.html')); await p.waitForTimeout(800);
  const receiptBefore = (await T(p,'.receipt')).replace(/\s+/g,' ').slice(0,120);
  await p.click('text=Change plan & add-ons'); await p.waitForTimeout(500);
  await p.click('.plancard[data-plan="pro"]'); await p.waitForTimeout(400);
  await p.click('#confirmBtn'); await p.waitForTimeout(800);
  const stripAfter = (await T(p,'.plan-strip')).replace(/\s+/g,' ').slice(0,100);
  const receiptAfter = (await T(p,'.receipt')).replace(/\s+/g,' ').slice(0,120);
  console.log(' plan strip after confirm :', stripAfter);
  console.log(' receipt  after confirm :', receiptAfter);
  console.log(' >> receipt changed:', receiptBefore !== receiptAfter, '| strip still says Essential:', stripAfter.includes('Essential'));
  await p.close();

  console.log('\n== C: do overview cards show stale numbers while a change is pending? ==');
  p = await ctx.newPage(); await p.goto(D('proto-c.html')); await p.waitForTimeout(800);
  await p.click('#cPlan'); await p.waitForTimeout(500);
  await p.click('.planrow[data-plan="pro"]'); await p.waitForTimeout(300);
  await p.click('#planNext'); await p.waitForTimeout(400);
  await p.click('#planNext'); await p.waitForTimeout(400);
  await p.click('#planNext'); await p.waitForTimeout(700);
  const card = (await T(p,'#cPlan')).replace(/\s+/g,' ');
  console.log(' plan card while pending:', card.slice(0,150));
  console.log(' >> card still shows old plan:', card.includes('Essential'), '| pending marker present:', card.includes('pending'));
  await p.close();

  console.log('\n== B: can a non-selected column be misread as your own configuration? ==');
  p = await ctx.newPage(); await p.goto(D('proto-b.html')); await p.waitForTimeout(800);
  const row = (await T(p,'#qtyBody tr:nth-child(2)')).replace(/\s+/g,' ');
  console.log(' transactions row:', row.slice(0,160));
  await p.close();

  console.log('\n== v2: is the forfeit arithmetic self-consistent? ==');
  p = await ctx.newPage(); await p.goto(D('manage-subscription-v2.html')); await p.waitForTimeout(900);
  await p.click('#scenarios button[data-sc="pro3"]'); await p.waitForTimeout(600);
  await p.click('text=Compare plans'); await p.waitForTimeout(400);
  await p.click('.plancard:has-text("Essential")'); await p.waitForTimeout(500);
  await p.click('#tGo'); await p.waitForTimeout(600);
  for (const f of ['Keep 3 seats','Keep them','Add 500 more']) {
    const l = p.locator(`#confirmBody button:has-text("${f}")`);
    if (await l.count()) { await l.click(); await p.waitForTimeout(600); }
  }
  const money = (await p.locator('#confirmBody').innerText()).split('\n').filter(l=>/\$/.test(l));
  console.log(money.map(l=>'  '+l.trim()).join('\n'));
  await p.close();
  await b.close();
})();
