const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  try {
    const state = JSON.parse(fs.readFileSync('.synder-state/storage-state.json', 'utf8'));
    if (state.cookies) await context.addCookies(state.cookies);
  } catch(e) {}

  const page = await context.newPage();
  await page.goto('https://demo.synderapp.com', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Open org switcher
  const orgText = await page.$('text=Dasha Test Com');
  await orgText.click();
  await page.waitForTimeout(1000);
  
  // Click "Create organization"
  console.log('Clicking "Create organization"...');
  const createOrg = await page.$('text=Create organization');
  if (createOrg) {
    await createOrg.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
    
    console.log('URL:', page.url());
    await page.screenshot({ path: '.synder-state/onboard-03-create-org.png', fullPage: true });
    
    const bodyText = await page.innerText('body').catch(() => '');
    const lines = bodyText.split('\n').filter(l => l.trim()).slice(0, 60);
    console.log('Page content:');
    lines.forEach(l => console.log('  ', l.trim()));
  } else {
    console.log('Could not find "Create organization" option');
  }
  
  // Save state
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
