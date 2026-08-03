const { chromium } = require('playwright');
const path = require('path');
const O = '.synder-state/settings-rework/v2';
require('fs').mkdirSync(O, { recursive: true });
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://' + path.resolve('projects/settings-rework/manage-subscription-v2.html'));
  await p.waitForTimeout(900);
  const T = s => p.locator(s).first().innerText().catch(() => '?');

  // every state renders
  for (const s of ['active','trial','past_due','cancelling','expired','premium','nocard','loading','error']) {
    await p.click(`#states button[data-s="${s}"]`);
    await p.waitForTimeout(450);
    const bannerLen = (await p.locator('#banner').innerText().catch(()=>'')).length;
    const barVisible = await p.locator('#tbar').isVisible();
    const addons = await p.locator('#addons .arow').count();
    console.log(`${s.padEnd(11)} banner:${String(bannerLen).padStart(4)} totalbar:${barVisible?'yes':'no '} addonRows:${addons}`);
    await p.screenshot({ path: `${O}/state-${s}.png`, fullPage: true });
  }

  // back to active: insight card present?
  await p.click('#states button[data-s="active"]'); await p.waitForTimeout(500);
  console.log('\ninsight:', (await T('#insightSlot')).split('\n')[0]);

  // downgrade guardrail: 2 users today, drop to 1 -> must BLOCK
  console.log('\n-- guardrail: raise seats then drop back below what is occupied');
  const usersRow = p.locator('#addons .arow').nth(1);
  await usersRow.locator('.stepper button').last().click();   // 1 -> 2 additional (3 seats)
  await p.waitForTimeout(350);
  console.log('seats raised, total:', await T('#tAmt'), '|', await T('#tDelta'));
  // now go to Pro and back to Essential: Essential allows 1 additional, 2 are occupied
  await p.click('text=Compare plans'); await p.waitForTimeout(400);
  await p.click('.plancard:has-text("Premium")'); await p.waitForTimeout(400);
  await p.click('.plancard:has-text("Essential")'); await p.waitForTimeout(400);
  await usersRow.locator('.stepper button').first().click().catch(()=>{});
  await p.waitForTimeout(400);
  console.log('back on Essential, total:', await T('#tAmt'), '|', await T('#tDelta'));
  await p.click('#tGo'); await p.waitForTimeout(600);
  const cb = await p.locator('#confirmBody').innerText();
  console.log('confirm mentions Users guardrail:', cb.includes('Users:'));
  console.log('confirm button:', await T('#confirmGo'), '| disabled:', await p.locator('#confirmGo').isDisabled());
  await p.screenshot({ path: `${O}/guardrail-block.png` });
  // use the offered fix
  await p.click('#confirmBody button:has-text("Keep")').catch(()=>{}); await p.waitForTimeout(700);
  console.log('after fix, button:', await T('#confirmGo'), '| disabled:', await p.locator('#confirmGo').isDisabled());
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // upgrade path: proration shown
  console.log('\n-- proration on upgrade');
  await p.click('#tReset').catch(()=>{}); await p.waitForTimeout(400);
  await p.click('text=Compare plans'); await p.waitForTimeout(500);
  await p.click('.plancard:has-text("Pro")'); await p.waitForTimeout(500);
  console.log('total on Pro:', await T('#tAmt'), '|', await T('#tDelta'));
  await p.click('#tGo'); await p.waitForTimeout(600);
  const cb2 = await p.locator('#confirmBody').innerText();
  console.log('shows credit line:', cb2.includes('Credit for'));
  console.log('confirm CTA:', await T('#confirmGo'));
  await p.screenshot({ path: `${O}/proration.png` });
  await p.click('#confirmGo'); await p.waitForTimeout(800);
  console.log('after apply, delta:', await T('#tDelta'), '| go disabled:', await p.locator('#tGo').isDisabled());
  await p.keyboard.press('Escape');

  // cancel wizard, real taxonomy
  console.log('\n-- cancel wizard');
  await p.click('#states button[data-s="active"]'); await p.waitForTimeout(500);
  await p.click('#dangerCard button'); await p.waitForTimeout(600);
  const reasons = await p.locator('#cancelBody .reasons button').allInnerTexts();
  console.log('step1 reasons (' + reasons.length + '):', reasons.join(' / '));
  await p.click('#cancelBody .reasons button:has-text("Too expensive")'); await p.waitForTimeout(300);
  await p.click('#cancelFooter button:has-text("Next")'); await p.waitForTimeout(500);
  console.log('step2 offer:', (await T('.offer h4')));
  const subs = await p.locator('#cancelBody .reasons button').allInnerTexts();
  console.log('step2 sub-reasons (' + subs.length + '):', subs.join(' / '));
  await p.screenshot({ path: `${O}/cancel-step2.png` });
  await p.click('#cancelBody .reasons button >> nth=0'); await p.waitForTimeout(300);
  await p.click('#cancelFooter button:has-text("Next")'); await p.waitForTimeout(500);
  const s3 = await p.locator('#cancelBody').innerText();
  console.log('step3 states consequences:', s3.includes('read-only') && s3.includes('forfeited'));
  await p.screenshot({ path: `${O}/cancel-step3.png` });
  await p.click('#cancelFooter button:has-text("Cancel subscription")'); await p.waitForTimeout(700);
  console.log('after cancelling, state banner:', (await p.locator('#banner').innerText()).split('\n')[0]);

  // reason with no sub-reasons should not block
  await p.click('#states button[data-s="active"]'); await p.waitForTimeout(400);
  await p.click('#dangerCard button'); await p.waitForTimeout(500);
  await p.click('#cancelBody .reasons button:has-text("Closing my business")'); await p.waitForTimeout(300);
  await p.click('#cancelFooter button:has-text("Next")'); await p.waitForTimeout(500);
  console.log('no-sub-reason Next enabled:', !(await p.locator('#cancelFooter button:has-text("Next")').isDisabled()));
  await p.keyboard.press('Escape');

  console.log('\nerrors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
