const { chromium } = require('playwright');
const fs = require('fs');

const OUT = '/home/ubuntu/.openclaw/workspace/.synder-state';

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/gd-${name}.png`, fullPage: false });
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

  // Capture API responses
  const apiData = {};
  page.on('response', async (resp) => {
    try {
      const ct = resp.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      const url = resp.url();
      if (!url.includes('synderapp')) return;
      const body = await resp.json().catch(() => null);
      if (body) {
        const key = url.replace('https://demo.synderapp.com', '').replace(/[\?&]/g, '_').substring(0, 100);
        apiData[key] = body;
      }
    } catch(e) {}
  });

  // Navigate to home first
  await page.goto('https://demo.synderapp.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1000);

  // Switch to org 1778 via API call
  console.log('Switching to org 1778...');
  const switchResult = await page.evaluate(async () => {
    const r = await fetch('/v1/organizations/1778/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    return { status: r.status, body: await r.text() };
  });
  console.log('Switch result:', JSON.stringify(switchResult));

  await page.waitForTimeout(1000);

  // Now get transactions
  console.log('Getting transactions...');
  const txResult = await page.evaluate(async () => {
    const r = await fetch('/v1/transactions?max=100&offset=0&sortBy=date&sortDir=desc', {
      credentials: 'include'
    });
    return { status: r.status, body: await r.text() };
  });
  console.log('Transactions status:', txResult.status);
  if (txResult.status === 200) {
    fs.writeFileSync(`${OUT}/transactions-raw.json`, txResult.body);
    console.log('Transactions saved');
    const parsed = JSON.parse(txResult.body);
    console.log('Total:', parsed.totalCount || parsed.total || 'unknown');
    console.log('First 3:', JSON.stringify((parsed.transactions || parsed.content || []).slice(0, 3), null, 2).substring(0, 1000));
  } else {
    console.log('TX body:', txResult.body.substring(0, 300));
  }

  // Get per-transaction settings
  console.log('\nGetting settings...');
  const settingsEndpoints = [
    '/v1/settings',
    '/accounting/v1/settings',
    '/v1/organizations/1778/settings',
    '/v1/integrations/settings',
  ];
  
  for (const ep of settingsEndpoints) {
    const r = await page.evaluate(async (url) => {
      const resp = await fetch(url, { credentials: 'include' });
      return { status: resp.status, body: await resp.text() };
    }, ep);
    console.log(ep, '->', r.status, r.body.substring(0, 200));
    if (r.status === 200) {
      fs.writeFileSync(`${OUT}/settings-${ep.replace(/\//g, '-')}.json`, r.body);
    }
  }

  // Get integrations
  console.log('\nGetting integrations...');
  const intR = await page.evaluate(async () => {
    const r = await fetch('/v1/integrations?max=100&offset=0', { credentials: 'include' });
    return { status: r.status, body: await r.text() };
  });
  console.log('Integrations status:', intR.status);
  if (intR.status === 200) {
    fs.writeFileSync(`${OUT}/integrations.json`, intR.body);
    const parsed = JSON.parse(intR.body);
    console.log('Integrations:', JSON.stringify(parsed).substring(0, 500));
  }

  // Navigate to main app to see if it works
  await page.goto('https://demo.synderapp.com/accounting/transactions', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await shot(page, '01-transactions');
  console.log('URL:', page.url());

  fs.writeFileSync(`${OUT}/api-fulldata.json`, JSON.stringify(apiData, null, 2));
  await browser.close();
  console.log('Done');
})();
