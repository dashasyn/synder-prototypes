/**
 * Focused Settings Error Audit for Synder (Per-Transaction mode)
 * Audits /company/settings/5864 — all tabs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STORAGE_STATE = '/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json';
const DIR = '/home/ubuntu/.openclaw/workspace/.synder-state/error-audit';
const SETTINGS_URL = 'https://demo.synderapp.com/company/settings/5864';

const findings = [];
let page;

function log(msg) { console.log(msg); }

async function ss(name) {
  const fp = path.join(DIR, `${name}.png`);
  try { await page.screenshot({ path: fp }); } catch(e) {}
  log(`📸 ${name}.png`);
  return `${name}.png`;
}

function finding(location, trigger, exactCopy, type, ssFile, uxNote) {
  const f = { location, trigger, exactCopy, type, screenshot: ssFile, uxNote };
  findings.push(f);
  log(`\n🔴 [${type.toUpperCase()}] ${location}`);
  log(`   → "${exactCopy.substring(0, 150)}"`);
}

async function goto(url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);
  } catch(e) {
    log('Navigation warning: ' + e.message.substring(0, 80));
    await page.waitForTimeout(2000);
  }
}

async function reloadSettings() {
  await goto(SETTINGS_URL);
}

async function getVisibleErrors() {
  return await page.evaluate(() => {
    const seen = new Set();
    const results = [];
    const selectors = [
      '[role="alert"]',
      '.MuiAlert-message', 
      '.MuiFormHelperText-root.Mui-error',
      '[class*="error-text"]', '[class*="errorText"]',
      '[class*="error-message"]', '[class*="errorMessage"]',
      '[class*="SnackbarContent-message"]',
      '[class*="notistack"]',
      '[class*="toast"]', '[class*="Toast"]',
    ];
    for (const sel of selectors) {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (!el.offsetParent && el.style.display === 'none') return;
          const text = (el.innerText || '').trim();
          if (text.length > 3 && text.length < 400 && !seen.has(text)) {
            seen.add(text);
            results.push({ text, sel });
          }
        });
      } catch(e) {}
    }
    return results;
  });
}

async function waitForError(ms = 4000) {
  try {
    await page.waitForSelector('[role="alert"], [class*="notistack"], [class*="Toast"], .MuiAlert-root', { timeout: ms, state: 'visible' });
    await page.waitForTimeout(500);
  } catch(e) {}
  return getVisibleErrors();
}

async function clickSaveBtn() {
  const btn = await page.$('button:has-text("Save")');
  if (btn && await btn.isVisible().catch(() => false)) {
    await btn.click();
    return true;
  }
  return false;
}

async function scrollToSection(anchor) {
  // Click the nav link for this section
  try {
    await page.click(`a[href*="${anchor}"]`);
    await page.waitForTimeout(1500);
  } catch(e) {
    // Scroll to the element with id
    try {
      await page.evaluate((id) => {
        const el = document.getElementById(id) || document.querySelector(`[id*="${id}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, anchor.replace('#', ''));
      await page.waitForTimeout(1000);
    } catch(e2) {}
  }
}

async function getSelectValues(sectionAnchor) {
  // Get all selects in the current visible section
  return await page.evaluate((anchor) => {
    const section = document.getElementById(anchor.replace('#', '')) || 
                    document.querySelector(`[id*="${anchor.replace('#', '')}"]`) ||
                    document.body;
    
    const selects = [];
    section.querySelectorAll('[class*="select__control"], [class*="Select-select"]').forEach((el, i) => {
      const value = el.querySelector('[class*="single-value"]')?.innerText?.trim() || 
                    el.innerText?.trim() || '';
      const label = (() => {
        let p = el;
        for (let j = 0; j < 10; j++) {
          p = p.parentElement;
          if (!p) break;
          const lbl = p.querySelector('label');
          if (lbl) return lbl.innerText.trim().substring(0, 60);
        }
        return '';
      })();
      if (label || value) selects.push({ label, value: value.substring(0, 50), index: i });
    });
    return selects;
  }, sectionAnchor);
}

async function tryToClearSelect(controlIndex) {
  // Get all select controls and click clear on the nth one
  const controls = await page.$$('[class*="select__control"]');
  if (!controls[controlIndex]) return false;
  
  // Hover to reveal the clear button
  await controls[controlIndex].hover();
  await page.waitForTimeout(300);
  
  // Find the clear indicator
  const clearBtns = await page.$$('[class*="select__clear-indicator"]');
  for (const btn of clearBtns) {
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(500);
      return true;
    }
  }
  
  return false;
}

// ====================== TAB AUDITS ======================

async function auditSection(tabName, anchor) {
  log(`\n\n========== ${tabName.toUpperCase()} ==========`);
  await reloadSettings();
  await scrollToSection(anchor);
  await ss(`tab-${tabName.toLowerCase().replace(/\//g, '-').replace(/\s/g, '-')}-default`);
  
  // Get full tab text
  const tabText = await page.evaluate((anchor) => {
    const section = document.getElementById(anchor.replace('#', '')) || 
                    document.querySelector(`[id*="${anchor.replace('#', '')}"]`);
    return section ? section.innerText : '';
  }, anchor);
  
  log(`${tabName} content:\n${tabText.substring(0, 3000)}`);
  
  // ---- Get selects ----
  const selects = await getSelectValues(anchor);
  log(`Selects found: ${JSON.stringify(selects)}`);
  
  // ---- Try clearing selects one by one and saving ----
  for (let i = 0; i < Math.min(selects.length, 6); i++) {
    if (!selects[i].value) continue;
    
    await reloadSettings();
    await scrollToSection(anchor);
    await page.waitForTimeout(1000);
    
    const cleared = await tryToClearSelect(i);
    if (cleared) {
      log(`Cleared select "${selects[i].label}" (was "${selects[i].value}")`);
      
      const saved = await clickSaveBtn();
      if (saved) {
        await page.waitForTimeout(2500);
        const errors = await waitForError(4000);
        if (errors.length > 0) {
          const ssName = `err-${tabName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-clear-${i}`;
          await ss(ssName);
          errors.forEach(e => {
            if (!findings.some(f => f.exactCopy === e.text)) {
              finding(
                `${tabName} > "${selects[i].label || 'select-'+i}"`,
                `Cleared "${selects[i].label || 'select'}" dropdown and saved`,
                e.text, 'validation', `${ssName}.png`,
                'Does it say which field? Is it actionable?'
              );
            }
          });
        }
      }
    }
  }
  
  // ---- Test Save with all defaults (look for success or error toasts) ----
  await reloadSettings();
  await scrollToSection(anchor);
  await page.waitForTimeout(1000);
  
  const savedDefault = await clickSaveBtn();
  if (savedDefault) {
    await page.waitForTimeout(2500);
    const defaultErrors = await waitForError(4000);
    if (defaultErrors.length > 0) {
      const ssName = `err-${tabName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-save-default`;
      await ss(ssName);
      defaultErrors.forEach(e => {
        if (!findings.some(f => f.exactCopy === e.text)) {
          finding(`${tabName} > Save (default)`, 'Clicked Save with default values', e.text, 'toast', `${ssName}.png`, 'Is this expected? Clear?');
        }
      });
    } else {
      // Success - check for success message
      const successMsg = await page.evaluate(() => {
        const seen = new Set();
        const results = [];
        ['[class*="success"]', '[class*="Success"]', '[role="alert"]'].forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            const text = el.innerText?.trim();
            if (text && text.length > 3 && !seen.has(text)) {
              seen.add(text);
              results.push(text);
            }
          });
        });
        return results;
      });
      if (successMsg.length > 0) {
        log(`  ✅ Success message: "${successMsg[0]}"`);
      }
    }
  }
  
  // ---- Test toggles ----
  await reloadSettings();
  await scrollToSection(anchor);
  await page.waitForTimeout(1000);
  
  const toggleInfos = await page.evaluate((anchor) => {
    const section = document.getElementById(anchor.replace('#', '')) || 
                    document.querySelector(`[id*="${anchor.replace('#', '')}"]`) ||
                    document.body;
    const toggles = [];
    section.querySelectorAll('input[type="checkbox"]:not([disabled])').forEach((inp, i) => {
      let p = inp;
      let labelText = '';
      for (let j = 0; j < 6; j++) {
        p = p.parentElement;
        if (!p) break;
        const lbl = p.querySelector('label');
        if (lbl && lbl.innerText.trim()) {
          labelText = lbl.innerText.trim().substring(0, 80);
          break;
        }
      }
      toggles.push({ index: i, label: labelText, checked: inp.checked, id: inp.id, name: inp.name });
    });
    return toggles;
  }, anchor);
  
  log(`Toggles: ${JSON.stringify(toggleInfos)}`);
  
  for (const tog of toggleInfos.slice(0, 6)) {
    try {
      await reloadSettings();
      await scrollToSection(anchor);
      await page.waitForTimeout(1000);
      
      // Find and click the specific toggle
      const toggleEl = tog.id 
        ? await page.$(`#${tog.id}`)
        : await page.$(`input[name="${tog.name}"]`);
      
      if (!toggleEl) continue;
      await toggleEl.click();
      await page.waitForTimeout(1500);
      
      // Check for dialog/modal
      const dialog = await page.$('[role="dialog"]');
      if (dialog && await dialog.isVisible()) {
        const dlgText = await dialog.innerText();
        if (dlgText.trim().length > 3) {
          const ssName = `err-${tabName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-toggle-dialog-${tog.index}`;
          await ss(ssName);
          finding(
            `${tabName} > "${tog.label}" — toggle modal`,
            `Toggled "${tog.label}" ${tog.checked ? 'OFF→ON' : 'ON→OFF'}... wait: it was ${tog.checked ? 'ON' : 'OFF'}`,
            dlgText.trim(), 'modal', `${ssName}.png`, 'Is the warning clear? Does it explain consequences?'
          );
          // Dismiss
          const cancelBtn = await dialog.$('button:has-text("Cancel"), button:has-text("No"), button:has-text("Close")');
          if (cancelBtn) { await cancelBtn.click(); await page.waitForTimeout(500); }
          else {
            const anyBtn = await dialog.$('button');
            if (anyBtn) { await anyBtn.click(); await page.waitForTimeout(500); }
          }
        }
      }
      
      // Check for inline warnings
      const warns = await getVisibleErrors();
      if (warns.length > 0) {
        warns.forEach(w => {
          if (!findings.some(f => f.exactCopy === w.text)) {
            finding(
              `${tabName} > "${tog.label}" — inline warning`,
              `Toggled "${tog.label}"`,
              w.text, 'inline', null, 'Clear and helpful?'
            );
          }
        });
      }
      
      // Also check for warning banners that appeared
      const banners = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('[class*="warning" i], [class*="Warning"]').forEach(el => {
          if (el.offsetParent === null) return;
          const text = el.innerText?.trim();
          if (text && text.length > 5 && text.length < 400) results.push(text);
        });
        return results;
      });
      
      if (banners.length > 0) {
        for (const bannerText of banners) {
          if (!findings.some(f => f.exactCopy === bannerText)) {
            const ssName = `err-${tabName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-banner-${tog.index}`;
            await ss(ssName);
            finding(
              `${tabName} > "${tog.label}" — warning banner`,
              `Toggled "${tog.label}"`,
              bannerText, 'banner', `${ssName}.png`, 'Actionable?'
            );
          }
        }
      }
      
    } catch(e) {
      log(`Toggle error: ${e.message.substring(0, 100)}`);
    }
  }
  
  // ---- Look for inline help text (these are always visible) ----
  const helpTexts = await page.evaluate((anchor) => {
    const section = document.getElementById(anchor.replace('#', '')) || 
                    document.querySelector(`[id*="${anchor.replace('#', '')}"]`) ||
                    document.body;
    const seen = new Set();
    const results = [];
    // Find description/hint text
    ['[class*="hint"]', '[class*="description"]', 'small', '[class*="help-text"]', 
     'p:not(h1 + p):not(h2 + p)', 'span[class*="info"]'].forEach(sel => {
      try {
        section.querySelectorAll(sel).forEach(el => {
          if (!el.offsetParent) return;
          const text = el.innerText?.trim();
          if (text && text.length > 15 && text.length < 300 && !seen.has(text)) {
            seen.add(text);
            results.push({ text, sel });
          }
        });
      } catch(e) {}
    });
    return results;
  }, anchor);
  
  if (helpTexts.length > 0) {
    log(`\nHelp/info texts on ${tabName}:`);
    helpTexts.forEach(ht => log(`  "${ht.text.substring(0, 120)}"`));
  }
}

// ====================== GENERAL TAB SPECIAL CASES ======================

async function auditGeneralSpecial() {
  log('\n\n========== GENERAL: SPECIAL CASES ==========');
  
  // === Auto-import OFF → Auto-sync conflict ===
  log('\n--- Auto-import OFF → Auto-sync ON conflict test ---');
  await reloadSettings();
  await scrollToSection('#default-general-settings');
  await page.waitForTimeout(1500);
  
  // Full page screenshot to see all toggles
  await page.screenshot({ path: path.join(DIR, 'general-full.png'), fullPage: true });
  
  // Find the Auto-import toggle by looking for nearby text
  const autoImportToggle = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label, [class*="label"], span'));
    for (const label of labels) {
      const text = label.innerText || '';
      if (text.toLowerCase().includes('auto-import') || text.toLowerCase().includes('auto import')) {
        // Find nearby toggle
        let p = label;
        for (let i = 0; i < 5; i++) {
          p = p.parentElement;
          if (!p) break;
          const inp = p.querySelector('input[type="checkbox"]');
          if (inp) return { id: inp.id, name: inp.name, checked: inp.checked, labelText: text.trim().substring(0, 50) };
        }
      }
    }
    return null;
  });
  
  log('Auto-import toggle info:', JSON.stringify(autoImportToggle));
  
  if (autoImportToggle) {
    // Get current state and turn OFF auto-import
    const toggle = autoImportToggle.id 
      ? await page.$(`#${autoImportToggle.id}`)
      : await page.$(`input[name="${autoImportToggle.name}"]`);
    
    if (toggle) {
      // If currently ON, turn OFF
      if (autoImportToggle.checked) {
        await toggle.click();
        await page.waitForTimeout(1500);
        
        // Look for warnings
        const warns = await getVisibleErrors();
        if (warns.length > 0) {
          await ss('err-general-autoimport-off');
          warns.forEach(w => {
            if (!findings.some(f => f.exactCopy === w.text)) {
              finding('General > Auto-import', 'Turned Auto-import OFF', w.text, 'inline', 'err-general-autoimport-off.png', 'Does it warn about auto-sync dependency?');
            }
          });
        }
        
        // Now look for auto-sync and try to enable it
        const autoSyncInfo = await page.evaluate(() => {
          const labels = Array.from(document.querySelectorAll('label, [class*="label"], span'));
          for (const label of labels) {
            const text = label.innerText || '';
            if (text.toLowerCase().includes('auto-sync') || text.toLowerCase().includes('auto sync')) {
              let p = label;
              for (let i = 0; i < 5; i++) {
                p = p.parentElement;
                if (!p) break;
                const inp = p.querySelector('input[type="checkbox"]');
                if (inp) return { id: inp.id, name: inp.name, checked: inp.checked, labelText: text.trim().substring(0, 50) };
              }
            }
          }
          return null;
        });
        
        log('Auto-sync toggle info:', JSON.stringify(autoSyncInfo));
        
        if (autoSyncInfo) {
          const syncToggle = autoSyncInfo.id 
            ? await page.$(`#${autoSyncInfo.id}`)
            : await page.$(`input[name="${autoSyncInfo.name}"]`);
          
          if (syncToggle && !autoSyncInfo.checked) {
            await syncToggle.click();
            await page.waitForTimeout(1500);
            
            const syncErrors = await getVisibleErrors();
            const modal = await page.$('[role="dialog"]');
            
            if (syncErrors.length > 0) {
              await ss('err-general-autosync-conflict');
              syncErrors.forEach(w => {
                if (!findings.some(f => f.exactCopy === w.text)) {
                  finding('General > Auto-sync (conflict)', 'Enabled Auto-sync while Auto-import is OFF', w.text, 'inline', 'err-general-autosync-conflict.png', 'Does it explain why this is a conflict?');
                }
              });
            }
            
            if (modal && await modal.isVisible()) {
              const modalText = await modal.innerText();
              await ss('err-general-autosync-modal');
              finding('General > Auto-sync conflict modal', 'Enabled Auto-sync with Auto-import OFF', modalText.trim(), 'modal', 'err-general-autosync-modal.png', 'Does modal explain the conflict clearly?');
              const cancelBtn = await modal.$('button:has-text("Cancel"), button:has-text("No")');
              if (cancelBtn) await cancelBtn.click();
            }
          }
        }
      }
    }
    
    // Save with auto-import OFF to see if there are warnings
    const saved = await clickSaveBtn();
    if (saved) {
      await page.waitForTimeout(2500);
      const saveErrors = await waitForError(4000);
      if (saveErrors.length > 0) {
        await ss('err-general-autoimport-off-save');
        saveErrors.forEach(w => {
          if (!findings.some(f => f.exactCopy === w.text)) {
            finding('General > Save (auto-import OFF)', 'Saved with Auto-import disabled', w.text, 'toast', 'err-general-autoimport-off-save.png', 'Clear?');
          }
        });
      }
    }
  }
  
  // === COGS toggle ===
  log('\n--- COGS toggle test ---');
  await reloadSettings();
  await scrollToSection('#default-general-settings');
  await page.waitForTimeout(1500);
  
  const cogsToggle = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label, span, [class*="label"]'));
    for (const label of labels) {
      const text = label.innerText || '';
      if (text.toLowerCase().includes('cogs') || text.toLowerCase().includes('cost of goods')) {
        let p = label;
        for (let i = 0; i < 5; i++) {
          p = p.parentElement;
          if (!p) break;
          const inp = p.querySelector('input[type="checkbox"]');
          if (inp) return { id: inp.id, name: inp.name, checked: inp.checked };
        }
      }
    }
    return null;
  });
  
  log('COGS toggle:', JSON.stringify(cogsToggle));
  
  if (cogsToggle) {
    const toggle = cogsToggle.id 
      ? await page.$(`#${cogsToggle.id}`)
      : await page.$(`input[name="${cogsToggle.name}"]`);
    
    if (toggle) {
      await toggle.click();
      await page.waitForTimeout(1500);
      
      const errors = await getVisibleErrors();
      const modal = await page.$('[role="dialog"]');
      
      if (errors.length > 0) {
        await ss('err-general-cogs-toggle');
        errors.forEach(w => {
          if (!findings.some(f => f.exactCopy === w.text)) {
            finding('General > COGS toggle', 'Toggled COGS tracking', w.text, 'inline', 'err-general-cogs-toggle.png', 'Warning about consequences?');
          }
        });
      }
      
      if (modal && await modal.isVisible()) {
        const modalText = await modal.innerText();
        await ss('err-general-cogs-modal');
        finding('General > COGS modal', 'Toggled COGS', modalText.trim(), 'modal', 'err-general-cogs-modal.png', 'Does it warn about impact?');
        const btn = await modal.$('button:has-text("Cancel"), button:has-text("No"), button');
        if (btn) await btn.click();
      }
    }
  }
  
  // === Check "Sync mode" section ===
  log('\n--- Sync mode change test ---');
  await reloadSettings();
  await page.waitForTimeout(1500);
  
  // Find sync mode dropdown
  const syncModeEl = await page.$('text=Per transaction');
  if (syncModeEl) {
    await syncModeEl.scrollIntoViewIfNeeded();
    await ss('general-sync-mode');
    log('Found sync mode section');
  }
  
  // === Test tooltips on info icons ===
  log('\n--- Testing all info icon tooltips ---');
  await reloadSettings();
  await scrollToSection('#default-general-settings');
  await page.waitForTimeout(1500);
  
  // Full settings page: scan all SVG icons that might be info icons
  const svgIcons = await page.$$('svg');
  log(`Total SVG icons on page: ${svgIcons.length}`);
  
  const tooltipsFound = [];
  for (let i = 0; i < Math.min(svgIcons.length, 80); i++) {
    try {
      const icon = svgIcons[i];
      if (!await icon.isVisible()) continue;
      
      await icon.hover();
      await page.waitForTimeout(500);
      
      const tooltip = await page.$('[role="tooltip"]:visible, [class*="tooltip"]:visible');
      if (tooltip) {
        const tipText = await tooltip.innerText().catch(() => '');
        if (tipText.trim().length > 3 && !tooltipsFound.includes(tipText.trim())) {
          tooltipsFound.push(tipText.trim());
          
          // Determine which section this tooltip is in
          const section = await icon.evaluate(el => {
            let p = el;
            for (let j = 0; j < 10; j++) {
              p = p.parentElement;
              if (!p) break;
              if (p.id && p.id.includes('settings')) return p.id;
            }
            // Find nearest section header
            const headers = document.querySelectorAll('h2, h3, h4, [class*="section-title"]');
            for (const h of headers) {
              // Check if this header is before the element
              if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
                return h.innerText?.trim()?.substring(0, 40);
              }
            }
            return 'unknown-section';
          });
          
          const ssName = `err-tooltip-${i}`;
          await ss(ssName);
          finding(
            `${section} > Info tooltip`,
            `Hover over info icon #${i}`,
            tipText.trim(), 'tooltip', `${ssName}.png`,
            'Is it clear and helpful?'
          );
        }
      }
    } catch(e) {}
  }
  
  // === Org-level Settings ===
  log('\n--- Org-level settings ---');
  try {
    await page.goto('https://demo.synderapp.com/company/settings', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await ss('org-settings-default');
    await page.screenshot({ path: path.join(DIR, 'org-settings-full.png'), fullPage: true });
    const orgText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    log('Org settings:\n' + orgText.substring(0, 3000));
  } catch(e) {
    log('Org settings error: ' + e.message);
  }
}

// ====================== MAIN ======================

(async () => {
  const browser = await chromium.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    timeout: 30000
  });
  
  const context = await browser.newContext({ 
    storageState: STORAGE_STATE,
    viewport: { width: 1440, height: 900 }
  });
  
  page = await context.newPage();
  
  try {
    // Verify login
    await page.goto('https://demo.synderapp.com/controlPanel/index', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    log('Login OK: ' + page.url());
    
    // Navigate to main settings page first to see all content
    await goto(SETTINGS_URL);
    await page.screenshot({ path: path.join(DIR, 'settings-full-page.png'), fullPage: true });
    const fullSettingsText = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync(path.join(DIR, 'settings-full-text.txt'), fullSettingsText);
    log('Full settings text saved (' + fullSettingsText.length + ' chars)');
    
    // Audit each section
    const sections = [
      ['General', '#default-general-settings'],
      ['Sales', '#default-sales-settings'],
      ['Invoices', '#default-invoice-settings'],
      ['Products-Services', '#default-item-settings'],
      ['Product-Mapping', '#default-product-mapping-settings'],
      ['Taxes', '#default-tax-settings'],
      ['Fees', '#default-fee-settings'],
      ['Application-Fees', '#default-applicationFee-settings'],
      ['Expenses', '#default-purchase-settings'],
      ['Payouts', '#default-payout-settings'],
      ['Multicurrency', '#default-multi-currency-settings'],
    ];
    
    for (const [tabName, anchor] of sections) {
      await auditSection(tabName, anchor);
    }
    
    // Special case: General tab specific tests
    await auditGeneralSpecial();
    
  } catch(e) {
    log('ERROR: ' + e.message);
    log(e.stack);
    try { await ss('fatal-error'); } catch(_) {}
  } finally {
    fs.writeFileSync(
      path.join(DIR, 'findings-focused.json'),
      JSON.stringify({ findings, total: findings.length, timestamp: new Date().toISOString() }, null, 2)
    );
    
    log('\n\n====== AUDIT COMPLETE ======');
    log(`Total findings: ${findings.length}`);
    findings.forEach((f, i) => {
      log(`[${i+1}] [${f.type}] ${f.location}: "${f.exactCopy.substring(0, 100)}"`);
    });
    
    await browser.close();
  }
})().catch(e => {
  log('Fatal unhandled: ' + e.message);
  process.exit(1);
});
