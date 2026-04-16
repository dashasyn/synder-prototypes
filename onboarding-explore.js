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
  await page.waitForTimeout(2000);
  
  // Get ALL react-select controls
  const selects = await page.$$('[class*="select__control"]');
  console.log('Total react-select controls:', selects.length);
  
  // Click each one and list options
  for (let i = 0; i < selects.length; i++) {
    const sel = selects[i];
    const box = await sel.boundingBox();
    if (!box) continue;
    
    // Get the current value
    const valueEl = await sel.$('[class*="singleValue"], [class*="placeholder"]');
    const currentVal = valueEl ? await valueEl.innerText().catch(() => '?') : '?';
    
    console.log(`\n--- Select #${i} (y=${Math.round(box.y)}, current="${currentVal}") ---`);
    
    await sel.click();
    await page.waitForTimeout(800);
    
    // Get all visible options
    const opts = await page.$$('[class*="option"]');
    console.log(`Options (${opts.length}):`);
    for (const o of opts.slice(0, 20)) {
      const t = await o.innerText().catch(() => '?');
      console.log(`  - ${t}`);
    }
    
    // Close the dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  
  // Also check the accountant radio buttons
  console.log('\n--- Radio buttons ---');
  const radios = await page.$$('input[type="radio"]');
  console.log('Radio inputs:', radios.length);
  for (const r of radios) {
    const name = await r.getAttribute('name') || '?';
    const value = await r.getAttribute('value') || '?';
    const checked = await r.isChecked();
    console.log(`  Radio: name=${name}, value=${value}, checked=${checked}`);
  }
  
  // Check checkboxes too
  const checkboxes = await page.$$('input[type="checkbox"]');
  console.log('Checkboxes:', checkboxes.length);
  for (const c of checkboxes) {
    const name = await c.getAttribute('name') || '?';
    const checked = await c.isChecked();
    const box = await c.boundingBox();
    console.log(`  Checkbox: name=${name}, checked=${checked}, y=${box ? Math.round(box.y) : '?'}`);
  }
  
  // Check business name input
  const nameInput = await page.$('input[placeholder*="name"]');
  if (nameInput) {
    const val = await nameInput.inputValue();
    console.log('\nBusiness name value:', val);
  }
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
