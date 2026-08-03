const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve('projects/settings-rework/manage-subscription-v2.html'));
  await p.waitForTimeout(900);
  const T = s => p.locator(s).first().innerText().catch(()=>'?');

  await p.click('#scenarios button[data-sc="pro3"]'); await p.waitForTimeout(600);
  await p.click('text=Compare plans'); await p.waitForTimeout(400);
  await p.click('.plancard:has-text("Essential")'); await p.waitForTimeout(500);
  await p.click('#tGo'); await p.waitForTimeout(600);
  for (const fix of ['Keep 3 seats', 'Keep them', 'Add 500 more']) {
    const l = p.locator(`#confirmBody button:has-text("${fix}")`);
    if (await l.count()) { await l.click(); await p.waitForTimeout(700); }
  }
  const cb = await p.locator('#confirmBody').innerText();
  console.log('forfeit disclosed:', cb.includes('not refundable'));
  console.log('schedule offered:', cb.includes('Schedule it for'));
  console.log('CTA:', await T('#confirmGo'));
  await p.screenshot({ path: '.synder-state/settings-rework/v2/forfeit.png' });
  const sched = p.locator('#confirmBody button:has-text("Schedule it for")');
  if (await sched.count()) { await sched.click(); await p.waitForTimeout(800);
    console.log('after scheduling — go disabled:', await p.locator('#tGo').isDisabled(), '| total:', await T('#tAmt')); }

  await p.click('#scenarios button[data-sc="demo"]'); await p.waitForTimeout(600);
  await p.click('text=Compare plans'); await p.waitForTimeout(400);
  await p.click('.plancard:has-text("Pro")'); await p.waitForTimeout(500);
  await p.click('#tGo'); await p.waitForTimeout(600);
  const cb2 = await p.locator('#confirmBody').innerText();
  console.log('\nupgrade — forfeit shown:', cb2.includes('not refundable'), '(expect false)');
  console.log('upgrade CTA:', await T('#confirmGo'));
  console.log('\nerrors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
