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
  
  await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  console.log('Page content:');
  const bodyText = await page.innerText('body').catch(() => '');
  const lines = bodyText.split('\n').filter(l => l.trim()).slice(0, 30);
  lines.forEach(l => console.log(' ', l.trim()));
  
  await page.screenshot({ path: '.synder-state/onboard-accounting.png', fullPage: true });
  
  // Select QuickBooks Online
  console.log('\nSelecting QuickBooks Online...');
  const qboCard = await page.$('text=QuickBooks (Online)');
  if (qboCard) {
    await qboCard.click();
    await page.waitForTimeout(500);
    console.log('  Clicked');
    await page.screenshot({ path: '.synder-state/onboard-accounting-selected.png', fullPage: true });
  } else {
    // Try clicking the card image for QBO (it'll be the first accounting card)
    console.log('  Text not found, trying image click...');
    const imgs = await page.$$('img[alt="platform_card"]');
    if (imgs.length > 0) {
      const box = await imgs[0].boundingBox();
      await page.mouse.click(box.x + 30, box.y + 20);
      console.log('  Clicked first accounting card');
    }
  }
  
  await page.waitForTimeout(500);
  
  // Click Next step
  console.log('Clicking Next step...');
  await page.click('button:has-text("Next step")');
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle').catch(() => {});
  
  console.log('URL:', page.url());
  await page.screenshot({ path: '.synder-state/onboard-after-accounting.png', fullPage: true });
  
  const nextText = await page.innerText('body').catch(() => '');
  const nextLines = nextText.split('\n').filter(l => l.trim()).slice(0, 60);
  console.log('\n=== NEXT PAGE ===');
  nextLines.forEach(l => console.log('  ', l.trim()));
  
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
