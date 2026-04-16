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
  
  // Find the Industry area - look for clickable elements near "Industry"
  console.log('=== Exploring Industry field ===');
  const industryLabel = await page.$('text=Industry');
  if (industryLabel) {
    const box = await industryLabel.boundingBox();
    console.log('Industry label at:', box);
    
    // Click just below the label to open whatever control is there
    await page.click(`text=Select...`, { position: { x: 5, y: 5 } });
    await page.waitForTimeout(300);
    
    // Actually let's find what's near the industry label
    // Look for any clickable container
    const parent = await industryLabel.evaluateHandle(el => {
      let p = el.parentElement;
      for (let i = 0; i < 5; i++) {
        if (p && p.parentElement) p = p.parentElement;
      }
      return p;
    });
    
    const html = await parent.evaluate(el => el.innerHTML.substring(0, 3000));
    console.log('Industry area HTML:\n', html);
  }
  
  // Also explore what's on the page between y=450 and y=600
  console.log('\n=== All clickable elements in industry zone ===');
  const allEls = await page.$$('button, input, [role="button"], [role="combobox"], [class*="select"], [class*="chip"], [class*="tag"], [class*="multi"]');
  for (const el of allEls) {
    const box = await el.boundingBox();
    if (!box || box.y < 440 || box.y > 600) continue;
    const tag = await el.evaluate(e => e.tagName);
    const cls = await el.evaluate(e => e.className.toString().substring(0, 80));
    const text = await el.innerText().catch(() => '');
    console.log(`  ${tag} y=${Math.round(box.y)} class="${cls}" text="${text.substring(0, 50)}"`);
  }
  
  // Try finding the Industry field via the "Select..." near it
  // There might be a custom dropdown - let me click in the area below "Industry" label
  console.log('\n=== Clicking Industry area ===');
  if (industryLabel) {
    const box = await industryLabel.boundingBox();
    // Click 40px below the label (where the dropdown control should be)
    await page.mouse.click(box.x + 100, box.y + 40);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '.synder-state/onboard-industry-open.png' });
    
    // Check for any popover/menu that appeared
    const menus = await page.$$('[class*="menu"], [class*="popover"], [class*="dropdown"], [role="listbox"], [role="menu"]');
    console.log('Menus/popovers:', menus.length);
    for (const m of menus) {
      const text = await m.innerText().catch(() => '');
      console.log('  Menu text:', text.substring(0, 500));
    }
  }
  
  // Revenue - check if it appears conditionally
  console.log('\n=== Revenue field ===');
  const revLabel = await page.$('text=revenue');
  console.log('Revenue visible:', !!revLabel);
  
  // Also find the business name input more precisely
  console.log('\n=== Business name input ===');
  const inputs = await page.$$('input[type="text"], input:not([type])');
  for (const inp of inputs) {
    const box = await inp.boundingBox();
    if (!box) continue;
    const placeholder = await inp.getAttribute('placeholder') || '';
    const name = await inp.getAttribute('name') || '';
    const value = await inp.inputValue();
    console.log(`  Input y=${Math.round(box.y)} name="${name}" placeholder="${placeholder}" value="${value}"`);
  }
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
