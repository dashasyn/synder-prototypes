const { chromium } = require('playwright');
const fs = require('fs');

const OUT = '/home/ubuntu/.openclaw/workspace/.synder-state';

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/ic-${name}.png`, fullPage: false });
  console.log('📸', name);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    storageState: `${OUT}/storage-state-new.json`,
    extraHTTPHeaders: {
      'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
      'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde'
    }
  });
  const page = await ctx.newPage();

  const apiData = {};
  const allRequests = [];

  page.on('request', req => {
    const url = req.url();
    if (url.includes('synderapp') && !url.includes('cdn-cgi') && !url.includes('speculation')) {
      allRequests.push({ method: req.method(), url: url.replace('https://demo.synderapp.com', '') });
    }
  });

  page.on('response', async (resp) => {
    try {
      const ct = resp.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      const url = resp.url();
      if (!url.includes('synderapp')) return;
      const body = await resp.json().catch(() => null);
      if (body) {
        const key = url.replace('https://demo.synderapp.com', '').substring(0, 100);
        apiData[key] = body;
      }
    } catch(e) {}
  });

  // Switch org first
  await page.goto('https://demo.synderapp.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.evaluate(async () => {
    await fetch('/v1/organizations/1778/select', { method: 'POST', credentials: 'include' });
  });
  await page.waitForTimeout(1000);

  // Navigate to transactions UI and wait for data to load
  console.log('Loading transactions page...');
  await page.goto('https://demo.synderapp.com/accounting/transactions', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(5000);
  await shot(page, '01-tx-page');
  console.log('URL:', page.url());

  // Get all text on page
  const pageText = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(`${OUT}/tx-page-content.txt`, pageText);
  console.log('Page text (first 500):', pageText.substring(0, 500));

  console.log('\nAll requests made:');
  allRequests.forEach(r => console.log(r.method, r.url));
  
  console.log('\nAPI data captured:', Object.keys(apiData).length);
  Object.keys(apiData).forEach(k => console.log(' -', k));
  
  fs.writeFileSync(`${OUT}/api-intercepted.json`, JSON.stringify(apiData, null, 2));

  // Try settings page
  console.log('\nLoading per-transaction settings...');
  await page.goto('https://demo.synderapp.com/accounting/settings/per-transaction', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);
  await shot(page, '02-settings');
  
  const settingsText = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(`${OUT}/settings-page-content.txt`, settingsText);
  console.log('Settings page (first 500):', settingsText.substring(0, 500));

  await browser.close();
  console.log('Done');
})();
