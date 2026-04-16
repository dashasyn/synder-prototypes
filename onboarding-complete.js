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
  page.setDefaultTimeout(10000);
  
  await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  async function clickAt(x, y) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(300);
  }

  // 1. Business name
  console.log('1. Business name...');
  const nameInput = page.locator('input[placeholder="Type any name here..."]');
  await nameInput.click();
  await nameInput.type('Dasha Per-Txn Test', { delay: 15 });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  console.log('   Value:', await nameInput.inputValue());

  // 2. Country
  console.log('2. Country...');
  const countryBox = await page.$$eval('[class*="select__control"]', els => {
    const el = els[1]; const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await clickAt(countryBox.x, countryBox.y);
  await page.keyboard.type('United States', { delay: 15 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  console.log('   Done');

  // 3. Industry — it's a react-select multi with checkboxes
  // After clicking, it focuses option 1; type to filter, then Enter to select
  console.log('3. Industry...');
  const iLabelBox = await page.locator('text=Industry').first().boundingBox();
  await clickAt(iLabelBox.x + 200, iLabelBox.y + 40);
  await page.waitForTimeout(800);
  // Type to filter to "Retail"
  await page.keyboard.type('Retail', { delay: 20 });
  await page.waitForTimeout(800);
  // "Retail / E-Commerce" should now be focused, press Enter to select
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  
  // Check what was selected
  const industryText = await page.evaluate(() => {
    const controls = document.querySelectorAll('[class*="select__control"]');
    for (const c of controls) {
      const multiVal = c.querySelectorAll('[class*="multiValue"]');
      if (multiVal.length > 0) {
        return Array.from(multiVal).map(v => v.textContent).join(', ');
      }
    }
    return 'none';
  });
  console.log('   Industry selected:', industryText);
  
  // Close industry dropdown
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  console.log('   Done');

  // 4. Duration
  console.log('4. Duration...');
  const durBox = await page.$$eval('[class*="select__control"]', els => {
    // Duration is the react-select with placeholder "Select..." that's NOT country
    // After selecting country (US) and industry, duration should be the one at ~y=600
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const ph = el.querySelector('[class*="placeholder"]');
      if (ph && r.y > 500) {
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
    }
    // fallback: last select
    const el = els[els.length - 1];
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  console.log('   Duration select at:', durBox);
  await clickAt(durBox.x, durBox.y);
  await page.waitForTimeout(500);
  await page.keyboard.type('1-3', { delay: 20 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  console.log('   Done');

  // 5. Revenue (appears after duration)
  await page.waitForTimeout(500);
  const revLabel = await page.locator('text=Your revenue').boundingBox().catch(() => null);
  if (revLabel) {
    console.log('5. Revenue...');
    const revBox = await page.$$eval('[class*="select__control"]', els => {
      const el = els[els.length - 1];
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await clickAt(revBox.x, revBox.y);
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown'); // First option
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log('   Done');
  } else {
    console.log('5. Revenue not visible, skipping');
  }

  // 6. No accountant — scroll and click radio
  console.log('6. No accountant...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  
  const radioInfo = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    return Array.from(radios).map(r => {
      const rect = r.getBoundingClientRect();
      return { value: r.value, checked: r.checked, x: rect.x, y: rect.y };
    });
  });
  console.log('   Radios:', JSON.stringify(radioInfo));
  
  const noRadio = radioInfo.find(r => r.value === 'No');
  if (noRadio) {
    await clickAt(noRadio.x + 10, noRadio.y + 10);
    await page.waitForTimeout(500);
  }
  
  const radios2 = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    return Array.from(radios).map(r => ({ value: r.value, checked: r.checked }));
  });
  console.log('   After click:', JSON.stringify(radios2));

  // Final screenshot
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: '.synder-state/onboard-complete-check.png', fullPage: true });

  const bodyText = await page.innerText('body').catch(() => '');
  const lines = bodyText.split('\n').filter(l => l.trim()).slice(0, 50);
  console.log('\n=== FORM STATE ===');
  lines.forEach(l => console.log('  ', l.trim()));
  
  const hasErrors = bodyText.includes('Please ');
  console.log('\nValidation errors present:', hasErrors);

  // Click Next
  console.log('\n>>> Next step...');
  const nextBox = await page.locator('text=Next step').boundingBox();
  await clickAt(nextBox.x + 30, nextBox.y + 15);
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle').catch(() => {});

  const newUrl = page.url();
  console.log('URL after next:', newUrl);
  await page.screenshot({ path: '.synder-state/onboard-step3-complete.png', fullPage: true });

  const nextText = await page.innerText('body').catch(() => '');
  const nextLines = nextText.split('\n').filter(l => l.trim()).slice(0, 60);
  console.log('\n=== NEXT PAGE ===');
  nextLines.forEach(l => console.log('  ', l.trim()));

  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
