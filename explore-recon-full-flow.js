const { chromium } = require('playwright');
const path = require('path');

const STATE_PATH = path.join(__dirname, '.synder-state', 'storage-state.json');
const SHOTS = path.join(__dirname, '.synder-state');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STATE_PATH,
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Go to create page
  console.log('=== FULL CREATE FLOW ===');
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation/create', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Screenshot initial state
  await page.screenshot({ path: path.join(SHOTS, 'flow-create-01-initial.png'), fullPage: false });

  // Get all the form structure in detail
  const html = await page.content();
  
  // Find and interact with date fields
  const dateInputs = await page.locator('input[type="text"]').all();
  console.log(`Found ${dateInputs.length} text inputs`);
  
  // Try to click on the first date input
  for (let i = 0; i < dateInputs.length; i++) {
    const box = await dateInputs[i].boundingBox();
    if (box) {
      console.log(`Input ${i}: x=${box.x} y=${box.y} w=${box.width} h=${box.height}`);
    }
  }

  // Look for date picker
  const dateLabels = await page.locator('label, [class*="label"], [class*="Label"]').allTextContents();
  console.log('Labels:', dateLabels.map(l => l.trim()).filter(l => l).join(' | '));

  // Get all visible text in the main content area to understand form structure
  const allText = await page.evaluate(() => {
    const main = document.querySelector('[class*="main-content"]') || document.querySelector('main') || document.body;
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, null);
    const texts = [];
    let node;
    while (node = walker.nextNode()) {
      const t = node.textContent.trim();
      if (t && t.length > 1 && !t.startsWith('{') && !t.startsWith('function')) {
        texts.push(t);
      }
    }
    return texts.slice(0, 100);
  });
  console.log('\nAll visible text in form area:');
  allText.forEach(t => console.log(`  "${t}"`));

  // Try to set date range - click first date input
  if (dateInputs.length >= 2) {
    // Click first input to open date picker
    await dateInputs[0].click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SHOTS, 'flow-create-02-date-picker.png'), fullPage: false });
    
    // Type a date
    await dateInputs[0].fill('01/01/2026');
    await page.waitForTimeout(500);
    await dateInputs[1].click();
    await page.waitForTimeout(500);
    await dateInputs[1].fill('03/01/2026');
    await page.waitForTimeout(500);
    
    // Press escape to close any date picker
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  
  // Now try to open Automation mode dropdown
  // First find it by looking for the select components
  const selects = await page.locator('[class*="css-"]').filter({ hasText: /Automated|Standard|Manual/ }).first();
  if (await selects.count() > 0) {
    await selects.click();
    await page.waitForTimeout(500);
    // Select "Standard"
    const standardOption = page.locator('[class*="option"]').filter({ hasText: 'Standard' }).first();
    if (await standardOption.count() > 0) {
      await standardOption.click();
      await page.waitForTimeout(500);
    }
  }
  
  await page.screenshot({ path: path.join(SHOTS, 'flow-create-03-filled.png'), fullPage: false });

  // Check if Integration dropdown has options
  const integrationDropdowns = await page.locator('[class*="select"], [class*="Select"]').all();
  console.log(`\nFound ${integrationDropdowns.length} select-like elements`);
  
  // Try to find and click the integration dropdown
  // Look for any dropdown that doesn't have Automation mode options
  const allDropdowns = await page.locator('[class*="css-"][role="combobox"], [class*="css-"][class*="control"]').all();
  console.log(`Found ${allDropdowns.length} combobox/control elements`);
  
  for (let i = 0; i < allDropdowns.length; i++) {
    const text = await allDropdowns[i].textContent().catch(() => '');
    console.log(`Dropdown ${i}: "${text?.trim().substring(0, 100)}"`);
  }

  // Try clicking on "Start matching" to see what happens
  const startBtn = page.locator('button, a').filter({ hasText: /start matching/i }).first();
  if (await startBtn.count() > 0) {
    console.log('\nClicking "Start matching"...');
    await startBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SHOTS, 'flow-create-04-after-start.png'), fullPage: false });
    
    // Check for error messages
    const errors = await page.locator('[class*="error"], [class*="Error"], [class*="alert"], [class*="Alert"]').allTextContents();
    console.log('Errors:', errors.map(e => e.trim()).filter(e => e).join(' | '));
    
    // Check for validation messages
    const validations = await page.locator('[class*="helper"], [class*="Helper"], [class*="validation"]').allTextContents();
    console.log('Validations:', validations.map(v => v.trim()).filter(v => v).join(' | '));
    
    console.log('URL after start:', page.url());
  }

  // Now navigate to hover over the info icon for Automation mode tooltip
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation/create', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Find SVG icons that might be info/tooltip triggers
  const svgs = await page.locator('svg').all();
  console.log(`\nFound ${svgs.length} SVG elements`);
  
  // Try hovering each SVG to find tooltips
  for (let i = 0; i < Math.min(svgs.length, 20); i++) {
    const box = await svgs[i].boundingBox();
    if (box && box.width < 30 && box.width > 10) { // Small icons
      await svgs[i].hover();
      await page.waitForTimeout(800);
      const tooltip = await page.locator('[class*="tooltip"], [class*="Tooltip"], [role="tooltip"], [class*="popper"], [class*="Popper"]').first();
      if (await tooltip.count() > 0) {
        const tipText = await tooltip.textContent();
        console.log(`Tooltip found on SVG ${i}: "${tipText?.trim()}"`);
        await page.screenshot({ path: path.join(SHOTS, `flow-create-05-tooltip-${i}.png`), fullPage: false });
      }
    }
  }

  // Check what the close (X) button does
  const closeBtn = page.locator('[class*="close"], [aria-label*="close"], [aria-label*="Close"]').first();
  if (await closeBtn.count() > 0) {
    console.log('\nFound close button');
  }
  
  // Check if there's a back button or breadcrumb
  const backElements = await page.locator('[class*="back"], [class*="breadcrumb"], [class*="Back"]').allTextContents();
  console.log('Back/breadcrumb elements:', backElements.map(b => b.trim()).filter(b => b).join(' | '));

  await browser.close();
  console.log('\nDone!');
})();
