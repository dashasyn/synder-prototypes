const { chromium } = require('playwright');
const OUT = '/home/ubuntu/.openclaw/workspace/.synder-state';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium-browser', headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8080/synder-settings.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/v2-general.png` });
  console.log('📸 general');

  // Click Sales section
  await page.click('.subnav-item:nth-child(2)');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/v2-sales-off.png` });
  console.log('📸 sales (generic OFF)');

  // Toggle generic customer ON
  await page.click('#section-sales .toggle-pill');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/v2-sales-generic-on.png` });
  console.log('📸 sales (generic ON - should show dropdown)');

  // Change generic name to Custom
  await page.selectOption('#sel-genericName', 'custom');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/v2-sales-generic-custom.png` });
  console.log('📸 sales (custom name field)');

  // Fees section
  await page.click('.subnav-item:nth-child(7)');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/v2-fees.png` });
  console.log('📸 fees');

  await browser.close();
})();
