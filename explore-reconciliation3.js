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

  // 1. Click "Start reconciling" and see what happens
  console.log('=== CLICKING START RECONCILING ===');
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  
  const startBtn = page.locator('button, a').filter({ hasText: /start reconcil/i }).first();
  if (await startBtn.count() > 0) {
    console.log('Found "Start reconciling" button, clicking...');
    await startBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SHOTS, 'recon-04-after-start.png'), fullPage: false });
    await page.screenshot({ path: path.join(SHOTS, 'recon-04b-after-start-full.png'), fullPage: true });
    
    console.log('URL after click:', page.url());
    
    const bodyText = await page.locator('body').textContent();
    console.log('Page content after click (first 3000):', bodyText?.substring(0, 3000));
    
    const buttons = await page.locator('button, [role="button"]').allTextContents();
    console.log('Buttons:', buttons.map(b => b.trim()).filter(b => b).join(' | '));
    
    // Check for modals
    const modals = await page.locator('[class*="modal"], [class*="dialog"], [role="dialog"]').count();
    console.log('Modals on page:', modals);
    
    // Check for steps/wizard
    const steps = await page.locator('[class*="step"], [class*="wizard"], [class*="progress"]').allTextContents();
    console.log('Step indicators:', steps.map(s => s.trim()).filter(s => s).join(' | '));
  }

  // 2. Expand the FAQ items
  console.log('\n=== FAQ CONTENT ===');
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  
  // Click "How does reconciliation work?"
  const faq1 = page.locator('text=How does reconciliation work?').first();
  if (await faq1.count() > 0) {
    await faq1.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SHOTS, 'recon-05-faq1-open.png'), fullPage: true });
    const faqContent1 = await page.locator('body').textContent();
    // Find the FAQ answer text
    const match1 = faqContent1?.match(/How does reconciliation work\?(.*?)(?:What files|$)/s);
    console.log('FAQ 1 answer:', match1?.[1]?.trim().substring(0, 500));
  }

  // Click "What files can I upload?"
  const faq2 = page.locator('text=What files can I upload?').first();
  if (await faq2.count() > 0) {
    await faq2.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SHOTS, 'recon-05b-faq2-open.png'), fullPage: true });
    const faqContent2 = await page.locator('body').textContent();
    const match2 = faqContent2?.match(/What files can I upload\?(.*?)(?:About|$)/s);
    console.log('FAQ 2 answer:', match2?.[1]?.trim().substring(0, 500));
  }

  // 3. Check Balance Reconciliation dropdown
  console.log('\n=== BALANCE RECON DROPDOWN ===');
  await page.goto('https://demo.synderapp.com/accounting/public/reconciliation/index.html', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  
  const dropdown = page.locator('[class*="select"], select, [role="combobox"], [role="listbox"]').first();
  if (await dropdown.count() > 0) {
    await dropdown.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SHOTS, 'recon-06-bal-dropdown-open.png'), fullPage: false });
    
    const options = await page.locator('[class*="option"], [role="option"], option').allTextContents();
    console.log('Dropdown options:', options.map(o => o.trim()).filter(o => o).join(' | '));
  }

  await browser.close();
  console.log('\nDone!');
})();
