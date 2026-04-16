const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/home/ubuntu/.openclaw/workspace/.synder-state';

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium-browser', headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8080/synder-settings.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/curr-settings-general.png`, fullPage: false });
  console.log('📸 general');

  // Click Sales tab
  await page.click('.subnav-item:nth-child(2)');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/curr-settings-sales.png`, fullPage: false });
  console.log('📸 sales');

  // Click Fees tab
  await page.click('.subnav-item:nth-child(7)');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/curr-settings-fees.png`, fullPage: false });
  console.log('📸 fees');

  await browser.close();
})();
