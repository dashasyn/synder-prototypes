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
    extraHTTPHeaders: CF
  });
  const page = await context.newPage();

  // Login
  await page.goto('https://demo.synderapp.com/auth', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Fill credentials
  await page.fill('input[placeholder="email@mail.com"]', 'dasha.aibot@synder.com');
  await page.fill('input[type="password"]', 'BJ9BG5MbZHmiLet!');
  
  // Click the exact "Sign in" button (not "Sign in with ...")
  // Use text match for exact "Sign in"
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.textContent();
    if (text.trim() === 'Sign in') {
      console.log('Clicking exact "Sign in" button');
      await btn.click();
      break;
    }
  }
  
  // Wait for navigation
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle').catch(() => {});
  console.log('After login:', page.url());
  await page.screenshot({ path: path.join(SS, '01-after-login.png') });

  if (page.url().includes('/auth') || page.url().includes('intuit.com')) {
    console.log('Login failed! Checking for error messages...');
    const errors = await page.$$eval('[class*="error"], [class*="Error"], [role="alert"]', els =>
      els.map(e => e.textContent?.trim()).filter(Boolean)
    );
    console.log('Errors:', errors);
    await browser.close();
    return;
  }

  // Save state
  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  console.log('State saved!');

  // Navigate to find billing/subscription
  // First check current page for any plan info
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log('Dashboard text (first 1000):', pageText.substring(0, 1000));
  
  // Get all sidebar nav items
  const allNavLinks = await page.$$eval('a', els =>
    els.map(e => ({ text: e.textContent?.trim()?.substring(0, 80), href: e.href }))
      .filter(e => e.text && e.href)
  );
  console.log('All links on page:', JSON.stringify(allNavLinks.slice(0, 30), null, 2));

  await browser.close();
  console.log('Done!');
})();
