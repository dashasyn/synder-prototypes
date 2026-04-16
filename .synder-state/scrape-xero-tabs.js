const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'xero-capture');
fs.mkdirSync(OUT_DIR, { recursive: true });

const STORAGE_STATE = path.join(__dirname, 'storage-state.json');

const TABS = [
  'General', 'Sales', 'Invoices', 'Products/Services',
  'Product mapping', 'Taxes', 'Fees', 'Application Fees',
  'Expenses', 'Payouts', 'Multicurrency'
];

async function waitAndGet(page, selector, timeout = 8000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return await page.$(selector);
  } catch { return null; }
}

async function getSettingsText(page, tabName) {
  // Wait for settings content to load
  await page.waitForTimeout(2000);
  
  // Try to get just the settings panel content (right side)
  const settingsContent = await page.evaluate(() => {
    // Try to find the settings content area
    const selectors = [
      '.settings-content',
      '[class*="settings-panel"]',
      '[class*="tab-content"]',
      'main',
      '#root > div > div > div:last-child'
    ];
    
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        // Get all text nodes, filtering out nav/sidebar items
        return el.innerText || el.textContent || '';
      }
    }
    
    // Fallback: get full body text but filter
    return document.body.innerText || '';
  });
  
  return settingsContent;
}

async function scrapeSettingsTab(page, tabName) {
  console.log(`\n--- Scraping tab: ${tabName} ---`);
  
  // Look for the tab link
  try {
    // Find tabs in sidebar
    const tabLinks = await page.$$('[class*="sidebar"] a, [class*="nav"] a, [class*="menu"] a, a[href*="setting"]');
    
    let found = false;
    for (const link of tabLinks) {
      const text = await link.textContent();
      if (text && text.trim() === tabName) {
        await link.click();
        await page.waitForTimeout(2000);
        found = true;
        console.log(`Clicked tab: ${tabName}`);
        break;
      }
    }
    
    if (!found) {
      // Try clicking by text
      const el = await page.getByText(tabName, { exact: true }).first();
      if (el) {
        await el.click();
        await page.waitForTimeout(2000);
        found = true;
      }
    }
    
    if (!found) {
      console.log(`Could not find tab: ${tabName}`);
    }
  } catch (e) {
    console.log(`Error clicking tab ${tabName}: ${e.message}`);
  }
  
  // Screenshot
  const safeName = tabName.replace(/[^a-z0-9]/gi, '-');
  await page.screenshot({ 
    path: path.join(OUT_DIR, `${safeName}.png`), 
    fullPage: false 
  });
  
  // Get text content - focus on settings panel
  const text = await page.evaluate(() => {
    // Try to find the settings right panel
    // Usually there's a sidebar on left with tabs, and main content on right
    const possibleContainers = [
      document.querySelector('[class*="settingsContent"]'),
      document.querySelector('[class*="settings-form"]'),
      document.querySelector('[class*="content-wrapper"]'),
      document.querySelector('[class*="main-content"]'),
      document.querySelector('main'),
    ];
    
    for (const container of possibleContainers) {
      if (container && container.innerText && container.innerText.length > 50) {
        return container.innerText;
      }
    }
    
    // Fallback: collect all text from toggle/setting rows
    const settingRows = document.querySelectorAll('[class*="setting-row"], [class*="toggle"], [class*="form-group"], [class*="field"]');
    if (settingRows.length > 0) {
      return Array.from(settingRows).map(el => el.innerText).join('\n');
    }
    
    return document.body.innerText;
  });
  
  fs.writeFileSync(path.join(OUT_DIR, `${safeName}.txt`), text);
  console.log(`Saved ${safeName}.txt (${text.length} chars)`);
  return text;
}

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    storageState: STORAGE_STATE,
    extraHTTPHeaders: {
      'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
      'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde'
    },
    viewport: { width: 1440, height: 900 }
  });
  
  const page = await context.newPage();
  
  // Navigate to Synder
  console.log('Navigating to Synder...');
  await page.goto('https://demo.synderapp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Screenshot to see current state
  await page.screenshot({ path: path.join(OUT_DIR, '00-start.png'), fullPage: false });
  console.log('Page title:', await page.title());
  console.log('URL:', page.url());
  
  // Check if we need to login
  if (page.url().includes('login') || page.url().includes('auth')) {
    console.log('Need to log in...');
    
    // Fill email
    const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email"]');
    if (emailInput) {
      await emailInput.fill('tututrurututu@gmail.com');
    }
    
    // Fill password
    const passInput = await page.$('input[type="password"]');
    if (passInput) {
      await passInput.fill('BJ9BG5MbZHmiLet!');
      await passInput.press('Enter');
    }
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT_DIR, '01-after-login.png') });
  }
  
  // Now look for org switcher - find the Xero org
  console.log('\nLooking for org switcher...');
  await page.screenshot({ path: path.join(OUT_DIR, '01-dashboard.png') });
  
  // Try to find and click org switcher
  const orgSelectors = [
    '[class*="org-switcher"]',
    '[class*="company-switcher"]', 
    '[class*="organization"]',
    '[data-testid*="org"]',
  ];
  
  let orgSwitcher = null;
  for (const sel of orgSelectors) {
    orgSwitcher = await page.$(sel);
    if (orgSwitcher) {
      console.log(`Found org switcher: ${sel}`);
      break;
    }
  }
  
  if (!orgSwitcher) {
    // Try to find by looking at the page structure
    console.log('Looking for org name in header...');
    const headerText = await page.evaluate(() => {
      const header = document.querySelector('header, [class*="header"], [class*="navbar"]');
      return header ? header.innerText : 'no header found';
    });
    console.log('Header text:', headerText.substring(0, 200));
  }
  
  // Get all org-related elements
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
  console.log('Page text sample:', pageText.substring(0, 500));
  
  // Try clicking the org name to open switcher
  // Common pattern: click on company/org name at top
  try {
    // Look for clickable org name elements
    const clickableOrgs = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const orgElements = elements.filter(el => {
        const text = el.innerText || '';
        return (text.includes('Xero') || text.includes('xero') || text.includes('Test') || text.includes('Dasha')) 
          && text.length < 100 
          && el.tagName !== 'SCRIPT' 
          && el.tagName !== 'STYLE';
      });
      return orgElements.slice(0, 5).map(el => ({
        tag: el.tagName,
        text: el.innerText?.substring(0, 50),
        class: el.className?.substring(0, 50)
      }));
    });
    console.log('Org-related elements:', JSON.stringify(clickableOrgs, null, 2));
  } catch (e) {}
  
  // Try to navigate to settings directly and look at org list
  // First let's see what orgs exist by navigating to the org switcher URL pattern
  await page.goto('https://demo.synderapp.com/', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);
  
  // Look for org/company menu
  const possibleOrgButtons = await page.$$('[class*="company"], [class*="org"], [class*="workspace"], [class*="account"]');
  console.log(`Found ${possibleOrgButtons.length} possible org buttons`);
  
  for (const btn of possibleOrgButtons.slice(0, 5)) {
    const text = await btn.evaluate(el => el.innerText?.substring(0, 100) || el.className?.substring(0, 100));
    console.log('  Button:', text);
  }
  
  // Try the aria-based snapshot to understand the page
  const accessibility = await page.evaluate(() => {
    // Find navigation elements
    const nav = document.querySelector('nav, [role="navigation"]');
    return nav ? nav.innerText?.substring(0, 500) : 'no nav found';
  });
  console.log('Nav text:', accessibility);

  await page.screenshot({ path: path.join(OUT_DIR, '02-looking-for-orgs.png') });
  
  await browser.close();
  console.log('\nInitial scan complete. Check xero-capture/ for screenshots.');
})();
