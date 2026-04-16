const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
  
  try {
    const state = JSON.parse(fs.readFileSync('.synder-state/storage-state.json', 'utf8'));
    if (state.cookies) await context.addCookies(state.cookies);
  } catch(e) {}

  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  
  await page.goto('https://demo.synderapp.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Click org switcher area
  const orgArea = await page.$('[class*="orgSelector"], [class*="select__control"]');
  if (orgArea) {
    await orgArea.click({ force: true });
    await page.waitForTimeout(500);
  }
  
  // Type to filter to "Per transaction"
  await page.keyboard.type('Per transaction', { delay: 20 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle').catch(() => {});
  
  console.log('URL:', page.url());
  await page.screenshot({ path: '.synder-state/per-txn-org.png', fullPage: true });
  
  const body = await page.innerText('body');
  body.split('\n').filter(l => l.trim()).slice(0, 30).forEach(l => console.log(' ', l.trim()));
  
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
