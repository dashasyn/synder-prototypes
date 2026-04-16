const { chromium } = require('playwright');
const fs = require('fs');

const OUT = '/home/ubuntu/.openclaw/workspace/.synder-state';
const storageState = JSON.parse(fs.readFileSync(`${OUT}/storage-state.json`, 'utf8'));

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/sd-${name}.png`, fullPage: false });
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
    storageState: `${OUT}/storage-state.json`,
    extraHTTPHeaders: {
      'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
      'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde'
    }
  });
  const page = await ctx.newPage();

  // Intercept API calls to capture transaction data
  const apiData = {};
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/') || url.includes('synder')) {
      try {
        const ct = response.headers()['content-type'] || '';
        if (ct.includes('json')) {
          const body = await response.json().catch(() => null);
          if (body) {
            const key = url.split('/').slice(-2).join('/');
            apiData[key] = body;
            console.log('API:', url.substring(0, 80));
          }
        }
      } catch(e) {}
    }
  });

  console.log('Going to transactions page...');
  await page.goto('https://demo.synderapp.com/transactions', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(3000);
  await shot(page, '01-transactions');
  console.log('URL:', page.url());

  // Save captured API data
  fs.writeFileSync(`${OUT}/api-transactions.json`, JSON.stringify(apiData, null, 2));
  console.log('API calls captured:', Object.keys(apiData).length);

  // Get transaction rows from DOM
  const rows = await page.evaluate(() => {
    const trs = document.querySelectorAll('table tr, [class*="transaction"], [class*="row"]');
    return Array.from(trs).slice(0, 20).map(tr => tr.textContent.trim().replace(/\s+/g, ' ').substring(0, 200));
  });
  console.log('Rows found:', rows.length);
  rows.forEach(r => r && r.length > 5 && console.log(' -', r));

  // Navigate to per-transaction settings
  console.log('\nGoing to per-transaction settings...');
  await page.goto('https://demo.synderapp.com/settings/per-transaction', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await shot(page, '02-per-txn-settings');
  console.log('URL:', page.url());

  // Get all settings values
  const settings = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, select, [class*="toggle"], [class*="switch"]');
    return Array.from(inputs).map(el => ({
      type: el.type || el.tagName,
      name: el.name || el.id || el.getAttribute('data-testid') || '',
      value: el.value || el.checked,
      label: el.closest('label')?.textContent?.trim()?.substring(0, 80) || 
             el.previousElementSibling?.textContent?.trim()?.substring(0, 80) || ''
    })).filter(s => s.label || s.name);
  });
  fs.writeFileSync(`${OUT}/per-txn-settings.json`, JSON.stringify(settings, null, 2));
  console.log('Settings found:', settings.length);
  settings.forEach(s => console.log(' -', s.name, ':', s.value, '|', s.label));

  // Go to account mapping
  await page.goto('https://demo.synderapp.com/settings/mapping', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await shot(page, '03-mapping');

  const mappingData = await page.evaluate(() => {
    return document.body.innerText.substring(0, 3000);
  });
  console.log('\nMapping page text:', mappingData.substring(0, 500));

  await browser.close();
  console.log('\nDone!');
})();
