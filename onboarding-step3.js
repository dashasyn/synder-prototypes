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
  await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('URL:', page.url());
  
  // Fill in business details
  // Business name
  console.log('Filling business name...');
  const bizName = await page.$('input[placeholder*="name"], input[name*="name"], input[name*="business"]');
  if (bizName) {
    await bizName.fill('Dasha Per-Transaction Test');
    console.log('Business name filled');
  } else {
    // Try by label
    await page.getByLabel(/business name/i).fill('Dasha Per-Transaction Test');
    console.log('Business name filled via label');
  }
  
  // Country - click dropdown and select
  console.log('Selecting country...');
  try {
    // Find the country dropdown
    const countryLabel = await page.getByText('Country', { exact: false });
    // Click the select near it
    const countrySelect = await page.$('[class*="country"] [class*="select"], [name*="country"]');
    if (countrySelect) {
      await countrySelect.click();
    } else {
      // Try clicking the "Select..." placeholder near Country
      const selects = await page.$$('[class*="select__placeholder"], [class*="placeholder"]');
      console.log('Found', selects.length, 'placeholder selects');
      if (selects.length > 0) {
        await selects[0].click(); // First "Select..." should be Country
        await page.waitForTimeout(500);
        await page.keyboard.type('United States');
        await page.waitForTimeout(1000);
        await page.keyboard.press('Enter');
        console.log('Country selected');
      }
    }
  } catch(e) {
    console.log('Country selection error:', e.message);
  }
  
  await page.waitForTimeout(500);
  
  // Industry
  console.log('Selecting industry...');
  try {
    const selects = await page.$$('[class*="select__placeholder"], [class*="placeholder"]');
    console.log('Remaining placeholders:', selects.length);
    for (const s of selects) {
      const text = await s.innerText().catch(() => '');
      console.log('  Placeholder:', text);
    }
    if (selects.length > 0) {
      await selects[0].click();
      await page.waitForTimeout(500);
      await page.keyboard.type('E-commerce');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');
      console.log('Industry selected');
    }
  } catch(e) {
    console.log('Industry error:', e.message);
  }
  
  await page.waitForTimeout(500);
  
  // How long in business
  console.log('Selecting business duration...');
  try {
    const selects = await page.$$('[class*="select__placeholder"], [class*="placeholder"]');
    if (selects.length > 0) {
      await selects[0].click();
      await page.waitForTimeout(500);
      await page.keyboard.type('1');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');
      console.log('Duration selected');
    }
  } catch(e) {
    console.log('Duration error:', e.message);
  }
  
  await page.waitForTimeout(500);
  
  // Select "No accountant"
  console.log('Selecting no accountant...');
  try {
    const noAccountant = await page.$('text=No, I don');
    if (noAccountant) {
      await noAccountant.click();
      console.log('No accountant selected');
    }
  } catch(e) {
    console.log('Accountant error:', e.message);
  }
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.synder-state/onboard-04-filled.png', fullPage: true });
  
  // Click Next step
  console.log('Clicking Next step...');
  const nextBtn = await page.$('text=Next step');
  if (nextBtn) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
    
    console.log('URL after next:', page.url());
    await page.screenshot({ path: '.synder-state/onboard-05-next.png', fullPage: true });
    
    const bodyText = await page.innerText('body').catch(() => '');
    const lines = bodyText.split('\n').filter(l => l.trim()).slice(0, 60);
    console.log('Page content:');
    lines.forEach(l => console.log('  ', l.trim()));
  }
  
  // Save state
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
