const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'xero-capture');
fs.mkdirSync(OUT_DIR, { recursive: true });

const STORAGE_STATE = path.join(__dirname, 'storage-state.json');

const CF_HEADERS = {
  'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
  'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde'
};

// Helper: get clean settings panel text (exclude sidebar nav)
async function getSettingsText(page) {
  await page.waitForTimeout(2500);
  return await page.evaluate(() => {
    // Find the settings content area - usually the right panel
    // Try multiple approaches
    
    // Approach 1: find by CSS class patterns
    const candidates = [
      document.querySelector('[class*="settingsContent"]'),
      document.querySelector('[class*="settings-content"]'),
      document.querySelector('[class*="content_wrap"]'),
      document.querySelector('[class*="rightPanel"]'),
      document.querySelector('[class*="right-panel"]'),
    ];
    
    for (const el of candidates) {
      if (el && el.innerText && el.innerText.trim().length > 30) {
        return el.innerText;
      }
    }
    
    // Approach 2: find all form/setting elements and collect their text
    // Get all label+description pairs in the page
    const allText = [];
    
    // Get toggle rows
    const rows = document.querySelectorAll('[class*="row"], [class*="setting"], [class*="field-wrap"]');
    if (rows.length > 3) {
      return Array.from(rows).map(r => r.innerText).join('\n---\n');
    }
    
    // Approach 3: get full body but try to extract just the relevant part
    const body = document.body.innerText;
    // Look for the point where settings content starts (after the sidebar)
    return body;
  });
}

// Extract ONLY the meaningful settings copy (labels, descriptions, toggle text)
// by stripping dropdown options and nav items
async function getCleanSettingsContent(page) {
  await page.waitForTimeout(2500);
  
  return await page.evaluate(() => {
    const result = [];
    
    // Strategy: collect visible text nodes that look like UI copy
    // Focus on: toggle labels, descriptions/hints, section headers, button text
    
    // 1. Find all toggle rows (label + description)
    const settingItems = [];
    
    // Common patterns for setting rows across React apps
    const rowSelectors = [
      '[class*="setting"]', '[class*="toggle-row"]', '[class*="form-row"]',
      '[class*="config"]', '[class*="option-row"]'
    ];
    
    // Try to find the settings panel (the main content, not sidebar)
    // Usually it's positioned to the right of the navigation
    const allDivs = document.querySelectorAll('div');
    let mainPanel = null;
    
    // Find the div that contains 'Auto-import' or similar settings text
    for (const div of allDivs) {
      const text = div.innerText || '';
      if ((text.includes('Auto-import') || text.includes('Auto-sync') || 
           text.includes('Clearing account') || text.includes('Apply Taxes') ||
           text.includes('Process payouts') || text.includes('Product settings')) 
          && text.length > 200 && text.length < 50000) {
        // Check it's not the whole body
        if (!div.querySelector('[class*="sidebar"]') && !div.querySelector('nav')) {
          mainPanel = div;
          break;
        }
      }
    }
    
    if (mainPanel) {
      // Get clean text - strip just the dropdown option lists
      // We want: labels, descriptions, button text, but NOT dropdown option lists
      const clone = mainPanel.cloneNode(true);
      
      // Remove dropdown option lists (usually long lists of account names)
      const dropdowns = clone.querySelectorAll('[class*="menu"], [class*="option"], select option, [class*="dropdown"] li');
      dropdowns.forEach(d => {
        // Only remove if it's a long list (>5 items visible)
        const parent = d.parentNode;
        if (parent && parent.children.length > 5) {
          d.remove();
        }
      });
      
      return mainPanel.innerText;
    }
    
    return document.body.innerText;
  });
}

async function scrapeTab(page, tabName) {
  const safeName = tabName.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-');
  console.log(`\n=== Scraping: ${tabName} ===`);
  
  // Click the tab in the left sidebar
  try {
    // Find sidebar links
    const links = await page.$$('a, [role="tab"], [class*="sidebar"] span, [class*="nav-item"]');
    let clicked = false;
    
    for (const link of links) {
      const text = (await link.textContent() || '').trim();
      if (text === tabName) {
        await link.click();
        clicked = true;
        console.log(`  Clicked "${tabName}"`);
        await page.waitForTimeout(2500);
        break;
      }
    }
    
    if (!clicked) {
      // Try getByRole
      const tabEl = page.getByRole('link', { name: tabName, exact: true });
      const count = await tabEl.count();
      if (count > 0) {
        await tabEl.first().click();
        clicked = true;
        await page.waitForTimeout(2500);
      }
    }
    
    if (!clicked) {
      // Try by text
      const textEl = page.getByText(tabName, { exact: true });
      const count = await textEl.count();
      if (count > 0) {
        await textEl.first().click();
        clicked = true;
        await page.waitForTimeout(2500);
      }
    }
    
    if (!clicked) {
      console.log(`  WARNING: Could not click tab "${tabName}"`);
    }
  } catch(e) {
    console.log(`  Error clicking tab: ${e.message}`);
  }
  
  // Screenshot
  await page.screenshot({ 
    path: path.join(OUT_DIR, `${safeName}.png`),
    fullPage: false
  });
  
  // Get page text
  const rawText = await getCleanSettingsContent(page);
  fs.writeFileSync(path.join(OUT_DIR, `${safeName}.txt`), rawText);
  console.log(`  Saved ${safeName}.txt (${rawText.length} chars)`);
  
  // Also get just the labels/descriptions in a structured way
  const structured = await page.evaluate(() => {
    const items = [];
    
    // Find all visible text elements that look like setting labels/descriptions
    const allEls = document.querySelectorAll('label, p, span, h1, h2, h3, h4, [class*="label"], [class*="description"], [class*="hint"], [class*="helper"]');
    
    for (const el of allEls) {
      const text = (el.innerText || '').trim();
      if (text.length > 5 && text.length < 500) {
        // Skip if it's just a nav item (very short, no spaces usually)
        // Skip account names (they don't have spaces or are very long lists)
        const hasMultipleWords = text.split(' ').length > 1;
        const isLikelyNav = text.length < 20 && !text.includes(' ');
        
        if (hasMultipleWords && !isLikelyNav) {
          // Check if visible
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            items.push(text);
          }
        }
      }
    }
    
    // Dedupe
    return [...new Set(items)];
  });
  
  fs.writeFileSync(
    path.join(OUT_DIR, `${safeName}-labels.json`), 
    JSON.stringify(structured, null, 2)
  );
  console.log(`  Found ${structured.length} label/description elements`);
  
  return { tab: tabName, text: rawText, labels: structured };
}

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    storageState: STORAGE_STATE,
    extraHTTPHeaders: CF_HEADERS,
    viewport: { width: 1440, height: 900 }
  });
  
  const page = await context.newPage();
  
  // Go to Synder dashboard first
  console.log('Loading Synder...');
  await page.goto('https://demo.synderapp.com/', { 
    waitUntil: 'networkidle', 
    timeout: 30000 
  });
  await page.waitForTimeout(2000);
  
  const currentOrg = await page.evaluate(() => {
    const orgEl = document.querySelector('[class*="orgSelector"], [class*="org-selector"], [class*="company-name"]');
    return orgEl ? orgEl.innerText?.trim() : 'unknown';
  });
  console.log('Current org:', currentOrg);
  
  // Navigate to Settings
  console.log('\nNavigating to Settings...');
  await page.goto('https://demo.synderapp.com/settings', { 
    waitUntil: 'networkidle', 
    timeout: 20000 
  });
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: path.join(OUT_DIR, '00-settings-landing.png') });
  console.log('Settings URL:', page.url());
  
  // Check what we see
  const settingsText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
  console.log('Settings page text:', settingsText.substring(0, 300));
  
  // Navigate to integration settings - click on mzkt.by (Stripe integration)
  // or find the per-transaction settings
  
  // Look for integration selector / sync mode settings
  // First let's find the integration settings entry point
  const links = await page.$$('a');
  const linkTexts = [];
  for (const link of links) {
    const text = (await link.textContent() || '').trim();
    const href = await link.getAttribute('href') || '';
    if (text.length > 0 && text.length < 100) {
      linkTexts.push({ text, href });
    }
  }
  console.log('Available links:', JSON.stringify(linkTexts.slice(0, 20), null, 2));
  
  // Find settings link
  let settingsUrl = page.url();
  
  // Look for "Per transaction" or integration settings
  if (!settingsUrl.includes('accounting-settings')) {
    // Try to click Settings in the sidebar
    const settingsLink = await page.getByRole('link', { name: 'Settings' }).first();
    if (await settingsLink.count() > 0) {
      await settingsLink.click();
      await page.waitForTimeout(2000);
    }
  }
  
  await page.screenshot({ path: path.join(OUT_DIR, '01-after-settings-click.png') });
  console.log('Current URL:', page.url());
  
  // Try to find the integration (mzkt.by) and click Settings for it
  const integrationSettings = await page.evaluate(() => {
    const allLinks = document.querySelectorAll('a');
    const results = [];
    for (const link of allLinks) {
      results.push({ text: link.innerText?.trim()?.substring(0, 50), href: link.href });
    }
    return results.filter(l => l.text && l.href).slice(0, 30);
  });
  console.log('Links on settings page:', JSON.stringify(integrationSettings, null, 2));
  
  // Navigate directly to per-transaction settings
  // Based on previous work, the URL pattern should be similar to:
  // /accounting/public/accounting-settings or similar
  
  // Try to click "Settings" next to an integration
  const settingsBtns = await page.$$('button, a');
  for (const btn of settingsBtns) {
    const text = (await btn.textContent() || '').trim();
    if (text === 'Settings' || text === 'Configure') {
      console.log('Found Settings button');
      await btn.click();
      await page.waitForTimeout(2000);
      break;
    }
  }
  
  await page.screenshot({ path: path.join(OUT_DIR, '02-integration-settings.png') });
  console.log('URL after clicking Settings:', page.url());
  
  // Check if we're in per-transaction settings now
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Body text:', bodyText);
  
  // If we see "Per transaction" mode selector, we're in the right place
  // Look for the sync mode switcher and click Per transaction
  if (bodyText.includes('Per transaction') || bodyText.includes('synchronization mode')) {
    console.log('Found sync mode selector!');
    
    // Click "Per transaction" 
    const perTxn = await page.getByText('Per transaction', { exact: false });
    if (await perTxn.count() > 0) {
      await perTxn.first().click();
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ path: path.join(OUT_DIR, '03-per-transaction-selected.png') });
  }
  
  // Now try to navigate to accounting settings with per-transaction mode
  // Look for the URL pattern from previous captures
  const currentUrl = page.url();
  console.log('Current URL after setup:', currentUrl);
  
  // Try direct URL if we know it
  if (!currentUrl.includes('per-transaction') && !currentUrl.includes('accounting-settings')) {
    // Try the direct settings URL patterns we know
    const urlsToTry = [
      'https://demo.synderapp.com/accounting/public/accounting-settings',
      'https://demo.synderapp.com/settings/accounting',
      'https://demo.synderapp.com/settings/per-transaction',
    ];
    
    for (const url of urlsToTry) {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      const text = await page.evaluate(() => document.body.innerText.substring(0, 200));
      console.log(`Tried ${url}: ${text.substring(0, 100)}`);
      if (!text.includes('404') && !text.includes('forbidden') && !text.includes('error')) {
        console.log('Found working URL:', url);
        break;
      }
    }
  }
  
  await page.screenshot({ path: path.join(OUT_DIR, '04-settings-final.png') });
  console.log('Final URL:', page.url());
  
  const finalText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
  fs.writeFileSync(path.join(OUT_DIR, 'page-debug.txt'), finalText);
  console.log('Page content saved to page-debug.txt');
  
  await browser.close();
  console.log('\nDone. Check xero-capture/ directory.');
})();
