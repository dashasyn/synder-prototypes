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

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({
    storageState: STORAGE_STATE,
    extraHTTPHeaders: CF_HEADERS,
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Track all navigation
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log('Navigated to:', frame.url());
    }
  });

  // Go to dashboard
  await page.goto('https://demo.synderapp.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  console.log('Current URL:', page.url());
  await page.screenshot({ path: path.join(OUT_DIR, 'nav-00-dashboard.png') });
  
  // Get all links from the page
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({ text: a.innerText?.trim(), href: a.href }))
      .filter(l => l.text && l.href && l.href.includes('synderapp'))
      .slice(0, 50);
  });
  console.log('Dashboard links:', JSON.stringify(links, null, 2));
  
  // Click "Settings" link
  const settingsLink = links.find(l => l.text === 'Settings');
  if (settingsLink) {
    console.log('Found Settings link:', settingsLink.href);
    await page.goto(settingsLink.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    console.log('Settings URL:', page.url());
    await page.screenshot({ path: path.join(OUT_DIR, 'nav-01-settings.png') });
    
    const settingsText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    fs.writeFileSync(path.join(OUT_DIR, 'settings-page-debug.txt'), settingsText);
    console.log('Settings text:', settingsText.substring(0, 500));
    
    // Get all links from settings page
    const settingsLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => ({ text: a.innerText?.trim(), href: a.href }))
        .filter(l => l.text && l.href && l.href.includes('synderapp'))
        .slice(0, 50);
    });
    console.log('Settings page links:', JSON.stringify(settingsLinks, null, 2));
  } else {
    console.log('No Settings link found in nav');
  }
  
  await browser.close();
})();
