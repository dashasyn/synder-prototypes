const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 950 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve('projects/settings-rework/organization.html'));
  await p.waitForTimeout(800);
  const T = s => p.locator(s).first().innerText().catch(()=>'?');

  // upgrade to Pro first so a downgrade is possible
  await p.click('text=Change plan'); await p.waitForTimeout(400);
  await p.click('.plan:has-text("Pro")'); await p.waitForTimeout(300);
  await p.click('#fNext'); await p.waitForTimeout(400);
  await p.click('#fNext'); await p.waitForTimeout(400);
  await p.click('#fNext'); await p.waitForTimeout(700);
  console.log('now on:', (await T('#moneyStrip')).split('\n')[1]);

  // downgrade — resolve every guard, then check the forfeit
  await p.click('text=Change plan'); await p.waitForTimeout(400);
  await p.click('.plan:has-text("Essential")'); await p.waitForTimeout(300);
  await p.click('#fNext'); await p.waitForTimeout(500);
  for (let i = 0; i < 6; i++) {
    const blocking = await p.locator('#guards .alert-error button').count();
    if (!blocking) break;
    await p.locator('#guards .alert-error button').first().click();
    await p.waitForTimeout(350);
  }
  console.log('blocking guards left:', await p.locator('#guards .alert-error').count(),
              '| warnings:', await p.locator('#guards .alert-warning').count());
  await p.click('#fNext'); await p.waitForTimeout(600);
  console.log('reached step3:', await p.locator('#sp3').isVisible());
  const pn = await p.locator('#paynow').innerText().catch(()=>'');
  console.log(pn.split('\n').map(l=>'  '+l.trim()).filter(l=>l.trim()).join('\n'));
  console.log('CTA:', await T('#fNext'));
  await p.screenshot({ path: '.synder-state/settings-rework/org/8-forfeit.png' });
  const sched = p.locator('#paynow a');
  if (await sched.count()) { await sched.click(); await p.waitForTimeout(700);
    console.log('after scheduling — page still on:', (await T('#moneyStrip')).split('\n')[1]); }
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
