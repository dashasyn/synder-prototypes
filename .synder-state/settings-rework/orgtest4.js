const { chromium } = require('playwright');
const path = require('path');
const O = '.synder-state/settings-rework/org';
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type()==='error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://' + path.resolve('projects/settings-rework/organization.html'));
  await p.waitForTimeout(900);
  const T = s => p.locator(s).first().innerText().catch(()=>'?');

  console.log('tabs:', (await p.locator('#tabs button').allInnerTexts()).map(t=>t.replace(/\n/g,'')).join(' · '));
  const h = await p.evaluate(() => ({
    card: document.querySelector('.card.compact').getBoundingClientRect().height,
    page: document.documentElement.scrollHeight,
    addonsOnBilling: !!document.querySelector('#pane-billing #acAvail'),
  }));
  console.log('plan card height:', Math.round(h.card) + 'px  (was ~330px with 5 stacked rows)');
  console.log('add-ons on the billing tab:', h.addonsOnBilling, '| page height:', h.page + 'px');
  console.log('factbar:', (await T('#factbar')).replace(/\n/g,' '));
  await p.screenshot({ path: `${O}/c1-billing.png`, fullPage: true });
  await p.screenshot({ path: `${O}/c1-billing-fold.png` });

  // add a product, confirm the compact strip and section label both update
  await p.click('.ac:has-text("Synder RevRec") button:has-text("Add")'); await p.waitForTimeout(400);
  await p.selectOption('#tierSel', '1'); await p.waitForTimeout(250);
  await p.click('#tierGo'); await p.waitForTimeout(700);
  console.log('\nstrip after adding RevRec:', (await T('#moneyStrip')).replace(/\n/g,' | ').slice(0,150));
  console.log('section label:', await T('#addonCount'));
  const cardH2 = await p.evaluate(() => document.querySelector('.card.compact').getBoundingClientRect().height);
  console.log('plan card height with an add-on:', Math.round(cardH2) + 'px');
  await p.screenshot({ path: `${O}/c2-with-revrec.png`, fullPage: true });

  // flows still work
  await p.click('text=Change plan'); await p.waitForTimeout(500);
  await p.click('.plan:has-text("Pro")'); await p.waitForTimeout(300);
  await p.click('#fNext'); await p.waitForTimeout(350);
  await p.click('#fNext'); await p.waitForTimeout(500);
  console.log('\nreview CTA:', await T('#fNext'), '| add-ons row in diff:', (await T('#diff')).includes('Add-ons'));
  await p.click('#fNext'); await p.waitForTimeout(700);
  console.log('after confirm:', (await T('#moneyStrip')).split('\n')[1]);
  await p.keyboard.press('Escape');
  await p.click('#cancelLink'); await p.waitForTimeout(400);
  await p.click('#creasons button >> nth=0'); await p.waitForTimeout(250);
  await p.click('#cNext'); await p.waitForTimeout(350); await p.click('#cNext'); await p.waitForTimeout(400);
  console.log('cancel review lists add-ons:', (await T('#cdiff')).includes('RevRec'));
  await p.click('#cNext'); await p.waitForTimeout(600);
  console.log('page after cancel:', (await T('#moneyStrip')).includes('Ends'));
  for (const t of ['conn','people','prefs']) { await p.click(`#tabs button[data-t="${t}"]`); await p.waitForTimeout(300); }
  console.log('\nerrors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
