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

  // ===== TX VERIFICATION - FULL UX ANALYSIS =====
  console.log('=== TRANSACTION VERIFICATION UX ===');
  await page.goto('https://demo.synderapp.com/verification/importHistory', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: path.join(SHOTS, 'txv-01-page.png'), fullPage: false });
  await page.screenshot({ path: path.join(SHOTS, 'txv-01b-full.png'), fullPage: true });

  // Get full page text
  const bodyText = await page.locator('body').textContent();
  console.log('TX Verification content:', bodyText?.trim().substring(0, 2000));
  
  const buttons = await page.locator('button, [role="button"]').allTextContents();
  console.log('Buttons:', buttons.map(b => b.trim()).filter(b => b).join(' | '));

  const headings = await page.locator('h1, h2, h3, h4, [class*="h1"], [class*="h2"]').allTextContents();
  console.log('Headings:', headings.map(h => h.trim()).filter(h => h).join(' | '));

  // Click "New verification" to see its create flow
  const newVerifBtn = page.locator('button').filter({ hasText: /new verification/i }).first();
  if (await newVerifBtn.count() > 0) {
    await newVerifBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SHOTS, 'txv-02-new-verif.png'), fullPage: false });
    console.log('\nNew verification URL:', page.url());
    
    // Check what's in the new verification flow
    const content = await page.locator('body').textContent();
    console.log('New verification content:', content?.trim().substring(0, 2000));
    
    const btns = await page.locator('button').allTextContents();
    console.log('Buttons:', btns.map(b => b.trim()).filter(b => b).join(' | '));
    
    await page.screenshot({ path: path.join(SHOTS, 'txv-02b-new-full.png'), fullPage: true });
  }

  // ===== COMPLETE THE TRANSACTION RECONCILIATION FLOW =====
  console.log('\n\n=== COMPLETING TRANSACTION RECONCILIATION ===');
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation/create', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Take screenshot of initial
  await page.screenshot({ path: path.join(SHOTS, 'flow2-01-initial.png'), fullPage: false });
  
  // Fill date range - use keyboard approach
  const dateInputs = await page.locator('.MuiDialog-root input').all();
  console.log(`Found ${dateInputs.length} inputs`);
  
  // Click on date range - try using the actual date inputs
  if (dateInputs.length >= 2) {
    // First date
    await dateInputs[0].click({ force: true });
    await page.waitForTimeout(800);
    
    // Check if calendar appeared
    const calendarVisible = await page.locator('[role="dialog"] [role="grid"], .MuiCalendarPicker-root, [class*="calendar"]').count();
    console.log('Calendar visible:', calendarVisible > 0);
    
    if (calendarVisible > 0) {
      // Click on day 1
      const cells = await page.locator('[role="gridcell"]:not([disabled])').all();
      console.log(`Available date cells: ${cells.length}`);
      if (cells.length > 0) {
        await cells[0].click();
        await page.waitForTimeout(500);
      }
    }
    
    // Second date
    await dateInputs[1].click({ force: true });
    await page.waitForTimeout(800);
    if (calendarVisible > 0) {
      const cells2 = await page.locator('[role="gridcell"]:not([disabled])').all();
      if (cells2.length > 7) {
        await cells2[9].click(); // ~10th available date
        await page.waitForTimeout(500);
      }
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: path.join(SHOTS, 'flow2-02-dates.png'), fullPage: false });

  // Select Automation Mode
  const allPlaceholders = await page.locator('.MuiDialog-root [class*="placeholder"]').all();
  console.log(`\nPlaceholder dropdowns: ${allPlaceholders.length}`);
  
  if (allPlaceholders.length > 0) {
    await allPlaceholders[0].click({ force: true });
    await page.waitForTimeout(800);
    
    const options = await page.locator('[class*="option"]').all();
    console.log(`Automation options: ${options.length}`);
    
    if (options.length > 0) {
      await options[0].click(); // Automated
      await page.waitForTimeout(500);
    }
  }

  await page.screenshot({ path: path.join(SHOTS, 'flow2-03-auto.png'), fullPage: false });

  // Select Integration
  const remainingPlaceholders = await page.locator('.MuiDialog-root [class*="placeholder"]').all();
  if (remainingPlaceholders.length > 0) {
    await remainingPlaceholders[0].click({ force: true });
    await page.waitForTimeout(800);
    
    const intOptions = await page.locator('[class*="option"]').all();
    console.log(`Integration options: ${intOptions.length}`);
    for (const opt of intOptions) {
      console.log('  - ' + await opt.textContent());
    }
    
    if (intOptions.length > 0) {
      await intOptions[0].click(); // First integration
      await page.waitForTimeout(500);
    }
  }

  await page.screenshot({ path: path.join(SHOTS, 'flow2-04-filled.png'), fullPage: false });
  console.log('\nForm filled - now clicking Start matching');

  // Click Start matching
  const startBtn = page.locator('button[class*="MuiButton"]').filter({ hasText: /start matching/i }).first();
  const startSpan = page.locator('span').filter({ hasText: /^Start matching$/ }).first();
  
  let clicked = false;
  if (await startBtn.count() > 0) {
    await startBtn.click({ force: true });
    clicked = true;
  } else if (await startSpan.count() > 0) {
    await startSpan.click({ force: true });
    clicked = true;
  }
  
  console.log('Clicked Start matching:', clicked);
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(SHOTS, 'flow2-05-processing.png'), fullPage: false });
  console.log('URL after start:', page.url());
  
  // Wait more and capture final state
  await page.waitForTimeout(8000);
  await page.screenshot({ path: path.join(SHOTS, 'flow2-06-result.png'), fullPage: false });
  await page.screenshot({ path: path.join(SHOTS, 'flow2-06b-result-full.png'), fullPage: true });
  
  const finalUrl = page.url();
  console.log('Final URL:', finalUrl);
  
  const finalContent = await page.locator('body').textContent();
  console.log('Final content:', finalContent?.trim().substring(0, 2000));
  
  const finalButtons = await page.locator('button').allTextContents();
  console.log('Final buttons:', finalButtons.map(b => b.trim()).filter(b => b).join(' | '));

  await browser.close();
  console.log('\nDone!');
})();
