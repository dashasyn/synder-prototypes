const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // Try loading existing state
  try {
    const fs = require('fs');
    const state = JSON.parse(fs.readFileSync('.synder-state/storage-state.json', 'utf8'));
    if (state.cookies) await context.addCookies(state.cookies);
  } catch(e) {
    console.log('No existing state, starting fresh');
  }

  const page = await context.newPage();
  
  console.log('Navigating to demo.synderapp.com...');
  await page.goto('https://demo.synderapp.com', { waitUntil: 'networkidle', timeout: 30000 });
  
  const url = page.url();
  console.log('Current URL:', url);
  console.log('Title:', await page.title());
  
  // Check if we hit Cloudflare Access
  const content = await page.content();
  if (url.includes('cloudflareaccess') || content.includes('Cloudflare Access') || content.includes('cloudflare')) {
    console.log('=== CLOUDFLARE ACCESS GATE ===');
    
    // Look for email input
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    if (emailInput) {
      console.log('Found email input, entering email...');
      await emailInput.fill('dasha.aibot@synder.com');
      
      // Find and click submit
      const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        console.log('Submitted email. Waiting for code page...');
        await page.waitForTimeout(3000);
        console.log('New URL:', page.url());
        console.log('CLOUDFLARE CODE SENT — check dasha.aibot@synder.com');
      }
    } else {
      console.log('Page content (first 2000 chars):');
      console.log(content.substring(0, 2000));
    }
  } else if (url.includes('/auth')) {
    console.log('At Synder auth page (no Cloudflare gate)');
  } else {
    console.log('Landed somewhere else. Content preview:');
    const text = await page.innerText('body').catch(() => 'could not get text');
    console.log(text.substring(0, 1000));
  }
  
  // Take screenshot
  await page.screenshot({ path: '.synder-state/login-screenshot.png', fullPage: true });
  console.log('Screenshot saved');
  
  // Don't close browser yet — we'll need it for the code
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
