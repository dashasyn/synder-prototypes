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
  
  // Click org switcher
  const orgText = await page.$('text=Dasha Test');
  if (orgText) {
    await orgText.click();
    await page.waitForTimeout(1000);
  } else {
    // Try "Per transaction" if we're already on it
    const perTxn = await page.$('text=Per transaction');
    if (perTxn) {
      await perTxn.click();
      await page.waitForTimeout(1000);
    }
  }
  
  await page.screenshot({ path: '.synder-state/org-switcher.png' });
  
  const body = await page.innerText('body');
  const lines = body.split('\n').filter(l => l.trim()).slice(0, 30);
  console.log('Page text:');
  lines.forEach(l => console.log(' ', l.trim()));
  
  // Check if "Per transaction test" appears
  if (body.includes('Per transaction test')) {
    console.log('\n✅ Found "Per transaction test" org!');
    
    // Click on it to switch
    const ptOrg = await page.$('text=Per transaction test');
    if (ptOrg) {
      await ptOrg.click();
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle').catch(() => {});
      
      console.log('URL:', page.url());
      await page.screenshot({ path: '.synder-state/per-txn-org.png', fullPage: true });
      
      const newBody = await page.innerText('body');
      newBody.split('\n').filter(l => l.trim()).slice(0, 20).forEach(l => console.log(' ', l.trim()));
    }
  } else {
    console.log('\n❌ "Per transaction test" not found in org list');
  }
  
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
