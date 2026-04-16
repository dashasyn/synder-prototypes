const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  // Login
  console.log('Navigating to login...');
  await page.goto('https://demo.synderapp.com/auth', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('URL after nav:', page.url());
  await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/.synder-state/relogin-01.png' });
  
  // Check if we need to log in
  const url = page.url();
  if (url.includes('auth') || url.includes('login')) {
    // Fill email
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]').first();
    await emailInput.fill('tututrurututu@gmail.com');
    
    // Fill password
    const passInput = page.locator('input[type="password"]').first();
    await passInput.fill('BJ9BG5MbZHmiLet!');
    
    // Click login/submit button
    const submitBtn = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first();
    await submitBtn.click();
    
    console.log('Submitted login form');
    await page.waitForTimeout(5000);
    console.log('URL after login:', page.url());
    await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/.synder-state/relogin-02.png' });
  }
  
  // Save new storage state
  await context.storageState({ path: '/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json' });
  console.log('Storage state saved');
  
  // Navigate to transactions
  console.log('Going to transactions...');
  await page.goto('https://demo.synderapp.com/transactions', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());
  await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/.synder-state/tx-page-current.png', fullPage: true });
  console.log('Screenshot saved');
  
  // Save HTML
  const html = await page.content();
  require('fs').writeFileSync('/home/ubuntu/.openclaw/workspace/.synder-state/tx-page-full.html', html);
  console.log('HTML saved, length:', html.length);
  
  // Extract computed styles for key elements
  const structureData = await page.evaluate(() => {
    // Capture all inline and computed styles for the transaction area
    const result = {};
    
    // Get all link tags (stylesheets)
    result.stylesheetLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
    
    // Get the body classes
    result.bodyClasses = document.body.className;
    
    // Get the HTML structure
    result.htmlTag = document.documentElement.outerHTML.substring(0, 200);
    
    return result;
  });
  console.log('Structure:', JSON.stringify(structureData, null, 2));
  
  await browser.close();
  console.log('Done');
})();
