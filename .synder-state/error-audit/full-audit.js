const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STORAGE_STATE = '/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json';
const SCREENSHOT_DIR = '/home/ubuntu/.openclaw/workspace/.synder-state/error-audit';
const BASE_SETTINGS = 'https://demo.synderapp.com/company/settings/5864';

const findings = [];

async function ss(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath });
  console.log(`📸 ${name}.png`);
  return `${name}.png`;
}

function addFinding(location, trigger, exactCopy, type, ssFile, uxQuality) {
  const f = { location, trigger, exactCopy, type, screenshot: ssFile, uxQuality };
  findings.push(f);
  console.log(`\n🔴 [${type.toUpperCase()}] ${location}`);
  console.log(`   Trigger: ${trigger}`);
  console.log(`   Copy: "${exactCopy}"`);
  return f;
}

async function gotoSettings(page, hash = '') {
  const url = hash ? `${BASE_SETTINGS}${hash}` : BASE_SETTINGS;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(3000);
}

async function getPageText(page) {
  return await page.evaluate(() => document.body.innerText);
}

async function getAllErrors(page) {
  return await page.evaluate(() => {
    const result = [];
    const seen = new Set();
    const selectors = [
      '[class*="error" i]', '[class*="Error"]', '[class*="warning" i]',
      '[class*="alert" i]', '[class*="toast" i]', '[class*="snack" i]',
      '[role="alert"]', '.MuiFormHelperText-root', '.MuiAlert-message',
      '[class*="helperText" i]', '[class*="invalid" i]',
      '[class*="errorText"]', '[class*="errorMessage"]',
      '[class*="validationError"]', '[class*="fieldError"]'
    ];
    for (const sel of selectors) {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (el.offsetParent === null && !el.closest('[role="alert"]')) return; // skip hidden
          const text = (el.innerText || el.textContent || '').trim();
          if (text.length > 3 && text.length < 500 && !seen.has(text) &&
              !text.includes('function') && !text.includes('{') &&
              !text.includes('window.')) {
            seen.add(text);
            result.push({ text, selector: sel });
          }
        });
      } catch (e) {}
    }
    return result;
  });
}

async function waitForToast(page, ms = 4000) {
  try {
    await page.waitForSelector('[role="alert"], [class*="Toast"], [class*="Snackbar"], [class*="notistack"]', 
      { timeout: ms, state: 'visible' });
    await page.waitForTimeout(600);
    return await getAllErrors(page);
  } catch (e) {
    return [];
  }
}

async function clickSave(page) {
  const saveBtn = await page.$('button:has-text("Save"), button:has-text("Save changes")');
  if (saveBtn && await saveBtn.isVisible().catch(() => false)) {
    await saveBtn.click();
    return true;
  }
  return false;
}

async function reloadTab(page, hash) {
  await gotoSettings(page, hash);
}

// ====== TAB AUDITORS ======

async function auditGeneral(page) {
  console.log('\n\n========== GENERAL TAB ==========');
  await gotoSettings(page, '#default-general-settings');
  await ss(page, 'general-01-default');
  
  const text = await getPageText(page);
  console.log('General tab content:\n', text.substring(0, 5000));
  
  // Screenshot full page
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'general-01-full.png'), fullPage: true });
  
  // === Test 1: Hover over info icons / tooltips ===
  console.log('\n--- Testing tooltips ---');
  const infoIcons = await page.$$('[class*="icon" i][class*="info" i], [class*="InfoIcon"], [data-testid*="info"], svg[class*="info"], [title]:not(a):not(button)');
  console.log(`Found ${infoIcons.length} potential info icons`);
  
  for (let i = 0; i < infoIcons.length; i++) {
    try {
      const icon = infoIcons[i];
      if (await icon.isVisible()) {
        await icon.hover();
        await page.waitForTimeout(800);
        const tooltip = await page.$('[role="tooltip"]');
        if (tooltip && await tooltip.isVisible()) {
          const tipText = await tooltip.innerText();
          if (tipText && tipText.trim().length > 3) {
            const ssName = `err-general-tooltip-${i}`;
            await ss(page, ssName);
            addFinding('General > Info Tooltip', `Hover icon #${i}`, tipText.trim(), 'tooltip', `${ssName}.png`, 'Check clarity and actionability');
          }
        }
      }
    } catch (e) {}
  }
  
  // === Test 2: Auto-sync conflict (turn off auto-import, try to enable auto-sync) ===
  console.log('\n--- Testing Auto-sync conflict ---');
  await gotoSettings(page, '#default-general-settings');
  await page.waitForTimeout(2000);
  
  // Find Auto-import toggle
  const autoImportSwitch = await findToggleByLabel(page, 'auto-import');
  const autoSyncSwitch = await findToggleByLabel(page, 'auto-sync');
  
  if (autoImportSwitch && autoSyncSwitch) {
    // Get current states
    const importChecked = await autoImportSwitch.evaluate(el => el.checked);
    const syncChecked = await autoSyncSwitch.evaluate(el => el.checked);
    console.log(`Auto-import: ${importChecked}, Auto-sync: ${syncChecked}`);
    
    // Turn OFF auto-import
    if (importChecked) {
      await autoImportSwitch.click();
      await page.waitForTimeout(1500);
      await ss(page, 'err-general-autoimport-off');
      const errors = await getAllErrors(page);
      console.log('Errors after turning off auto-import:', errors);
      
      // Check for warnings
      const errs = await waitForToast(page, 3000);
      if (errs.length > 0) {
        errs.forEach(e => addFinding('General > Auto-import toggle', 'Turned off Auto-import', e.text, 'toast', 'err-general-autoimport-off.png', 'Clear?'));
      }
    }
    
    // Now try to turn ON auto-sync
    const syncCheckedNow = await autoSyncSwitch.evaluate(el => el.checked);
    if (!syncCheckedNow) {
      await autoSyncSwitch.click();
      await page.waitForTimeout(1500);
      await ss(page, 'err-general-autosync-conflict');
      const allErrs = await getAllErrors(page);
      console.log('Errors after enabling auto-sync with auto-import off:', allErrs);
      allErrs.forEach(e => addFinding('General > Auto-sync toggle', 'Enabled Auto-sync while Auto-import is OFF', e.text, 'inline', 'err-general-autosync-conflict.png', 'Clear?'));
    }
  }
  
  // Reload to reset
  await reloadTab(page, '#default-general-settings');
  await page.waitForTimeout(2000);
  
  // === Test 3: Save the general settings ===
  console.log('\n--- Testing Save on General ---');
  const saved = await clickSave(page);
  if (saved) {
    await page.waitForTimeout(2000);
    const saveErrors = await waitForToast(page, 3000);
    if (saveErrors.length > 0) {
      await ss(page, 'err-general-save-response');
      saveErrors.forEach(e => addFinding('General > Save', 'Clicked Save', e.text, 'toast', 'err-general-save-response.png', 'Clear?'));
    } else {
      await ss(page, 'general-save-success');
      // Check for success toast
      const pageErrors = await getAllErrors(page);
      if (pageErrors.length > 0) {
        await ss(page, 'err-general-save-errors');
        pageErrors.forEach(e => addFinding('General > Save', 'Clicked Save', e.text, 'toast', 'err-general-save-errors.png', 'Clear?'));
      }
    }
  }
  
  // === Test 4: Look at "Upgrade to use" items ===
  console.log('\n--- Checking Upgrade-locked items ---');
  await reloadTab(page, '#default-general-settings');
  const upgradeLinks = await page.$$('a:has-text("Upgrade to use")');
  console.log(`Found ${upgradeLinks.length} upgrade-locked items`);
  
  for (let i = 0; i < upgradeLinks.length; i++) {
    try {
      const link = upgradeLinks[i];
      // Find the label for this feature
      const featureLabel = await link.evaluate(el => {
        let p = el;
        for (let j = 0; j < 6; j++) {
          p = p.parentElement;
          if (!p) break;
          const label = p.querySelector('label, [class*="label"], [class*="title"]');
          if (label && label !== el) return label.innerText.trim().substring(0, 80);
        }
        return el.closest('[class*="row"], [class*="section"]')?.innerText?.substring(0, 100) || 'unknown';
      });
      console.log(`Upgrade item ${i}: "${featureLabel}"`);
      
      // Hover to see tooltip on disabled toggle
      const nearbyToggle = await link.evaluate(el => {
        let p = el;
        for (let j = 0; j < 6; j++) {
          p = p.parentElement;
          if (!p) break;
          const toggle = p.querySelector('input[type="checkbox"], [role="switch"]');
          if (toggle) return toggle.getAttribute('disabled') || toggle.getAttribute('aria-disabled') || 'enabled';
        }
        return null;
      });
      console.log(`  Toggle state: ${nearbyToggle}`);
    } catch (e) {}
  }
  
  // === Test 5: Check disabled toggles for tooltips ===
  const disabledToggles = await page.$$('input[type="checkbox"][disabled], [aria-disabled="true"]');
  console.log(`Found ${disabledToggles.length} disabled toggles`);
  
  for (let i = 0; i < disabledToggles.length; i++) {
    try {
      await disabledToggles[i].hover();
      await page.waitForTimeout(700);
      const tooltip = await page.$('[role="tooltip"]');
      if (tooltip && await tooltip.isVisible()) {
        const tipText = await tooltip.innerText();
        if (tipText && tipText.trim().length > 3) {
          const ssName = `err-general-disabled-tooltip-${i}`;
          await ss(page, ssName);
          addFinding('General > Disabled toggle', `Hover disabled toggle #${i}`, tipText.trim(), 'tooltip', `${ssName}.png`, 'Explains why disabled?');
        }
      }
    } catch (e) {}
  }
}

async function findToggleByLabel(page, labelText) {
  // Find a toggle/checkbox whose nearby label contains labelText
  const result = await page.evaluate((labelText) => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"], [role="switch"]'));
    for (const input of inputs) {
      let p = input;
      for (let i = 0; i < 5; i++) {
        p = p.parentElement;
        if (!p) break;
        const text = p.innerText || '';
        if (text.toLowerCase().includes(labelText.toLowerCase())) {
          // Return a selector we can use
          const id = input.id;
          const name = input.name;
          return { found: true, id, name };
        }
      }
    }
    return { found: false };
  }, labelText);
  
  if (result.found) {
    if (result.id) return await page.$(`#${result.id}`);
    if (result.name) return await page.$(`[name="${result.name}"]`);
  }
  return null;
}

async function auditSales(page) {
  console.log('\n\n========== SALES TAB ==========');
  await gotoSettings(page, '#default-sales-settings');
  await page.waitForTimeout(2000);
  await ss(page, 'sales-01-default');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'sales-01-full.png'), fullPage: true });
  
  const text = await getPageText(page);
  console.log('Sales tab content:\n', text.substring(0, 6000));
  
  // === Test: Clear required dropdowns ===
  console.log('\n--- Testing required field clearing on Sales ---');
  
  // Find all MUI select dropdowns
  const selects = await page.$$('[class*="MuiSelect"], [class*="select-container"], [class*="SelectField"]');
  console.log(`Found ${selects.length} select elements`);
  
  // Find specific required fields
  const requiredFields = await page.evaluate(() => {
    const fields = [];
    // Look for labels with asterisks or "required" text
    document.querySelectorAll('label, [class*="label"]').forEach(label => {
      const text = label.innerText || label.textContent || '';
      if (text.includes('*') || text.toLowerCase().includes('required')) {
        fields.push(text.trim().substring(0, 80));
      }
    });
    return fields;
  });
  console.log('Required fields:', requiredFields);
  
  // Look for "Income account" field - a key required field
  const incomeAccountEl = await page.$('text=/income account/i');
  if (incomeAccountEl) {
    console.log('Found income account');
    await incomeAccountEl.scrollIntoViewIfNeeded();
    await ss(page, 'sales-income-account-visible');
  }
  
  // Try to find select elements and clear them
  const allSelects = await page.evaluate(() => {
    const results = [];
    // Find React-select or MUI select components
    document.querySelectorAll('[class*="select__control"], [class*="MuiSelect-root"]').forEach((el, i) => {
      const label = el.closest('[class*="form-group"], [class*="FormControl"], [class*="field"]')
        ?.querySelector('label, [class*="label"]')?.innerText?.trim() || `Select ${i}`;
      const currentValue = el.querySelector('[class*="select__single-value"], [class*="MuiSelect-select"]')?.innerText?.trim() || '';
      results.push({ label: label.substring(0, 80), currentValue: currentValue.substring(0, 40), index: i });
    });
    return results;
  });
  
  console.log('All selects on Sales tab:', JSON.stringify(allSelects, null, 2));
  
  // Try clicking the clear (X) button on dropdowns
  const clearButtons = await page.$$('[class*="select__indicator-separator"] + [class*="select__indicator"], [aria-label*="clear" i], [class*="clearIndicator"]');
  console.log(`Found ${clearButtons.length} clear buttons`);
  
  // Try to clear dropdowns that have a clear button
  for (let i = 0; i < clearButtons.length && i < 5; i++) {
    try {
      const btn = clearButtons[i];
      if (await btn.isVisible()) {
        // Get the parent select's label first
        const label = await btn.evaluate(el => {
          let p = el;
          for (let j = 0; j < 8; j++) {
            p = p.parentElement;
            if (!p) break;
            const lbl = p.querySelector('label');
            if (lbl) return lbl.innerText.trim().substring(0, 60);
          }
          return 'unknown';
        });
        
        console.log(`Clearing dropdown: "${label}"`);
        await btn.click();
        await page.waitForTimeout(1000);
        
        // Try to save now
        const saved = await clickSave(page);
        if (saved) {
          await page.waitForTimeout(2000);
          const errors = await getAllErrors(page);
          const toastErrors = await waitForToast(page, 3000);
          const allErrors = [...errors, ...toastErrors];
          
          if (allErrors.length > 0) {
            const ssName = `err-sales-cleared-${label.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 30)}`;
            await ss(page, ssName);
            allErrors.forEach(e => {
              if (!findings.some(f => f.exactCopy === e.text)) {
                addFinding(`Sales > ${label}`, `Cleared "${label}" and saved`, e.text, 'validation', `${ssName}.png`, 'Is it clear what to fix?');
              }
            });
          }
        }
        
        // Reload to reset
        await reloadTab(page, '#default-sales-settings');
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log(`Error clearing dropdown ${i}:`, e.message.substring(0, 100));
    }
  }
  
  // === Test: Toggle switches on Sales ===
  console.log('\n--- Testing toggles on Sales ---');
  await reloadTab(page, '#default-sales-settings');
  
  const toggles = await page.$$('input[type="checkbox"]');
  console.log(`Found ${toggles.length} checkboxes/toggles`);
  
  for (let i = 0; i < Math.min(toggles.length, 8); i++) {
    try {
      const toggle = toggles[i];
      if (!await toggle.isVisible()) continue;
      
      const labelText = await toggle.evaluate(el => {
        let p = el;
        for (let j = 0; j < 5; j++) {
          p = p.parentElement;
          if (!p) break;
          const label = p.querySelector('label');
          const text = label?.innerText || p.innerText || '';
          if (text.trim().length > 0 && text.trim().length < 100) return text.trim().substring(0, 80);
        }
        return `toggle-${el.name || el.id || 'unknown'}`;
      });
      
      const wasChecked = await toggle.evaluate(el => el.checked);
      await toggle.click();
      await page.waitForTimeout(1000);
      
      // Check for warnings/dialogs
      const errors = await getAllErrors(page);
      const modal = await page.$('[role="dialog"], [class*="modal"], [class*="Modal"]');
      
      if (errors.length > 0) {
        const ssName = `err-sales-toggle-${i}`;
        await ss(page, ssName);
        errors.forEach(e => {
          if (!findings.some(f => f.exactCopy === e.text)) {
            addFinding(`Sales > Toggle: ${labelText}`, `Toggled "${labelText}" (was ${wasChecked ? 'on' : 'off'})`, e.text, 'inline', `${ssName}.png`, 'Clear?');
          }
        });
      }
      
      if (modal && await modal.isVisible()) {
        const modalText = await modal.innerText();
        if (modalText.trim().length > 3) {
          const ssName = `err-sales-toggle-modal-${i}`;
          await ss(page, ssName);
          addFinding(`Sales > Toggle: ${labelText}`, `Toggled "${labelText}"`, modalText.trim(), 'modal', `${ssName}.png`, 'Clear?');
          // Close modal
          const cancelBtn = await modal.$('button:has-text("Cancel"), button:has-text("No"), button:has-text("Close")');
          if (cancelBtn) await cancelBtn.click();
          await page.waitForTimeout(500);
        }
      }
      
      // Undo toggle
      await toggle.click();
      await page.waitForTimeout(500);
      
    } catch (e) {
      console.log(`Toggle ${i} error:`, e.message.substring(0, 80));
    }
  }
}

async function auditInvoices(page) {
  console.log('\n\n========== INVOICES TAB ==========');
  await gotoSettings(page, '#default-invoice-settings');
  await page.waitForTimeout(2000);
  await ss(page, 'invoices-01-default');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'invoices-01-full.png'), fullPage: true });
  
  const text = await getPageText(page);
  console.log('Invoices tab content:\n', text.substring(0, 5000));
  
  // Test clearing required fields
  await testRequiredFieldClearing(page, 'invoices', '#default-invoice-settings');
  await testToggles(page, 'invoices', '#default-invoice-settings');
}

async function auditProductsServices(page) {
  console.log('\n\n========== PRODUCTS/SERVICES TAB ==========');
  await gotoSettings(page, '#default-item-settings');
  await page.waitForTimeout(2000);
  await ss(page, 'products-01-default');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'products-01-full.png'), fullPage: true });
  
  const text = await getPageText(page);
  console.log('Products/Services tab content:\n', text.substring(0, 5000));
  
  await testRequiredFieldClearing(page, 'products', '#default-item-settings');
  await testToggles(page, 'products', '#default-item-settings');
}

async function auditProductMapping(page) {
  console.log('\n\n========== PRODUCT MAPPING TAB ==========');
  await gotoSettings(page, '#default-product-mapping-settings');
  await page.waitForTimeout(2000);
  await ss(page, 'productmapping-01-default');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'productmapping-01-full.png'), fullPage: true });
  
  const text = await getPageText(page);
  console.log('Product mapping tab content:\n', text.substring(0, 5000));
  
  await testRequiredFieldClearing(page, 'productmapping', '#default-product-mapping-settings');
}

async function auditTaxes(page) {
  console.log('\n\n========== TAXES TAB ==========');
  await gotoSettings(page, '#default-tax-settings');
  await page.waitForTimeout(2000);
  await ss(page, 'taxes-01-default');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'taxes-01-full.png'), fullPage: true });
  
  const text = await getPageText(page);
  console.log('Taxes tab content:\n', text.substring(0, 5000));
  
  await testRequiredFieldClearing(page, 'taxes', '#default-tax-settings');
  await testToggles(page, 'taxes', '#default-tax-settings');
}

async function auditFees(page) {
  console.log('\n\n========== FEES TAB ==========');
  await gotoSettings(page, '#default-fee-settings');
  await page.waitForTimeout(2000);
  await ss(page, 'fees-01-default');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fees-01-full.png'), fullPage: true });
  
  const text = await getPageText(page);
  console.log('Fees tab content:\n', text.substring(0, 4000));
  
  await testRequiredFieldClearing(page, 'fees', '#default-fee-settings');
  await testToggles(page, 'fees', '#default-fee-settings');
}

async function auditApplicationFees(page) {
  console.log('\n\n========== APPLICATION FEES TAB ==========');
  await gotoSettings(page, '#default-applicationFee-settings');
  await page.waitForTimeout(2000);
  await ss(page, 'appfees-01-default');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'appfees-01-full.png'), fullPage: true });
  
  const text = await getPageText(page);
  console.log('Application Fees tab content:\n', text.substring(0, 4000));
  
  await testRequiredFieldClearing(page, 'appfees', '#default-applicationFee-settings');
}

async function auditExpenses(page) {
  console.log('\n\n========== EXPENSES TAB ==========');
  await gotoSettings(page, '#default-purchase-settings');
  await page.waitForTimeout(2000);
  await ss(page, 'expenses-01-default');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'expenses-01-full.png'), fullPage: true });
  
  const text = await getPageText(page);
  console.log('Expenses tab content:\n', text.substring(0, 4000));
  
  await testRequiredFieldClearing(page, 'expenses', '#default-purchase-settings');
  await testToggles(page, 'expenses', '#default-purchase-settings');
}

async function auditPayouts(page) {
  console.log('\n\n========== PAYOUTS TAB ==========');
  await gotoSettings(page, '#default-payout-settings');
  await page.waitForTimeout(2000);
  await ss(page, 'payouts-01-default');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'payouts-01-full.png'), fullPage: true });
  
  const text = await getPageText(page);
  console.log('Payouts tab content:\n', text.substring(0, 4000));
  
  await testRequiredFieldClearing(page, 'payouts', '#default-payout-settings');
  await testToggles(page, 'payouts', '#default-payout-settings');
}

async function auditMulticurrency(page) {
  console.log('\n\n========== MULTICURRENCY TAB ==========');
  await gotoSettings(page, '#default-multi-currency-settings');
  await page.waitForTimeout(2000);
  await ss(page, 'multicurrency-01-default');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'multicurrency-01-full.png'), fullPage: true });
  
  const text = await getPageText(page);
  console.log('Multicurrency tab content:\n', text.substring(0, 4000));
  
  await testRequiredFieldClearing(page, 'multicurrency', '#default-multi-currency-settings');
  await testToggles(page, 'multicurrency', '#default-multi-currency-settings');
}

// Generic test helpers
async function testRequiredFieldClearing(page, tabName, hash) {
  console.log(`\n--- Testing required field clearing on ${tabName} ---`);
  await reloadTab(page, hash);
  await page.waitForTimeout(2000);
  
  // Get all selects with current values
  const selectData = await page.evaluate(() => {
    const results = [];
    // React-select and MUI selects
    const selects = document.querySelectorAll('[class*="select__control"], .MuiSelect-root, [class*="Select-root"]');
    selects.forEach((el, i) => {
      const value = el.querySelector('[class*="single-value"], [class*="Select-select"]')?.innerText?.trim() || '';
      const label = (() => {
        let p = el;
        for (let j = 0; j < 8; j++) {
          p = p.parentElement;
          if (!p) break;
          const lbl = p.querySelector('label');
          if (lbl && lbl.innerText.trim().length > 0) return lbl.innerText.trim().substring(0, 60);
        }
        return `select-${i}`;
      })();
      results.push({ label, value: value.substring(0, 40), index: i });
    });
    return results;
  });
  
  console.log(`Selects on ${tabName}:`, JSON.stringify(selectData, null, 2));
  
  // Try to clear each select by clicking on it and searching for an empty value
  for (let i = 0; i < Math.min(selectData.length, 8); i++) {
    const selectInfo = selectData[i];
    if (!selectInfo.value) continue; // Skip empty ones
    
    try {
      // Find and click the select
      const selectEl = await page.evaluate((index) => {
        const selects = document.querySelectorAll('[class*="select__control"], .MuiSelect-root, [class*="Select-root"]');
        const el = selects[index];
        if (!el) return null;
        // Return a unique selector
        const id = el.id || el.getAttribute('data-testid') || null;
        return { id, classes: el.className.substring(0, 80), index };
      }, i);
      
      if (!selectEl) continue;
      
      // Get the nth select control
      const controls = await page.$$('[class*="select__control"]');
      if (controls[i]) {
        console.log(`Clicking select: "${selectInfo.label}" (value: "${selectInfo.value}")`);
        await controls[i].click();
        await page.waitForTimeout(500);
        
        // Check if a dropdown opened
        const dropdown = await page.$('[class*="select__menu"]');
        if (dropdown) {
          // Try to find a clear button
          const clearBtn = await page.$('[class*="select__clear-indicator"], [aria-label="Clear"]');
          if (clearBtn && await clearBtn.isVisible()) {
            // Close dropdown first, then click clear
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
            await clearBtn.click();
            await page.waitForTimeout(500);
          } else {
            // Close dropdown
            await page.keyboard.press('Escape');
          }
        }
      }
      
      // Try using clear button (X) which appears on hover
      const allClearBtns = await page.$$('[class*="select__clear-indicator"]');
      if (allClearBtns.length > 0 && allClearBtns[i]) {
        try {
          if (await allClearBtns[i].isVisible()) {
            await allClearBtns[i].click();
            await page.waitForTimeout(500);
          }
        } catch (e) {}
      }
      
    } catch (e) {
      console.log(`Error with select ${i}:`, e.message.substring(0, 80));
    }
  }
  
  // Now try to save and see errors
  const saved = await clickSave(page);
  if (saved) {
    await page.waitForTimeout(2500);
    const toastErrors = await waitForToast(page, 4000);
    const allErrs = await getAllErrors(page);
    const combined = [...new Set([...toastErrors, ...allErrs].map(e => e.text))];
    
    if (combined.length > 0) {
      const ssName = `err-${tabName}-save-cleared`;
      await ss(page, ssName);
      combined.forEach(text => {
        if (!findings.some(f => f.exactCopy === text)) {
          addFinding(`${tabName.charAt(0).toUpperCase() + tabName.slice(1)} > Save`, 'Cleared required fields and saved', text, 'validation', `${ssName}.png`, 'Is it clear what field to fill?');
        }
      });
    }
  }
  
  // Reload to reset
  await reloadTab(page, hash);
  await page.waitForTimeout(1500);
}

async function testToggles(page, tabName, hash) {
  console.log(`\n--- Testing toggles on ${tabName} ---`);
  await reloadTab(page, hash);
  await page.waitForTimeout(2000);
  
  const toggles = await page.$$('input[type="checkbox"]:not([disabled])');
  console.log(`Found ${toggles.length} enabled toggles`);
  
  for (let i = 0; i < Math.min(toggles.length, 10); i++) {
    try {
      const toggle = toggles[i];
      if (!await toggle.isVisible()) continue;
      
      const info = await toggle.evaluate(el => {
        let p = el;
        let labelText = '';
        for (let j = 0; j < 6; j++) {
          p = p.parentElement;
          if (!p) break;
          const label = p.querySelector('label');
          if (label && label.innerText.trim()) {
            labelText = label.innerText.trim().substring(0, 80);
            break;
          }
        }
        return { checked: el.checked, name: el.name || el.id || '', label: labelText };
      });
      
      console.log(`Toggle ${i}: "${info.label}" (${info.checked ? 'ON' : 'OFF'})`);
      
      // Toggle it
      await toggle.click();
      await page.waitForTimeout(1200);
      
      // Check for any messages
      const errors = await getAllErrors(page);
      const modal = await page.$('[role="dialog"]');
      
      if (errors.length > 0) {
        const errorTexts = errors.map(e => e.text).filter(t => 
          !findings.some(f => f.exactCopy === t)
        );
        if (errorTexts.length > 0) {
          const ssName = `err-${tabName}-toggle-${i}`;
          await ss(page, ssName);
          errorTexts.forEach(text => {
            addFinding(
              `${tabName.charAt(0).toUpperCase() + tabName.slice(1)} > "${info.label}"`, 
              `Toggled "${info.label}" ${info.checked ? 'OFF' : 'ON'}`, 
              text, 
              'inline', 
              `${ssName}.png`, 
              'Is error message clear and helpful?'
            );
          });
        }
      }
      
      if (modal && await modal.isVisible()) {
        const modalText = await modal.innerText();
        const cleanText = modalText.trim();
        if (cleanText.length > 3 && !findings.some(f => f.exactCopy === cleanText)) {
          const ssName = `err-${tabName}-toggle-modal-${i}`;
          await ss(page, ssName);
          addFinding(
            `${tabName.charAt(0).toUpperCase() + tabName.slice(1)} > "${info.label}" modal`,
            `Toggled "${info.label}"`,
            cleanText,
            'modal',
            `${ssName}.png`,
            'Is warning actionable?'
          );
          // Dismiss
          const cancelBtn = await modal.$('button:has-text("Cancel"), button:has-text("No"), button:has-text("Close"), button:has-text("OK")');
          if (cancelBtn) {
            await cancelBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }
      
      // Check for warning banners
      const warnings = await page.$$('[class*="warning" i], [class*="Warning"]');
      for (const warn of warnings) {
        if (await warn.isVisible()) {
          const warnText = await warn.innerText();
          if (warnText.trim().length > 3 && !findings.some(f => f.exactCopy === warnText.trim())) {
            const ssName = `err-${tabName}-toggle-warning-${i}`;
            await ss(page, ssName);
            addFinding(
              `${tabName.charAt(0).toUpperCase() + tabName.slice(1)} > "${info.label}" warning`,
              `Toggled "${info.label}"`,
              warnText.trim(),
              'banner',
              `${ssName}.png`,
              'Is it helpful and clear?'
            );
          }
        }
      }
      
      // Undo toggle
      const currentToggle = await page.$(`input[type="checkbox"]:not([disabled])`);
      await toggle.click().catch(() => {});
      await page.waitForTimeout(500);
      
    } catch (e) {
      console.log(`Toggle ${i} error: ${e.message.substring(0, 80)}`);
      await reloadTab(page, hash);
      await page.waitForTimeout(1500);
      break;
    }
  }
  
  await reloadTab(page, hash);
}

async function auditOrgSettings(page) {
  console.log('\n\n========== ORG-LEVEL SETTINGS ==========');
  await page.goto('https://demo.synderapp.com/company/settings', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(3000);
  await ss(page, 'org-settings-01-default');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'org-settings-full.png'), fullPage: true });
  
  const text = await getPageText(page);
  console.log('Org settings content:\n', text.substring(0, 3000));
  
  // Check all settings tabs at org level
  const orgLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map(a => ({
      text: a.innerText.trim().substring(0, 60),
      href: a.href
    })).filter(l => l.text.length > 0 && l.href.includes('company'));
  });
  console.log('Org settings links:', JSON.stringify(orgLinks.slice(0, 20), null, 2));
}

async function captureAllInlineHelpText(page) {
  // Get all help/description text on the page
  return await page.evaluate(() => {
    const texts = [];
    const helpSelectors = [
      '[class*="helpText"]', '[class*="help-text"]', '[class*="description"]',
      '[class*="subtitle"]', 'small', '[class*="hint"]',
      'p[class*="info"]', '[class*="infoText"]'
    ];
    const seen = new Set();
    for (const sel of helpSelectors) {
      document.querySelectorAll(sel).forEach(el => {
        const text = (el.innerText || '').trim();
        if (text.length > 10 && text.length < 500 && !seen.has(text)) {
          seen.add(text);
          texts.push({ text, selector: sel });
        }
      });
    }
    return texts;
  });
}

async function auditAllTooltips(page, hash, tabName) {
  // Hover over ALL elements with title or data-tip to find hidden warning text
  await reloadTab(page, hash);
  await page.waitForTimeout(2000);
  
  const allWithTooltips = await page.$$('[title]:not(link):not(script):not(style), [data-tip], [data-tooltip], [aria-describedby]');
  console.log(`Found ${allWithTooltips.length} elements with tooltips on ${tabName}`);
  
  for (let i = 0; i < Math.min(allWithTooltips.length, 20); i++) {
    try {
      const el = allWithTooltips[i];
      if (!await el.isVisible()) continue;
      
      const title = await el.getAttribute('title') || '';
      const dataTip = await el.getAttribute('data-tip') || '';
      const combined = title || dataTip;
      
      if (combined.length > 3 && !findings.some(f => f.exactCopy === combined)) {
        await el.hover();
        await page.waitForTimeout(600);
        
        // Check both title attribute and visible tooltip
        const tooltip = await page.$('[role="tooltip"]');
        const visibleText = tooltip ? await tooltip.innerText().catch(() => '') : '';
        const finalText = visibleText.trim() || combined;
        
        if (finalText.length > 3 && !findings.some(f => f.exactCopy === finalText)) {
          addFinding(`${tabName} > Tooltip/Title`, `Hover over element with title`, finalText, 'tooltip', null, 'Is it clear?');
        }
      }
    } catch (e) {}
  }
}

// ====== MAIN ======
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({ 
    storageState: STORAGE_STATE,
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  // Disable resource loading for speed
  await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf}', route => route.abort());
  
  try {
    // Quick login verification
    await page.goto('https://demo.synderapp.com/controlPanel/index', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    console.log('Logged in URL:', page.url());
    
    // Audit each tab
    await auditGeneral(page);
    await auditSales(page);
    await auditInvoices(page);
    await auditProductsServices(page);
    await auditProductMapping(page);
    await auditTaxes(page);
    await auditFees(page);
    await auditApplicationFees(page);
    await auditExpenses(page);
    await auditPayouts(page);
    await auditMulticurrency(page);
    await auditOrgSettings(page);
    
  } catch(e) {
    console.error('Fatal error:', e.message);
    console.error(e.stack);
    await ss(page, 'fatal-error');
  } finally {
    // Save findings
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'all-findings.json'),
      JSON.stringify({ findings, total: findings.length, timestamp: new Date().toISOString() }, null, 2)
    );
    
    console.log('\n\n========== AUDIT COMPLETE ==========');
    console.log(`Total findings: ${findings.length}`);
    findings.forEach((f, i) => {
      console.log(`\n[${i+1}] [${f.type}] ${f.location}`);
      console.log(`  Trigger: ${f.trigger}`);
      console.log(`  Copy: "${f.exactCopy.substring(0, 100)}"`);
    });
    
    await browser.close();
  }
})().catch(e => {
  console.error('Unhandled error:', e.message);
  process.exit(1);
});
