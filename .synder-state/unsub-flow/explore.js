const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS = path.join(__dirname);
const CF_HEADERS = {
  'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
  'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde'
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: CF_HEADERS
  });
  const page = await context.newPage();

  // Try loading saved state first
  try {
    const stateContext = await chromium.launch({ headless: true }).then(async b => {
      const ctx = await b.newContext({
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: CF_HEADERS,
        storageState: path.join(__dirname, '..', 'storage-state.json')
      });
      return { browser: b, context: ctx };
    });
    
    const p = await stateContext.context.newPage();
    await p.goto('https://demo.synderapp.com/transactions', { waitUntil: 'networkidle', timeout: 30000 });
    
    if (p.url().includes('/transactions') || p.url().includes('/dashboard')) {
      console.log('Saved state works! Using it.');
      await stateContext.browser.close();
      await browser.close();
      
      // Re-launch with saved state
      const b2 = await chromium.launch({ headless: true });
      const ctx2 = await b2.newContext({
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: CF_HEADERS,
        storageState: path.join(__dirname, '..', 'storage-state.json')
      });
      const page2 = await ctx2.newPage();
      
      // Go to settings/billing/subscription area
      await page2.goto('https://demo.synderapp.com/settings', { waitUntil: 'networkidle', timeout: 30000 });
      await page2.screenshot({ path: path.join(SCREENSHOTS, '01-settings-page.png'), fullPage: false });
      console.log('URL after settings:', page2.url());
      
      // Look for billing/subscription links
      const links = await page2.$$eval('a, button, [role="tab"], [role="menuitem"]', els => 
        els.map(e => ({ text: e.textContent?.trim()?.substring(0, 60), href: e.href || '', tag: e.tagName }))
          .filter(e => e.text && (
            e.text.toLowerCase().includes('subscri') || 
            e.text.toLowerCase().includes('billing') || 
            e.text.toLowerCase().includes('plan') ||
            e.text.toLowerCase().includes('cancel') ||
            e.text.toLowerCase().includes('unsub')
          ))
      );
      console.log('Subscription-related elements:', JSON.stringify(links, null, 2));
      
      // Check sidebar for billing
      const sidebarItems = await page2.$$eval('nav a, [class*="sidebar"] a, [class*="menu"] a', els =>
        els.map(e => ({ text: e.textContent?.trim()?.substring(0, 60), href: e.href || '' }))
      );
      console.log('Sidebar/nav items:', JSON.stringify(sidebarItems, null, 2));

      // Try direct URLs
      for (const tryUrl of [
        'https://demo.synderapp.com/billing',
        'https://demo.synderapp.com/subscription',
        'https://demo.synderapp.com/settings/billing',
        'https://demo.synderapp.com/settings/subscription',
        'https://demo.synderapp.com/settings/plan',
        'https://demo.synderapp.com/account/billing',
      ]) {
        await page2.goto(tryUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
        const finalUrl = page2.url();
        if (!finalUrl.includes('/auth') && !finalUrl.includes('/404')) {
          console.log(`${tryUrl} → ${finalUrl} ✓`);
          await page2.screenshot({ path: path.join(SCREENSHOTS, `02-${tryUrl.split('/').pop()}.png`), fullPage: false });
          break;
        } else {
          console.log(`${tryUrl} → ${finalUrl} ✗`);
        }
      }
      
      await b2.close();
      return;
    }
    await stateContext.browser.close();
  } catch (e) {
    console.log('Saved state failed, logging in fresh:', e.message);
  }

  // Fresh login
  await page.goto('https://demo.synderapp.com/auth', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Login page URL:', page.url());
  await page.screenshot({ path: path.join(SCREENSHOTS, '00-login.png'), fullPage: false });
  
  // Fill email
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'dasha.aibot@synder.com');
  await page.fill('input[type="password"], input[name="password"]', 'BJ9BG5MbZHmiLet!');
  
  // Click sign in
  const signInBtn = await page.$('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');
  if (signInBtn) await signInBtn.click();
  
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  console.log('After login URL:', page.url());
  await page.screenshot({ path: path.join(SCREENSHOTS, '01-after-login.png'), fullPage: false });
  
  // Save state
  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  
  await browser.close();
})();
