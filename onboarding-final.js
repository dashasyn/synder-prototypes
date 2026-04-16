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

  // Helper: click at exact coordinates
  async function clickAt(x, y) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(300);
  }

  // 1. Business name
  console.log('1. Business name...');
  const nameInput = page.locator('input[placeholder="Type any name here..."]');
  await nameInput.click();
  await nameInput.fill('');
  await nameInput.type('Dasha Per-Txn Test', { delay: 15 });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  console.log('   Value:', await nameInput.inputValue());

  // 2. Country — use coordinates from select #1 at y=412
  console.log('2. Country...');
  const countryBox = await page.$$eval('[class*="select__control"]', els => {
    const el = els[1]; // second select = country
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await clickAt(countryBox.x, countryBox.y);
  await page.keyboard.type('United States', { delay: 15 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  console.log('   Done');

  // 3. Industry — custom dropdown
  console.log('3. Industry...');
  const iLabelBox = await page.locator('text=Industry').first().boundingBox();
  await clickAt(iLabelBox.x + 200, iLabelBox.y + 40);
  await page.waitForTimeout(800);
  
  // Click "Retail / E-Commerce"
  const retailBox = await page.locator('text=Retail / E-Commerce').boundingBox().catch(() => null);
  if (retailBox) {
    await clickAt(retailBox.x + 20, retailBox.y + 10);
    console.log('   Selected');
  }
  await page.waitForTimeout(300);
  // Close dropdown by clicking heading
  await clickAt(iLabelBox.x, iLabelBox.y - 80);
  await page.waitForTimeout(300);

  // 4. Duration
  console.log('4. Duration...');
  const durBox = await page.$$eval('[class*="select__control"]', els => {
    const el = els[2]; // third select = duration
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await clickAt(durBox.x, durBox.y);
  await page.waitForTimeout(500);
  // Click "1-3 years"
  const dur13Box = await page.locator('text=1-3 years').boundingBox().catch(() => null);
  if (dur13Box) {
    await clickAt(dur13Box.x + 20, dur13Box.y + 10);
    console.log('   Selected 1-3 years');
  } else {
    // Use keyboard
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    console.log('   Keyboard selected');
  }
  await page.waitForTimeout(500);

  // 5. Revenue (if appeared)
  const revLabel = await page.locator('text=Your revenue').boundingBox().catch(() => null);
  if (revLabel) {
    console.log('5. Revenue...');
    // The revenue select should be the last react-select now
    const revBox = await page.$$eval('[class*="select__control"]', els => {
      const el = els[els.length - 1];
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await clickAt(revBox.x, revBox.y);
    await page.waitForTimeout(500);
    // Screenshot to see options
    await page.screenshot({ path: '.synder-state/onboard-rev-options.png' });
    // Pick first reasonable option
    const firstOpt = await page.locator('[class*="option"]').first().boundingBox().catch(() => null);
    if (firstOpt) {
      await clickAt(firstOpt.x + 20, firstOpt.y + 10);
      console.log('   Selected first option');
    }
    await page.waitForTimeout(500);
  }

  // 6. No accountant — click the radio circle area
  console.log('6. No accountant...');
  const noTextBox = await page.locator("text=No, I don't have an accountant/bookkeeper").boundingBox();
  if (noTextBox) {
    // Radio circle should be ~25px to the left of the text
    await clickAt(noTextBox.x - 15, noTextBox.y + noTextBox.height / 2);
    await page.waitForTimeout(500);
    console.log('   Clicked radio area');
  }
  
  // Verify
  const radios = await page.$$eval('input[type="radio"]', els => 
    els.map(r => ({ value: r.value, checked: r.checked }))
  );
  console.log('   Radios:', JSON.stringify(radios));
  
  // If "No" still not checked, try clicking the checkbox area more broadly
  if (!radios.find(r => r.value === 'No' && r.checked)) {
    console.log('   Retrying with broader click area...');
    // Try clicking directly on the text itself
    await clickAt(noTextBox.x + 10, noTextBox.y + noTextBox.height / 2);
    await page.waitForTimeout(300);
    
    const radios2 = await page.$$eval('input[type="radio"]', els => 
      els.map(r => ({ value: r.value, checked: r.checked }))
    );
    console.log('   Radios after:', JSON.stringify(radios2));
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: '.synder-state/onboard-final-filled.png', fullPage: true });

  const bodyText = await page.innerText('body').catch(() => '');
  const lines = bodyText.split('\n').filter(l => l.trim()).slice(0, 50);
  console.log('\n=== FORM STATE ===');
  lines.forEach(l => console.log('  ', l.trim()));

  // Next step
  console.log('\n>>> Next step...');
  const nextBox = await page.locator('text=Next step').boundingBox();
  await clickAt(nextBox.x + 30, nextBox.y + 15);
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle').catch(() => {});

  console.log('URL:', page.url());
  await page.screenshot({ path: '.synder-state/onboard-step3-result.png', fullPage: true });

  const nextText = await page.innerText('body').catch(() => '');
  const nextLines = nextText.split('\n').filter(l => l.trim()).slice(0, 60);
  console.log('\n=== NEXT PAGE ===');
  nextLines.forEach(l => console.log('  ', l.trim()));

  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
