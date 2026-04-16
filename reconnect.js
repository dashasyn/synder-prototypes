const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STATE_PATH = '/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json';
const OUT = '/home/ubuntu/.openclaw/workspace/.synder-state/settings-audit';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  
  const browser = await chromium.launch({ 
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  
  const context = await browser.newContext({
    storageState: STATE_PATH,
    viewport: { width: 1440, height: 900 }
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  
  // Go to settings - this should trigger the "Reconnect accounting" modal
  console.log('Navigating to settings...');
  await page.goto('https://demo.synderapp.com/organizations/generalSettings/general', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);
  
  await page.screenshot({ path: path.join(OUT, 'reconnect-01.png'), fullPage: true });
  
  // Look for "Reconnect accounting" button
  const reconnectBtn = await page.$('button:has-text("Reconnect accounting")');
  if (reconnectBtn && await reconnectBtn.isVisible()) {
    console.log('Found "Reconnect accounting" button, clicking...');
    await reconnectBtn.click();
    await sleep(5000);
    
    console.log('URL after click:', page.url());
    await page.screenshot({ path: path.join(OUT, 'reconnect-02.png'), fullPage: true });
    
    // Check what happened - might redirect to OAuth or show a form
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
    console.log('Page after reconnect click:', bodyText.substring(0, 500));
    
    // If it opened a new window/tab for OAuth, check
    const pages = context.pages();
    console.log('Number of pages:', pages.length);
    for (let i = 0; i < pages.length; i++) {
      console.log(`Page ${i}: ${pages[i].url()}`);
    }
    
    // Wait for any redirects
    await sleep(5000);
    
    for (let i = 0; i < pages.length; i++) {
      console.log(`Page ${i} after wait: ${pages[i].url()}`);
      await pages[i].screenshot({ path: path.join(OUT, `reconnect-03-page${i}.png`), fullPage: true });
    }
    
    // If there's an OAuth page, we might need to authorize
    // Check if we're on QuickBooks or Xero login
    const currentUrl = page.url();
    if (currentUrl.includes('intuit') || currentUrl.includes('quickbooks') || currentUrl.includes('xero')) {
      console.log('OAuth redirect detected:', currentUrl);
    }
    
  } else {
    console.log('Reconnect button not found. Checking page state...');
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1500));
    console.log('Page text:', bodyText.substring(0, 500));
    
    // Maybe the modal didn't appear - try navigating to the connection page
    // Look for any reconnect-related links or buttons
    const allBtns = await page.evaluate(() => {
      return [...document.querySelectorAll('button, a')].filter(e => e.offsetParent !== null)
        .map(e => ({ tag: e.tagName, text: e.innerText?.trim()?.substring(0, 50), href: e.href || '' }))
        .filter(e => e.text);
    });
    console.log('All visible buttons/links:', JSON.stringify(allBtns, null, 2));
  }
  
  await context.storageState({ path: STATE_PATH });
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
