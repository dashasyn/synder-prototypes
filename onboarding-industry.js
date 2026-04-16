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

  // Fill all fields but focus on figuring out Industry
  // 1. Business name
  const nameInput = page.locator('input[placeholder="Type any name here..."]');
  await nameInput.click();
  await nameInput.type('Dasha Per-Txn Test', { delay: 15 });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);

  // 2. Country
  const countryBox = await page.$$eval('[class*="select__control"]', els => {
    const el = els[1]; const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await clickAt(countryBox.x, countryBox.y);
  await page.keyboard.type('United States', { delay: 15 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  // 3. Industry - investigate properly
  console.log('=== Industry investigation ===');
  const iLabelBox = await page.locator('text=Industry').first().boundingBox();
  console.log('Label at:', iLabelBox);
  
  // Click the dropdown area
  await clickAt(iLabelBox.x + 200, iLabelBox.y + 40);
  await page.waitForTimeout(1000);
  
  // Take screenshot to see what opened
  await page.screenshot({ path: '.synder-state/onboard-industry-open2.png' });
  
  // Inspect the dropdown structure
  const dropdownInfo = await page.evaluate(() => {
    const menus = document.querySelectorAll('[class*="menu"], [class*="popover"], [class*="dropdown"], [role="listbox"]');
    const results = [];
    for (const m of menus) {
      const rect = m.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Get all checkboxes inside
        const checkboxes = m.querySelectorAll('input[type="checkbox"]');
        const items = m.querySelectorAll('li, [role="option"], [class*="item"], [class*="option"]');
        results.push({
          tag: m.tagName,
          class: m.className.substring(0, 100),
          y: Math.round(rect.y),
          checkboxCount: checkboxes.length,
          itemCount: items.length,
          text: m.textContent.substring(0, 300)
        });
      }
    }
    return results;
  });
  console.log('Dropdown menus:', JSON.stringify(dropdownInfo, null, 2));
  
  // Look for all visible option-like elements
  const optionEls = await page.evaluate(() => {
    const allEls = document.querySelectorAll('li, [role="option"], [class*="menuItem"], [class*="MenuItem"]');
    const visible = Array.from(allEls).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    return visible.map(el => ({
      tag: el.tagName,
      text: el.textContent.trim().substring(0, 50),
      class: el.className.toString().substring(0, 80),
      x: Math.round(el.getBoundingClientRect().x),
      y: Math.round(el.getBoundingClientRect().y)
    }));
  });
  console.log('Visible option elements:', JSON.stringify(optionEls, null, 2));
  
  // Try clicking "Retail / E-Commerce" if visible
  const retailEl = optionEls.find(el => el.text.includes('Retail') || el.text.includes('E-Commerce'));
  if (retailEl) {
    console.log('Found Retail option at:', retailEl.x, retailEl.y);
    await clickAt(retailEl.x + 10, retailEl.y + 10);
    await page.waitForTimeout(500);
    
    // Take screenshot after click
    await page.screenshot({ path: '.synder-state/onboard-industry-clicked.png' });
    
    // Check if there's a checkbox or confirm button
    const confirmBtn = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.includes('Apply') || b.textContent.includes('OK') || b.textContent.includes('Done') || b.textContent.includes('Confirm')) {
          return b.textContent;
        }
      }
      return null;
    });
    console.log('Confirm button:', confirmBtn);
    
    if (confirmBtn) {
      await page.click(`text=${confirmBtn}`);
      await page.waitForTimeout(300);
    }
    
    // Close by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Check industry value now
    const industryValue = await page.evaluate(() => {
      const labels = document.querySelectorAll('label');
      for (const l of labels) {
        if (l.textContent.includes('Industry')) {
          const parent = l.closest('[class*="Grid"]') || l.parentElement;
          return parent?.textContent.substring(0, 100);
        }
      }
      return 'not found';
    });
    console.log('Industry area text:', industryValue);
  } else {
    console.log('Retail option NOT found in visible elements');
    console.log('Page text visible:', await page.innerText('body').then(t => t.substring(0, 500)));
  }
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
