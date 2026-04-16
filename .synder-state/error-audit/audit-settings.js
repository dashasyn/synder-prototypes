const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STORAGE_STATE = '/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json';
const SCREENSHOT_DIR = '/home/ubuntu/.openclaw/workspace/.synder-state/error-audit';

const findings = [];
let screenshotCount = 0;

async function screenshot(page, name) {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`📸 Screenshot: ${filename}`);
  return filename;
}

function addFinding(location, trigger, exactCopy, type, screenshotFile, uxQuality) {
  findings.push({ location, trigger, exactCopy, type, screenshotFile, uxQuality });
  console.log(`\n🔴 FINDING: [${type}] ${location}`);
  console.log(`   Trigger: ${trigger}`);
  console.log(`   Copy: "${exactCopy}"`);
}

async function waitAndGetToast(page, timeoutMs = 5000) {
  try {
    // Common toast selectors in MUI/React apps
    const toastSelectors = [
      '[class*="toast"]',
      '[class*="snackbar"]',
      '[class*="notification"]',
      '[class*="alert"]',
      '.MuiAlert-message',
      '[role="alert"]',
      '[class*="Toast"]',
      '[class*="Snackbar"]',
      '[class*="error"]',
      '[class*="warning"]',
    ];
    
    for (const sel of toastSelectors) {
      try {
        const el = await page.waitForSelector(sel, { timeout: 1500, state: 'visible' });
        if (el) {
          const text = await el.innerText().catch(() => '');
          if (text && text.trim().length > 2) {
            return { text: text.trim(), selector: sel };
          }
        }
      } catch (e) { /* continue */ }
    }
  } catch (e) {}
  return null;
}

async function getAllVisibleErrors(page) {
  return await page.evaluate(() => {
    const errorTexts = [];
    
    // Check for error/warning elements
    const selectors = [
      '[class*="error"]', '[class*="Error"]',
      '[class*="warning"]', '[class*="Warning"]',
      '[class*="alert"]', '[class*="Alert"]',
      '[class*="toast"]', '[class*="Toast"]',
      '[class*="snack"]', '[class*="Snack"]',
      '[role="alert"]',
      '[class*="validation"]',
      '[class*="invalid"]',
      'p[class*="helper"]',
      '[class*="helperText"]',
      '[class*="HelperText"]',
    ];
    
    const seen = new Set();
    for (const sel of selectors) {
      try {
        const els = document.querySelectorAll(sel);
        els.forEach(el => {
          const text = el.innerText || el.textContent;
          if (text && text.trim().length > 2 && !seen.has(text.trim())) {
            seen.add(text.trim());
            errorTexts.push({ 
              selector: sel, 
              text: text.trim(),
              classes: el.className 
            });
          }
        });
      } catch (e) {}
    }
    return errorTexts;
  });
}

async function clickSaveButton(page) {
  // Try various save button patterns
  const saveSelectors = [
    'button:has-text("Save")',
    'button:has-text("Save changes")',
    'button:has-text("Apply")',
    '[data-testid*="save"]',
  ];
  
  for (const sel of saveSelectors) {
    try {
      const btn = await page.$(sel);
      if (btn) {
        const isVisible = await btn.isVisible();
        if (isVisible) {
          await btn.click();
          return true;
        }
      }
    } catch (e) {}
  }
  return false;
}

async function navigateToIntegrationSettings(page) {
  console.log('\n=== Navigating to Integration Settings ===');
  
  // Go to the main page first
  await page.goto('https://demo.synderapp.com/controlPanel/synchronization/transactions', { 
    waitUntil: 'networkidle', 
    timeout: 30000 
  });
  await page.waitForTimeout(2000);
  await screenshot(page, 'nav-00-start');
  
  // Look for settings navigation
  // Try clicking on Settings in the sidebar
  const settingsInSidebar = await page.$('a[href*="settings"], [data-testid*="settings"], nav a:has-text("Settings")');
  if (settingsInSidebar) {
    await settingsInSidebar.click();
    await page.waitForTimeout(2000);
  } else {
    await page.goto('https://demo.synderapp.com/controlPanel/settings', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    await page.waitForTimeout(2000);
  }
  
  await screenshot(page, 'nav-01-settings-page');
  console.log('Current URL:', page.url());
  
  // Get the page structure to understand navigation
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log('Page text preview:', pageText.substring(0, 500));
  
  return page.url();
}

async function findAndClickIntegration(page) {
  console.log('\n=== Finding mzkt.by Integration ===');
  
  // Look for the integration in the list
  const integText = await page.$('text=mzkt.by');
  if (integText) {
    console.log('Found mzkt.by text');
    await integText.click();
    await page.waitForTimeout(2000);
    await screenshot(page, 'nav-02-integration-clicked');
  }
  
  // Try to find Settings gear/button for the integration
  const gearButtons = await page.$$('[data-testid*="settings"], [aria-label*="Settings"], button[title*="Settings"]');
  console.log(`Found ${gearButtons.length} gear buttons`);
  
  // Look for any settings link near mzkt.by
  const currentUrl = page.url();
  console.log('URL after clicking integration:', currentUrl);
  
  return currentUrl;
}

async function exploreTabContent(page, tabName) {
  console.log(`\n=== Exploring ${tabName} tab ===`);
  
  // Get all form elements
  const formData = await page.evaluate(() => {
    const result = {
      dropdowns: [],
      toggles: [],
      inputs: [],
      selects: [],
      buttons: [],
    };
    
    // Find all select/dropdowns
    document.querySelectorAll('select, [role="combobox"], [class*="Select"], [class*="select"]').forEach(el => {
      const label = el.getAttribute('aria-label') || el.getAttribute('placeholder') || '';
      const value = el.textContent?.trim() || el.value || '';
      result.dropdowns.push({ label, value, tag: el.tagName, classes: el.className.substring(0, 80) });
    });
    
    // Find toggles/checkboxes
    document.querySelectorAll('input[type="checkbox"], [role="switch"], [class*="toggle"], [class*="Toggle"]').forEach(el => {
      const label = el.getAttribute('aria-label') || el.closest('label')?.textContent?.trim() || '';
      const checked = el.checked || el.getAttribute('aria-checked') === 'true';
      result.toggles.push({ label: label.substring(0, 80), checked });
    });
    
    // Find input fields
    document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(el => {
      const label = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || '';
      result.inputs.push({ label: label.substring(0, 60), value: (el.value || '').substring(0, 40) });
    });
    
    // Find buttons
    document.querySelectorAll('button').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text.length > 0 && text.length < 50) {
        result.buttons.push(text);
      }
    });
    
    return result;
  });
  
  console.log(`  Dropdowns: ${formData.dropdowns.length}`);
  console.log(`  Toggles: ${formData.toggles.length}`);
  console.log(`  Inputs: ${formData.inputs.length}`);
  console.log(`  Buttons: ${formData.buttons.slice(0, 10).join(', ')}`);
  
  return formData;
}

async function tryTriggerErrors(page, tabName) {
  const tabFindings = [];
  
  // Try clicking Save with current state to see default validation
  console.log(`  Trying save on ${tabName}...`);
  const saved = await clickSaveButton(page);
  if (saved) {
    await page.waitForTimeout(2000);
    const errors = await getAllVisibleErrors(page);
    if (errors.length > 0) {
      for (const err of errors) {
        if (err.text.length > 3) {
          const ssName = `err-${tabName.toLowerCase().replace(/\s+/g, '-')}-save-default`;
          await screenshot(page, ssName);
          addFinding(
            `${tabName} > Save`,
            'Clicked Save with default values',
            err.text,
            'validation',
            `${ssName}.png`,
            'auto-detected'
          );
          tabFindings.push(err.text);
        }
      }
    }
  }
  
  return tabFindings;
}

async function auditGeneralTab(page, baseUrl) {
  console.log('\n\n========== GENERAL TAB ==========');
  
  // Navigate to general tab
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  const ss1 = await screenshot(page, 'err-general-default-state');
  
  // Get full page text
  const fullText = await page.evaluate(() => document.body.innerText);
  console.log('General tab text (first 2000 chars):\n', fullText.substring(0, 2000));
  
  // Look for all tooltips/info icons
  const infoIcons = await page.$$('[data-testid*="tooltip"], [class*="tooltip"], [class*="Tooltip"], [title], svg[class*="info"]');
  console.log(`Found ${infoIcons.length} potential tooltip elements`);
  
  // Hover over info icons to reveal tooltips
  for (let i = 0; i < Math.min(infoIcons.length, 10); i++) {
    try {
      const icon = infoIcons[i];
      const isVisible = await icon.isVisible();
      if (isVisible) {
        await icon.hover();
        await page.waitForTimeout(800);
        
        // Check for tooltip content
        const tooltip = await page.$('[role="tooltip"], [class*="tooltip-content"], [class*="Tooltip-popper"]');
        if (tooltip) {
          const tooltipText = await tooltip.innerText();
          if (tooltipText && tooltipText.trim().length > 5) {
            console.log(`Tooltip: "${tooltipText.trim()}"`);
            const ssName = `err-general-tooltip-${i}`;
            await screenshot(page, ssName);
            addFinding(
              'General > Tooltip',
              'Hover over info icon',
              tooltipText.trim(),
              'tooltip',
              `${ssName}.png`,
              'informational'
            );
          }
        }
      }
    } catch (e) {}
  }
  
  // Try to find auto-sync / auto-import toggles
  await screenshot(page, 'err-general-before-toggles');
  
  // Look for toggles with labels
  const toggleData = await page.evaluate(() => {
    const toggles = [];
    // MUI Switch elements
    document.querySelectorAll('.MuiSwitch-root, [class*="Switch"]').forEach((sw, i) => {
      const label = sw.closest('label')?.textContent?.trim() 
        || sw.closest('[class*="FormControl"]')?.querySelector('label')?.textContent?.trim()
        || sw.previousElementSibling?.textContent?.trim()
        || sw.nextElementSibling?.textContent?.trim()
        || `toggle-${i}`;
      const input = sw.querySelector('input[type="checkbox"]');
      toggles.push({ 
        label: label?.substring(0, 100),
        checked: input?.checked || false,
        index: i
      });
    });
    return toggles;
  });
  
  console.log('Toggles found:', JSON.stringify(toggleData, null, 2));
  
  // Check for the Sync Mode section
  const syncModeEl = await page.$('text=Sync mode');
  if (syncModeEl) {
    console.log('Found "Sync mode" text');
    await syncModeEl.scrollIntoViewIfNeeded();
    await screenshot(page, 'err-general-syncmode-section');
  }
  
  // Look for Auto-sync toggle
  const autoSyncEl = await page.$('text=/auto.sync/i');
  if (autoSyncEl) {
    const autoSyncText = await autoSyncEl.innerText();
    console.log('Auto-sync element text:', autoSyncText);
    await autoSyncEl.scrollIntoViewIfNeeded();
    await screenshot(page, 'err-general-autosync-found');
  }
  
  // Try to find conflict by enabling Auto-sync when auto-import might be disabled
  const autoImportEl = await page.$('text=/auto.import/i');
  if (autoImportEl) {
    console.log('Found auto-import element');
    await autoImportEl.scrollIntoViewIfNeeded();
    await screenshot(page, 'err-general-autoimport-found');
  }
}

async function runFullAudit() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({ 
    storageState: STORAGE_STATE,
    viewport: { width: 1440, height: 900 }
  });
  
  const page = await context.newPage();
  
  // Set up console listener
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser error:', msg.text().substring(0, 200));
    }
  });
  
  try {
    // ============ STEP 1: Navigate to app and find the settings ============
    console.log('\n=== STEP 1: Finding the integration settings ===');
    await page.goto('https://demo.synderapp.com/controlPanel/synchronization/transactions', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    await page.waitForTimeout(3000);
    await screenshot(page, 'step1-transactions-page');
    
    console.log('Current URL:', page.url());
    
    // Get sidebar structure
    const sidebarText = await page.evaluate(() => {
      const sidebar = document.querySelector('nav, [class*="sidebar"], [class*="Sidebar"], aside');
      return sidebar ? sidebar.innerText : 'No sidebar found';
    });
    console.log('Sidebar content:', sidebarText.substring(0, 500));
    
    // Try to navigate to Settings
    await page.goto('https://demo.synderapp.com/controlPanel/settings', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    await page.waitForTimeout(3000);
    await screenshot(page, 'step2-settings-page');
    
    console.log('Settings URL:', page.url());
    const settingsText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    console.log('Settings page text:\n', settingsText.substring(0, 2000));
    
    // Find the integration in settings
    // Look for mzkt.by or Stripe in settings
    const integrationLinks = await page.evaluate(() => {
      const links = [];
      document.querySelectorAll('a, [class*="integration"], [class*="Integration"]').forEach(el => {
        const text = el.innerText?.trim() || el.textContent?.trim() || '';
        const href = el.href || '';
        if (text.length > 0 && text.length < 100) {
          links.push({ text, href });
        }
      });
      return links;
    });
    
    console.log('Integration links:', JSON.stringify(integrationLinks.slice(0, 20), null, 2));
    
    // Take a full page screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step2-settings-fullpage.png'), fullPage: true });
    
    // ============ STEP 2: Find the actual settings URL for mzkt.by ============
    // The settings page might have integration-specific settings
    // Let's check the URL patterns
    
    // Try clicking on "Connections" or "Integrations" in sidebar
    const connectionsEl = await page.$('a[href*="connection"], a[href*="integration"], [class*="navigation"] a:has-text("Connections"), nav a:has-text("Connections")');
    
    if (connectionsEl) {
      await connectionsEl.click();
      await page.waitForTimeout(2000);
      await screenshot(page, 'step3-connections-page');
    }
    
    // Let's try the direct API to get integration IDs
    const integResponse = await page.evaluate(async () => {
      try {
        const resp = await fetch('/api/integrations', { credentials: 'include' });
        if (resp.ok) return await resp.json();
      } catch (e) {}
      return null;
    });
    
    if (integResponse) {
      console.log('API integrations:', JSON.stringify(integResponse).substring(0, 500));
    }
    
    // Let's look at what URLs are in the page
    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText.trim().substring(0, 50), href: a.href }))
        .filter(l => l.text.length > 0);
    });
    
    const settingsLinks = allLinks.filter(l => l.href.includes('settings') || l.href.includes('Settings'));
    console.log('Settings-related links:', JSON.stringify(settingsLinks.slice(0, 20), null, 2));
    
    // ============ STEP 3: Navigate to org-level settings first ============
    await page.goto('https://demo.synderapp.com/controlPanel/settings', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    await page.waitForTimeout(2000);
    
    // Screenshot and explore the settings page structure
    await screenshot(page, 'step3-settings-explore');
    
    // Find what's in the settings nav
    const settingsNavItems = await page.evaluate(() => {
      const items = [];
      // Look for nav links, menu items, tabs
      const candidates = document.querySelectorAll('[class*="nav"] a, [class*="menu"] a, [class*="tab"], [role="tab"], [class*="settings"] a');
      candidates.forEach(el => {
        const text = el.innerText?.trim() || '';
        const href = el.href || el.getAttribute('data-href') || '';
        if (text.length > 0 && text.length < 80) {
          items.push({ text, href, classes: el.className.substring(0, 60) });
        }
      });
      return items;
    });
    
    console.log('Settings nav items:', JSON.stringify(settingsNavItems.slice(0, 30), null, 2));
    
    // ============ STEP 4: Try to find integration-specific settings ============
    // In Synder, integration settings are usually at a URL like:
    // /controlPanel/settings/integration/[id]/general
    // or accessible from the integrations list
    
    // Let's search the page for any element related to mzkt.by (Stripe integration)
    const mzktEl = await page.$('text=mzkt');
    if (mzktEl) {
      console.log('Found mzkt element');
      const mzktParent = await mzktEl.evaluate(el => {
        let p = el.parentElement;
        for (let i = 0; i < 5; i++) {
          const link = p.querySelector('a');
          if (link) return link.href;
          p = p.parentElement;
        }
        return null;
      });
      console.log('mzkt parent link:', mzktParent);
    }
    
    // Check the network for settings-related requests
    const requests = [];
    page.on('request', req => {
      if (req.url().includes('settings') || req.url().includes('integration')) {
        requests.push(req.url());
      }
    });
    
    // Navigate around to find settings
    await page.goto('https://demo.synderapp.com/controlPanel/integrations', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    await page.waitForTimeout(2000);
    await screenshot(page, 'step4-integrations');
    
    const integrationsText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    console.log('Integrations page:', integrationsText.substring(0, 1000));
    
    // Look for mzkt.by row and settings button
    const mzktRow = await page.$('text=mzkt.by');
    if (mzktRow) {
      console.log('Found mzkt.by on integrations page');
      await mzktRow.scrollIntoViewIfNeeded();
      await screenshot(page, 'step4-mzkt-found');
      
      // Look for settings button near it
      const row = await mzktRow.evaluate(el => {
        // Walk up to find the row container
        let p = el;
        for (let i = 0; i < 10; i++) {
          p = p.parentElement;
          if (!p) break;
          const links = p.querySelectorAll('a, button');
          if (links.length >= 2) {
            return {
              links: Array.from(links).map(l => ({ 
                text: l.innerText.trim().substring(0, 50), 
                href: l.href || '',
                'data-testid': l.getAttribute('data-testid') || ''
              })),
              html: p.innerHTML.substring(0, 500)
            };
          }
        }
        return null;
      });
      
      if (row) {
        console.log('Row structure:', JSON.stringify(row, null, 2));
        
        // Try to find and click settings for this integration
        const settingsBtn = await page.$('[data-testid*="settings"]');
        if (settingsBtn) {
          await settingsBtn.click();
          await page.waitForTimeout(2000);
          console.log('After settings click URL:', page.url());
          await screenshot(page, 'step4-after-settings-click');
        }
      }
    }
    
    // Try to find the settings URL by examining the page
    const pageUrls = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a[href]');
      return Array.from(anchors).map(a => a.href).filter(h => h.includes('setting'));
    });
    console.log('Settings URLs found:', pageUrls.slice(0, 10));
    
    // ============ STEP 5: Try known URL patterns ============
    const candidateUrls = [
      'https://demo.synderapp.com/controlPanel/settings/integration',
      'https://demo.synderapp.com/controlPanel/integration-settings',
    ];
    
    for (const url of candidateUrls) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(1500);
        const currentUrl = page.url();
        console.log(`Tried ${url} → ${currentUrl}`);
        if (!currentUrl.includes('404') && currentUrl !== url) {
          await screenshot(page, `step5-${url.replace(/[^a-z0-9]/gi, '-').substring(40)}`);
        }
      } catch (e) {
        console.log(`Failed: ${url}: ${e.message}`);
      }
    }
    
  } catch (e) {
    console.error('Error in audit:', e);
    await screenshot(page, 'error-state');
  } finally {
    // Save initial findings
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'initial-findings.json'),
      JSON.stringify({ findings, timestamp: new Date().toISOString() }, null, 2)
    );
    
    await browser.close();
    console.log('\n\n=== INITIAL AUDIT COMPLETE ===');
    console.log(`Findings: ${findings.length}`);
  }
}

runFullAudit().catch(console.error);
