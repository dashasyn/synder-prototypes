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

  // ===== PART 1: Deep dive into create flow modal =====
  console.log('=== CREATE FLOW MODAL DEEP DIVE ===');
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation/create', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Get the full modal HTML structure
  const modalHTML = await page.evaluate(() => {
    const dialog = document.querySelector('[role="presentation"]') || document.querySelector('.MuiDialog-root');
    if (!dialog) return 'NO DIALOG FOUND';
    // Get the text content in a structured way
    const elements = dialog.querySelectorAll('*');
    const result = [];
    for (const el of elements) {
      const tag = el.tagName.toLowerCase();
      const text = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 ? el.textContent.trim() : '';
      const cls = el.className?.toString()?.substring(0, 80) || '';
      const role = el.getAttribute('role') || '';
      if (text) {
        result.push({ tag, text, cls: cls.substring(0, 60), role });
      }
    }
    return JSON.stringify(result.slice(0, 80), null, 2);
  });
  console.log('Modal structure:', modalHTML.substring(0, 3000));

  // Take detailed screenshots of the modal
  const dialog = page.locator('.MuiDialog-root, [role="presentation"]').first();
  await page.screenshot({ path: path.join(SHOTS, 'deep-01-modal.png'), fullPage: false });

  // Try to interact with the modal using force:true to bypass intercepted clicks
  // First find the date inputs within the dialog
  const dialogInputs = await page.locator('.MuiDialog-root input').all();
  console.log(`\nFound ${dialogInputs.length} inputs in modal`);
  
  for (let i = 0; i < dialogInputs.length; i++) {
    const box = await dialogInputs[i].boundingBox();
    const val = await dialogInputs[i].inputValue().catch(() => '');
    const placeholder = await dialogInputs[i].getAttribute('placeholder') || '';
    const id = await dialogInputs[i].getAttribute('id') || '';
    console.log(`Modal input ${i}: id="${id}" placeholder="${placeholder}" value="${val}" bounds=${JSON.stringify(box)}`);
  }

  // Try clicking date input with force
  if (dialogInputs.length > 0) {
    await dialogInputs[0].click({ force: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SHOTS, 'deep-02-date-clicked.png'), fullPage: false });
  }

  // Check the date picker UI
  const datePickerVisible = await page.locator('.MuiCalendarPicker-root, .MuiDateCalendar-root, [class*="calendar"], [class*="Calendar"], [class*="datepicker"], [class*="DatePicker"]').count();
  console.log(`\nDate picker visible: ${datePickerVisible > 0}`);

  // Try finding react-select components (for integration/automation dropdowns)
  const reactSelects = await page.locator('[class*="css-"][class*="control"], [class*="react-select"]').all();
  console.log(`\nReact-select components: ${reactSelects.length}`);
  
  for (let i = 0; i < reactSelects.length; i++) {
    const text = await reactSelects[i].textContent().catch(() => '');
    console.log(`  Select ${i}: "${text?.trim().substring(0, 100)}"`);
  }

  // Hover over info/tooltip icons
  const svgInDialog = await page.locator('.MuiDialog-root svg').all();
  console.log(`\nSVG icons in dialog: ${svgInDialog.length}`);
  
  for (let i = 0; i < svgInDialog.length; i++) {
    const box = await svgInDialog[i].boundingBox();
    if (box && box.width > 10 && box.width < 30) {
      await svgInDialog[i].hover({ force: true });
      await page.waitForTimeout(800);
      
      const tooltipText = await page.locator('[role="tooltip"], [class*="Tooltip"], .MuiTooltip-tooltip').first().textContent().catch(() => null);
      if (tooltipText) {
        console.log(`Tooltip on SVG ${i}: "${tooltipText.trim()}"`);
        await page.screenshot({ path: path.join(SHOTS, `deep-03-tooltip-${i}.png`), fullPage: false });
      }
    }
  }

  // Click "Start matching" without filling form to see validation
  const startMatchingBtn = page.locator('.MuiDialog-root button').filter({ hasText: /start matching/i }).first();
  if (await startMatchingBtn.count() > 0) {
    console.log('\nClicking Start matching without filling form...');
    await startMatchingBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SHOTS, 'deep-04-validation.png'), fullPage: false });
    
    // Check for validation errors
    const errorTexts = await page.locator('.MuiDialog-root [class*="error"], .MuiDialog-root [class*="Error"], .MuiFormHelperText-root').allTextContents();
    console.log('Validation errors:', errorTexts.map(e => e.trim()).filter(e => e).join(' | '));
    
    const url = page.url();
    console.log('URL:', url);
  }

  // ===== PART 2: Check what the page looks like for different states =====
  console.log('\n\n=== WHAT DOES A COMPLETED RECONCILIATION LOOK LIKE? ===');
  // Check if there are any completed reconciliations already
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Check for any list/table of reconciliations
  const tables = await page.locator('table, [class*="table"], [class*="Table"], [class*="list"], [class*="List"]').count();
  console.log(`Tables/lists on page: ${tables}`);
  
  const bodyText = await page.locator('body').textContent();
  const hasEmptyState = bodyText?.includes('Start reconciling') || bodyText?.includes('Reconcile transactions');
  console.log(`Shows empty state: ${hasEmptyState}`);

  // ===== PART 3: Check responsive / mobile view =====
  console.log('\n\n=== MOBILE VIEW ===');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOTS, 'deep-05-tablet.png'), fullPage: false });
  
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('https://demo.synderapp.com/ui/transactionReconciliation', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOTS, 'deep-06-mobile.png'), fullPage: false });

  // ===== PART 4: Check the page for user without any integrations =====
  console.log('\n\n=== NAVIGATION INFORMATION ARCHITECTURE ===');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('https://demo.synderapp.com/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  
  // Get full sidebar structure
  const sidebarItems = await page.evaluate(() => {
    const items = document.querySelectorAll('[class*="sidebar"] a, nav a');
    return Array.from(items).map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href'),
      isActive: a.className.includes('active') || a.className.includes('selected')
    })).filter(i => i.text);
  });
  console.log('Full sidebar navigation:');
  sidebarItems.forEach(item => console.log(`  ${item.isActive ? '→ ' : '  '}${item.text} (${item.href})`));

  await browser.close();
  console.log('\nDone!');
})();
