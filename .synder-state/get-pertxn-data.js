const { chromium } = require('playwright');
const fs = require('fs');

const OUT = '/home/ubuntu/.openclaw/workspace/.synder-state';

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/pt-${name}.png`, fullPage: false });
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
  page.on('response', async (resp) => {
    try {
      const ct = resp.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      const url = resp.url();
      if (!url.includes('synderapp')) return;
      const body = await resp.json().catch(() => null);
      if (body) {
        const key = url.replace('https://demo.synderapp.com', '').substring(0, 120);
        apiData[key] = body;
      }
    } catch(e) {}
  });

  await page.goto('https://demo.synderapp.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  
  // Switch to org 1785
  const sw = await page.evaluate(async () => {
    const r = await fetch('/v1/organizations/1785/select', { method: 'POST', credentials: 'include' });
    return r.status;
  });
  console.log('Switch to 1785:', sw);
  await page.waitForTimeout(1000);

  // Get transactions via API
  console.log('Getting transactions...');
  const txR = await page.evaluate(async () => {
    const endpoints = [
      '/v1/transactions?max=100&offset=0&sortBy=date&sortDir=desc',
      '/accounting/api/transactions?max=100&offset=0',
      '/api/transactions?max=100',
    ];
    const results = {};
    for (const ep of endpoints) {
      const r = await fetch(ep, { credentials: 'include' });
      results[ep] = { status: r.status, body: (await r.text()).substring(0, 500) };
    }
    return results;
  });
  console.log('Transaction endpoints:', JSON.stringify(txR, null, 2));

  // Get settings
  console.log('\nGetting settings...');
  const settingsR = await page.evaluate(async () => {
    const endpoints = [
      '/accounting/api/settings',
      '/accounting/api/syncSettings',
      '/v1/syncSettings',
      '/accounting/api/perTransactionSettings',
    ];
    const results = {};
    for (const ep of endpoints) {
      const r = await fetch(ep, { credentials: 'include' });
      results[ep] = { status: r.status, body: (await r.text()).substring(0, 500) };
    }
    return results;
  });
  console.log('Settings endpoints:', JSON.stringify(settingsR, null, 2));

  // Navigate to the app
  await page.goto('https://demo.synderapp.com/transactions', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(5000);
  await shot(page, '01-tx-page');
  console.log('URL:', page.url());

  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  fs.writeFileSync(`${OUT}/pt-page-text.txt`, pageText);
  console.log('Page text:', pageText.substring(0, 500));

  // Check all API calls  
  console.log('\nAPI captured:', Object.keys(apiData).length);
  for (const k of Object.keys(apiData)) {
    if (k.includes('transaction') || k.includes('setting') || k.includes('mapping') || k.includes('account') || k.includes('integration')) {
      console.log('KEY:', k);
      console.log(JSON.stringify(apiData[k]).substring(0, 400));
    }
  }
  
  fs.writeFileSync(`${OUT}/pt-api-data.json`, JSON.stringify(apiData, null, 2));
  await browser.close();
  console.log('Done');
})();
