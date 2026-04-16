/**
 * Synder Error Copy Audit - Phase 1: Settings & Integration
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = '/home/ubuntu/.openclaw/workspace/.synder-state/error-audit';
const STORAGE_STATE = '/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json';
const BASE_URL = 'https://demo.synderapp.com';

const findings = [];

async function screenshot(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, name);
  await page.screenshot({ path: filepath, fullPage: false });
  return name;
}

async function findErrorsOnPage(page) {
  // Look for various error/warning elements
  const selectors = [
    '.error', '.warning', '.alert', '[class*="error"]', '[class*="warning"]',
    '[class*="Error"]', '[class*="Warning"]', '[class*="toast"]', '[class*="Toast"]',
    '[class*="snack"]', '[class*="Snack"]', '[role="alert"]', '[class*="notification"]',
    '[class*="banner"]', '[class*="Banner"]', '[class*="invalid"]', '[class*="Invalid"]',
    '.MuiAlert-root', '[class*="MuiAlert"]', '[class*="helper"]', '[class*="Helper"]',
    'p[class*="error"]', 'span[class*="error"]', 'div[class*="error"]'
  ];
  
  const found = [];
  for (const sel of selectors) {
    try {
      const els = await page.$$(sel);
      for (const el of els) {
        const text = (await el.textContent())?.trim();
        const visible = await el.isVisible();
        if (text && text.length > 2 && text.length < 500 && visible) {
          found.push({ selector: sel, text });
        }
      }
    } catch(e) {}
  }
  return found;
}

function addFinding(location, trigger, copy, type, screenshot, severity, uxNotes) {
  findings.push({ location, trigger, copy, type, screenshot, severity, uxNotes });
  console.log(`[FINDING] ${type.toUpperCase()} | ${location} | "${copy.substring(0, 80)}"`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE,
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[CONSOLE ERROR]', msg.text().substring(0, 100));
  });

  // ============================================================
  // 1. SETTINGS PAGE - General tab
  // ============================================================
  console.log('\n=== 1. SETTINGS - General ===');
  await page.goto(`${BASE_URL}/controlPanel/settings`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await screenshot(page, 'set-01-general.png');
  
  // Check what's visible
  const settingsText = await page.evaluate(() => document.body.innerText);
  console.log('Settings page text snippet:', settingsText.substring(0, 500));
  
  // Look for tabs
  const tabs = await page.$$('[role="tab"], .tab, [class*="Tab"]');
  console.log('Tab count:', tabs.length);
  for (const tab of tabs) {
    const t = await tab.textContent();
    console.log(' - Tab:', t?.trim());
  }
  
  // ============================================================
  // 1b. Try to find auto-sync settings toggle
  // ============================================================
  // Look for auto-sync related toggles
  const toggleLabels = await page.$$eval('label, [class*="label"], [class*="Label"]', els => 
    els.map(e => e.textContent?.trim()).filter(t => t && t.length < 100)
  );
  console.log('Labels on settings:', toggleLabels.slice(0, 20));
  
  // ============================================================
  // 2. SETTINGS - look for Per Transaction org
  // ============================================================
  console.log('\n=== 2. ORG SWITCHER ===');
  // Check current org
  const orgName = await page.$eval('[class*="org"], [class*="Org"], [class*="company"], [class*="Company"]', 
    el => el.textContent?.trim()
  ).catch(() => 'not found');
  console.log('Current org:', orgName);
  
  // ============================================================
  // 3. Navigate to integration settings
  // ============================================================
  console.log('\n=== 3. INTEGRATION SETTINGS ===');
  await page.goto(`${BASE_URL}/controlPanel/integrations`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await screenshot(page, 'integ-01-list.png');
  
  // Find integration cards/rows
  const integLinks = await page.$$('[class*="integration"], [class*="Integration"], [href*="integration"]');
  console.log('Integration links found:', integLinks.length);
  
  // Click first integration to get to settings
  const integCards = await page.$$('[class*="card"], [class*="Card"], [class*="row"], [class*="Row"]');
  console.log('Cards/rows found:', integCards.length);
  
  // Look for settings link
  const settingsLinks = await page.$$('a[href*="settings"], button:has-text("Settings"), [aria-label*="settings"]');
  console.log('Settings links:', settingsLinks.length);

  // ============================================================
  // 4. INTEGRATION - General tab - try saving with empty required fields
  // ============================================================
  // Navigate directly to integration settings
  await page.goto(`${BASE_URL}/controlPanel/integrations`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Click the first integration's settings
  const firstSettingsBtn = await page.$('[class*="settings"], a[href*="settings"], button[title*="settings"]');
  if (firstSettingsBtn) {
    await firstSettingsBtn.click();
    await page.waitForTimeout(2000);
    await screenshot(page, 'integ-02-settings-page.png');
  }
  
  // ============================================================
  // 5. SMART RULES - create with missing fields
  // ============================================================
  console.log('\n=== 5. SMART RULES ===');
  await page.goto(`${BASE_URL}/controlPanel/smartRules`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await screenshot(page, 'smart-01-list.png');
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('Smart rules text:', pageText.substring(0, 300));
  
  // Find create button
  const createBtn = await page.$('button:has-text("Create"), button:has-text("Add"), button:has-text("New"), [class*="create"], [class*="Create"]');
  if (createBtn) {
    await createBtn.click();
    await page.waitForTimeout(2000);
    await screenshot(page, 'smart-02-create-modal.png');
    
    // Try saving empty
    const saveBtn = await page.$('button:has-text("Save"), button:has-text("Create"), button[type="submit"]');
    if (saveBtn) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'smart-03-validation-errors.png');
      const errors = await findErrorsOnPage(page);
      console.log('Smart rules validation errors:', errors);
      for (const e of errors) {
        addFinding('Smart Rules > Create Rule', 'Click Save with empty form', e.text, 'validation', 'smart-03-validation-errors.png', 'critical', 'Validation on required fields');
      }
    }
    
    // Close if modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  
  // ============================================================
  // 6. INVOICING
  // ============================================================
  console.log('\n=== 6. INVOICING ===');
  await page.goto(`${BASE_URL}/controlPanel/invoices`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await screenshot(page, 'inv-01-list.png');
  const invText = await page.evaluate(() => document.body.innerText);
  console.log('Invoice page text:', invText.substring(0, 300));
  
  // ============================================================
  // 7. SUMMARIES
  // ============================================================
  console.log('\n=== 7. SUMMARIES ===');
  await page.goto(`${BASE_URL}/controlPanel/summaries`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await screenshot(page, 'sum-01-page.png');
  const sumText = await page.evaluate(() => document.body.innerText);
  console.log('Summaries text:', sumText.substring(0, 300));
  
  // ============================================================
  // 8. MANUAL JOURNALS
  // ============================================================
  console.log('\n=== 8. MANUAL JOURNALS ===');
  await page.goto(`${BASE_URL}/controlPanel/manualJournals`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await screenshot(page, 'mj-01-list.png');
  
  // ============================================================
  // 9. TRANSACTIONS
  // ============================================================
  console.log('\n=== 9. TRANSACTIONS ===');
  await page.goto(`${BASE_URL}/controlPanel/transactions`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await screenshot(page, 'tx-01-list.png');
  
  // ============================================================
  // 10. REVENUE RECOGNITION
  // ============================================================
  console.log('\n=== 10. REVENUE RECOGNITION ===');
  await page.goto(`${BASE_URL}/controlPanel/revenueRecognition`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await screenshot(page, 'rev-01-page.png');
  const revText = await page.evaluate(() => document.body.innerText);
  console.log('RevRec text:', revText.substring(0, 300));
  
  // ============================================================
  // 11. AI REPORTS  
  // ============================================================
  console.log('\n=== 11. AI REPORTS ===');
  await page.goto(`${BASE_URL}/controlPanel/aiReports`, { waitUntil: 'networkidle', timeout: 30000 }).catch(()=>{});
  await page.waitForTimeout(2000);
  await screenshot(page, 'ai-01-page.png');
  const aiText = await page.evaluate(() => document.body.innerText);
  console.log('AI Reports text:', aiText.substring(0, 300));
  
  // ============================================================
  // Get page URL list from nav
  // ============================================================
  await page.goto(`${BASE_URL}/controlPanel/index`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const navLinks = await page.$$eval('nav a, [class*="sidebar"] a, [class*="menu"] a', 
    els => [...new Set(els.map(e => e.href))].filter(h => h.includes('controlPanel'))
  );
  console.log('\nAll nav links:', navLinks);
  
  await browser.close();
  
  // Save findings so far
  fs.writeFileSync('/home/ubuntu/.openclaw/workspace/.synder-state/error-audit/findings-phase1.json', 
    JSON.stringify(findings, null, 2));
  console.log('\n=== Phase 1 complete. Findings:', findings.length);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
