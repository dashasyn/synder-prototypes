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

  // Go to settings, switch to "Unsubscribe" org via direct URL approach
  // First try navigating to settings
  await page.goto('https://demo.synderapp.com/company/settings', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Get current org name
  const orgText = await page.evaluate(() => {
    const els = document.querySelectorAll('[class*="singleValueText"]');
    return Array.from(els).map(e => e.textContent?.trim());
  });
  console.log('Current org:', orgText);
  
  // Click the org switcher - use the input in the react-select
  const orgInput = await page.$('input[class*=""]');
  
  // Try clicking the org name area
  await page.evaluate(() => {
    const el = document.querySelector('[class*="singleValueText"]');
    if (el) el.click();
  });
  await page.waitForTimeout(500);
  
  // Check if dropdown is open
  const dropdown = await page.evaluate(() => {
    const options = document.querySelectorAll('[class*="option"]');
    return Array.from(options).map(o => o.textContent?.trim()).filter(Boolean);
  });
  console.log('Dropdown options:', dropdown);
  
  // Click "Unsubscribe" option using evaluate
  const switched = await page.evaluate(() => {
    const options = document.querySelectorAll('[class*="option"]');
    for (const opt of options) {
      if (opt.textContent?.trim()?.includes('Unsubscribe')) {
        opt.click();
        return true;
      }
    }
    return false;
  });
  console.log('Clicked Unsubscribe:', switched);
  
  if (switched) {
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});
    console.log('After switch URL:', page.url());
    
    // Now navigate to various pages to understand the org
    // 1. Organization settings
    await page.goto('https://demo.synderapp.com/organizations/settings', { waitUntil: 'networkidle', timeout: 20000 });
    await page.screenshot({ path: path.join(SS, 'U-org-settings.png'), fullPage: true });
    const orgSettingsText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('\n=== ORG SETTINGS (Unsubscribe) ===\n', orgSettingsText.substring(0, 2000));
    
    // 2. Billing page
    await page.goto('https://demo.synderapp.com/organizations/billing', { waitUntil: 'networkidle', timeout: 20000 });
    await page.screenshot({ path: path.join(SS, 'U-billing.png'), fullPage: true });
    const billingText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    console.log('\n=== BILLING (Unsubscribe) ===\n', billingText.substring(0, 3000));
    
    // 3. Manage subscription
    await page.goto('https://demo.synderapp.com/organizations/settings/manageSubscription', { waitUntil: 'networkidle', timeout: 20000 });
    await page.screenshot({ path: path.join(SS, 'U-manage-sub.png'), fullPage: true });
    const manageText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    console.log('\n=== MANAGE SUBSCRIPTION (Unsubscribe) ===\n', manageText.substring(0, 3000));
    
    // Get all buttons on manage subscription page
    const btns = await page.$$eval('button, a[class*="btn"], [role="button"]', els =>
      els.filter(e => e.offsetParent !== null)
        .map(e => ({ text: e.textContent?.trim()?.substring(0, 80), href: e.href || '' }))
        .filter(e => e.text)
    );
    console.log('Manage sub buttons:', JSON.stringify(btns, null, 2));
    
    // 4. Check if there's a cancel flow starting point
    const cancelBtn = await page.$('button:has-text("Cancel subscription")');
    if (cancelBtn) {
      console.log('\nCancel subscription button found on manage subscription page');
      // Click it but DON'T proceed - just screenshot the first modal
      await cancelBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SS, 'U-cancel-modal.png') });
      
      // Check modal content
      const modal = await page.$('[role="dialog"], [class*="MuiDialog"], [class*="modal"]');
      if (modal) {
        const modalText = await modal.textContent();
        console.log('Modal text:', modalText?.substring(0, 500));
      }
      
      // Click "I want to stay" to NOT cancel
      const stayBtn = await page.$('button:has-text("I want to stay")');
      if (stayBtn) {
        await stayBtn.click();
        await page.waitForTimeout(1000);
        console.log('Clicked "I want to stay" - staying subscribed');
      }
    }
    
    // Save state with Unsubscribe org selected
    await context.storageState({ path: path.join(__dirname, '..', 'storage-state-unsub.json') });
  }
  
  await browser.close();
  console.log('\nDone!');
})();
