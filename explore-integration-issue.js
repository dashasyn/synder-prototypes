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

  // ===== INVESTIGATE INTEGRATION DROPDOWN EMPTY STATE =====
  console.log('=== INVESTIGATING INTEGRATION DROPDOWN ===');

  // Intercept network calls to see what the integration API returns
  const apiCalls = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('api') || url.includes('integration') || url.includes('reconcil')) {
      try {
        const status = response.status();
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('json')) {
          const body = await response.json().catch(() => null);
          apiCalls.push({ url, status, body: JSON.stringify(body).substring(0, 500) });
        } else {
          apiCalls.push({ url, status, body: '[non-JSON]' });
        }
      } catch (e) {}
    }
  });

  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation/create', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  console.log('\nAPI calls made:');
  apiCalls.forEach(c => console.log(`  ${c.status} ${c.url}\n    ${c.body.substring(0, 200)}`));

  // Try clicking the Integration dropdown and capture any new API calls
  const preClickCallCount = apiCalls.length;
  const integrationDropdown = page.locator('.MuiDialog-root [class*="css-"][class*="placeholder"]').last();
  if (await integrationDropdown.count() > 0) {
    await integrationDropdown.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SHOTS, 'integ-01-dropdown-open.png'), fullPage: false });
    
    // Check if any options appeared
    const options = await page.locator('[class*="menu"], [class*="option"], [role="option"], [role="listbox"]').allTextContents();
    console.log('\nOptions after click:', options.map(o => o.trim()).filter(o => o).join(' | '));
    
    // Check the DOM for the menu
    const menuHTML = await page.evaluate(() => {
      const menu = document.querySelector('[class*="css-"][class*="menu"]');
      return menu ? menu.textContent : 'NO MENU FOUND';
    });
    console.log('Menu content:', menuHTML);
    
    // New API calls
    const newCalls = apiCalls.slice(preClickCallCount);
    if (newCalls.length > 0) {
      console.log('\nNew API calls after dropdown click:');
      newCalls.forEach(c => console.log(`  ${c.status} ${c.url}\n    ${c.body.substring(0, 300)}`));
    }
  }

  // ===== CHECK WHAT INTEGRATIONS ARE AVAILABLE IN THE ACCOUNT =====
  console.log('\n\n=== CHECKING INTEGRATIONS / CONNECTIONS ===');
  await page.goto('https://demo.synderapp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Look for connections/integrations page
  const integLinks = await page.locator('a').filter({ hasText: /connect|integration|channel|platform/i }).all();
  console.log(`Integration-related links: ${integLinks.length}`);
  for (const link of integLinks.slice(0, 10)) {
    const text = await link.textContent();
    const href = await link.getAttribute('href');
    console.log(`  "${text?.trim()}" -> ${href}`);
  }

  // Navigate to settings/connections
  const settingsLink = page.locator('a').filter({ hasText: /settings/i }).first();
  if (await settingsLink.count() > 0) {
    await settingsLink.click();
    await page.waitForTimeout(2000);
    console.log('Settings URL:', page.url());
    await page.screenshot({ path: path.join(SHOTS, 'integ-02-settings.png'), fullPage: false });
  }

  // ===== CHECK THE COMPLETED RECONCILIATION EXPERIENCE =====
  console.log('\n\n=== WHAT DOES A COMPLETED RECONCILIATION LOOK LIKE? ===');
  // Navigate to the list with wildcard to find existing ones
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Check if there are any existing reconciliations in a list
  const tableRows = await page.locator('tr, [class*="row"], [class*="Row"]').count();
  console.log(`Table rows found: ${tableRows}`);
  
  const listItems = await page.locator('[class*="list-item"], [class*="ListItem"]').count();
  console.log(`List items: ${listItems}`);
  
  // Full body text
  const bodyText = await page.locator('[class*="main-content"]').first().textContent().catch(() => '');
  console.log('Main content:', bodyText?.trim().substring(0, 1000));

  // ===== CHECK HOW "TRANSACTION VERIFICATION" DIFFERS FROM RECONCILIATION =====
  console.log('\n\n=== TRANSACTION VERIFICATION (RELATED FEATURE) ===');
  await page.goto('https://demo.synderapp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  
  const txVerifLink = page.locator('a').filter({ hasText: /transaction verification/i }).first();
  if (await txVerifLink.count() > 0) {
    const href = await txVerifLink.getAttribute('href');
    console.log('Transaction Verification URL:', href);
    await page.goto(href || '', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SHOTS, 'integ-03-tx-verification.png'), fullPage: false });
    
    const bodyText2 = await page.locator('[class*="main-content"]').first().textContent().catch(() => '');
    console.log('TX Verification content:', bodyText2?.trim().substring(0, 500));
    
    const buttons = await page.locator('button, [role="button"]').allTextContents();
    console.log('Buttons:', buttons.map(b => b.trim()).filter(b => b).join(' | '));
  }

  // ===== FINAL: WHAT HAPPENS AFTER START MATCHING WHEN INTEGRATION IS EMPTY? =====
  console.log('\n\n=== START MATCHING BEHAVIOR WITH EMPTY INTEGRATION ===');
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation/create', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Fill dates only
  const dateInputs = await page.locator('.MuiDialog-root input').all();
  if (dateInputs.length >= 2) {
    await dateInputs[0].click({ force: true });
    await page.waitForTimeout(500);
    const day1 = page.locator('.MuiDialog-root [role="gridcell"]').filter({ hasText: /^1$/ }).first();
    if (await day1.count() > 0) {
      await day1.click();
      await page.waitForTimeout(500);
    }
    await dateInputs[1].click({ force: true });
    await page.waitForTimeout(500);
    const day10 = page.locator('.MuiDialog-root [role="gridcell"]').filter({ hasText: /^10$/ }).first();
    if (await day10.count() > 0) {
      await day10.click();
      await page.waitForTimeout(500);
    }
  }

  // Try to select automation mode
  const autoSelect = page.locator('.MuiDialog-root [class*="placeholder"]').first();
  if (await autoSelect.count() > 0) {
    await autoSelect.click({ force: true });
    await page.waitForTimeout(500);
    const automatedOpt = page.locator('[class*="option"]').filter({ hasText: 'Automated' }).first();
    if (await automatedOpt.count() > 0) {
      await automatedOpt.click();
      await page.waitForTimeout(500);
    }
  }
  
  // Take screenshot of state with automation mode selected but integration empty
  await page.screenshot({ path: path.join(SHOTS, 'integ-04-partial-fill.png'), fullPage: false });
  
  // Check if Start matching is disabled or enabled
  const startBtn = page.locator('span, button').filter({ hasText: /start matching/i }).first();
  const isDisabled = await startBtn.getAttribute('disabled');
  const btnClass = await startBtn.getAttribute('class');
  console.log(`Start matching button disabled: ${isDisabled}`);
  console.log(`Start matching button class: ${btnClass?.substring(0, 200)}`);

  await browser.close();
  console.log('\nDone!');
})();
