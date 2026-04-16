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
  
  // We should be on the select integrations page - navigate there
  await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  const currentUrl = page.url();
  const bodyText = await page.innerText('body').catch(() => '');
  console.log('URL:', currentUrl);
  console.log('On page:', bodyText.includes('Select the integrations') ? 'Select integrations' : bodyText.substring(0, 100));
  
  if (!bodyText.includes('Select the integrations')) {
    console.log('Not on integrations page, might need to re-fill step 1 first');
    // This would mean we need to redo the previous step
  }
  
  // Screenshot current state
  await page.screenshot({ path: '.synder-state/onboard-integrations.png', fullPage: true });
  
  // Select Stripe
  console.log('Selecting Stripe...');
  const stripeCard = await page.$('text=Stripe');
  if (stripeCard) {
    await stripeCard.click();
    await page.waitForTimeout(500);
    console.log('  Stripe selected');
    await page.screenshot({ path: '.synder-state/onboard-integrations-selected.png', fullPage: true });
  } else {
    console.log('  Stripe not found on page');
    console.log('  Page text:', bodyText.substring(0, 500));
  }
  
  // Check what's selected
  const selectedCards = await page.evaluate(() => {
    const cards = document.querySelectorAll('[class*="selected"], [class*="active"], [aria-selected="true"], [class*="checked"]');
    return Array.from(cards).map(c => c.textContent.trim().substring(0, 50));
  });
  console.log('Selected:', selectedCards);
  
  // Click Next step
  console.log('Clicking Next step...');
  await page.click('text=Next step');
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle').catch(() => {});
  
  console.log('URL:', page.url());
  await page.screenshot({ path: '.synder-state/onboard-connect.png', fullPage: true });
  
  const nextText = await page.innerText('body').catch(() => '');
  const nextLines = nextText.split('\n').filter(l => l.trim()).slice(0, 60);
  console.log('\n=== NEXT PAGE ===');
  nextLines.forEach(l => console.log('  ', l.trim()));
  
  // Save state
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
