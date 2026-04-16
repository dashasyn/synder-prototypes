const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STATE_PATH = '/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json';
const OUT = '/home/ubuntu/.openclaw/workspace/.synder-state/settings-audit';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function dismissModals(page) {
  for (let i = 0; i < 3; i++) {
    try {
      const closeBtn = await page.$('button:has-text("Close")');
      if (closeBtn && await closeBtn.isVisible()) { await closeBtn.click(); await sleep(500); }
    } catch(e) {}
    try { await page.keyboard.press('Escape'); await sleep(300); } catch(e) {}
  }
}

async function captureFullPage(page, filename) {
  await page.screenshot({ path: path.join(OUT, filename), fullPage: true });
  const text = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(path.join(OUT, filename.replace('.png', '.txt')), text);
  return text;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  
  const browser = await chromium.launch({ 
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  
  const context = await browser.newContext({
    storageState: STATE_PATH,
    viewport: { width: 1440, height: 1200 }
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  
  // Go to org settings
  await page.goto('https://demo.synderapp.com/organizations/settings', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);
  
  // Click "Sync settings" button
  console.log('Looking for "Sync settings" button...');
  const syncBtn = await page.$('text=Sync settings');
  if (syncBtn) {
    console.log('Found "Sync settings", clicking...');
    await syncBtn.click();
    await sleep(4000);
    await dismissModals(page);
    
    console.log('URL:', page.url());
    const text = await captureFullPage(page, 'ptxn-main-01.png');
    console.log('Page text (first 800):', text.substring(0, 800));
    
    // Check if per-transaction interface loaded
    const hasInterface = text.includes('Auto-import') || text.includes('General');
    console.log('Has per-txn interface:', hasInterface);
    
    if (hasInterface) {
      // ═══════════ EXPLORE ALL SIDEBAR TABS ═══════════
      const sidebarTabs = ['General', 'Sales', 'Invoices', 'Products/Services', 'Product mapping', 'Taxes', 'Fees', 'Application Fees', 'Expenses', 'Payouts', 'Multicurrency'];
      
      for (let i = 0; i < sidebarTabs.length; i++) {
        const tabName = sidebarTabs[i];
        console.log(`\n=== SIDEBAR: ${tabName} ===`);
        
        try {
          const clicked = await page.evaluate((name) => {
            const els = [...document.querySelectorAll('a, button, div, span')];
            for (const el of els) {
              if (el.innerText?.trim() === name && el.offsetParent !== null) {
                // Make sure it's in the sidebar area (not a random "General" elsewhere)
                const rect = el.getBoundingClientRect();
                if (rect.x < 400) { // sidebar is on the left
                  el.click();
                  return true;
                }
              }
            }
            return false;
          }, tabName);
          
          if (!clicked) {
            // Try broader match
            const clicked2 = await page.evaluate((name) => {
              const els = [...document.querySelectorAll('*')];
              for (const el of els) {
                if (el.innerText?.trim() === name && el.offsetParent !== null && el.children.length === 0) {
                  el.click();
                  return true;
                }
              }
              return false;
            }, tabName);
            if (!clicked2) {
              console.log(`  Tab "${tabName}" not found`);
              continue;
            }
          }
          
          await sleep(2000);
          await dismissModals(page);
          
          const safeName = tabName.replace(/[\/\s]/g, '_');
          const tabText = await captureFullPage(page, `ptxn-${String(i+1).padStart(2,'0')}-${safeName}.png`);
          
          // Extract just the settings content (skip sidebar/nav text)
          const contentStart = tabText.indexOf(tabName);
          const relevantText = tabText.substring(contentStart > 0 ? contentStart : 0, contentStart + 2000);
          console.log(`  Content: ${relevantText.substring(0, 400)}`);
          
        } catch(e) {
          console.log(`  Error: ${e.message.substring(0, 100)}`);
        }
      }
      
      // ═══════════ EXPLORE TRANSACTION TYPE TABS ═══════════
      console.log('\n\n=== TRANSACTION TYPE TABS ===');
      
      // Go back to General first
      await page.evaluate(() => {
        const els = [...document.querySelectorAll('*')];
        for (const el of els) {
          if (el.innerText?.trim() === 'General' && el.offsetParent && el.children.length === 0) {
            const rect = el.getBoundingClientRect();
            if (rect.x < 400) { el.click(); break; }
          }
        }
      });
      await sleep(1000);
      
      const txnTypes = ['Adjustment', 'Advance', 'Application fee', 'Chargeback', 'Collection transfer', 'Contribution', 'Issuing transaction', 'Financing paydown', 'Invoice'];
      
      for (const txnType of txnTypes) {
        console.log(`\n--- Txn type: ${txnType} ---`);
        try {
          const clicked = await page.evaluate((name) => {
            const els = [...document.querySelectorAll('*')];
            for (const el of els) {
              const t = el.innerText?.trim();
              // Match the tab text (might have ✕ close button)
              if (t && (t === name || t.startsWith(name)) && el.offsetParent) {
                const rect = el.getBoundingClientRect();
                if (rect.y < 200) { // top tab bar
                  el.click();
                  return true;
                }
              }
            }
            return false;
          }, txnType);
          
          if (clicked) {
            await sleep(2000);
            const safeName = txnType.replace(/\s/g, '_');
            const typeText = await captureFullPage(page, `ptxn-type-${safeName}.png`);
            console.log(`  Captured. Length: ${typeText.length}`);
          } else {
            console.log(`  Not found`);
          }
        } catch(e) {
          console.log(`  Error: ${e.message.substring(0, 80)}`);
        }
      }
      
      // ═══════════ CREATE ADDITIONAL SETTINGS DROPDOWN ═══════════
      console.log('\n=== CREATE ADDITIONAL SETTINGS ===');
      try {
        const clicked = await page.evaluate(() => {
          const els = [...document.querySelectorAll('*')];
          for (const el of els) {
            if (el.innerText?.trim()?.includes('Create additional settings') && el.offsetParent) {
              el.click();
              return true;
            }
          }
          return false;
        });
        if (clicked) {
          await sleep(2000);
          await captureFullPage(page, 'ptxn-create-additional.png');
          const menuText = await page.evaluate(() => {
            const menu = document.querySelector('[class*="Menu"], [role="menu"], [class*="Popover"], [class*="dropdown"]');
            return menu ? menu.innerText : 'No menu found';
          });
          console.log('Menu options:', menuText);
          await page.keyboard.press('Escape');
        }
      } catch(e) {
        console.log('Error:', e.message.substring(0, 100));
      }
      
      // ═══════════ TOGGLE TESTS ═══════════
      console.log('\n=== TOGGLE & TOAST TESTS ===');
      // Go to Default > General
      await page.evaluate(() => {
        const els = [...document.querySelectorAll('*')];
        for (const el of els) {
          if (el.innerText?.trim() === 'General' && el.offsetParent && el.children.length === 0) {
            const rect = el.getBoundingClientRect();
            if (rect.x < 400) { el.click(); break; }
          }
        }
      });
      await sleep(1500);
      
      const switches = await page.$$('[class*="MuiSwitch"]');
      console.log(`Found ${switches.length} switches`);
      
      const toasts = [];
      for (let si = 0; si < Math.min(switches.length, 6); si++) {
        try {
          const switchLabel = await page.evaluate((idx) => {
            const sw = document.querySelectorAll('[class*="MuiSwitch"]')[idx];
            const parent = sw?.closest('div[class*="row"], div[class*="setting"], div')?.parentElement;
            return parent?.querySelector('label, [class*="label"], span')?.innerText?.trim() || `Switch ${idx}`;
          }, si);
          
          const switchInput = await switches[si].$('input');
          if (!switchInput) continue;
          const wasChecked = await switchInput.isChecked();
          
          await switches[si].click({ force: true });
          await sleep(2500);
          
          const toast = await page.evaluate(() => {
            const t = document.querySelector('[class*="Snackbar"] [class*="message"], [class*="toast"], [role="alert"]');
            return t ? t.innerText : null;
          });
          
          const isNowChecked = await switchInput.isChecked();
          console.log(`  ${switchLabel}: ${wasChecked ? 'ON→OFF' : 'OFF→ON'} | Toast: "${toast || 'none'}"`);
          
          if (toast) toasts.push({ setting: switchLabel, action: wasChecked ? 'OFF' : 'ON', toast });
          
          await page.screenshot({ path: path.join(OUT, `ptxn-toggle-${si}.png`), fullPage: true });
          
          // Toggle back
          await switches[si].click({ force: true });
          await sleep(1500);
        } catch(e) {
          console.log(`  Toggle ${si} error: ${e.message.substring(0, 80)}`);
        }
      }
      
      fs.writeFileSync(path.join(OUT, 'ptxn-toasts.json'), JSON.stringify(toasts, null, 2));
    }
  } else {
    console.log('"Sync settings" not found. Looking for alternatives...');
    const allBtns = await page.evaluate(() => {
      return [...document.querySelectorAll('button, a')]
        .filter(e => e.offsetParent)
        .map(e => ({ text: e.innerText?.trim()?.substring(0, 50), href: e.href || '' }))
        .filter(e => e.text);
    });
    console.log('Buttons:', JSON.stringify(allBtns, null, 2));
  }
  
  await context.storageState({ path: STATE_PATH });
  console.log('\n\nALL DONE!');
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
