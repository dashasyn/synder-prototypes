const { chromium } = require('playwright');
const fs = require('fs');

const OUT = '.synder-state/settings-rework';
const SUB = 'https://demo.synderapp.com/organizations/settings/manageSubscription';
const BILL = 'https://demo.synderapp.com/organizations/billing?action=UPGRADE';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({
    viewport: { width: 1512, height: 950 },
    storageState: `${OUT}/state.json`,
    extraHTTPHeaders: {
      'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
      'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde',
    },
  });
  const out = {};
  const page = await ctx.newPage();

  // track popups + downloads + navigations for the three "silent" actions
  const popups = [];
  ctx.on('page', async (p) => {
    popups.push('POPUP: ' + p.url());
    await p.waitForTimeout(3000).catch(() => {});
    popups.push('  settled: ' + p.url());
  });
  page.on('download', d => popups.push('DOWNLOAD: ' + d.suggestedFilename()));

  const probe = async (label, text) => {
    await page.goto(SUB, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    popups.push('--- ' + label);
    const before = page.url();
    const l = page.locator(`text="${text}"`).first();
    if (!(await l.count())) { popups.push('  NOT FOUND'); return; }
    await l.click({ timeout: 8000 }).catch(e => popups.push('  click err ' + e.message.slice(0, 80)));
    await page.waitForTimeout(6000);
    popups.push('  url now: ' + page.url() + (page.url() === before ? ' (unchanged)' : ' (NAVIGATED)'));
    await page.screenshot({ path: `${OUT}/40-${label}.png`, fullPage: false });
  };

  await probe('changecard', 'Change card');
  await probe('invoices', 'Get subscription invoices');
  await probe('freetx', 'Get more transactions for free');

  // Additional services dropdown options (Invoicing / Smart rules)
  await page.goto(SUB, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  const dropdowns = [];
  const combos = page.locator('[role="combobox"], .MuiSelect-select, [class*="select" i][tabindex]');
  const n = await combos.count();
  for (let i = 0; i < n; i++) {
    const label = await combos.nth(i).innerText().catch(() => '');
    await combos.nth(i).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const opts = await page.locator('[role="option"], li[data-value], .MuiMenuItem-root').allInnerTexts().catch(() => []);
    dropdowns.push({ trigger: label.trim(), options: opts.map(o => o.replace(/\s+/g, ' ').trim()) });
    await page.screenshot({ path: `${OUT}/41-dropdown-${i}.png`, fullPage: false });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }
  out.dropdowns = dropdowns;

  // Additional services steppers: does the price update live?
  await page.goto(SUB, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  const beforeTxt = await page.locator('body').innerText();
  const plusBtns = page.locator('div:has-text("Monthly transactions") > button, [class*="stepper" i] button');
  out.stepperProbe = { plusCount: await plusBtns.count() };
  // click every svg button in the Additional services block and diff text
  const addBlock = page.locator('div:has-text("Additional services")').last();
  const btns = addBlock.locator('button');
  const bn = await btns.count();
  out.stepperProbe.buttonsInBlock = bn;
  for (let i = 0; i < Math.min(bn, 6); i++) {
    const t = (await btns.nth(i).innerText().catch(() => '')).trim();
    out.stepperProbe[`btn${i}`] = t || '(icon only)';
  }
  // bump the last "+" we can find next to Monthly transactions
  const mt = page.locator('p:has-text("Monthly transactions"), span:has-text("Monthly transactions")').first();
  if (await mt.count()) {
    const row = mt.locator('xpath=..');
    const rb = row.locator('button');
    if (await rb.count() >= 2) {
      await rb.last().click().catch(() => {});
      await page.waitForTimeout(2500);
      await rb.last().click().catch(() => {});
      await page.waitForTimeout(3000);
    }
  }
  await page.screenshot({ path: `${OUT}/42-stepper-bumped.png`, fullPage: true });
  const afterTxt = await page.locator('body').innerText();
  out.stepperProbe.changed = beforeTxt !== afterTxt;
  out.stepperProbe.afterExcerpt = afterTxt.slice(afterTxt.indexOf('Additional services'), afterTxt.indexOf('Additional services') + 400);

  // Pro card: Max toggle on billing page
  await page.goto(BILL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  const maxT = page.locator('text="Max"').first();
  if (await maxT.count()) {
    await maxT.click().catch(() => {});
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${OUT}/43-pro-max.png`, fullPage: false });
    const t = await page.locator('body').innerText();
    out.proMax = t.slice(t.indexOf('Pro'), t.indexOf('Pro') + 500);
  }

  // Support accordion (last one, wasn't in earlier dump)
  await page.goto(BILL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  for (const acc of ['Core functionalities', 'Add-ons', 'Other Synder products', 'Support']) {
    const l = page.locator(`text="${acc}"`).first();
    if (await l.count()) { await l.click().catch(() => {}); await page.waitForTimeout(1500); }
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/44-billing-all-expanded.png`, fullPage: true });
  const bt = await page.locator('body').innerText();
  out.supportSection = bt.slice(bt.indexOf('Support'), bt.indexOf('Support') + 1200);
  out.billingFull = bt;

  out.popupLog = popups;
  fs.writeFileSync(`${OUT}/deep.json`, JSON.stringify(out, null, 2));
  console.log(popups.join('\n'));
  console.log('\nDROPDOWNS:', JSON.stringify(dropdowns, null, 1));
  console.log('\nSTEPPER:', JSON.stringify(out.stepperProbe, null, 1));
  console.log('\nPRO MAX:', out.proMax);
  console.log('\nSUPPORT:', out.supportSection);
  await browser.close();
})();
