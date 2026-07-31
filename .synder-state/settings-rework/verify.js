const { chromium } = require('playwright');
const path = require('path');
const DIR = path.resolve('projects/settings-rework');
const OUT = '.synder-state/settings-rework/shots';
require('fs').mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 });
  const errors = [];

  const open = async (file) => {
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(`${file}: ${m.text()}`); });
    page.on('pageerror', e => errors.push(`${file}: PAGEERROR ${e.message}`));
    await page.goto('file://' + path.join(DIR, file), { waitUntil: 'load' });
    await page.waitForTimeout(900);
    return page;
  };

  const txt = (p, sel) => p.locator(sel).first().innerText().catch(() => '(none)');

  // ── A
  let p = await open('proto-a.html');
  await p.screenshot({ path: `${OUT}/A-1-page.png`, fullPage: true });
  await p.click('text=Change plan & add-ons');
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/A-2-drawer.png` });
  console.log('A drawer total before:', await txt(p, '#newTotal'), '| delta:', await txt(p, '#delta'));
  // bump transactions twice
  const aPlus = p.locator('.arow').first().locator('.stepper button').last();
  await aPlus.click(); await aPlus.click();
  await p.waitForTimeout(400);
  console.log('A after +1000 tx:', await txt(p, '#newTotal'), '| delta:', await txt(p, '#delta'),
              '| confirm disabled:', await p.locator('#confirmBtn').isDisabled());
  await p.screenshot({ path: `${OUT}/A-3-drawer-bumped.png` });
  // switch to Pro
  await p.click('.plancard[data-plan="pro"]');
  await p.waitForTimeout(400);
  console.log('A on Pro:', await txt(p, '#newTotal'), '| delta:', await txt(p, '#delta'));
  await p.locator('#proMax').click();
  await p.waitForTimeout(400);
  console.log('A on Pro Max:', await txt(p, '#newTotal'));
  await p.screenshot({ path: `${OUT}/A-4-pro-max.png` });
  // premium quote path
  await p.click('.plancard[data-plan="premium"]');
  await p.waitForTimeout(300);
  console.log('A on Premium:', await txt(p, '#newTotal'), '| btn:', await txt(p, '#confirmBtn'));
  await p.keyboard.press('Escape');
  // save bar
  await p.fill('#details input.input', 'Renamed Co');
  await p.waitForTimeout(300);
  console.log('A savebar visible:', await p.locator('#savebar').isVisible(), '|', await txt(p, '#savebar .txt'));
  await p.screenshot({ path: `${OUT}/A-5-savebar.png` });
  await p.click('text=Buy historical transactions');
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/A-6-hist-modal.png` });
  await p.close();

  // ── B
  p = await open('proto-b.html');
  await p.screenshot({ path: `${OUT}/B-1-billing.png`, fullPage: true });
  console.log('\nB total:', await txt(p, '#tAmt'), '|', await txt(p, '#tDelta'));
  const bPlus = p.locator('#qtyBody tr').nth(1).locator('.stepper button').last();
  await bPlus.click(); await bPlus.click(); await bPlus.click();
  await p.waitForTimeout(400);
  console.log('B after +1500 tx:', await txt(p, '#tAmt'), '|', await txt(p, '#tDelta'));
  console.log('B items:', (await txt(p, '#tItems')).replace(/\n/g, ' · '));
  await p.screenshot({ path: `${OUT}/B-2-bumped.png` });
  await p.click('text=Choose Pro');
  await p.waitForTimeout(500);
  console.log('B on Pro:', await txt(p, '#tAmt'), '|', await txt(p, '#tDelta'));
  await p.screenshot({ path: `${OUT}/B-3-pro-selected.png`, fullPage: true });
  await p.click('#sMax'); await p.waitForTimeout(400);
  console.log('B Pro Max:', await txt(p, '#tAmt'));
  await p.click('#tReset'); await p.waitForTimeout(400);
  console.log('B after reset:', await txt(p, '#tAmt'), '| go disabled:', await p.locator('#tGo').isDisabled());
  await p.click('text=Organization'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/B-4-org.png`, fullPage: true });
  console.log('B totalbar hidden on org tab:', !(await p.locator('#tbar').isVisible()));
  await p.close();

  // ── C
  p = await open('proto-c.html');
  await p.screenshot({ path: `${OUT}/C-1-overview.png`, fullPage: true });
  console.log('\nC cart btn disabled at start:', await p.locator('#cartBtn').isDisabled());
  await p.click('#cPlan');
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/C-2-plan-step1.png` });
  await p.click('.planrow[data-plan="pro"]');
  await p.waitForTimeout(300);
  await p.click('#planNext'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/C-3-plan-step2.png` });
  const cPlus = p.locator('#addons .arow').first().locator('.stepper button').last();
  await cPlus.click(); await cPlus.click();
  await p.waitForTimeout(400);
  console.log('C foot after bump:', await txt(p, '#planFoot'));
  await p.click('#planNext'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/C-4-plan-review.png` });
  console.log('C diff rows:', await p.locator('#diffBox .dr').count());
  await p.click('#planNext'); await p.waitForTimeout(700);
  console.log('C cart btn after add:', await txt(p, '#cartBtn'), '| disabled:', await p.locator('#cartBtn').isDisabled());
  await p.screenshot({ path: `${OUT}/C-5-overview-pending.png`, fullPage: true });
  await p.click('#cartBtn'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/C-6-cart.png` });
  console.log('C cart foot:', await txt(p, '#cartFoot'));
  await p.click('text=Confirm everything'); await p.waitForTimeout(700);
  console.log('C after confirm, cart disabled:', await p.locator('#cartBtn').isDisabled());
  await p.click('.scard:has-text("Payment & invoices")'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/C-7-payment.png` });
  await p.keyboard.press('Escape');
  await p.click('.scard:has-text("Sync balance")'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/C-8-balance.png` });
  await p.close();

  console.log('\n=== CONSOLE / PAGE ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
