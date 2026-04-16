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
  page.setDefaultTimeout(15000);
  
  await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // 1. Business name
  console.log('1. Business name...');
  const nameInput = await page.$('input[placeholder="Type any name here..."]');
  await nameInput.click();
  await nameInput.fill('Dasha Per-Txn Test');
  // Click elsewhere to confirm
  await page.click('text=Provide business details');
  await page.waitForTimeout(300);
  let nameVal = await nameInput.inputValue();
  console.log('   Value:', nameVal);
  
  // 2. Country (react-select)
  console.log('2. Country...');
  // Country is select #1 (y=412 area), find it
  const countrySelect = await page.$$('[class*="select__control"]');
  // countrySelect[1] should be Country (index 0=timezone, 1=country, 2=duration)
  await countrySelect[1].click();
  await page.waitForTimeout(300);
  await page.keyboard.type('United States', { delay: 20 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  console.log('   Done');
  
  // 3. Industry (custom dropdown - click the "Select..." area near Industry label)
  console.log('3. Industry...');
  // The industry label is at y~480, dropdown below it
  const industryLabel = await page.$('text=Industry');
  const iBox = await industryLabel.boundingBox();
  // Click in the dropdown area below the label
  await page.mouse.click(iBox.x + 150, iBox.y + 40);
  await page.waitForTimeout(800);
  
  // Now click "Retail / E-Commerce"
  const retailOption = await page.$('text=Retail / E-Commerce');
  if (retailOption) {
    await retailOption.click();
    console.log('   Selected Retail / E-Commerce');
  } else {
    console.log('   Option not found!');
  }
  await page.waitForTimeout(500);
  
  // 4. How long in business (react-select #2)
  console.log('4. Business duration...');
  const durationSelects = await page.$$('[class*="select__control"]');
  // After industry selection, re-query. Duration is the last react-select
  await durationSelects[durationSelects.length - 1].click();
  await page.waitForTimeout(300);
  await page.keyboard.type('1-3', { delay: 20 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  console.log('   Done');
  
  // Check if revenue appeared
  await page.waitForTimeout(500);
  const revField = await page.$('text=Your revenue');
  if (revField) {
    console.log('5. Revenue appeared, filling...');
    // It's probably another react-select
    const revSelects = await page.$$('[class*="select__control"]');
    await revSelects[revSelects.length - 1].click();
    await page.waitForTimeout(300);
    // Just press down and enter to pick first option
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log('   Done');
  }
  
  // 5. No accountant
  console.log('6. Accountant = No...');
  const noRadio = await page.$('input[type="radio"][value="No"]');
  if (noRadio) {
    await noRadio.click({ force: true });
    console.log('   Clicked radio');
  }
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: '.synder-state/onboard-filled-v2.png', fullPage: true });
  
  // Verify
  const bodyText = await page.innerText('body').catch(() => '');
  const lines = bodyText.split('\n').filter(l => l.trim()).slice(0, 45);
  console.log('\n=== FORM STATE ===');
  lines.forEach(l => console.log('  ', l.trim()));
  
  // Click Next
  console.log('\n>>> Clicking Next step...');
  await page.click('text=Next step');
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle').catch(() => {});
  
  console.log('URL:', page.url());
  await page.screenshot({ path: '.synder-state/onboard-step3.png', fullPage: true });
  
  const nextText = await page.innerText('body').catch(() => '');
  const nextLines = nextText.split('\n').filter(l => l.trim()).slice(0, 60);
  console.log('\n=== NEXT PAGE ===');
  nextLines.forEach(l => console.log('  ', l.trim()));
  
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
