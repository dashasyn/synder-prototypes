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

  // Go to the create page directly
  console.log('=== EXPLORING RECONCILIATION CREATE FLOW ===');
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation/create', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Get all form elements and their states
  const allInputs = await page.locator('input, select, [role="combobox"]').all();
  for (const input of allInputs) {
    const type = await input.getAttribute('type');
    const name = await input.getAttribute('name');
    const placeholder = await input.getAttribute('placeholder');
    const value = await input.inputValue().catch(() => '');
    const label = await input.getAttribute('aria-label');
    console.log(`Input: type=${type} name=${name} placeholder=${placeholder} value=${value} label=${label}`);
  }

  // Try clicking on Automation mode dropdown
  const autoMode = page.locator('text=Automation mode').first();
  if (await autoMode.count() > 0) {
    // Find the nearest dropdown/select
    const autoDropdown = page.locator('[class*="select"], [class*="dropdown"]').filter({ has: page.locator('text=Automation mode') }).first();
    if (await autoDropdown.count() === 0) {
      // Try clicking near automation mode to open dropdown
      const autoSection = page.locator('div, span').filter({ hasText: /^Automation mode/ }).first();
      if (await autoSection.count() > 0) {
        const parentDiv = autoSection.locator('..').locator('[class*="select"], [role="combobox"], [role="button"]').first();
        if (await parentDiv.count() > 0) {
          await parentDiv.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: path.join(SHOTS, 'recon-07-automode-dropdown.png'), fullPage: false });
          const options = await page.locator('[class*="option"], [role="option"]').allTextContents();
          console.log('Automation mode options:', options.map(o => o.trim()).filter(o => o).join(' | '));
        }
      }
    }
  }

  // Try to hover over the info icon next to Automation mode
  const infoIcon = page.locator('[class*="info"], [class*="tooltip"], svg').filter({ has: page.locator('[class*="icon"]') });
  
  // Try clicking on Integration dropdown
  const integrationSection = page.locator('text=Integration').first();
  console.log('\nIntegration section found:', await integrationSection.count() > 0);
  
  // Get all dropdowns/selects on page
  const selects = await page.locator('[class*="MuiSelect"], [class*="ant-select"], select, [role="combobox"], [role="listbox"]').all();
  console.log('\nAll selects/dropdowns count:', selects.length);
  for (let i = 0; i < selects.length; i++) {
    const text = await selects[i].textContent().catch(() => '');
    const cls = await selects[i].getAttribute('class').catch(() => '');
    console.log(`  Select ${i}: text="${text?.trim().substring(0, 100)}" class="${cls?.substring(0, 100)}"`);
  }

  // Take a closer look at the full HTML structure of the form
  const formHTML = await page.locator('[class*="content"], main').first().innerHTML().catch(() => '');
  // Extract key structural elements
  const labels = formHTML.match(/(?:label|Label|title|Title|heading)[^>]*>[^<]*/gi) || [];
  console.log('\nLabels found in HTML:', labels.slice(0, 20).join(' | '));

  // Screenshot the tooltip if we can find it
  const tooltips = await page.locator('[class*="tooltip"], [class*="Tooltip"], [data-tip]').all();
  console.log('\nTooltip elements:', tooltips.length);

  // Try hovering over various elements
  const infoElements = await page.locator('svg, [class*="icon"]').all();
  console.log('SVG/icon elements:', infoElements.length);

  // Get full visible text of the form area
  const mainArea = await page.locator('[class*="main-content"], [class*="content"]').first();
  if (await mainArea.count() > 0) {
    const mainText = await mainArea.textContent();
    console.log('\nMain content text:', mainText?.trim().substring(0, 2000));
  }

  await browser.close();
  console.log('\nDone!');
})();
