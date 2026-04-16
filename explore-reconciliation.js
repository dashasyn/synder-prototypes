const { chromium } = require('playwright');
const path = require('path');

const STATE_PATH = path.join(__dirname, '.synder-state', 'storage-state.json');
const SHOTS = path.join(__dirname, '.synder-state');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STATE_PATH,
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Go to main app
  console.log('Loading app...');
  await page.goto('https://demo.synderapp.com/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.screenshot({ path: path.join(SHOTS, 'recon-01-dashboard.png'), fullPage: false });
  console.log('Dashboard loaded');

  // Look for reconciliation in sidebar/navigation
  const sidebarText = await page.locator('nav, [class*="sidebar"], [class*="menu"], [class*="navigation"]').allTextContents();
  console.log('Sidebar/nav text:', sidebarText.join(' | ').substring(0, 2000));

  // Try to find reconciliation links
  const reconLinks = await page.locator('a, button').filter({ hasText: /reconcil/i }).all();
  console.log(`Found ${reconLinks.length} reconciliation links/buttons`);
  for (const link of reconLinks) {
    const text = await link.textContent();
    const href = await link.getAttribute('href');
    console.log(`  - "${text?.trim()}" href=${href}`);
  }

  // Click on Transaction Reconciliation if found
  const txReconLink = await page.locator('a, button').filter({ hasText: /transaction.*reconcil/i }).first();
  if (await txReconLink.count() > 0) {
    console.log('Clicking Transaction Reconciliation...');
    await txReconLink.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SHOTS, 'recon-02-tx-recon-page.png'), fullPage: true });
    console.log('Transaction Reconciliation page captured');

    // Get page content overview
    const mainContent = await page.locator('main, [class*="content"], [class*="main"]').first().textContent().catch(() => '');
    console.log('Page content (first 3000 chars):', mainContent?.substring(0, 3000));

    // Look for CTAs, buttons, action items
    const buttons = await page.locator('button, [role="button"], a[class*="btn"], a[class*="button"]').allTextContents();
    console.log('Buttons on page:', buttons.map(b => b.trim()).filter(b => b).join(' | '));

    // Check for any modals, tooltips, info banners
    const banners = await page.locator('[class*="banner"], [class*="alert"], [class*="info"], [class*="notice"], [class*="tooltip"], [class*="empty"]').allTextContents();
    console.log('Banners/notices:', banners.map(b => b.trim()).filter(b => b).join(' | '));

    // Take a close-up of the main action area
    await page.screenshot({ path: path.join(SHOTS, 'recon-02b-tx-recon-viewport.png'), fullPage: false });
  }

  // Now try Balance Reconciliation
  await page.goto('https://demo.synderapp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  const balReconLink = await page.locator('a, button').filter({ hasText: /balance.*reconcil/i }).first();
  if (await balReconLink.count() > 0) {
    console.log('\nClicking Balance Reconciliation...');
    await balReconLink.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SHOTS, 'recon-03-bal-recon-page.png'), fullPage: true });
    console.log('Balance Reconciliation page captured');

    const mainContent2 = await page.locator('main, [class*="content"], [class*="main"]').first().textContent().catch(() => '');
    console.log('Balance Recon content (first 3000 chars):', mainContent2?.substring(0, 3000));

    const buttons2 = await page.locator('button, [role="button"]').allTextContents();
    console.log('Buttons:', buttons2.map(b => b.trim()).filter(b => b).join(' | '));
  }

  // Also check if there's a reconciliation section in settings or elsewhere
  const allLinks = await page.locator('a[href]').all();
  for (const link of allLinks) {
    const href = await link.getAttribute('href');
    if (href && /reconcil/i.test(href)) {
      const text = await link.textContent();
      console.log(`\nRecon-related link: "${text?.trim()}" -> ${href}`);
    }
  }

  await browser.close();
  console.log('\nDone!');
})();
