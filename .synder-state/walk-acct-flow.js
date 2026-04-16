const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: '.synder-state/storage-state.json',
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  
  // Navigate to role selection
  let text = await page.locator('body').innerText();
  if (!text.includes('How would you describe your role')) {
    await page.locator('text=Tell us about you').first().click();
    await page.waitForTimeout(2000);
  }
  
  // Select Accounting role
  await page.locator('.common-select__control').first().click();
  await page.waitForTimeout(500);
  await page.locator('.common-select__option:has-text("Accounting or Bookkeeping Firm")').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.synder-state/flow-acct/01-role-selected.png' });
  
  await page.locator('button:has-text("Next step")').click();
  await page.waitForTimeout(3000);
  
  // ===== PRACTICE INFO (sub-step of step 1) =====
  await page.screenshot({ path: '.synder-state/flow-acct/02-practice-empty.png', fullPage: true });
  
  // Open employees dropdown
  await page.locator('.common-select__control').first().click();
  await page.waitForTimeout(500);
  let opts = await page.locator('.common-select__option').allInnerTexts();
  console.log('Employee options:', JSON.stringify(opts));
  await page.screenshot({ path: '.synder-state/flow-acct/02b-employees-open.png' });
  await page.locator('.common-select__option:has-text("2 - 9")').click();
  await page.waitForTimeout(500);
  
  // Open industries (might be a different select type - look for it)
  // The "Choose the industries you serve" field
  const industryField = page.locator('text=Choose the industries you serve').locator('..').locator('[class*="select__control"], input, [class*="clickable"]');
  const allSelectControls = page.locator('[class*="select__control"]');
  const selCount = await allSelectControls.count();
  console.log('Total select controls after filling employees:', selCount);
  
  // Click the second select control (industries)
  if (selCount >= 2) {
    await allSelectControls.nth(1).click();
    await page.waitForTimeout(500);
    opts = await page.locator('[class*="select__option"]').allInnerTexts();
    console.log('Industry options:', JSON.stringify(opts.slice(0, 20)));
    await page.screenshot({ path: '.synder-state/flow-acct/02c-industries-open.png' });
    await page.locator('[class*="select__option"]').first().click();
    await page.waitForTimeout(500);
  }
  
  // Click third select (clients count)
  const selCount2 = await allSelectControls.count();
  if (selCount2 >= 3) {
    await allSelectControls.nth(2).click();
    await page.waitForTimeout(500);
    opts = await page.locator('[class*="select__option"]').allInnerTexts();
    console.log('Client count options:', JSON.stringify(opts));
    await page.screenshot({ path: '.synder-state/flow-acct/02d-clients-open.png' });
    await page.locator('[class*="select__option"]').first().click();
    await page.waitForTimeout(500);
  }
  
  await page.screenshot({ path: '.synder-state/flow-acct/03-practice-filled.png' });
  
  // Click Next
  await page.locator('button:has-text("Next step")').click();
  await page.waitForTimeout(5000);
  
  // ===== STEP 2: Provide Client details =====
  text = await page.locator('body').innerText();
  console.log('=== STEP 2: CLIENT DETAILS ===');
  console.log(text.substring(0, 1500));
  await page.screenshot({ path: '.synder-state/flow-acct/04-client-details.png', fullPage: true });
  
  // Save state for continuing later
  await context.storageState({ path: '.synder-state/storage-state-acct.json' });
  
  await browser.close();
})().catch(e => console.error('ERROR:', e.message));
