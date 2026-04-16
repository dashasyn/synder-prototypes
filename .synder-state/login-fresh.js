const { chromium } = require('playwright');
const fs = require('fs');

const OUT = '/home/ubuntu/.openclaw/workspace/.synder-state';

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/fresh-${name}.png`, fullPage: false });
  console.log('📸', name);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  await page.setExtraHTTPHeaders({
    'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
    'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde'
  });

  await page.goto('https://demo.synderapp.com/auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.fill('input[placeholder="email@mail.com"]', 'dasha.aibot@synder.com');
  await page.fill('input[type="password"]', 'BJ9BG5MbZHmiLet!');
  await shot(page, '02-filled');

  // Click the "Sign in" button (not SSO buttons)
  await page.click('button:has-text("Sign in"):not(:has-text("Intuit")):not(:has-text("Google")):not(:has-text("Xero"))');
  await page.waitForTimeout(6000);
  await shot(page, '03-after-submit');
  console.log('After submit URL:', page.url());

  const storage = await ctx.storageState();
  fs.writeFileSync(`${OUT}/storage-state-new.json`, JSON.stringify(storage, null, 2));

  // Now scrape transactions
  const apiResults = {};
  page.on('response', async (response) => {
    const url = response.url();
    try {
      const ct = response.headers()['content-type'] || '';
      if (ct.includes('json') && (url.includes('transaction') || url.includes('setting') || url.includes('mapping') || url.includes('account'))) {
        const body = await response.json().catch(() => null);
        if (body) {
          const key = url.replace('https://demo.synderapp.com/', '').substring(0, 60);
          apiResults[key] = body;
          console.log('📦 API:', key);
        }
      }
    } catch(e) {}
  });

  console.log('Going to transactions...');
  await page.goto('https://demo.synderapp.com/transactions', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(3000);
  await shot(page, '04-transactions');
  console.log('URL:', page.url());

  fs.writeFileSync(`${OUT}/api-captured.json`, JSON.stringify(apiResults, null, 2));
  console.log('API responses captured:', Object.keys(apiResults).length);

  // Get visible transaction data
  const txText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
  fs.writeFileSync(`${OUT}/tx-page-text.txt`, txText);
  console.log('Tx page text saved');

  await browser.close();
  console.log('Done');
})();
