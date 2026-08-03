const { chromium } = require('playwright');
const path = require('path');
const O = '.synder-state/settings-rework/v2';
require('fs').mkdirSync(O, { recursive: true });
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://' + path.resolve('projects/settings-rework/manage-subscription-v2.html'));
  await p.waitForTimeout(900);
  const T = s => p.locator(s).first().innerText().catch(() => '?');

  console.log('=== demo org (over-provisioned) ===');
  console.log('insight:', (await T('#insightSlot')).split('\n')[0]);
  console.log('total:', await T('#tAmt'));

  console.log('\n=== Pro org, 3 people ===');
  await p.click('#scenarios button[data-sc="pro3"]'); await p.waitForTimeout(700);
  console.log('insight:', (await T('#insightSlot')).split('\n')[0]);
  console.log('total:', await T('#tAmt'), '|', await T('#tDelta'));
  await p.screenshot({ path: `${O}/pro3-insight.png`, fullPage: true });

  // downgrade Pro -> Essential: should trip BOTH guardrails
  await p.click('text=Compare plans'); await p.waitForTimeout(400);
  await p.click('.plancard:has-text("Essential")'); await p.waitForTimeout(600);
  console.log('after downgrade to Essential:', await T('#tAmt'), '|', await T('#tDelta'));
  await p.click('#tGo'); await p.waitForTimeout(700);
  const cb = await p.locator('#confirmBody').innerText();
  console.log('Users guardrail:', cb.includes('Users:'), '| Transactions guardrail:', cb.includes('Transactions:'), '| Smart rules guardrail:', cb.includes('Smart rules:'));
  console.log('confirm CTA:', await T('#confirmGo'), '| blocked:', await p.locator('#confirmGo').isDisabled());
  await p.screenshot({ path: `${O}/guardrails-fire.png` });

  // resolve seats via the offered fix
  await p.click('#confirmBody button:has-text("Keep 3 seats")'); await p.waitForTimeout(800);
  const cb2 = await p.locator('#confirmBody').innerText();
  console.log('after seat fix — Users guardrail gone:', !cb2.includes('Users:'), '| still blocked:', await p.locator('#confirmGo').isDisabled());
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // upgrade path proration
  console.log('\n=== proration ===');
  await p.click('#scenarios button[data-sc="demo"]'); await p.waitForTimeout(600);
  await p.click('text=Compare plans'); await p.waitForTimeout(400);
  await p.click('.plancard:has-text("Pro")'); await p.waitForTimeout(500);
  await p.click('#tGo'); await p.waitForTimeout(600);
  const cb3 = await p.locator('#confirmBody').innerText();
  console.log('credit line present:', cb3.includes('Credit for'), '| CTA:', await T('#confirmGo'));
  await p.screenshot({ path: `${O}/proration.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // cancel wizard
  console.log('\n=== cancel wizard ===');
  await p.click('#dangerCard button'); await p.waitForTimeout(700);
  const reasons = await p.locator('#cancelBody .reasons button').allInnerTexts();
  console.log('step1 reasons (' + reasons.length + '):', reasons.join(' / '));
  await p.click('#cancelBody .reasons button:has-text("Too expensive")'); await p.waitForTimeout(300);
  await p.click('#cancelFooter button:has-text("Next")'); await p.waitForTimeout(500);
  console.log('step2 offer:', await T('.offer h4'));
  const subs = await p.locator('#cancelBody .reasons button').allInnerTexts();
  console.log('step2 subs (' + subs.length + '):', subs.join(' / '));
  await p.screenshot({ path: `${O}/cancel-step2.png` });
  await p.click('#cancelBody .reasons button >> nth=0'); await p.waitForTimeout(250);
  await p.click('#cancelFooter button:has-text("Next")'); await p.waitForTimeout(500);
  const s3 = await p.locator('#cancelBody').innerText();
  console.log('step3 spells out consequences:', s3.includes('read-only') && s3.includes('forfeited') && s3.includes('reactivate'));
  await p.screenshot({ path: `${O}/cancel-step3.png` });
  await p.click('#cancelFooter button:has-text("Cancel subscription")'); await p.waitForTimeout(800);
  console.log('lands in cancelling state:', (await p.locator('#banner').innerText()).includes('ends 27 Jul 2027'));

  // reason with no sub-reasons
  await p.click('#states button[data-s="active"]'); await p.waitForTimeout(400);
  await p.click('#dangerCard button'); await p.waitForTimeout(500);
  await p.click('#cancelBody .reasons button:has-text("Closing my business")'); await p.waitForTimeout(250);
  await p.click('#cancelFooter button:has-text("Next")'); await p.waitForTimeout(500);
  console.log('no-sub-reason path advances:', !(await p.locator('#cancelFooter button:has-text("Next")').isDisabled()));
  await p.keyboard.press('Escape');

  console.log('\nerrors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
