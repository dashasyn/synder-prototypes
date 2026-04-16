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
  page.setDefaultTimeout(10000);
  
  await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('URL:', page.url());
  await page.waitForTimeout(2000);
  
  // Helper: fill a react-select dropdown by clicking its container, typing, and pressing Enter
  async function fillReactSelect(labelText, typeText) {
    console.log(`Filling "${labelText}" with "${typeText}"...`);
    // Find all react-select containers
    const allSelects = await page.$$('[class*="select__control"], [class*="selectControl"]');
    // Find the one nearest to the label
    const label = await page.$(`text=${labelText}`);
    if (!label) {
      console.log(`  Label "${labelText}" not found, trying by placeholder...`);
      return false;
    }
    
    // Get the parent grid/form-group containing this label
    const labelBox = await label.boundingBox();
    if (!labelBox) return false;
    
    // Find the closest select control below/near this label
    let bestSelect = null;
    let bestDist = Infinity;
    for (const sel of allSelects) {
      const box = await sel.boundingBox();
      if (!box) continue;
      // Select should be below or at the same level as label, and horizontally aligned
      const dist = Math.abs(box.x - labelBox.x) + Math.abs(box.y - labelBox.y);
      if (box.y >= labelBox.y - 10 && dist < bestDist) {
        bestDist = dist;
        bestSelect = sel;
      }
    }
    
    if (bestSelect) {
      await bestSelect.click();
      await page.waitForTimeout(300);
      await page.keyboard.type(typeText, { delay: 30 });
      await page.waitForTimeout(1500);
      // Check what options are visible
      const opts = await page.$$('[class*="option"]');
      for (const o of opts.slice(0, 5)) {
        console.log(`  Option: ${await o.innerText().catch(() => '?')}`);
      }
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      console.log(`  Done`);
      return true;
    }
    console.log(`  No select found near label`);
    return false;
  }
  
  // 1. Business name
  console.log('Filling business name...');
  const nameInput = await page.$('input[name*="name"], input[placeholder*="name"]');
  if (nameInput) {
    await nameInput.click();
    await nameInput.fill('Dasha Per-Txn Test');
    console.log('  Done');
  }
  
  // 2. Website (optional, skip)
  
  // 3. Timezone - already UTC, skip
  
  // 4. Country
  await fillReactSelect('Country', 'United States');
  await page.waitForTimeout(500);
  
  // 5. Industry
  await fillReactSelect('Industry', 'Ecommerce');
  await page.waitForTimeout(500);
  // If "Ecommerce" doesn't match, try "E-commerce" or "Retail"
  
  // 6. How long in business
  await fillReactSelect('How long have you been in business', '1-3');
  await page.waitForTimeout(500);
  
  // Check if "revenue" field appeared
  const hasRevenue = await page.$('text=revenue');
  if (hasRevenue) {
    console.log('Revenue field appeared');
    await fillReactSelect('revenue', '100');
    await page.waitForTimeout(500);
  }
  
  // 7. No accountant
  console.log('Selecting no accountant...');
  const noAcct = await page.$("text=No, I don't have");
  if (noAcct) {
    await noAcct.click();
    console.log('  Done');
  }
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.synder-state/onboard-filled-final.png', fullPage: true });
  
  // Print form state
  const bodyText = await page.innerText('body').catch(() => '');
  const lines = bodyText.split('\n').filter(l => l.trim()).slice(0, 50);
  console.log('\n=== FORM STATE ===');
  lines.forEach(l => console.log('  ', l.trim()));
  
  // Click Next step
  console.log('\nClicking Next step...');
  await page.click('text=Next step');
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle').catch(() => {});
  
  const newUrl = page.url();
  console.log('URL after next:', newUrl);
  await page.screenshot({ path: '.synder-state/onboard-step3.png', fullPage: true });
  
  const nextText = await page.innerText('body').catch(() => '');
  const nextLines = nextText.split('\n').filter(l => l.trim()).slice(0, 60);
  console.log('\n=== NEXT PAGE ===');
  nextLines.forEach(l => console.log('  ', l.trim()));
  
  // Save state
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
