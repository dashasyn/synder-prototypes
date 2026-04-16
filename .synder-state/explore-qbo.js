const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = '/home/ubuntu/.openclaw/workspace/.synder-state/qbo';
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });
  console.log('📸', name);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // --- LOGIN TO QBO ---
  console.log('Navigating to QBO login...');
  await page.goto('https://qbo.intuit.com/app/homepage', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await shot(page, '01-initial');

  // Try sign in flow
  try {
    // Intuit login - enter email
    await page.waitForSelector('input[type="email"], #Email, input[name="Email"], #ius-userid', { timeout: 15000 });
    await shot(page, '02-login-form');
    
    const emailField = page.locator('#ius-userid, input[name="Email"], input[type="email"]').first();
    await emailField.fill('rurururururururururururu23@gmail.com');
    await shot(page, '03-email-filled');
    
    const nextBtn = page.locator('#ius-sign-in-submit-btn, button[type="submit"]').first();
    await nextBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, '04-after-email');

    // Password
    const pwField = page.locator('#ius-password, input[type="password"]').first();
    if (await pwField.isVisible()) {
      await pwField.fill('%6s567FYRYhsh<90');
      await shot(page, '05-password-filled');
      await pwField.press('Enter');
    }
    
    await page.waitForTimeout(5000);
    await shot(page, '06-after-login');
    console.log('URL after login:', page.url());
    
  } catch (e) {
    console.log('Login error:', e.message);
    await shot(page, 'error-login');
  }

  await browser.close();
  console.log('Done');
})();
