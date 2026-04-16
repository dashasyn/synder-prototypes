const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STORAGE_STATE = '/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json';
const SCREENSHOT_DIR = '/home/ubuntu/.openclaw/workspace/.synder-state/error-audit';

const findings = [];

async function ss(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath });
  console.log(`📸 ${name}.png`);
  return `${name}.png`;
}

function log(msg) { console.log(msg); }

function addFinding(location, trigger, exactCopy, type, ssFile, uxQuality) {
  const f = { location, trigger, exactCopy, type, screenshot: ssFile, uxQuality };
  findings.push(f);
  log(`\n🔴 [${type.toUpperCase()}] ${location}`);
  log(`   Trigger: ${trigger}`);
  log(`   Copy: "${exactCopy}"`);
  return f;
}

async function gotoUrl(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2500);
  } catch (e) {
    log(`Navigation warning for ${url}: ${e.message.substring(0, 100)}`);
    await page.waitForTimeout(2000);
  }
}

async function getErrors(page) {
  return await page.evaluate(() => {
    const result = [];
    const seen = new Set();
    const selectors = [
      '[class*="error" i]', '[class*="Error"]', '[class*="warning" i]',
      '[class*="alert" i]', '[class*="toast" i]', '[class*="snack" i]',
      '[role="alert"]', 'p[class*="helper"]', '[class*="helperText"]',
      '[class*="invalid" i]', '[class*="validation" i]',
      '[class*="ErrorMessage"]', '[class*="errorText"]',
      '.MuiFormHelperText-root', '.MuiAlert-message'
    ];
    for (const sel of selectors) {
      try {
        document.querySelectorAll(sel).forEach(el => {
          const text = (el.innerText || el.textContent || '').trim();
          if (text.length > 3 && !seen.has(text) && 
              !text.includes('function(') && !text.includes('{') &&
              text.length < 500) {
            seen.add(text);
            result.push({ text, selector: sel, classes: el.className.substring(0, 100) });
          }
        });
      } catch (e) {}
    }
    return result;
  });
}

async function waitForToast(page) {
  try {
    await page.waitForSelector('[role="alert"], [class*="toast" i], [class*="snack" i], [class*="Toast"], [class*="Snackbar"]', 
      { timeout: 4000, state: 'visible' });
    await page.waitForTimeout(500);
  } catch (e) {}
  return await getErrors(page);
}

async function clickSave(page) {
  const saveBtn = await page.$('button:has-text("Save"), button:has-text("Save changes")');
  if (saveBtn) {
    const vis = await saveBtn.isVisible().catch(() => false);
    if (vis) {
      await saveBtn.click();
      return true;
    }
  }
  return false;
}

async function hoverTooltips(page, tabName) {
  // Hover over all info/help icons
  const infoIcons = await page.$$('svg[data-testid*="info" i], svg[data-testid*="help" i], [class*="info-icon"], [class*="InfoIcon"], [data-tip], [data-tooltip]');
  for (let i = 0; i < infoIcons.length; i++) {
    try {
      const icon = infoIcons[i];
      if (await icon.isVisible()) {
        await icon.hover();
        await page.waitForTimeout(700);
        const tooltip = await page.$('[role="tooltip"]');
        if (tooltip && await tooltip.isVisible()) {
          const text = await tooltip.innerText();
          if (text && text.trim().length > 3) {
            const name = `err-${tabName}-tooltip-${i}`;
            await ss(page, name);
            addFinding(`${tabName} > Tooltip ${i}`, 'Hover over info icon', text.trim(), 'tooltip', `${name}.png`, 'Check if clear and helpful');
          }
        }
      }
    } catch (e) {}
  }
}

// ================== MAIN AUDIT ==================

async function auditIntegration(page) {
  // First, let's explore the control panel to find integration settings
  log('\n=== Finding Integration Settings URL ===');
  
  await gotoUrl(page, 'https://demo.synderapp.com/controlPanel/index');
  await ss(page, 'nav-01-dashboard');
  
  // Get all links in the app
  const allLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({ text: a.innerText.trim().substring(0, 60), href: a.href }))
      .filter(l => l.text.length > 0 && !l.href.includes('javascript'));
  });
  
  log('All links found:');
  allLinks.forEach(l => log(`  ${l.text} → ${l.href}`));
  
  // Look for Settings in sidebar
  const settingsLinks = allLinks.filter(l => 
    l.text.toLowerCase().includes('setting') || 
    l.href.toLowerCase().includes('setting')
  );
  log('\nSettings links:', JSON.stringify(settingsLinks, null, 2));
  
  // Click settings
  if (settingsLinks.length > 0) {
    await page.goto(settingsLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2500);
    await ss(page, 'nav-02-settings');
    log('Settings URL:', page.url());
    
    const settingsContent = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    log('Settings content:\n', settingsContent.substring(0, 2000));
  }
  
  // Look for integrations in settings
  await gotoUrl(page, 'https://demo.synderapp.com/controlPanel/settings');
  await ss(page, 'nav-03-settings-direct');
  
  // Get page structure
  const pageHTML = await page.evaluate(() => {
    // Get a simplified version of the page
    const getText = (el) => {
      const texts = [];
      el.querySelectorAll('a, button, h1, h2, h3, h4, span[class*="title"], div[class*="name"]').forEach(e => {
        const t = e.innerText?.trim();
        const h = e.href || '';
        if (t && t.length > 0 && t.length < 80) {
          texts.push({ tag: e.tagName, text: t, href: h });
        }
      });
      return texts;
    };
    return getText(document.body);
  });
  
  log('\nPage structure (first 50 items):');
  pageHTML.slice(0, 50).forEach(item => log(`  [${item.tag}] ${item.text} ${item.href ? '→ ' + item.href : ''}`));
}

async function findSettingsUrl(page) {
  // Try to find the settings URL for mzkt.by integration
  log('\n=== Finding mzkt.by settings URL ===');
  
  await gotoUrl(page, 'https://demo.synderapp.com/controlPanel/settings');
  
  // Take full page screenshot
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'nav-settings-full.png'), fullPage: true });
  
  // Get ALL links on page
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({ text: a.innerText.trim().substring(0, 80), href: a.href }))
      .filter(l => l.text.length > 0);
  });
  
  // Find integration links
  const integLinks = links.filter(l => 
    l.text.toLowerCase().includes('mzkt') ||
    l.text.toLowerCase().includes('stripe') ||
    l.href.toLowerCase().includes('integration') ||
    l.href.toLowerCase().includes('settings')
  );
  
  log('Integration-related links:', JSON.stringify(integLinks, null, 2));
  
  // Look for any "General", "Sales", "Invoices" tabs - these would be integration settings
  const tabLinks = links.filter(l => 
    ['general', 'sales', 'invoices', 'products', 'taxes', 'fees', 'expenses', 'payouts', 'multicurrency'].some(
      tab => l.text.toLowerCase().includes(tab)
    )
  );
  
  log('\nTab links:', JSON.stringify(tabLinks, null, 2));
  
  return { links, integLinks, tabLinks };
}

async function exploreFromScratch(page) {
  log('\n=== Exploring from scratch ===');
  
  // Start at dashboard
  await gotoUrl(page, 'https://demo.synderapp.com/controlPanel/index');
  await ss(page, 'explore-01-dashboard');
  
  // Get full page HTML structure
  const structure = await page.evaluate(() => {
    const nav = document.querySelector('nav, [class*="sidebar"], [class*="Sidebar"], aside, [class*="navigation"]');
    return nav ? nav.innerText : document.body.innerText.substring(0, 3000);
  });
  log('Navigation structure:', structure.substring(0, 1000));
  
  // Find ALL navigation items with their URLs
  const navItems = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('a[href], [onclick], [data-href]').forEach(el => {
      const text = el.innerText?.trim() || el.getAttribute('title') || '';
      const href = el.href || el.getAttribute('data-href') || '';
      if (text.length > 0 && text.length < 100 && href) {
        items.push({ text, href });
      }
    });
    return items;
  });
  
  // Find unique URLs
  const uniqueUrls = [...new Set(navItems.map(i => i.href))];
  log('\nUnique URLs:', uniqueUrls.slice(0, 30).join('\n  '));
  
  // Navigate to Connections/Integrations page
  const connectionPage = await page.$('a[href*="connection"], a[href*="integration"], a:has-text("Connections"), a:has-text("Integrations")');
  if (connectionPage) {
    await connectionPage.click();
    await page.waitForTimeout(2500);
    await ss(page, 'explore-02-connections');
    log('Connections URL:', page.url());
  }
  
  // Try /connections
  await gotoUrl(page, 'https://demo.synderapp.com/controlPanel/connections');
  await ss(page, 'explore-03-connections-direct');
  log('Connections direct URL:', page.url());
  
  // Full page of connections
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'explore-03-connections-full.png'), fullPage: true });
  
  const connText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
  log('Connections page text:', connText.substring(0, 2000));
  
  // Find mzkt.by
  const hasMzkt = connText.toLowerCase().includes('mzkt');
  log('Has mzkt.by:', hasMzkt);
  
  if (hasMzkt) {
    // Find the settings gear for mzkt
    const mzktEl = await page.$('text=mzkt');
    if (mzktEl) {
      await mzktEl.scrollIntoViewIfNeeded();
      await ss(page, 'explore-04-mzkt-visible');
      
      // Find settings button near it
      const settingsBtn = await mzktEl.evaluate(el => {
        let p = el;
        for (let i = 0; i < 10; i++) {
          p = p.parentElement;
          if (!p) break;
          const btns = p.querySelectorAll('[data-testid*="settings"], a[href*="settings"], [aria-label*="settings" i], svg[class*="settings" i]');
          if (btns.length > 0) {
            return {
              href: btns[0].href,
              testid: btns[0].getAttribute('data-testid'),
              classes: btns[0].className.substring(0, 80)
            };
          }
        }
        return null;
      });
      
      log('Settings button near mzkt:', JSON.stringify(settingsBtn));
      
      // Try to find any anchor links near mzkt
      const nearbyLinks = await mzktEl.evaluate(el => {
        let p = el;
        for (let i = 0; i < 8; i++) {
          p = p.parentElement;
          if (!p) break;
          const links = p.querySelectorAll('a[href]');
          if (links.length > 0) {
            return Array.from(links).map(l => ({ text: l.innerText.trim(), href: l.href }));
          }
        }
        return [];
      });
      
      log('Nearby links:', JSON.stringify(nearbyLinks));
    }
  }
  
  // Try the integrations page
  await gotoUrl(page, 'https://demo.synderapp.com/controlPanel/integrations');
  await ss(page, 'explore-05-integrations');
  log('Integrations URL:', page.url());
  
  const integText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  log('Integrations text:', integText.substring(0, 1500));
  
  // Get all links
  const integLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({ text: a.innerText.trim().substring(0, 60), href: a.href }));
  });
  
  log('Integration page links:', JSON.stringify(integLinks.slice(0, 30), null, 2));
}

async function deepExplore(page) {
  log('\n=== Deep exploring for settings URL pattern ===');
  
  // Try common Synder settings URL patterns based on previous knowledge
  const urlsToTry = [
    'https://demo.synderapp.com/controlPanel/synchronization/settings',
    'https://demo.synderapp.com/controlPanel/synchronization/transactions',
    'https://demo.synderapp.com/controlPanel/sync/settings',
    'https://demo.synderapp.com/controlPanel/integrations/settings',
  ];
  
  for (const url of urlsToTry) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      const title = await page.title();
      log(`${url} → ${currentUrl} (${title})`);
      if (currentUrl.includes('setting') || currentUrl.includes('Setting')) {
        await ss(page, `explore-url-${url.split('/').pop()}`);
        const text = await page.evaluate(() => document.body.innerText.substring(0, 2000));
        log('Page content:', text.substring(0, 500));
      }
    } catch (e) {
      log(`Failed ${url}: ${e.message.substring(0, 80)}`);
    }
  }
  
  // Go to transactions page and look for settings there
  await gotoUrl(page, 'https://demo.synderapp.com/controlPanel/synchronization/transactions');
  const txUrl = page.url();
  log('Transactions URL:', txUrl);
  await ss(page, 'explore-tx-page');
  
  // Look at the full page to find any "Settings" button
  const allButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, button')).map(el => ({
      text: el.innerText?.trim().substring(0, 60),
      href: el.href || '',
      classes: el.className.substring(0, 60)
    })).filter(b => b.text && b.text.length > 0 && b.text.length < 60);
  });
  
  const settingsRelated = allButtons.filter(b => 
    b.text.toLowerCase().includes('setting') ||
    b.href.toLowerCase().includes('setting') ||
    b.classes.toLowerCase().includes('setting')
  );
  
  log('Settings buttons on tx page:', JSON.stringify(settingsRelated, null, 2));
  
  // Find any dropdown or menu that leads to settings
  const gearIcon = await page.$('[data-testid="settings-icon"], [aria-label="Settings"], svg[class*="settings"], [class*="gear"]');
  if (gearIcon) {
    log('Found gear icon');
    await gearIcon.click();
    await page.waitForTimeout(1000);
    await ss(page, 'explore-gear-click');
    log('After gear click URL:', page.url());
  }
}

async function findSettingsViaNetworkIntercept(page) {
  log('\n=== Finding settings via network intercept ===');
  
  const settingsUrls = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('setting') || url.includes('Setting')) {
      settingsUrls.push(url);
    }
  });
  
  // Navigate around the app to trigger network requests
  await gotoUrl(page, 'https://demo.synderapp.com/controlPanel/synchronization/transactions');
  await page.waitForTimeout(3000);
  
  log('Network settings URLs intercepted:', settingsUrls.slice(0, 20));
  
  return settingsUrls;
}

async function exploreSettingsFromUI(page) {
  log('\n=== Looking for Settings via UI navigation ===');
  
  await gotoUrl(page, 'https://demo.synderapp.com/controlPanel/synchronization/transactions');
  
  // Full page screenshot
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ui-tx-full.png'), fullPage: true });
  
  // Get full text content
  const fullText = await page.evaluate(() => document.body.innerText);
  log('Full page text (2000 chars):', fullText.substring(0, 2000));
  
  // Look for org-level settings link in sidebar
  const sidebarLinks = await page.evaluate(() => {
    // Try multiple sidebar selectors
    const sidebarSelectors = ['[class*="sidebar"]', '[class*="Sidebar"]', 'nav', 'aside', '[class*="leftPanel"]', '[class*="left-panel"]'];
    for (const sel of sidebarSelectors) {
      const sidebar = document.querySelector(sel);
      if (sidebar) {
        return Array.from(sidebar.querySelectorAll('a[href], [onclick]')).map(el => ({
          text: el.innerText?.trim().substring(0, 60),
          href: el.href || '',
        })).filter(l => l.text);
      }
    }
    return [];
  });
  
  log('Sidebar links:', JSON.stringify(sidebarLinks, null, 2));
  
  // Navigate to a settings-like URL
  const sLinks = sidebarLinks.filter(l => l.href.includes('setting') || l.text.toLowerCase().includes('setting'));
  log('Settings sidebar links:', JSON.stringify(sLinks, null, 2));
  
  if (sLinks.length > 0) {
    await page.goto(sLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2500);
    await ss(page, 'ui-settings-clicked');
    log('Settings URL:', page.url());
  }
}

async function findIntegrationSettingsURL(page) {
  log('\n=== Systematic search for integration settings ===');
  
  // Start at transactions page which we know exists
  await gotoUrl(page, 'https://demo.synderapp.com/controlPanel/synchronization/transactions');
  await page.waitForTimeout(2000);
  
  // Try to hover over integration name or find a settings dropdown
  // First, get the current URL to understand the routing structure
  const txUrl = page.url();
  log('Transactions URL:', txUrl);
  
  // Take screenshot to see current state
  await ss(page, 'finding-01-tx');
  
  // Get all interactive elements
  const interactives = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('a, button, [role="menuitem"], [class*="clickable"], [class*="Clickable"]').forEach(el => {
      const text = el.innerText?.trim() || '';
      const href = el.href || '';
      const testId = el.getAttribute('data-testid') || '';
      if ((text.length > 0 || testId.length > 0) && text.length < 80) {
        items.push({ text, href, testId, tag: el.tagName });
      }
    });
    return items;
  });
  
  log('Interactive elements:', JSON.stringify(interactives.slice(0, 40), null, 2));
  
  // Look for a "Settings" link specifically in the synder navigation
  const settingsEl = await page.$('a:has-text("Settings"), [data-testid="nav-settings"], [href*="/settings"]');
  if (settingsEl) {
    log('Found settings element, clicking...');
    await settingsEl.click();
    await page.waitForTimeout(2500);
    await ss(page, 'finding-02-settings');
    log('Settings URL:', page.url());
    
    // Now look for the integration settings
    const settingsContent = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    log('Settings content:', settingsContent.substring(0, 2000));
  }
  
  // Examine the URL pattern more carefully - try known IDs
  // From previous audits, try to find the integration settings
  await gotoUrl(page, 'https://demo.synderapp.com/controlPanel/settings');
  await ss(page, 'finding-03-settings-direct');
  log('Direct settings URL:', page.url());
  
  // Get full HTML to understand structure
  const bodyText = await page.evaluate(() => document.body.innerText);
  log('\nFull settings page text:\n', bodyText.substring(0, 5000));
  
  // Get all links to find integration-specific ones
  const allLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText.trim().substring(0, 80),
      href: a.href,
      path: new URL(a.href).pathname
    })).filter(l => l.text.length > 0 && l.href.includes('demo.synderapp'));
  });
  
  log('\nAll links on settings page:', JSON.stringify(allLinks, null, 2));
}

// ================== MAIN ==================

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({ 
    storageState: STORAGE_STATE,
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  try {
    await exploreFromScratch(page);
    await findIntegrationSettingsURL(page);
    
  } catch(e) {
    log('Error: ' + e.message);
    log(e.stack);
    await ss(page, 'error-crash');
  } finally {
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'findings-v2.json'),
      JSON.stringify({ findings, timestamp: new Date().toISOString() }, null, 2)
    );
    await browser.close();
    log('\n=== DONE ===');
  }
})().catch(console.error);
