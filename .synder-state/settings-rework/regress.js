const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
  const errs = [];
  const load = async f => { const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(f + ': ' + e.message));
    p.on('console', m => { if (m.type()==='error') errs.push(f + ': ' + m.text()); });
    await p.goto('file://' + path.resolve('projects/settings-rework/' + f)); await p.waitForTimeout(800); return p; };
  const T = (p,s)=>p.locator(s).first().innerText().catch(()=>'?');

  // ── ratchet regression: Essential -> Pro -> Essential must come back to 1,000
  let p = await load('proto-a.html');
  await p.click('text=Change plan & add-ons'); await p.waitForTimeout(400);
  await p.click('.plancard[data-plan="pro"]'); await p.waitForTimeout(300);
  await p.click('.plancard[data-plan="essential"]'); await p.waitForTimeout(300);
  console.log('A round-trip tx:', await T(p,'#addons .arow .val'), '| total:', await T(p,'#newTotal'), '| confirm disabled:', await p.locator('#confirmBtn').isDisabled());
  // touched value must survive a plan switch
  const plus = p.locator('.arow').first().locator('.stepper button').last();
  await plus.click(); await p.waitForTimeout(250);
  await p.click('.plancard[data-plan="pro"]'); await p.waitForTimeout(300);
  await p.click('.plancard[data-plan="essential"]'); await p.waitForTimeout(300);
  console.log('A touched survives round-trip:', await T(p,'#addons .arow .val'), '| total:', await T(p,'#newTotal'));
  await p.close();

  p = await load('proto-b.html');
  await p.click('text=Choose Pro'); await p.waitForTimeout(400);
  await p.click('text=Choose Essential'); await p.waitForTimeout(400);
  console.log('B round-trip total:', await T(p,'#tAmt'), '| go disabled:', await p.locator('#tGo').isDisabled());
  await p.close();

  p = await load('proto-c.html');
  await p.click('#cPlan'); await p.waitForTimeout(500);
  await p.click('.planrow[data-plan="pro"]'); await p.waitForTimeout(250);
  await p.click('.planrow[data-plan="essential"]'); await p.waitForTimeout(250);
  console.log('C round-trip foot:', await T(p,'#planFoot'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // balance purchase must land in the cart, not charge instantly
  await p.click('.scard:has-text("Sync balance")'); await p.waitForTimeout(500);
  await p.click('text=Add to pending changes'); await p.waitForTimeout(600);
  console.log('C cart after balance:', await T(p,'#cartBtn'), '| disabled:', await p.locator('#cartBtn').isDisabled());
  await p.click('#cartBtn'); await p.waitForTimeout(500);
  console.log('C cart foot:', await T(p,'#cartFoot'));
  console.log('C cart mentions historical:', (await T(p,'#cartBody')).includes('Historical'));
  await p.keyboard.press('Escape');
  // keyboard reachability
  const kb = await p.evaluate(() => { const c=document.querySelector('.scard');
    return { role:c.getAttribute('role'), tab:c.getAttribute('tabindex'), label:c.getAttribute('aria-label') }; });
  console.log('C card semantics:', JSON.stringify(kb));
  await p.close();
  console.log('\nerrors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
