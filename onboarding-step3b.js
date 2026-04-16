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
  
  await page.waitForTimeout(1000);
  
  // Check current state of form
  const bodyText = await page.innerText('body').catch(() => '');
  console.log('Current form state (key fields):');
  if (bodyText.includes('Business name')) console.log('On business details step');
  
  // First let's see what's already filled
  await page.screenshot({ path: '.synder-state/onboard-04a-current.png', fullPage: true });
  
  // Fix Industry - click on the current "Education" value and change it
  console.log('Fixing Industry...');
  try {
    const eduText = await page.$('text=Education');
    if (eduText) {
      await eduText.click();
      await page.waitForTimeout(500);
      // Clear and type
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(300);
      // Type ecommerce
      await page.keyboard.type('Ecommerce', { delay: 50 });
      await page.waitForTimeout(1500);
      
      // Screenshot to see dropdown options
      await page.screenshot({ path: '.synder-state/onboard-04b-industry-dropdown.png' });
      
      // Get visible options
      const options = await page.$$('[class*="option"], [class*="menu"] [class*="item"]');
      console.log('Visible options:', options.length);
      for (const opt of options.slice(0, 10)) {
        const t = await opt.innerText().catch(() => '');
        console.log('  Option:', t);
      }
      
      await page.keyboard.press('Enter');
      console.log('Industry fixed');
    }
  } catch(e) {
    console.log('Industry fix error:', e.message);
  }
  
  await page.waitForTimeout(500);
  
  // Fix "How long in business" - this is the remaining "Select..." dropdown
  console.log('Fixing business duration...');
  try {
    // Find the "Select..." text that's part of the duration dropdown
    // It should be the only remaining "Select..." on the page
    const selectPlaceholders = await page.$$('text=Select...');
    console.log('Found "Select..." elements:', selectPlaceholders.length);
    
    // Also try looking for the specific label
    const durationLabel = await page.getByText('How long have you been in business?');
    if (durationLabel) {
      console.log('Found duration label');
      // The dropdown should be right after this label
      // Click on the parent container area
      const parent = await durationLabel.evaluateHandle(el => el.closest('[class*="Grid"]') || el.parentElement);
      const selectInParent = await parent.$('[class*="select"], [class*="control"], [role="combobox"]');
      if (selectInParent) {
        await selectInParent.click();
      } else {
        // Just click the Select... text
        if (selectPlaceholders.length > 0) {
          await selectPlaceholders[0].click();
        }
      }
      await page.waitForTimeout(500);
      await page.keyboard.type('1-3', { delay: 50 });
      await page.waitForTimeout(1500);
      
      await page.screenshot({ path: '.synder-state/onboard-04c-duration-dropdown.png' });
      
      const options = await page.$$('[class*="option"]');
      console.log('Duration options:', options.length);
      for (const opt of options.slice(0, 10)) {
        const t = await opt.innerText().catch(() => '');
        console.log('  Option:', t);
      }
      
      await page.keyboard.press('Enter');
      console.log('Duration selected');
    }
  } catch(e) {
    console.log('Duration fix error:', e.message);
  }
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.synder-state/onboard-04d-ready.png', fullPage: true });
  
  // Check form text again
  const updatedText = await page.innerText('body').catch(() => '');
  const lines = updatedText.split('\n').filter(l => l.trim()).slice(0, 40);
  console.log('\nUpdated form:');
  lines.forEach(l => console.log('  ', l.trim()));
  
  // Click Next step
  console.log('\nClicking Next step...');
  await page.click('text=Next step');
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle').catch(() => {});
  
  console.log('URL after next:', page.url());
  await page.screenshot({ path: '.synder-state/onboard-05-next.png', fullPage: true });
  
  const nextText = await page.innerText('body').catch(() => '');
  const nextLines = nextText.split('\n').filter(l => l.trim()).slice(0, 50);
  console.log('Next page:');
  nextLines.forEach(l => console.log('  ', l.trim()));
  
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
