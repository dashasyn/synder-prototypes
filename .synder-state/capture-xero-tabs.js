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

const TAB_HASHES = {
  'General':           '#default-general-settings',
  'Sales':             '#default-sales-settings',
  'Invoices':          '#default-invoice-settings',
  'Products-Services': '#default-item-settings',
  'Product-mapping':   '#default-product-mapping-settings',
  'Taxes':             '#default-tax-settings',
  'Fees':              '#default-fee-settings',
  'Payouts':           '#default-payout-settings',
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({
    storageState: STORAGE_STATE,
    extraHTTPHeaders: CF_HEADERS,
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Load settings page
  console.log('Loading settings page...');
  await page.goto('https://demo.synderapp.com/company/settings', { 
    waitUntil: 'networkidle', 
    timeout: 30000 
  });
  await page.waitForTimeout(3000);
  
  console.log('URL:', page.url());
  await page.screenshot({ path: path.join(OUT_DIR, '00-full-settings.png'), fullPage: false });

  // Capture ALL page text first (full dump)
  const fullPageText = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(path.join(OUT_DIR, 'FULL-PAGE-TEXT.txt'), fullPageText);
  console.log('Full page text saved:', fullPageText.length, 'chars');

  // Now capture each tab section by clicking the tab link and scrolling to it
  const results = {};
  
  for (const [tabName, hash] of Object.entries(TAB_HASHES)) {
    console.log(`\n--- Tab: ${tabName} ---`);
    
    // Click the tab link in the sidebar
    try {
      const tabLink = await page.$(`a[href="${hash}"]`);
      if (tabLink) {
        await tabLink.click();
        await page.waitForTimeout(1500);
        console.log(`Clicked: ${hash}`);
      } else {
        // Try scrolling to the element
        const targetEl = await page.$(hash.replace('#', '') ? `[id="${hash.replace('#', '')}"]` : null);
        if (targetEl) {
          await targetEl.scrollIntoViewIfNeeded();
          await page.waitForTimeout(1000);
        }
      }
    } catch(e) {
      console.log(`Error clicking tab: ${e.message}`);
    }
    
    // Screenshot the current visible area
    await page.screenshot({ 
      path: path.join(OUT_DIR, `${tabName}.png`), 
      fullPage: false 
    });
    
    // Extract just the content of this tab's section
    const sectionId = hash.replace('#', '');
    const sectionText = await page.evaluate((id) => {
      // Try to find the section element
      const el = document.getElementById(id) || 
                 document.querySelector(`[id="${id}"]`) ||
                 document.querySelector(`[data-section="${id}"]`);
      
      if (el) {
        return { method: 'byId', text: el.innerText };
      }
      
      // Fallback: get what's visible in viewport
      const viewportEls = [];
      const allEls = document.querySelectorAll('div, section, article');
      const vp = { 
        top: window.scrollY, 
        bottom: window.scrollY + window.innerHeight 
      };
      
      for (const el of allEls) {
        const rect = el.getBoundingClientRect();
        const elTop = rect.top + window.scrollY;
        if (elTop >= vp.top && elTop <= vp.bottom && el.innerText && el.innerText.length > 100) {
          viewportEls.push(el.innerText);
          break;
        }
      }
      
      return { method: 'viewport', text: viewportEls[0] || '' };
    }, sectionId);
    
    console.log(`  Section method: ${sectionText.method}, chars: ${sectionText.text.length}`);
    
    results[tabName] = sectionText.text;
    fs.writeFileSync(path.join(OUT_DIR, `${tabName}.txt`), sectionText.text);
  }
  
  // Now extract truly meaningful copy: labels, descriptions, toggle names
  // Parse from full page text intelligently
  console.log('\n=== Extracting structured copy from each section ===');
  
  // Get structured data for all tabs in one shot
  const structuredData = await page.evaluate(() => {
    const result = {};
    
    // The settings page has sections identified by ids
    const sectionIds = [
      'default-general-settings',
      'default-sales-settings',
      'default-invoice-settings',
      'default-item-settings',
      'default-product-mapping-settings',
      'default-tax-settings',
      'default-fee-settings',
      'default-payout-settings'
    ];
    
    const tabNames = {
      'default-general-settings': 'General',
      'default-sales-settings': 'Sales',
      'default-invoice-settings': 'Invoices',
      'default-item-settings': 'Products-Services',
      'default-product-mapping-settings': 'Product-mapping',
      'default-tax-settings': 'Taxes',
      'default-fee-settings': 'Fees',
      'default-payout-settings': 'Payouts'
    };
    
    // Try to find section containers
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) {
        result[tabNames[id]] = {
          found: true,
          text: el.innerText,
          htmlLength: el.innerHTML.length
        };
      } else {
        result[tabNames[id]] = { found: false, text: '' };
      }
    }
    
    // Also collect all toggle/setting labels on the page
    const allLabels = [];
    const labelEls = document.querySelectorAll('label, [class*="label"], [class*="title"], [class*="description"], [class*="hint"], p');
    for (const el of labelEls) {
      const text = (el.innerText || '').trim();
      if (text.length > 8 && text.length < 600 && !text.includes('\n\n\n')) {
        allLabels.push(text);
      }
    }
    result['_allLabels'] = [...new Set(allLabels)];
    
    return result;
  });
  
  // Save structured data
  fs.writeFileSync(path.join(OUT_DIR, 'STRUCTURED-DATA.json'), JSON.stringify(structuredData, null, 2));
  console.log('Structured data saved');
  
  for (const [tab, data] of Object.entries(structuredData)) {
    if (tab === '_allLabels') continue;
    console.log(`  ${tab}: found=${data.found}, chars=${data.text?.length || 0}`);
  }
  
  // Since the page is a SPA, let me also try clicking each tab and getting a full page screenshot
  console.log('\n=== Full page screenshots per tab ===');
  for (const [tabName, hash] of Object.entries(TAB_HASHES)) {
    const tabLink = await page.$(`a[href="${hash}"]`);
    if (tabLink) {
      await tabLink.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ 
        path: path.join(OUT_DIR, `${tabName}-full.png`), 
        fullPage: true 
      });
      console.log(`  Saved ${tabName}-full.png`);
    }
  }
  
  await browser.close();
  console.log('\n✅ Done! Check xero-capture/ directory.');
})();
