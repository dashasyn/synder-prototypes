const { chromium } = require('playwright');
const fs = require('fs');

const OUT = '/home/ubuntu/.openclaw/workspace/.synder-state';
const storage = JSON.parse(fs.readFileSync(`${OUT}/storage-state-new.json`, 'utf8'));

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/ss-${name}.png`, fullPage: true });
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

  // Intercept all JSON API calls
  const apiData = {};
  page.on('response', async (resp) => {
    try {
      const ct = resp.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      const url = resp.url();
      if (!url.includes('synderapp')) return;
      const body = await resp.json().catch(() => null);
      if (body) {
        const key = url.replace('https://demo.synderapp.com', '').replace(/[^a-zA-Z0-9\-_\/]/g, '_').substring(0, 80);
        apiData[key] = body;
        console.log('API:', url.substring(0, 100));
      }
    } catch(e) {}
  });

  // First find what org we are in and switch to the right one
  await page.goto('https://demo.synderapp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await shot(page, '00-home');
  console.log('Home URL:', page.url());
  
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
  console.log('Home text:', pageText.substring(0, 500));

  // Try different URLs to find settings  
  const urlsToTry = [
    '/settings',
    '/settings/general',
    '/accounting/settings',
  ];
  
  for (const url of urlsToTry) {
    await page.goto(`https://demo.synderapp.com${url}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`\n${url}:`, text.substring(0, 200));
    await shot(page, 'settings-' + url.replace(/\//g, '-'));
  }

  fs.writeFileSync(`${OUT}/api-settings.json`, JSON.stringify(apiData, null, 2));
  await browser.close();
  console.log('Done');
})();
