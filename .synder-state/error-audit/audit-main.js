/**
 * Synder Error Copy Audit - Comprehensive
 * Explores all sections, triggers validation errors, collects exact copy
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = '/home/ubuntu/.openclaw/workspace/.synder-state/error-audit';
const STORAGE_STATE = '/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json';
const BASE_URL = 'https://demo.synderapp.com';

const findings = [];
let screenshotCount = 0;

async function ss(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, name);
  await page.screenshot({ path: filepath, fullPage: false });
  screenshotCount++;
  return name;
}

async function ssFullPage(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, name);
  await page.screenshot({ path: filepath, fullPage: true });
  screenshotCount++;
  return name;
}

async function go(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2500);
  } catch(e) {
    console.log(`  [WARN] goto ${url} failed: ${e.message.substring(0, 60)}`);
  }
}

function addFinding(location, trigger, copy, type, screenshotFile, severity, uxNotes) {
  const finding = { location, trigger, copy, type, screenshot: screenshotFile, severity, uxNotes };
  findings.push(finding);
  console.log(`  ✓ [${severity.toUpperCase()}] ${type} | ${copy.substring(0, 70)}`);
}

// Collect all visible error/warning text on current page
async function collectErrors(page) {
  return page.evaluate(() => {
    const selectors = [
      '[class*="error"]', '[class*="Error"]',
      '[class*="warning"]', '[class*="Warning"]', 
      '[class*="alert"]', '[class*="Alert"]',
      '[class*="toast"]', '[class*="Toast"]',
      '[class*="snack"]', '[class*="Snack"]',
      '[class*="invalid"]', '[class*="Invalid"]',
      '[role="alert"]', '[aria-live="assertive"]',
      '[class*="helper"]', '.MuiFormHelperText-root',
      '[class*="validation"]', '[class*="Validation"]',
      '[class*="conflict"]', '[class*="Conflict"]',
      '[class*="banner"]', '[class*="Banner"]',
      'p.error', 'span.error', 'div.error',
      '[class*="required"]'
    ];
    const seen = new Set();
    const results = [];
    
    for (const sel of selectors) {
      try {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (!el.offsetParent && el.offsetHeight === 0) continue; // hidden
          const text = el.textContent?.trim();
          if (!text || text.length < 3 || text.length > 400) continue;
          
          // Skip if it's mostly a container of other found items
          const key = text.substring(0, 50);
          if (seen.has(key)) continue;
          seen.add(key);
          
          // Check if element is actually visible
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
          if (rect.width === 0 && rect.height === 0) continue;
          
          results.push({ selector: sel, text, tagName: el.tagName });
        }
      } catch(e) {}
    }
    return results;
  });
}

// Collect ALL tooltips/title attributes 
async function collectTooltips(page) {
  return page.evaluate(() => {
    const els = document.querySelectorAll('[title], [data-tooltip], [aria-label]');
    const results = [];
    for (const el of els) {
      const tooltip = el.getAttribute('title') || el.getAttribute('data-tooltip') || el.getAttribute('aria-label');
      if (tooltip && tooltip.length > 5 && tooltip.length < 300) {
        results.push({ tooltip, tagName: el.tagName, text: el.textContent?.trim().substring(0,30) });
      }
    }
    return results;
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE,
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  // ============================================================
  // SECTION 1: SETTINGS PAGE
  // ============================================================
  console.log('\n====== SECTION 1: SETTINGS ======');
  
  await go(page, `${BASE_URL}/company/settings`);
  await ss(page, 'err-settings-01-general.png');
  
  // Get settings page text
  const settingsText = await page.evaluate(() => document.body.innerText);
  console.log('Settings text:', settingsText.substring(0, 800));
  
  // Find all tabs
  const settingsTabs = await page.$$eval('[role="tab"], [class*="tab-"], [class*="Tab"]', 
    els => els.map(e => ({ text: e.textContent?.trim(), href: e.getAttribute('href') || e.getAttribute('data-tab') }))
  );
  console.log('Settings tabs:', JSON.stringify(settingsTabs));
  
  // Try toggling various settings
  const toggles = await page.$$('input[type="checkbox"], input[type="radio"], [role="switch"], [class*="toggle"], [class*="Toggle"]');
  console.log('Toggles found:', toggles.length);
  
  // Collect any existing errors/warnings on settings page
  const settingsErrors = await collectErrors(page);
  console.log('Settings page errors:', JSON.stringify(settingsErrors));
  for (const e of settingsErrors) {
    addFinding('Settings > General', 'Page load', e.text, 'inline', 'err-settings-01-general.png', 'warning', 'Visible on load');
  }

  // Look for auto-sync warning specifically
  const autoSyncText = await page.evaluate(() => {
    const body = document.body.innerText;
    return body.includes('auto-sync') || body.includes('Auto-sync') || body.includes('autoSync');
  });
  console.log('Auto-sync found on settings:', autoSyncText);

  // ============================================================
  // SECTION 1b: INTEGRATION SETTINGS - try each settings tab
  // ============================================================
  console.log('\n====== SECTION 1b: INTEGRATION SETTINGS ======');
  
  // Company settings for integration 5864 (Stripe / mzkt.by)
  await go(page, `${BASE_URL}/company/settings/5864`);
  await ss(page, 'err-integ-01-settings.png');
  
  const integSettingsText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
  console.log('Integration settings text:', integSettingsText);
  
  // Get tabs
  const integTabs = await page.$$('[role="tab"], [class*="tab-"], nav a, [class*="Tab"]');
  console.log('Integration tabs found:', integTabs.length);
  
  for (let i = 0; i < Math.min(integTabs.length, 15); i++) {
    try {
      const tabText = await integTabs[i].textContent();
      console.log(`  Tab ${i}: "${tabText?.trim()}"`);
    } catch(e) {}
  }
  
  // ============================================================
  // SECTION 1c: Try to force auto-sync conflict
  // ============================================================
  console.log('\n--- Trying auto-sync conflict ---');
  
  // Look for auto-import/auto-sync toggles on settings
  await go(page, `${BASE_URL}/company/settings`);
  
  // Find auto-import toggle
  const autoImportLabel = await page.$('label:has-text("Auto import"), label:has-text("auto-import"), label:has-text("Auto-import"), [class*="autoImport"]');
  if (autoImportLabel) {
    console.log('Found auto-import label');
    await autoImportLabel.click();
    await page.waitForTimeout(1000);
    await ss(page, 'err-settings-autoimport-toggle.png');
    const errorsAfterToggle = await collectErrors(page);
    console.log('Errors after auto-import toggle:', JSON.stringify(errorsAfterToggle));
  }

  // ============================================================
  // SECTION 2: TRANSACTIONS
  // ============================================================
  console.log('\n====== SECTION 2: TRANSACTIONS ======');
  
  await go(page, `${BASE_URL}/transaction/list`);
  await ss(page, 'err-tx-01-list.png');
  
  const txText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Transactions text:', txText);
  
  // Collect errors
  const txErrors = await collectErrors(page);
  if (txErrors.length > 0) {
    console.log('TX page errors:', JSON.stringify(txErrors));
    for (const e of txErrors) {
      addFinding('Transactions > List', 'Page load', e.text, 'inline', 'err-tx-01-list.png', 'warning', '');
    }
  }
  
  // Try selecting all and see bulk action errors
  const selectAllCb = await page.$('input[type="checkbox"][class*="select-all"], th input[type="checkbox"], [aria-label*="select all"]');
  if (selectAllCb) {
    await selectAllCb.click();
    await page.waitForTimeout(1000);
    await ss(page, 'err-tx-02-all-selected.png');
    
    // Look for bulk actions
    const bulkActions = await page.$('[class*="bulk"], [class*="Bulk"], button:has-text("Delete"), button:has-text("Rollback")');
    if (bulkActions) {
      await bulkActions.click();
      await page.waitForTimeout(1000);
      await ss(page, 'err-tx-03-bulk-action.png');
      const bulkErrors = await collectErrors(page);
      for (const e of bulkErrors) {
        addFinding('Transactions > Bulk Actions', 'Select all + bulk action', e.text, 'modal', 'err-tx-03-bulk-action.png', 'warning', '');
      }
      await page.keyboard.press('Escape');
    }
  }
  
  // Look for filter options and try filters that return no results
  const filterBtn = await page.$('button:has-text("Filter"), button[aria-label*="filter"], [class*="filter-btn"]');
  if (filterBtn) {
    await filterBtn.click();
    await page.waitForTimeout(1000);
    await ss(page, 'err-tx-04-filter-open.png');
    await page.keyboard.press('Escape');
  }

  // ============================================================
  // SECTION 3: TRANSACTION RECONCILIATION
  // ============================================================
  console.log('\n====== SECTION 3: RECONCILIATION ======');
  
  await go(page, `${BASE_URL}/ui/transactionReconciliation`);
  await ss(page, 'err-recon-01-page.png');
  
  const reconText = await page.evaluate(() => document.body.innerText.substring(0, 600));
  console.log('Reconciliation text:', reconText);
  
  // Collect visible errors/warnings
  const reconErrors = await collectErrors(page);
  for (const e of reconErrors) {
    addFinding('Transaction Reconciliation', 'Page load', e.text, 'banner', 'err-recon-01-page.png', 'warning', '');
    console.log('  Recon error:', e.text);
  }
  
  // Try to start reconciliation  
  const startBtn = await page.$('button:has-text("Start"), button:has-text("Begin"), button:has-text("Reconcile")');
  if (startBtn) {
    await startBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'err-recon-02-start-attempt.png');
    const reconModalErrors = await collectErrors(page);
    for (const e of reconModalErrors) {
      addFinding('Transaction Reconciliation > Start', 'Click Start Reconciliation', e.text, 'modal', 'err-recon-02-start-attempt.png', 'critical', '');
      console.log('  Recon start error:', e.text);
    }
    await page.keyboard.press('Escape');
  }

  // ============================================================
  // SECTION 4: SMART RULES
  // ============================================================
  console.log('\n====== SECTION 4: SMART RULES ======');
  
  await go(page, `${BASE_URL}/rules/rules`);
  await ss(page, 'err-rules-01-list.png');
  
  const rulesText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Rules text:', rulesText);
  
  // Find create button
  const createRuleBtn = await page.$('button:has-text("Create"), button:has-text("Add rule"), button:has-text("New rule"), button:has-text("+ Rule"), a:has-text("Create")');
  if (createRuleBtn) {
    console.log('Found create rule button');
    await createRuleBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'err-rules-02-create.png');
    
    const createText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Create rule text:', createText);
    
    // Try saving immediately without filling
    const saveBtn = await page.$('button:has-text("Save"), button:has-text("Create"), button[type="submit"], button:has-text("Done")');
    if (saveBtn) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
      await ss(page, 'err-rules-03-validation.png');
      
      const ruleValidation = await collectErrors(page);
      console.log('Rule validation errors:', JSON.stringify(ruleValidation));
      for (const e of ruleValidation) {
        addFinding('Smart Rules > Create Rule > Save', 'Submit empty rule form', e.text, 'validation', 'err-rules-03-validation.png', 'critical', '');
      }
    }
    
    // Navigate back
    const backBtn = await page.$('button:has-text("Cancel"), button:has-text("Back"), a:has-text("Back")');
    if (backBtn) await backBtn.click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  
  // Check rule executions page
  await go(page, `${BASE_URL}/rules/executions`);
  await ss(page, 'err-rules-executions.png');
  const execText = await page.evaluate(() => document.body.innerText.substring(0, 400));
  console.log('Executions text:', execText);

  // ============================================================
  // SECTION 5: INVOICING
  // ============================================================
  console.log('\n====== SECTION 5: INVOICING ======');
  
  await go(page, `${BASE_URL}/invoicing/list`);
  await ss(page, 'err-inv-01-list.png');
  
  const invText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Invoices text:', invText);
  
  // Look for create invoice button
  const createInvBtn = await page.$('button:has-text("Create"), button:has-text("New"), button:has-text("Add"), a:has-text("Create invoice")');
  if (createInvBtn) {
    await createInvBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'err-inv-02-create.png');
    
    const invCreateText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Create invoice text:', invCreateText);
    
    // Try saving empty
    const saveInvBtn = await page.$('button:has-text("Save"), button:has-text("Create"), button[type="submit"], button:has-text("Send")');
    if (saveInvBtn) {
      await saveInvBtn.click();
      await page.waitForTimeout(1500);
      await ss(page, 'err-inv-03-validation.png');
      
      const invValidation = await collectErrors(page);
      console.log('Invoice validation:', JSON.stringify(invValidation));
      for (const e of invValidation) {
        addFinding('Invoicing > Create Invoice > Save', 'Submit empty invoice form', e.text, 'validation', 'err-inv-03-validation.png', 'critical', '');
      }
    }
    
    await page.keyboard.press('Escape');
    const backBtn = await page.$('button:has-text("Cancel"), button:has-text("Back"), a[href*="invoic"]');
    if (backBtn) await backBtn.click();
  }

  // ============================================================
  // SECTION 6: PAYMENT LINKS (Checkout page)
  // ============================================================
  console.log('\n====== SECTION 6: PAYMENT LINKS ======');
  
  await go(page, `${BASE_URL}/checkoutPage/list`);
  await ss(page, 'err-checkout-01.png');
  const checkoutText = await page.evaluate(() => document.body.innerText.substring(0, 400));
  console.log('Checkout/payment links text:', checkoutText);

  // ============================================================
  // SECTION 7: REVENUE RECOGNITION
  // ============================================================
  console.log('\n====== SECTION 7: REVENUE RECOGNITION ======');
  
  await go(page, `${BASE_URL}/revenueRecognitionOnboarding/index`);
  await ss(page, 'err-revrec-01.png');
  const revrecText = await page.evaluate(() => document.body.innerText.substring(0, 600));
  console.log('RevRec text:', revrecText);
  
  const revrecErrors = await collectErrors(page);
  for (const e of revrecErrors) {
    addFinding('Revenue Recognition > Onboarding', 'Page load', e.text, 'banner', 'err-revrec-01.png', 'warning', '');
    console.log('  RevRec error:', e.text);
  }
  
  // Try any buttons
  const revrecBtn = await page.$('button:has-text("Connect"), button:has-text("Start"), button:has-text("Get started")');
  if (revrecBtn) {
    await revrecBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'err-revrec-02-action.png');
    const revrecActionErrors = await collectErrors(page);
    for (const e of revrecActionErrors) {
      addFinding('Revenue Recognition > Start', 'Click start/connect', e.text, 'modal', 'err-revrec-02-action.png', 'warning', '');
    }
    await page.keyboard.press('Escape');
  }

  // ============================================================
  // SECTION 8: REPORTING
  // ============================================================
  console.log('\n====== SECTION 8: REPORTING ======');
  
  for (const [slug, name] of [
    ['sales', 'Sales'],
    ['expenses', 'Expenses'],
    ['profitandloss', 'P&L'],
    ['balancesheet', 'Balance Sheet']
  ]) {
    await go(page, `${BASE_URL}/reporting/${slug}`);
    const fname = `err-report-${slug}.png`;
    await ss(page, fname);
    const txt = await page.evaluate(() => document.body.innerText.substring(0, 400));
    console.log(`${name} text:`, txt);
    
    const errors = await collectErrors(page);
    for (const e of errors) {
      addFinding(`Reporting > ${name}`, 'Page load', e.text, 'inline', fname, 'warning', '');
      console.log(`  ${name} error:`, e.text);
    }
  }

  // ============================================================
  // SECTION 9: IMPORT ACTIVITY LOG
  // ============================================================
  console.log('\n====== SECTION 9: IMPORT HISTORY ======');
  
  await go(page, `${BASE_URL}/imports/history`);
  await ss(page, 'err-imports-01.png');
  const importsText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Import history text:', importsText);
  
  // Try starting a historical import with bad dates
  const historicalBtn = await page.$('button:has-text("Historical"), button:has-text("Import"), a:has-text("Historical")');
  if (historicalBtn) {
    await historicalBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'err-imports-02-modal.png');
    
    // Try submitting with empty dates
    const importSubmitBtn = await page.$('button:has-text("Start"), button:has-text("Import"), button[type="submit"]');
    if (importSubmitBtn) {
      await importSubmitBtn.click();
      await page.waitForTimeout(1500);
      await ss(page, 'err-imports-03-validation.png');
      
      const importValidation = await collectErrors(page);
      console.log('Import validation:', JSON.stringify(importValidation));
      for (const e of importValidation) {
        addFinding('Import History > Start Import', 'Submit with empty date range', e.text, 'validation', 'err-imports-03-validation.png', 'critical', '');
      }
    }
    await page.keyboard.press('Escape');
  }

  // ============================================================
  // SECTION 10: TRANSACTION VERIFICATION
  // ============================================================
  console.log('\n====== SECTION 10: TX VERIFICATION ======');
  
  await go(page, `${BASE_URL}/verification/importHistory`);
  await ss(page, 'err-txverif-01.png');
  const txvText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('TX verification text:', txvText);
  
  const txvErrors = await collectErrors(page);
  for (const e of txvErrors) {
    addFinding('Transaction Verification', 'Page load', e.text, 'inline', 'err-txverif-01.png', 'warning', '');
    console.log('  TXV error:', e.text);
  }

  // ============================================================
  // SECTION 11: ORG SETTINGS
  // ============================================================
  console.log('\n====== SECTION 11: ORG SETTINGS ======');
  
  await go(page, `${BASE_URL}/organizations/settings`);
  await ss(page, 'err-orgsettings-01.png');
  const orgText = await page.evaluate(() => document.body.innerText.substring(0, 600));
  console.log('Org settings text:', orgText);

  // ============================================================
  // SECTION 12: DEEP DIVE - INTEGRATION SETTINGS TABS
  // ============================================================
  console.log('\n====== SECTION 12: INTEGRATION SETTINGS TABS ======');
  
  await go(page, `${BASE_URL}/company/settings/5864`);
  await page.waitForTimeout(2000);
  
  // Find and click each tab
  const allTabs = await page.$$('[role="tab"]');
  console.log('Integration settings tabs found:', allTabs.length);
  
  // Take initial screenshot with all tabs visible
  await ss(page, 'err-integ-tabs-01-overview.png');
  
  const integSettingsTextFull = await page.evaluate(() => document.body.innerText.substring(0, 2000));
  console.log('Integration settings full text:', integSettingsTextFull);
  
  // Click each tab and try to trigger errors
  for (let i = 0; i < Math.min(allTabs.length, 12); i++) {
    try {
      const tabText = await allTabs[i].textContent();
      const tabName = tabText?.trim() || `tab-${i}`;
      console.log(`\n  --- Tab: ${tabName} ---`);
      
      await allTabs[i].click();
      await page.waitForTimeout(1500);
      
      const tabFname = `err-integ-tab-${i}-${tabName.toLowerCase().replace(/\s+/g, '-').substring(0, 20)}.png`;
      await ss(page, tabFname);
      
      const tabText2 = await page.evaluate(() => document.body.innerText.substring(0, 800));
      console.log(`  Tab content: ${tabText2.substring(0, 200)}`);
      
      // Collect errors
      const tabErrors = await collectErrors(page);
      for (const e of tabErrors) {
        addFinding(`Integration Settings > ${tabName}`, 'Page load / tab click', e.text, 'inline', tabFname, 'warning', '');
        console.log(`  Tab error: ${e.text.substring(0, 80)}`);
      }
      
      // Try to find and clear required fields, then save
      const textInputs = await page.$$('input[type="text"], input:not([type="checkbox"]):not([type="radio"])');
      const requiredInputs = [];
      for (const input of textInputs.slice(0, 5)) {
        try {
          const val = await input.inputValue();
          const required = await input.getAttribute('required');
          const placeholder = await input.getAttribute('placeholder');
          if (val || required) {
            requiredInputs.push({ input, originalVal: val, placeholder });
          }
        } catch(e) {}
      }
      
      // Clear and try to save
      if (requiredInputs.length > 0) {
        for (const { input, originalVal } of requiredInputs.slice(0, 2)) {
          await input.fill('');
        }
        
        const tabSaveBtn = await page.$('button:has-text("Save"), button[type="submit"]');
        if (tabSaveBtn) {
          await tabSaveBtn.click();
          await page.waitForTimeout(1500);
          const saveFname = `err-integ-tab-${i}-save-empty.png`;
          await ss(page, saveFname);
          
          const saveErrors = await collectErrors(page);
          for (const e of saveErrors) {
            addFinding(`Integration Settings > ${tabName} > Save`, 'Clear required fields and save', e.text, 'validation', saveFname, 'critical', '');
            console.log(`  Save error: ${e.text.substring(0, 80)}`);
          }
          
          // Restore
          for (const { input, originalVal } of requiredInputs.slice(0, 2)) {
            if (originalVal) await input.fill(originalVal);
          }
        }
      }
    } catch(e) {
      console.log(`  Tab ${i} error: ${e.message.substring(0, 60)}`);
    }
  }

  // ============================================================
  // SECTION 13: MANUAL JOURNALS
  // ============================================================
  console.log('\n====== SECTION 13: MANUAL JOURNALS ======');
  
  // Manual journals might be at different URL
  for (const url of [
    `${BASE_URL}/manualJournals/list`,
    `${BASE_URL}/accounting/manualJournals`,
    `${BASE_URL}/journals/list`
  ]) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const currentUrl = page.url();
    if (!currentUrl.includes('login') && !currentUrl.includes('error')) {
      console.log('Found manual journals at:', currentUrl);
      await ss(page, 'err-mj-01.png');
      break;
    }
  }

  // ============================================================
  // SECTION 14: AI REPORTS
  // ============================================================
  console.log('\n====== SECTION 14: AI REPORTS ======');
  
  await go(page, `${BASE_URL}/accounting/public/aiReportsDashboard/index.html`);
  await ss(page, 'err-aireports-01.png');
  const aiText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('AI reports text:', aiText);
  
  // Try submitting empty query
  const aiInput = await page.$('input[type="text"], textarea, [class*="input"], [contenteditable]');
  if (aiInput) {
    await aiInput.click();
    // Clear and submit empty
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    await ss(page, 'err-aireports-02-empty.png');
    const aiErrors = await collectErrors(page);
    for (const e of aiErrors) {
      addFinding('AI Reports > Query', 'Submit empty query', e.text, 'validation', 'err-aireports-02-empty.png', 'warning', '');
    }
  }

  // ============================================================
  // SECTION 15: NOTIFICATION SETTINGS
  // ============================================================
  console.log('\n====== SECTION 15: USER PROFILE ======');
  
  await go(page, `${BASE_URL}/userProfile/notifications`);
  await ss(page, 'err-profile-notifs.png');
  const profileText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Profile notifications:', profileText);

  // ============================================================
  // SECTION 16: ONBOARDING FLOW - new org
  // ============================================================
  console.log('\n====== SECTION 16: ORG CREATION ======');
  
  await go(page, `${BASE_URL}/organizations/create`);
  await ss(page, 'err-orgcreate-01.png');
  const orgCreateText = await page.evaluate(() => document.body.innerText.substring(0, 600));
  console.log('Org create text:', orgCreateText);
  
  // Try submitting empty
  const orgCreateSave = await page.$('button:has-text("Create"), button:has-text("Next"), button[type="submit"]');
  if (orgCreateSave) {
    await orgCreateSave.click();
    await page.waitForTimeout(1500);
    await ss(page, 'err-orgcreate-02-validation.png');
    
    const orgCreateErrors = await collectErrors(page);
    console.log('Org create validation:', JSON.stringify(orgCreateErrors));
    for (const e of orgCreateErrors) {
      addFinding('Organization > Create', 'Submit empty org creation form', e.text, 'validation', 'err-orgcreate-02-validation.png', 'critical', '');
    }
  }

  // ============================================================
  // SECTION 17: INTEGRATION SETTINGS - deep dive on each settings tab
  // Going back to integration with fresh eyes
  // ============================================================
  console.log('\n====== SECTION 17: INTEGRATION SETTINGS - DEEP DIVE ======');
  
  await go(page, `${BASE_URL}/company/settings/5864`);
  
  // Click each settings tab by text
  const integTabNames = ['General', 'Sales', 'Invoices', 'Products', 'Taxes', 'Fees', 'Expenses', 'Payouts', 'Multicurrency'];
  
  for (const tabName of integTabNames) {
    try {
      const tab = await page.$(`[role="tab"]:has-text("${tabName}"), a:has-text("${tabName}"), button:has-text("${tabName}")`);
      if (!tab) {
        console.log(`  Tab "${tabName}" not found`);
        continue;
      }
      
      await tab.click();
      await page.waitForTimeout(1500);
      
      const fname = `err-integ-${tabName.toLowerCase()}-01.png`;
      await ss(page, fname);
      
      const tabContent = await page.evaluate(() => document.body.innerText.substring(0, 1000));
      console.log(`\n  [${tabName}]:`, tabContent.substring(0, 300));
      
      // Collect any visible errors/warnings
      const tabErrors = await collectErrors(page);
      for (const e of tabErrors) {
        addFinding(`Integration Settings > ${tabName}`, 'Page/tab load', e.text, 'inline', fname, 'warning', '');
        console.log(`    ⚠ ${e.text.substring(0, 80)}`);
      }
      
      // Try various interactions to trigger validation
      // 1. Clear required text fields and save
      const inputs = await page.$$('input[type="text"], input[type="email"], input[type="number"]');
      const cleared = [];
      
      for (const input of inputs.slice(0, 5)) {
        try {
          const val = await input.inputValue();
          if (val) {
            await input.triple_click().catch(() => input.click());
            await page.keyboard.selectAll();
            await input.fill('');
            cleared.push({ input, val });
          }
        } catch(e) {}
      }
      
      const saveBtn = await page.$('button:has-text("Save"), button[type="submit"]');
      if (saveBtn) {
        await saveBtn.click();
        await page.waitForTimeout(1500);
        
        const saveFname = `err-integ-${tabName.toLowerCase()}-save-empty.png`;
        await ss(page, saveFname);
        
        const saveErrors = await collectErrors(page);
        for (const e of saveErrors) {
          addFinding(`Integration Settings > ${tabName} > Save`, 'Clear required fields and save', e.text, 'validation', saveFname, 'critical', '');
          console.log(`    ✓ Validation: ${e.text.substring(0, 80)}`);
        }
        
        // Also check for toast notifications
        await page.waitForTimeout(2000);
        const toasts = await page.$$('[class*="toast"], [class*="Toast"], [class*="snack"], [class*="Snack"], [role="alert"]');
        for (const toast of toasts) {
          const toastText = await toast.textContent();
          if (toastText?.trim()) {
            addFinding(`Integration Settings > ${tabName} > Save`, 'Save attempt', toastText.trim(), 'toast', saveFname, 'critical', '');
            console.log(`    🍞 Toast: ${toastText.trim().substring(0, 80)}`);
          }
        }
        
        // Restore values
        for (const { input, val } of cleared) {
          try { await input.fill(val); } catch(e) {}
        }
      }
      
      // 2. Try toggling conflicting settings
      // Look for select/dropdown changes
      const selects = await page.$$('select, [class*="select__control"], [class*="Select__control"]');
      if (selects.length > 0) {
        console.log(`  Found ${selects.length} dropdowns in ${tabName}`);
      }
      
    } catch(e) {
      console.log(`  Error in tab ${tabName}: ${e.message.substring(0, 60)}`);
    }
  }

  // ============================================================
  // SECTION 18: SETTINGS CONFLICTS - Auto-sync vs Auto-import
  // ============================================================
  console.log('\n====== SECTION 18: SETTINGS - TOGGLE CONFLICTS ======');
  
  await go(page, `${BASE_URL}/company/settings`);
  await page.waitForTimeout(1000);
  
  // Get full page content to understand the settings structure
  const fullSettingsText = await page.evaluate(() => document.body.innerText);
  console.log('Full settings content:', fullSettingsText.substring(0, 2000));
  
  // Find all checkboxes/toggles
  const allInputs = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"], input[type="radio"], [role="switch"]'));
    return inputs.map(i => ({
      type: i.type,
      name: i.name,
      id: i.id,
      checked: i.checked,
      ariaLabel: i.getAttribute('aria-label'),
      labelText: document.querySelector(`label[for="${i.id}"]`)?.textContent?.trim()
    }));
  });
  console.log('All toggle inputs:', JSON.stringify(allInputs, null, 2));
  
  // Try toggling each one and looking for conflict messages
  for (const inputInfo of allInputs.slice(0, 10)) {
    try {
      const selector = inputInfo.id 
        ? `#${inputInfo.id}` 
        : `input[name="${inputInfo.name}"]`;
      
      const input = await page.$(selector);
      if (!input) continue;
      
      await input.click().catch(() => {});
      await page.waitForTimeout(800);
      
      // Check for any new errors/warnings/conflicts
      const conflictMsgs = await page.evaluate(() => {
        const alerts = Array.from(document.querySelectorAll('[role="alert"], [class*="conflict"], [class*="warning"], [class*="error"], [class*="toast"]'));
        return alerts.map(a => a.textContent?.trim()).filter(t => t && t.length > 3);
      });
      
      if (conflictMsgs.length > 0) {
        console.log('CONFLICT found for toggle:', inputInfo.labelText || inputInfo.name);
        const conflictFname = `err-settings-conflict-${(inputInfo.labelText || inputInfo.id || 'toggle').replace(/\s+/g, '-').substring(0, 30)}.png`;
        await ss(page, conflictFname);
        for (const msg of conflictMsgs) {
          addFinding('Settings > General > Toggle', `Toggle: ${inputInfo.labelText || inputInfo.name}`, msg, 'inline', conflictFname, 'warning', 'Conflict message on toggle');
          console.log(`  Conflict: ${msg.substring(0, 80)}`);
        }
      }
      
      // Revert
      await input.click().catch(() => {});
      await page.waitForTimeout(500);
    } catch(e) {
      console.log(`  Toggle error: ${e.message.substring(0, 40)}`);
    }
  }
  
  await ss(page, 'err-settings-final.png');

  // ============================================================
  // SECTION 19: AI REPORTS - deeper
  // ============================================================
  console.log('\n====== SECTION 19: CUSTOM DEVELOPMENT ======');
  await go(page, `${BASE_URL}/customDevelopment/index`);
  await ss(page, 'err-customdev-01.png');
  const customDevText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Custom development:', customDevText);

  // ============================================================
  // Save all findings
  // ============================================================
  const outputPath = '/home/ubuntu/.openclaw/workspace/.synder-state/error-audit/findings-main.json';
  fs.writeFileSync(outputPath, JSON.stringify(findings, null, 2));
  
  console.log('\n====== AUDIT COMPLETE ======');
  console.log(`Total findings: ${findings.length}`);
  console.log(`Screenshots taken: ${screenshotCount}`);
  console.log(`Saved to: ${outputPath}`);
  
  await browser.close();
})().catch(e => {
  console.error('FATAL ERROR:', e.message);
  console.error(e.stack);
  process.exit(1);
});
