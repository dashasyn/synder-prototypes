const { chromium } = require('playwright');
const path = require('path');
const O = '.synder-state/settings-rework/org';
require('fs').mkdirSync(O, { recursive: true });
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type()==='error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://' + path.resolve('projects/settings-rework/organization.html'));
  await p.waitForTimeout(1000);
  const T = s => p.locator(s).first().innerText().catch(()=>'?');

  console.log('sidebar visible:', await p.locator('.sidebar').isVisible(), '| items:', await p.locator('.snav').count());
  console.log('topbar:', (await T('.topbar')).replace(/\n/g,' ').slice(0,70));
  console.log('tabs:', (await p.locator('#tabs button').allInnerTexts()).map(t=>t.replace(/\n/g,'')).join(' · '));
  console.log('attention above tabs:', await p.evaluate(() => {
    const a = document.getElementById('attn'), t = document.getElementById('tabs');
    return a.getBoundingClientRect().bottom <= t.getBoundingClientRect().top + 2; }));
  await p.screenshot({ path: `${O}/n1-billing.png`, fullPage: true });

  // add-ons tab
  await p.click('#tabs button[data-t="addons"]'); await p.waitForTimeout(600);
  const names = await p.locator('#pane-addons .ac .an').allInnerTexts();
  console.log('\nadd-on cards (' + names.length + '):', names.join(' · '));
  console.log('RevRec present:', names.includes('Synder RevRec'), '| Insights:', names.includes('Synder Insights'),
              '| Invoicing:', names.includes('Invoicing'), '| promo:', names.includes('Earn transactions free'));
  await p.screenshot({ path: `${O}/n2-addons.png`, fullPage: true });

  // add RevRec and check it lands on the billing tab + total
  await p.click('#pane-addons .ac:has-text("Synder RevRec") button:has-text("Add")'); await p.waitForTimeout(500);
  console.log('\ntier modal:', await T('#tierTitle'), '| now:', await T('#tierNow'), '| add:', await T('#tierAdd'), '| total:', await T('#tierTot'));
  await p.selectOption('#tierSel', '1'); await p.waitForTimeout(300);
  console.log('after tier change → total:', await T('#tierTot'));
  await p.screenshot({ path: `${O}/n3-tier.png` });
  await p.click('#tierGo'); await p.waitForTimeout(700);
  console.log('addon badge:', await T('#addonCount'));
  await p.click('#tabs button[data-t="billing"]'); await p.waitForTimeout(500);
  console.log('billing total now:', (await T('#moneyStrip')).replace(/\n/g,' ').match(/\$[\d.,]+/g)?.join(' '));
  console.log('RevRec line on billing:', (await T('#moneySubs')).includes('Synder RevRec'));
  await p.screenshot({ path: `${O}/n4-with-revrec.png`, fullPage: true });

  // plan flow still fine, and shows add-ons unchanged
  await p.click('text=Change plan'); await p.waitForTimeout(500);
  await p.click('.plan:has-text("Pro")'); await p.waitForTimeout(300);
  console.log('\nflow footer:', await T('#fTot'), '|', await T('#fDelta'));
  await p.click('#fNext'); await p.waitForTimeout(400);
  await p.click('#fNext'); await p.waitForTimeout(500);
  const d = await p.locator('#diff').innerText();
  console.log('review mentions add-ons row:', d.includes('Add-ons'));
  console.log('CTA:', await T('#fNext'));
  await p.screenshot({ path: `${O}/n5-review.png` });
  await p.click('#fNext'); await p.waitForTimeout(700);
  console.log('after confirm, plan:', (await T('#moneyStrip')).split('\n')[1]);
  await p.keyboard.press('Escape');

  // cancel mentions add-ons
  await p.click('#cancelLink'); await p.waitForTimeout(500);
  await p.click('#creasons button:has-text("Closing this organization")'); await p.waitForTimeout(250);
  await p.click('#cNext'); await p.waitForTimeout(400);
  await p.click('#cNext'); await p.waitForTimeout(500);
  console.log('\ncancel review mentions add-ons:', (await T('#cdiff')).includes('RevRec'));
  await p.screenshot({ path: `${O}/n6-cancel.png` });
  await p.click('#cNext'); await p.waitForTimeout(700);
  console.log('page after cancel says Ends:', (await T('#moneyStrip')).includes('Ends'));

  // remaining tabs render
  for (const t of ['conn','people','prefs']) {
    await p.click(`#tabs button[data-t="${t}"]`); await p.waitForTimeout(400);
    await p.screenshot({ path: `${O}/n7-${t}.png`, fullPage: true });
  }
  console.log('\nerrors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
