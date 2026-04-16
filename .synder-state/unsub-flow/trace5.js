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

  // Go to organization settings (where "Manage subscription" is)
  await page.goto('https://demo.synderapp.com/organizations/settings', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('On org settings:', page.url());
  await page.screenshot({ path: path.join(SS, '30-org-settings.png'), fullPage: true });

  // Click "Manage subscription"
  const manageBtn = await page.$('text="Manage subscription"');
  if (manageBtn) {
    console.log('Clicking "Manage subscription"...');
    
    // Listen for new page (might open Stripe portal) or navigation
    const newPagePromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);
    
    await manageBtn.click();
    await page.waitForTimeout(3000);
    
    // Check for new tab/page
    const newPage = await newPagePromise;
    if (newPage) {
      console.log('New page opened:', newPage.url());
      await newPage.waitForLoadState('networkidle').catch(() => {});
      await newPage.screenshot({ path: path.join(SS, '31-manage-sub-newpage.png'), fullPage: true });
      const newPageText = await newPage.evaluate(() => document.body.innerText.substring(0, 5000));
      console.log('New page text:\n', newPageText.substring(0, 3000));
    }
    
    // Check for modal
    await page.waitForLoadState('networkidle').catch(() => {});
    const modal = await page.$('[class*="modal"], [class*="Modal"], [role="dialog"], [class*="popup"], [class*="Popup"], [class*="drawer"], [class*="Drawer"]');
    if (modal) {
      console.log('Modal appeared!');
      const modalText = await modal.textContent();
      console.log('Modal text:', modalText?.substring(0, 2000));
      await page.screenshot({ path: path.join(SS, '31-manage-sub-modal.png') });
      
      // Modal buttons
      const modalBtns = await modal.$$eval('button, a', els =>
        els.map(e => ({ text: e.textContent?.trim()?.substring(0, 80), href: e.href || '' }))
      );
      console.log('Modal buttons:', JSON.stringify(modalBtns, null, 2));
    }
    
    // Check if page navigated
    console.log('Current URL after click:', page.url());
    await page.screenshot({ path: path.join(SS, '32-after-manage-click.png'), fullPage: true });
    
    // Get full page text
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    console.log('Page text after click:\n', pageText.substring(0, 3000));

    // Look for cancel/unsubscribe now
    const cancelEls = await page.$$eval('button, a, [role="button"], span', els =>
      els.filter(e => {
        const t = (e.textContent || '').toLowerCase();
        return t.includes('cancel') || t.includes('unsub') || t.includes('pause');
      })
      .filter(e => e.offsetParent !== null)
      .map(e => ({
        tag: e.tagName,
        text: e.textContent?.trim()?.substring(0, 100),
        href: e.href || '',
        className: e.className?.substring?.(0, 100) || ''
      }))
    );
    console.log('Cancel/unsub elements:', JSON.stringify(cancelEls, null, 2));
  } else {
    console.log('"Manage subscription" button not found!');
  }

  // Also directly try the cancel subscription URL patterns
  const cancelUrls = [
    'https://demo.synderapp.com/organizations/cancel',
    'https://demo.synderapp.com/organizations/unsubscribe',
    'https://demo.synderapp.com/subscription/cancel',
    'https://demo.synderapp.com/organizations/billing/cancel',
  ];
  
  for (const url of cancelUrls) {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    const finalUrl = page.url();
    console.log(`${url} → ${finalUrl}`);
    if (!finalUrl.includes('/auth') && !finalUrl.includes('/settings') && !finalUrl.includes('/billing')) {
      await page.screenshot({ path: path.join(SS, `33-cancel-${url.split('/').pop()}.png`), fullPage: true });
      const text = await page.evaluate(() => document.body.innerText.substring(0, 2000));
      console.log('Content:', text.substring(0, 1000));
    }
  }

  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  await browser.close();
  console.log('Done!');
})();
