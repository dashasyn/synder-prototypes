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

  // ===== PART 1: Validation errors =====
  console.log('=== VALIDATION ERRORS ===');
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation/create', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Click Start matching without filling anything
  const startBtn = page.locator('button, span').filter({ hasText: /Start matching/i }).first();
  await startBtn.click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOTS, 'deep-07-validation-empty.png'), fullPage: false });
  
  // Check for validation errors
  const allTextAfterClick = await page.evaluate(() => {
    const dialog = document.querySelector('.MuiDialog-root') || document.body;
    return dialog.textContent?.substring(0, 3000);
  });
  console.log('Content after empty submit:', allTextAfterClick?.substring(0, 1500));

  // Check for any toast/snackbar notifications
  const toasts = await page.locator('[class*="toast"], [class*="Toast"], [class*="snackbar"], [class*="Snackbar"], [class*="notification"]').allTextContents();
  console.log('Toast/snackbar messages:', toasts.map(t => t.trim()).filter(t => t).join(' | '));

  // ===== PART 2: Fill the form partially =====
  console.log('\n=== FILLING FORM ===');
  
  // Click first date input and pick a date
  const dateInput1 = page.locator('.MuiDialog-root input').first();
  await dateInput1.click({ force: true });
  await page.waitForTimeout(1000);
  
  // Click on March 1 in the calendar
  const day1 = page.locator('.MuiDialog-root [role="gridcell"]').filter({ hasText: /^1$/ }).first();
  if (await day1.count() > 0) {
    await day1.click();
    await page.waitForTimeout(500);
  }
  
  // Click second date input
  const dateInput2 = page.locator('.MuiDialog-root input').nth(1);
  await dateInput2.click({ force: true });
  await page.waitForTimeout(1000);
  
  // Click on March 10
  const day10 = page.locator('.MuiDialog-root [role="gridcell"]').filter({ hasText: /^10$/ }).first();
  if (await day10.count() > 0) {
    await day10.click();
    await page.waitForTimeout(500);
  }
  
  await page.screenshot({ path: path.join(SHOTS, 'deep-08-dates-set.png'), fullPage: false });
  console.log('Dates set');

  // Select Automation mode
  const autoModeSelect = page.locator('.MuiDialog-root [class*="css-"][class*="placeholder"]').first();
  if (await autoModeSelect.count() > 0) {
    await autoModeSelect.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Pick Automated
    const automatedOption = page.locator('[class*="option"]').filter({ hasText: 'Automated' }).first();
    if (await automatedOption.count() > 0) {
      await automatedOption.click();
      await page.waitForTimeout(500);
    }
  }
  await page.screenshot({ path: path.join(SHOTS, 'deep-09-auto-selected.png'), fullPage: false });
  console.log('Automation mode set');

  // Select Integration
  const integrationSelect = page.locator('.MuiDialog-root [class*="css-"][class*="placeholder"]').first();
  if (await integrationSelect.count() > 0) {
    await integrationSelect.click({ force: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SHOTS, 'deep-10-integration-dropdown.png'), fullPage: false });
    
    // Get all options
    const options = await page.locator('[class*="option"]').allTextContents();
    console.log('Integration options:', options.map(o => o.trim()).filter(o => o).join(' | '));
    
    // Pick first option
    const firstOption = page.locator('[class*="option"]').first();
    if (await firstOption.count() > 0) {
      await firstOption.click();
      await page.waitForTimeout(500);
    }
  }
  await page.screenshot({ path: path.join(SHOTS, 'deep-11-all-filled.png'), fullPage: false });
  console.log('All fields filled');

  // Now try Start matching
  const startBtnFilled = page.locator('span').filter({ hasText: /Start matching/i }).first();
  await startBtnFilled.click({ force: true });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(SHOTS, 'deep-12-after-start-matching.png'), fullPage: false });
  console.log('URL after start matching:', page.url());
  
  // Check what appeared
  const bodyText = await page.locator('body').textContent();
  console.log('Page content after matching (first 2000):', bodyText?.substring(0, 2000));

  // Wait more for loading
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(SHOTS, 'deep-13-after-wait.png'), fullPage: false });
  console.log('URL after wait:', page.url());

  // ===== PART 3: Tablet and mobile =====
  console.log('\n=== RESPONSIVE VIEWS ===');
  
  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOTS, 'deep-14-tablet.png'), fullPage: false });
  
  // Check if sidebar collapses
  const sidebarVisible = await page.locator('[class*="sidebar"]').first().isVisible().catch(() => false);
  console.log('Sidebar visible on tablet:', sidebarVisible);

  // Mobile
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOTS, 'deep-15-mobile.png'), fullPage: false });

  // Check create flow on mobile
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation/create', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SHOTS, 'deep-16-mobile-create.png'), fullPage: false });

  // ===== PART 4: Check what other pages in the reconciliation section look like =====
  console.log('\n=== OTHER RECONCILIATION PAGES ===');
  await page.setViewportSize({ width: 1440, height: 900 });
  
  // Manual Journals
  await page.goto('https://demo.synderapp.com/accounting/public/manualJournals/index.html', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOTS, 'deep-17-manual-journals.png'), fullPage: false });
  console.log('Manual Journals page captured');
  
  // Chart of accounts
  await page.goto('https://demo.synderapp.com/accounting/public/chartOfAccounts/index.html', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOTS, 'deep-18-chart-accounts.png'), fullPage: false });
  console.log('Chart of Accounts page captured');

  await browser.close();
  console.log('\nDone!');
})();
