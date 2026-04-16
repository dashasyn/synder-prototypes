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
  
  // Screenshot starting state
  await page.screenshot({ path: '.synder-state/onboard-start-v3.png', fullPage: true });
  
  // 1. Business name - use React-compatible approach
  console.log('1. Business name...');
  await page.evaluate(() => {
    const input = document.querySelector('input[placeholder="Type any name here..."]');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, 'Dasha Per-Txn Test');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const nameVal = await page.$eval('input[placeholder="Type any name here..."]', el => el.value);
  console.log('   Value:', nameVal);
  
  // 2. Country - react-select, use click approach  
  console.log('2. Country...');
  // Get all react-select controls. They should be: [timezone, country, duration]
  // Let me identify them by their current values
  const selectInfo = await page.evaluate(() => {
    const controls = document.querySelectorAll('[class*="select__control"]');
    return Array.from(controls).map((c, i) => {
      const val = c.querySelector('[class*="singleValue"]');
      const ph = c.querySelector('[class*="placeholder"]');
      const rect = c.getBoundingClientRect();
      return { index: i, y: Math.round(rect.y), value: val?.textContent || '', placeholder: ph?.textContent || '' };
    });
  });
  console.log('   React selects:', JSON.stringify(selectInfo));
  
  // Country should be the one with "Select..." near y~412 area, or the second one
  const countryIdx = selectInfo.findIndex(s => s.placeholder === 'Select...' || (s.value === '' && s.y < 500));
  console.log('   Country index:', countryIdx);
  
  const allSelects = await page.$$('[class*="select__control"]');
  if (countryIdx >= 0 && allSelects[countryIdx]) {
    await allSelects[countryIdx].click({ force: true });
    await page.waitForTimeout(300);
    await page.keyboard.type('United States', { delay: 20 });
    await page.waitForTimeout(800);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log('   Done');
  }
  
  // 3. Industry - custom multi-select dropdown
  console.log('3. Industry...');
  // Find "Select..." text near Industry label and click to open
  const industryLabel = await page.$('text=Industry');
  const iBox = await industryLabel.boundingBox();
  await page.mouse.click(iBox.x + 200, iBox.y + 40);
  await page.waitForTimeout(1000);
  
  // Screenshot to see dropdown
  await page.screenshot({ path: '.synder-state/onboard-industry-v3.png' });
  
  const retailOpt = await page.$('text=Retail / E-Commerce');
  if (retailOpt) {
    await retailOpt.click();
    console.log('   Selected Retail / E-Commerce');
  } else {
    console.log('   Looking for industry options...');
    const allText = await page.innerText('body');
    const match = allText.match(/Retail|Commerce|SaaS|Technology/g);
    console.log('   Found keywords:', match);
  }
  await page.waitForTimeout(500);
  
  // Close any open dropdown by clicking the heading
  await page.click('text=Provide business details');
  await page.waitForTimeout(300);
  
  // 4. How long in business
  console.log('4. Duration...');
  // Re-query selects after potential DOM changes
  const selectInfo2 = await page.evaluate(() => {
    const controls = document.querySelectorAll('[class*="select__control"]');
    return Array.from(controls).map((c, i) => {
      const val = c.querySelector('[class*="singleValue"]');
      const ph = c.querySelector('[class*="placeholder"]');
      const rect = c.getBoundingClientRect();
      return { index: i, y: Math.round(rect.y), value: val?.textContent || '', placeholder: ph?.textContent || '' };
    });
  });
  console.log('   Selects now:', JSON.stringify(selectInfo2));
  
  // Duration is the one that still says "Select..." and is below country
  const durationIdx = selectInfo2.findIndex(s => s.placeholder === 'Select...' && s.y > 450);
  console.log('   Duration index:', durationIdx);
  
  const allSelects2 = await page.$$('[class*="select__control"]');
  if (durationIdx >= 0 && allSelects2[durationIdx]) {
    // Scroll to make it visible
    await allSelects2[durationIdx].scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await allSelects2[durationIdx].click({ force: true });
    await page.waitForTimeout(500);
    
    // Check if menu opened
    const menuVisible = await page.$('[class*="select__menu"]');
    console.log('   Menu visible:', !!menuVisible);
    
    if (menuVisible) {
      const opt = await page.$('text=1-3 years');
      if (opt) {
        await opt.click();
        console.log('   Selected 1-3 years');
      }
    } else {
      // Try keyboard
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      console.log('   Used keyboard');
    }
    await page.waitForTimeout(500);
  }
  
  // 5. Revenue (if visible)
  const revField = await page.$('text=Your revenue');
  if (revField) {
    console.log('5. Revenue...');
    const revSelects = await page.$$('[class*="select__control"]');
    const lastSelect = revSelects[revSelects.length - 1];
    await lastSelect.scrollIntoViewIfNeeded();
    await lastSelect.click({ force: true });
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log('   Done');
  }
  
  // 6. No accountant
  console.log('6. No accountant...');
  const noLabel = await page.$("text=No, I don't have an accountant");
  if (noLabel) {
    await noLabel.click({ force: true });
    await page.waitForTimeout(300);
    console.log('   Clicked label');
  }
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: '.synder-state/onboard-filled-v3.png', fullPage: true });
  
  const bodyText = await page.innerText('body').catch(() => '');
  const lines = bodyText.split('\n').filter(l => l.trim()).slice(0, 50);
  console.log('\n=== FORM STATE ===');
  lines.forEach(l => console.log('  ', l.trim()));
  
  // Try Next
  console.log('\n>>> Next step...');
  await page.click('text=Next step');
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle').catch(() => {});
  
  console.log('URL:', page.url());
  await page.screenshot({ path: '.synder-state/onboard-after-next.png', fullPage: true });
  
  const nextText = await page.innerText('body').catch(() => '');
  const nextLines = nextText.split('\n').filter(l => l.trim()).slice(0, 60);
  console.log('\n=== AFTER NEXT ===');
  nextLines.forEach(l => console.log('  ', l.trim()));
  
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
