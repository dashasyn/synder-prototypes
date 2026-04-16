const { chromium } = require('playwright');
const path = require('path');

const SS = path.join(__dirname);
const CF = {
  'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
  'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde'
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: CF,
    storageState: path.join(__dirname, '..', 'storage-state.json')
  });
  const page = await context.newPage();

  // Go to settings first to switch org
  await page.goto('https://demo.synderapp.com/company/settings', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Click org switcher
  await page.click('text="Unsubscribe"');
  await page.waitForTimeout(500);
  
  // Click Dasha Test Company and wait for page reload
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
    page.click('text="Dasha Test Company"')
  ]);
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle').catch(() => {});
  console.log('Switched to:', page.url());

  // Navigate to billing
  await page.goto('https://demo.synderapp.com/organizations/billing', { waitUntil: 'networkidle', timeout: 20000 });
  console.log('Billing URL:', page.url());
  await page.screenshot({ path: path.join(SS, '11-billing.png'), fullPage: true });
  
  const billingText = await page.evaluate(() => document.body.innerText);
  console.log('BILLING PAGE TEXT:\n', billingText.substring(0, 5000));

  // Find cancel/unsubscribe elements
  const cancelEls = await page.$$eval('button, a, [role="button"]', els =>
    els.filter(e => e.offsetParent !== null)
      .filter(e => {
        const t = (e.textContent || '').toLowerCase();
        return t.includes('cancel') || t.includes('unsub') || t.includes('downgrade') || t.includes('pause') || t.includes('close') || t.includes('delete');
      })
      .map(e => ({
        tag: e.tagName,
        text: e.textContent?.trim()?.substring(0, 80),
        href: e.href || ''
      }))
  );
  console.log('Cancel/unsub elements:', JSON.stringify(cancelEls, null, 2));

  // All buttons on the page
  const allBtns = await page.$$eval('button, a[class*="btn"], a[class*="Btn"], [role="button"]', els =>
    els.filter(e => e.offsetParent !== null)
      .map(e => ({ text: e.textContent?.trim()?.substring(0, 80), href: e.href || '' }))
      .filter(e => e.text)
  );
  console.log('All buttons:', JSON.stringify(allBtns, null, 2));

  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  await browser.close();
  console.log('Done!');
})();
