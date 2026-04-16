const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS = path.join(__dirname);
const CF_HEADERS = {
  'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
  'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde'
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: CF_HEADERS
  });
  const page = await context.newPage();

  // Go to auth page
  await page.goto('https://demo.synderapp.com/auth', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Auth page URL:', page.url());
  await page.screenshot({ path: path.join(SCREENSHOTS, '00-auth-page.png'), fullPage: true });
  
  // Get page content to understand the form
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Page text (first 2000 chars):', bodyText.substring(0, 2000));
  
  // Look for "Sign in with email" or similar link/button
  const emailSignIn = await page.$('text=/email/i');
  if (emailSignIn) {
    const text = await emailSignIn.textContent();
    console.log('Found email option:', text);
  }
  
  // List all buttons and links
  const elements = await page.$$eval('button, a, input', els =>
    els.map(e => ({
      tag: e.tagName,
      type: e.type || '',
      text: e.textContent?.trim()?.substring(0, 80),
      placeholder: e.placeholder || '',
      href: e.href || '',
      id: e.id || '',
      name: e.name || ''
    }))
  );
  console.log('Interactive elements:', JSON.stringify(elements, null, 2));
  
  await browser.close();
})();
