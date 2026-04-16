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
  
  // Business name — use click + keyboard (most React-compatible)
  console.log('1. Business name...');
  const nameInput = await page.$('input[placeholder="Type any name here..."]');
  await nameInput.click();
  await nameInput.press('Control+a');
  await nameInput.type('Dasha Per-Txn Test', { delay: 20 });
  await page.waitForTimeout(300);
  // Tab away to trigger blur
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  console.log('   Value:', await nameInput.inputValue());

  // Country
  console.log('2. Country...');
  const selects = await page.$$('[class*="select__control"]');
  await selects[1].click({ force: true });
  await page.waitForTimeout(300);
  await page.keyboard.type('United States', { delay: 20 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  // Industry
  console.log('3. Industry...');
  const iLabel = await page.$('text=Industry');
  const iBox = await iLabel.boundingBox();
  await page.mouse.click(iBox.x + 200, iBox.y + 40);
  await page.waitForTimeout(1000);
  const retail = await page.$('text=Retail / E-Commerce');
  if (retail) await retail.click();
  await page.waitForTimeout(500);
  await page.click('text=Provide business details');
  await page.waitForTimeout(300);

  // Duration
  console.log('4. Duration...');
  const selects2 = await page.$$('[class*="select__control"]');
  await selects2[2].scrollIntoViewIfNeeded();
  await selects2[2].click({ force: true });
  await page.waitForTimeout(500);
  const opt13 = await page.$('text=1-3 years');
  if (opt13) await opt13.click();
  await page.waitForTimeout(500);

  // Revenue
  const revField = await page.$('text=Your revenue');
  if (revField) {
    console.log('5. Revenue...');
    const selects3 = await page.$$('[class*="select__control"]');
    await selects3[selects3.length - 1].scrollIntoViewIfNeeded();
    await selects3[selects3.length - 1].click({ force: true });
    await page.waitForTimeout(500);
    const rev250 = await page.$('text=250K');
    if (rev250) await rev250.click();
    else {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(500);
  }

  // No accountant — try multiple approaches
  console.log('6. No accountant...');
  
  // Approach A: Find and click the "No" radio by its label text
  // The structure is likely: <label><radio/><span>No, I don't...</span></label>
  // or a Material UI RadioGroup
  
  // First, let's see the radio HTML structure
  const radioHTML = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    return Array.from(radios).map(r => ({
      value: r.value,
      checked: r.checked,
      parentHTML: r.parentElement?.outerHTML?.substring(0, 200),
      id: r.id,
      name: r.name,
    }));
  });
  console.log('   Radio structure:', JSON.stringify(radioHTML, null, 2));
  
  // Click the "No" radio label - for MUI, the radio is wrapped in <label> with <span>
  // Try clicking the radio span icon
  const noRadioParent = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    for (const r of radios) {
      if (r.value === 'No') {
        // Get the encompassing label or clickable parent
        const label = r.closest('label') || r.parentElement;
        if (label) {
          label.click();
          return 'clicked label';
        }
      }
    }
    return 'not found';
  });
  console.log('   Result:', noRadioParent);
  await page.waitForTimeout(500);
  
  // Check if "No" is now checked
  const noChecked = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    return Array.from(radios).map(r => ({ value: r.value, checked: r.checked }));
  });
  console.log('   After click:', JSON.stringify(noChecked));
  
  // If still not working, try clicking the visible text
  if (!noChecked.find(r => r.value === 'No' && r.checked)) {
    console.log('   Trying text click...');
    // MUI radios: the span with class MuiRadio-root or similar
    await page.evaluate(() => {
      const spans = document.querySelectorAll('[class*="MuiRadio"], [class*="radio"]');
      // Get all, the "No" one should be the second
      if (spans.length >= 2) {
        spans[1].click();
      }
    });
    await page.waitForTimeout(300);
    
    const check2 = await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      return Array.from(radios).map(r => ({ value: r.value, checked: r.checked }));
    });
    console.log('   After span click:', JSON.stringify(check2));
  }
  
  // Last resort: use page.click on the visible "No, I don't" text area
  if (true) {
    const noText = await page.locator("text=No, I don't have an accountant/bookkeeper");
    const nBox = await noText.boundingBox();
    if (nBox) {
      // Click 20px to the left of the text (where the radio circle is)
      await page.mouse.click(nBox.x - 20, nBox.y + nBox.height / 2);
      await page.waitForTimeout(500);
      console.log('   Clicked left of text');
    }
  }
  
  await page.screenshot({ path: '.synder-state/onboard-fixed.png', fullPage: true });
  
  const bodyText = await page.innerText('body').catch(() => '');
  const lines = bodyText.split('\n').filter(l => l.trim()).slice(0, 45);
  console.log('\n=== FORM STATE ===');
  lines.forEach(l => console.log('  ', l.trim()));
  
  // Check if we can proceed
  const hasNameError = bodyText.includes('Please give your organization');
  const hasAccountantError = bodyText.includes("specify your accountant");
  console.log('\nName error:', hasNameError, '| Accountant error:', hasAccountantError);
  
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
