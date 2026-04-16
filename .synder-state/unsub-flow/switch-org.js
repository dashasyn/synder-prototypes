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

  await page.goto('https://demo.synderapp.com/company/settings', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Click the org name text to open the dropdown
  const orgNameEl = await page.$('[class*="singleValueText"]');
  if (orgNameEl) {
    // Get bounding box and click it
    const box = await orgNameEl.boundingBox();
    console.log('Org name bounding box:', JSON.stringify(box));
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);
    
    // Now type "Unsub" to filter
    await page.keyboard.type('Unsub');
    await page.waitForTimeout(500);
    
    // Screenshot the dropdown
    await page.screenshot({ path: path.join(SS, 'org-dropdown.png') });
    
    // Check what's visible now
    const allText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('After typing "Unsub":', allText.substring(0, 1000));
    
    // Try pressing Enter to select the filtered option
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});
    console.log('After Enter URL:', page.url());
    
    // Check current org
    const currentOrg = await page.evaluate(() => {
      const el = document.querySelector('[class*="singleValueText"]');
      return el?.textContent?.trim() || 'unknown';
    });
    console.log('Current org after switch:', currentOrg);
  }

  // If we're on Unsubscribe org now, explore it
  // Try manage subscription
  await page.goto('https://demo.synderapp.com/organizations/settings', { waitUntil: 'networkidle', timeout: 20000 });
  await page.screenshot({ path: path.join(SS, 'U-org-settings.png'), fullPage: true });
  
  const orgText = await page.evaluate(() => document.body.innerText);
  console.log('\n=== ORG SETTINGS ===\n', orgText.substring(0, 2000));
  
  // Check subscription info
  const subInfo = await page.$$eval('*', els =>
    els.filter(e => e.children.length === 0 && e.offsetParent !== null)
      .map(e => e.textContent?.trim())
      .filter(t => t && (
        /plan|subscri|essential|medium|scale|enterprise|pro|premium|trial|active|cancel|expire|billing/i.test(t)
      ))
  );
  console.log('Subscription-related text:', [...new Set(subInfo)]);
  
  // Navigate to manage subscription
  await page.goto('https://demo.synderapp.com/organizations/settings/manageSubscription', { waitUntil: 'networkidle', timeout: 20000 });
  await page.screenshot({ path: path.join(SS, 'U-manage-sub.png'), fullPage: true });
  const manageText = await page.evaluate(() => document.body.innerText);
  console.log('\n=== MANAGE SUB ===\n', manageText.substring(0, 3000));
  
  // Get buttons
  const allBtns = await page.$$eval('button', btns =>
    btns.filter(b => b.offsetParent !== null)
      .map(b => b.textContent?.trim()?.substring(0, 80))
      .filter(Boolean)
  );
  console.log('Buttons:', allBtns);
  
  // Navigate to billing
  await page.goto('https://demo.synderapp.com/organizations/billing', { waitUntil: 'networkidle', timeout: 20000 });
  await page.screenshot({ path: path.join(SS, 'U-billing.png'), fullPage: true });
  const billingText = await page.evaluate(() => document.body.innerText);
  console.log('\n=== BILLING ===\n', billingText.substring(0, 3000));
  
  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  await browser.close();
  console.log('Done!');
})();
