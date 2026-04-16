const { chromium } = require('playwright');
const path = require('path');

const SS = path.join(__dirname);
const CF = {
  'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
  'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde'
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: CF,
    storageState: path.join(__dirname, '..', 'storage-state.json')
  });
  const page = await context.newPage();

  // 1. Check Organization settings
  await page.goto('https://demo.synderapp.com/organizations/settings', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  console.log('=== ORG SETTINGS ===');
  console.log('URL:', page.url());
  await page.screenshot({ path: path.join(SS, '20-org-settings.png'), fullPage: true });
  const orgText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log(orgText.substring(0, 2000));
  
  // Find cancel/delete options
  const cancelInOrg = await page.$$eval('button, a, [role="button"]', els =>
    els.filter(e => e.offsetParent !== null)
      .map(e => ({ text: e.textContent?.trim()?.substring(0, 80), href: e.href || '' }))
      .filter(e => e.text)
  );
  console.log('Buttons:', JSON.stringify(cancelInOrg, null, 2));

  // 2. Check User profile
  await page.goto('https://demo.synderapp.com/userProfile', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  console.log('\n=== USER PROFILE ===');
  console.log('URL:', page.url());
  await page.screenshot({ path: path.join(SS, '21-user-profile.png'), fullPage: true });
  const profileText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log(profileText.substring(0, 2000));

  // 3. Check billing page with ?action=CANCEL or similar
  for (const action of ['CANCEL', 'UNSUBSCRIBE', 'DOWNGRADE']) {
    await page.goto(`https://demo.synderapp.com/organizations/billing?action=${action}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    console.log(`\nBilling ?action=${action}: ${page.url()}`);
    // Check if anything different showed up
    const hasModal = await page.$('[class*="modal"], [class*="Modal"], [role="dialog"]');
    if (hasModal) {
      const modalText = await hasModal.textContent();
      console.log('Modal found:', modalText?.substring(0, 500));
      await page.screenshot({ path: path.join(SS, `22-billing-${action.toLowerCase()}.png`) });
    }
  }

  // 4. Switch to "Unsubscribe" org and check billing there
  console.log('\n=== SWITCHING TO "UNSUBSCRIBE" ORG ===');
  await page.goto('https://demo.synderapp.com/company/settings', { waitUntil: 'networkidle', timeout: 20000 });
  
  // Click the org switcher
  const orgName = await page.$eval('[class*="singleValueText"]', el => el.textContent?.trim()).catch(() => 'unknown');
  console.log('Current org:', orgName);
  
  // Click the org name area to open dropdown
  await page.click('[class*="singleValueText"]');
  await page.waitForTimeout(500);
  
  // Look for "Unsubscribe" option
  const unsubOption = await page.$('text="Unsubscribe"');
  if (unsubOption) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
      unsubOption.click()
    ]);
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
    console.log('Switched to Unsubscribe org:', page.url());
    
    // Now check billing for this org
    await page.goto('https://demo.synderapp.com/organizations/billing', { waitUntil: 'networkidle', timeout: 20000 });
    console.log('Unsub org billing URL:', page.url());
    await page.screenshot({ path: path.join(SS, '23-unsub-org-billing.png'), fullPage: true });
    
    const unsubBillingText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    console.log('Unsub org billing text:\n', unsubBillingText.substring(0, 3000));
    
    // Check for cancel/unsubscribe buttons
    const cancelBtns = await page.$$eval('button, a, [role="button"]', els =>
      els.filter(e => e.offsetParent !== null)
        .map(e => ({ text: e.textContent?.trim()?.substring(0, 80), href: e.href || '' }))
        .filter(e => e.text)
    );
    console.log('All visible buttons:', JSON.stringify(cancelBtns, null, 2));
  }

  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  await browser.close();
  console.log('Done!');
})();
