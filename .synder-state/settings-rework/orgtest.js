const { chromium } = require('playwright');
const path = require('path');
const O = '.synder-state/settings-rework/org';
require('fs').mkdirSync(O, { recursive: true });
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 950 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type()==='error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://' + path.resolve('projects/settings-rework/organization.html'));
  await p.waitForTimeout(900);
  const T = s => p.locator(s).first().innerText().catch(()=>'?');

  await p.screenshot({ path: `${O}/1-page.png`, fullPage: true });
  console.log('zone1 banner:', (await T('#z1')).split('\n').slice(0,2).join(' | '));

  // fixing a connection should remove it from the attention zone
  await p.click('#z1 a'); await p.waitForTimeout(500);
  console.log('after 1 fix:', (await T('#z1')).split('\n')[1] || '(zone empty)');
  await p.click('#z1 a'); await p.waitForTimeout(500);
  const z1 = await p.locator('#z1').innerText().catch(()=>'');
  console.log('after both fixed, zone hidden:', z1.trim() === '');
  await p.screenshot({ path: `${O}/2-fixed.png`, fullPage: true });
  await p.reload(); await p.waitForTimeout(800);

  // ── the flow
  await p.click('text=Change plan'); await p.waitForTimeout(600);
  console.log('\nflow step1 visible:', await p.locator('#sp1').isVisible(), '| footer:', await T('#fTot'), await T('#fDelta'));
  await p.screenshot({ path: `${O}/3-step1.png` });
  await p.click('.plan:has-text("Pro")'); await p.waitForTimeout(400);
  console.log('after picking Pro:', await T('#fTot'), '|', await T('#fDelta'));
  await p.click('#fNext'); await p.waitForTimeout(500);
  console.log('step2 addon rows:', await p.locator('#addons .arow').count(), '| guards:', await p.locator('#guards .alert').count());
  await p.screenshot({ path: `${O}/4-step2.png` });
  const plus = p.locator('#addons .arow').first().locator('.stepper button').last();
  await plus.click(); await plus.click(); await p.waitForTimeout(400);
  console.log('after +1000 tx:', await T('#fTot'), '|', await T('#fDelta'));
  await p.click('#fNext'); await p.waitForTimeout(500);
  console.log('step3 diff rows:', await p.locator('#diff .dr').count(), '| CTA:', await T('#fNext'));
  await p.screenshot({ path: `${O}/5-step3.png` });
  await p.click('#fNext'); await p.waitForTimeout(700);
  console.log('after confirm — page plan:', (await T('#moneyStrip')).split('\n').slice(0,4).join(' | '));
  await p.screenshot({ path: `${O}/6-after.png`, fullPage: true });

  // downgrade should trip the guardrail and block
  await p.click('text=Change plan'); await p.waitForTimeout(500);
  await p.click('.plan:has-text("Essential")'); await p.waitForTimeout(400);
  await p.click('#fNext'); await p.waitForTimeout(500);
  const gtxt = await p.locator('#guards').innerText().catch(()=>'');
  console.log('\ndowngrade guards:', gtxt.split('\n').filter(l=>l.trim()).slice(0,3).join(' / '));
  await p.click('#fNext'); await p.waitForTimeout(400);
  console.log('blocked at step2:', await p.locator('#sp2').isVisible());
  await p.screenshot({ path: `${O}/7-guard.png` });
  await p.click('#guards button'); await p.waitForTimeout(400);
  await p.click('#fNext'); await p.waitForTimeout(500);
  const pn = await p.locator('#paynow').innerText().catch(()=>'');
  console.log('forfeit shown:', pn.includes('not refundable'), '| schedule offered:', pn.includes('Schedule it'));
  await p.screenshot({ path: `${O}/8-forfeit.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // coupon + autocharge + historical actually change the page
  await p.reload(); await p.waitForTimeout(800);
  await p.click('text=Add a coupon'); await p.waitForTimeout(400);
  await p.fill('#couponIn', 'spring20');
  await p.click('#mCoupon .btn-primary'); await p.waitForTimeout(600);
  console.log('\ncoupon on page:', (await T('#moneyStrip')).includes('SPRING20'));
  await p.click('#moneySubs a:has-text("Change")'); await p.waitForTimeout(500);
  console.log('autocharge modal states rate:', (await T('#autoRate')));
  await p.selectOption('#autoCap', '$250 / month'); await p.waitForTimeout(300);
  await p.click('#mAuto .btn-primary'); await p.waitForTimeout(600);
  console.log('autocharge line:', (await T('#moneySubs')).split('\n').find(l=>l.includes('$0.04')) || '(none)');
  await p.click('text=Buy more'); await p.waitForTimeout(400);
  await p.click('#mHist .btn-primary'); await p.waitForTimeout(600);
  console.log('historical line:', (await T('#moneySubs')).split('\n').find(l=>l.includes('reserve')) || '(none)');
  await p.screenshot({ path: `${O}/9-money.png`, fullPage: true });

  // cancel flow updates the page
  await p.click('#cancelLink'); await p.waitForTimeout(600);
  const rs = await p.locator('#creasons button').allInnerTexts();
  console.log('\ncancel reasons:', rs.length);
  await p.click('#creasons button:has-text("Too expensive")'); await p.waitForTimeout(300);
  await p.click('#cNext'); await p.waitForTimeout(500);
  console.log('offer:', await T('.offer h4'));
  await p.screenshot({ path: `${O}/10-cancel2.png` });
  await p.click('#cNext'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${O}/11-cancel3.png` });
  await p.click('#cNext'); await p.waitForTimeout(700);
  const ms = await T('#moneyStrip');
  console.log('page after cancelling — says Active?', ms.includes('Active'), '| says Ends?', ms.includes('Ends'));
  console.log('cancel link hidden:', !(await p.locator('#cancelLink').isVisible()));
  await p.screenshot({ path: `${O}/12-cancelled.png`, fullPage: true });

  // other states render
  for (const s of ['trial','past_due','premium','active']) {
    await p.click(`#states button[data-s="${s}"]`); await p.waitForTimeout(450);
    await p.screenshot({ path: `${O}/13-state-${s}.png`, fullPage: true });
  }
  console.log('\nerrors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
