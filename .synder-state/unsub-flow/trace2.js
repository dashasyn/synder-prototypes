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

  // Go to settings
  await page.goto('https://demo.synderapp.com/company/settings', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Switch to Dasha Test Company org
  // Click org switcher (the "UN" / "Unsubscribe" element)
  const orgSwitcher = await page.$('p.sidebar-section-jss112');
  if (!orgSwitcher) {
    // Try clicking the area at the top of sidebar
    await page.click('text="Unsubscribe"');
  } else {
    await orgSwitcher.click();
  }
  await page.waitForTimeout(1000);
  
  // Click "Dasha Test Company"
  const dashaOrg = await page.$('text="Dasha Test Company"');
  if (dashaOrg) {
    console.log('Switching to Dasha Test Company...');
    await dashaOrg.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
    console.log('After switch:', page.url());
  }
  
  await page.screenshot({ path: path.join(SS, '10-dasha-org.png') });

  // Now navigate to billing page
  await page.goto('https://demo.synderapp.com/organizations/billing', { waitUntil: 'networkidle', timeout: 20000 });
  console.log('Billing page URL:', page.url());
  await page.screenshot({ path: path.join(SS, '11-billing-page.png'), fullPage: true });
  
  // Get page content
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
  console.log('Billing page text:\n', pageText);

  // Find cancel/unsubscribe elements
  const cancelElements = await page.$$eval('button, a, [role="button"]', els =>
    els.filter(e => e.offsetParent !== null)
      .filter(e => {
        const t = (e.textContent || '').toLowerCase();
        return t.includes('cancel') || t.includes('unsub') || t.includes('downgrade') || t.includes('pause');
      })
      .map(e => ({
        tag: e.tagName,
        text: e.textContent?.trim()?.substring(0, 80),
        href: e.href || '',
        className: e.className?.substring(0, 80) || ''
      }))
  );
  console.log('Cancel/unsub elements:', JSON.stringify(cancelElements, null, 2));

  // Also try Organization settings
  await page.goto('https://demo.synderapp.com/organizations/settings', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  console.log('Org settings URL:', page.url());
  await page.screenshot({ path: path.join(SS, '12-org-settings.png'), fullPage: true });
  const orgText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log('Org settings text:\n', orgText);

  // Try /organizations page
  await page.goto('https://demo.synderapp.com/organizations', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  console.log('Orgs URL:', page.url());
  await page.screenshot({ path: path.join(SS, '13-organizations.png'), fullPage: true });

  // Also try userProfile
  await page.goto('https://demo.synderapp.com/userProfile', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  console.log('User profile URL:', page.url());
  await page.screenshot({ path: path.join(SS, '14-user-profile.png'), fullPage: true });
  const profileText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log('Profile text:\n', profileText);

  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  await browser.close();
  console.log('Done!');
})();
