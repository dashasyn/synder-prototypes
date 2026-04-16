const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  
  try {
    const state = JSON.parse(fs.readFileSync('.synder-state/storage-state.json', 'utf8'));
    if (state.cookies) await context.addCookies(state.cookies);
  } catch(e) {}

  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  
  await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // 1. Business name
  console.log('1. Business name...');
  await page.fill('input[placeholder="Type any name here..."]', 'Dasha Per-Txn Test');
  await page.click('text=Provide business details');
  await page.waitForTimeout(300);
  console.log('   Done');
  
  // 2. Country
  console.log('2. Country...');
  const selects = await page.$$('[class*="select__control"]');
  await selects[1].click({ force: true });
  await page.waitForTimeout(300);
  await page.keyboard.type('United States', { delay: 20 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  console.log('   Done');
  
  // 3. Industry
  console.log('3. Industry...');
  const industryLabel = await page.$('text=Industry');
  const iBox = await industryLabel.boundingBox();
  await page.mouse.click(iBox.x + 150, iBox.y + 40);
  await page.waitForTimeout(800);
  const retailOpt = await page.$('text=Retail / E-Commerce');
  if (retailOpt) {
    await retailOpt.click();
    console.log('   Selected Retail / E-Commerce');
  }
  await page.waitForTimeout(500);
  
  // Scroll down to make duration visible
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(500);
  
  // 4. How long in business — use keyboard approach via label click
  console.log('4. Duration...');
  const durationLabel = await page.$('text=How long have you been in business');
  if (durationLabel) {
    const dBox = await durationLabel.boundingBox();
    console.log('   Duration label at y:', dBox.y);
    // Click the select input inside this field using evaluate
    await page.evaluate(() => {
      // Find all react-select inputs and click the one in the duration section
      const inputs = document.querySelectorAll('[class*="select__input"] input, [class*="dummyInput"]');
      // The duration select should be after the country one
      for (const inp of inputs) {
        const rect = inp.getBoundingClientRect();
        if (rect.y > 300) { // below country/timezone area
          inp.focus();
          inp.click();
          break;
        }
      }
    });
    await page.waitForTimeout(500);
    await page.keyboard.type('1-3', { delay: 30 });
    await page.waitForTimeout(800);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log('   Done');
  }
  
  // 5. Revenue (if visible)
  await page.waitForTimeout(500);
  const revField = await page.$('text=Your revenue');
  if (revField) {
    console.log('5. Revenue...');
    const rBox = await revField.boundingBox();
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('[class*="select__input"] input, [class*="dummyInput"]');
      const arr = Array.from(inputs);
      const last = arr[arr.length - 1];
      if (last) { last.focus(); last.click(); }
    });
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log('   Done');
  }
  
  // 6. No accountant
  console.log('6. No accountant...');
  await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    for (const r of radios) {
      if (r.value === 'No') {
        r.click();
        // Also trigger React's onChange
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked').set;
        nativeInputValueSetter.call(r, true);
        r.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });
  await page.waitForTimeout(500);
  console.log('   Done');
  
  await page.screenshot({ path: '.synder-state/onboard-filled-v3.png', fullPage: true });
  
  // Verify form state
  const bodyText = await page.innerText('body').catch(() => '');
  const lines = bodyText.split('\n').filter(l => l.trim()).slice(0, 50);
  console.log('\n=== FORM STATE ===');
  lines.forEach(l => console.log('  ', l.trim()));
  
  // Check for validation errors
  const hasErrors = bodyText.includes('Please ');
  console.log('\nHas validation errors:', hasErrors);
  
  if (!hasErrors || bodyText.includes('Next step')) {
    console.log('\n>>> Clicking Next step...');
    await page.click('text=Next step');
    await page.waitForTimeout(4000);
    await page.waitForLoadState('networkidle').catch(() => {});
    
    console.log('URL:', page.url());
    await page.screenshot({ path: '.synder-state/onboard-next-page.png', fullPage: true });
    
    const nextText = await page.innerText('body').catch(() => '');
    const nextLines = nextText.split('\n').filter(l => l.trim()).slice(0, 60);
    console.log('\n=== NEXT PAGE ===');
    nextLines.forEach(l => console.log('  ', l.trim()));
  }
  
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
