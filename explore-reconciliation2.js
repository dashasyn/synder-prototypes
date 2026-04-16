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

  // 1. Transaction Reconciliation
  console.log('=== TRANSACTION RECONCILIATION ===');
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOTS, 'recon-01-tx-page.png'), fullPage: false });
  await page.screenshot({ path: path.join(SHOTS, 'recon-01b-tx-full.png'), fullPage: true });

  // Get all text content
  const bodyText = await page.locator('body').textContent();
  console.log('Page text (first 4000):', bodyText?.substring(0, 4000));

  // Get all buttons
  const buttons = await page.locator('button, [role="button"], a[class*="btn"]').allTextContents();
  console.log('\nButtons:', buttons.map(b => b.trim()).filter(b => b).join(' | '));

  // Get any empty states or CTAs
  const headings = await page.locator('h1, h2, h3, h4').allTextContents();
  console.log('\nHeadings:', headings.map(h => h.trim()).filter(h => h).join(' | '));

  // Check for pricing/paywall indicators
  const pricingElements = await page.locator('[class*="price"], [class*="upgrade"], [class*="premium"], [class*="plan"], [class*="trial"], [class*="lock"]').allTextContents();
  console.log('\nPricing/paywall elements:', pricingElements.map(p => p.trim()).filter(p => p).join(' | '));

  // Check for beta badges
  const betaElements = await page.locator('[class*="beta"], [class*="Badge"]').allTextContents();
  console.log('\nBeta elements:', betaElements.map(b => b.trim()).filter(b => b).join(' | '));

  // Look for any tooltips, popovers, info icons
  const infoIcons = await page.locator('[class*="info"], [class*="help"], [class*="hint"], [aria-label*="info"], [aria-label*="help"], [data-tooltip]').count();
  console.log('\nInfo/help elements count:', infoIcons);

  // 2. Balance Reconciliation
  console.log('\n\n=== BALANCE RECONCILIATION ===');
  await page.goto('https://demo.synderapp.com/accounting/public/reconciliation/index.html', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOTS, 'recon-02-bal-page.png'), fullPage: false });
  await page.screenshot({ path: path.join(SHOTS, 'recon-02b-bal-full.png'), fullPage: true });

  const bodyText2 = await page.locator('body').textContent();
  console.log('Page text (first 4000):', bodyText2?.substring(0, 4000));

  const buttons2 = await page.locator('button, [role="button"]').allTextContents();
  console.log('\nButtons:', buttons2.map(b => b.trim()).filter(b => b).join(' | '));

  const headings2 = await page.locator('h1, h2, h3, h4').allTextContents();
  console.log('\nHeadings:', headings2.map(h => h.trim()).filter(h => h).join(' | '));

  // 3. Check the sidebar navigation structure more carefully
  console.log('\n\n=== SIDEBAR NAVIGATION ===');
  await page.goto('https://demo.synderapp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Expand Reconciliation section if collapsed
  const reconSection = page.locator('text=Reconciliation').first();
  if (await reconSection.count() > 0) {
    await reconSection.click().catch(() => {});
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(SHOTS, 'recon-03-sidebar.png'), fullPage: false });

  // Get the reconciliation nav section
  const navItems = await page.locator('[class*="nav"], [class*="menu"], [class*="sidebar"]').locator('a').allTextContents();
  const reconNav = navItems.filter(t => /reconcil|journal|chart|manual/i.test(t));
  console.log('Reconciliation section nav items:', reconNav.map(n => n.trim()).join(' | '));

  await browser.close();
  console.log('\nDone!');
})();
