const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'settings-crawl');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function extractPageFields(page) {
  return await page.evaluate(() => {
    const fields = [];
    
    // Get all form-like elements
    const allElements = document.querySelectorAll('input, select, textarea, [class*=toggle], [class*=Toggle], [class*=switch], [class*=Switch], [role=switch], [role=checkbox], [class*=dropdown], [class*=Dropdown]');
    
    allElements.forEach(el => {
      const label = el.closest('label')?.textContent?.trim() || 
                    el.getAttribute('aria-label') || 
                    el.getAttribute('placeholder') || 
                    el.previousElementSibling?.textContent?.trim() || '';
      fields.push({
        type: el.tagName + (el.type ? ':' + el.type : ''),
        label: label.substring(0, 100),
        value: el.value || el.textContent?.trim()?.substring(0, 100) || '',
        checked: el.checked,
        cls: el.className?.substring(0, 80) || ''
      });
    });

    // Also get all visible text sections with their structure
    const sections = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, label, [class*=title], [class*=Title], [class*=header], [class*=Header], [class*=setting], [class*=Setting]').forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 0 && text.length < 200) {
        sections.push({ tag: el.tagName, text, cls: el.className?.substring(0, 60) || '' });
      }
    });

    // Get full page text organized by sections
    const bodyText = document.body.innerText;
    
    return { fields, sections, bodyText };
  });
}

async function clickTab(page, tabText) {
  try {
    // Try clicking by link text
    const tab = page.locator(`a:has-text("${tabText}")`).first();
    if (await tab.isVisible({ timeout: 2000 })) {
      await tab.click();
      await page.waitForTimeout(1500);
      return true;
    }
  } catch(e) {}
  
  try {
    // Try by role
    const tab = page.getByRole('tab', { name: tabText }).first();
    if (await tab.isVisible({ timeout: 2000 })) {
      await tab.click();
      await page.waitForTimeout(1500);
      return true;
    }
  } catch(e) {}
  
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: path.join(__dirname, 'storage-state.json'),
    extraHTTPHeaders: {
      'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
      'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde'
    }
  });
  const page = await context.newPage();
  
  console.log('Navigating to Settings...');
  await page.goto('https://demo.synderapp.com/company/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const mainTabs = ['General', 'Sales', 'Invoices', 'Products/Services', 'Taxes', 'Fees', 'Application Fees', 'Payouts'];
  const allData = {};
  
  for (const tab of mainTabs) {
    console.log(`\n=== Crawling tab: ${tab} ===`);
    const clicked = await clickTab(page, tab);
    if (!clicked) {
      console.log(`  Could not click tab: ${tab}`);
      continue;
    }
    
    await page.waitForTimeout(2000);
    
    // Screenshot
    await page.screenshot({ 
      path: path.join(OUTPUT_DIR, `tab-${tab.replace(/\//g, '-')}.png`), 
      fullPage: true 
    });
    
    // Extract full page text
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // For Sales tab, also get the subtabs (transaction types)
    if (tab === 'Sales') {
      const subTabs = await page.evaluate(() => {
        const tabs = [];
        document.querySelectorAll('ul li a, ul li button, [role=tab]').forEach(el => {
          const t = el.textContent?.trim();
          if (t && t.length > 0 && t.length < 50 && !['General','Sales','Invoices','Products/Services','Taxes','Fees','Application Fees','Payouts','Expenses','Multicurrency'].includes(t)) {
            tabs.push(t);
          }
        });
        return [...new Set(tabs)];
      });
      console.log(`  Sales subtabs: ${subTabs.join(', ')}`);
      
      allData[tab] = { pageText: pageText.substring(0, 5000), subTabs };
      
      // Crawl key subtabs
      const keySubTabs = ['Default', 'Refund', 'Adjustment', 'Payout', 'Payment', 'Invoice', 'Chargeback'];
      for (const sub of keySubTabs) {
        if (subTabs.includes(sub)) {
          console.log(`  Crawling subtab: ${sub}`);
          try {
            const subEl = page.locator(`li:has-text("${sub}")`).first();
            await subEl.click();
            await page.waitForTimeout(1500);
            
            const subText = await page.evaluate(() => document.body.innerText);
            await page.screenshot({ 
              path: path.join(OUTPUT_DIR, `tab-Sales-${sub}.png`), 
              fullPage: true 
            });
            
            allData[`Sales/${sub}`] = { pageText: subText.substring(0, 5000) };
          } catch(e) {
            console.log(`  Error on subtab ${sub}: ${e.message}`);
          }
        }
      }
    } else {
      allData[tab] = { pageText: pageText.substring(0, 5000) };
    }
    
    console.log(`  Captured ${allData[tab]?.pageText?.length || 0} chars`);
  }
  
  // Also crawl the "Additional settings" if it exists
  console.log('\n=== Looking for Additional Settings ===');
  try {
    const additionalLink = page.locator('text=Additional settings').first();
    if (await additionalLink.isVisible({ timeout: 3000 })) {
      await additionalLink.click();
      await page.waitForTimeout(2000);
      const addText = await page.evaluate(() => document.body.innerText);
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'tab-Additional.png'), fullPage: true });
      allData['Additional'] = { pageText: addText.substring(0, 5000) };
      console.log('  Captured Additional settings');
    } else {
      console.log('  No Additional settings link found');
    }
  } catch(e) {
    console.log('  Additional settings: ' + e.message);
  }
  
  // Save all data
  fs.writeFileSync(path.join(OUTPUT_DIR, 'all-settings.json'), JSON.stringify(allData, null, 2));
  console.log('\n=== Done! Saved to settings-crawl/ ===');
  
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
