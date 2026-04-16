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

  // Go directly to manage subscription
  await page.goto('https://demo.synderapp.com/organizations/settings/manageSubscription', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Screenshot the manage subscription page first
  await page.screenshot({ path: path.join(SS, '40-manage-sub.png'), fullPage: true });

  // Click Cancel subscription (first click - opens modal)
  await page.click('button:has-text("Cancel subscription")');
  await page.waitForTimeout(1500);
  
  // Screenshot modal
  await page.screenshot({ path: path.join(SS, '41-cancel-modal.png') });
  
  // Now click "Cancel subscription" inside the modal (the outlined one)
  const modalCancelBtn = await page.$('.MuiButton-outlined:has-text("Cancel subscription")');
  if (modalCancelBtn) {
    console.log('Clicking modal "Cancel subscription"...');
    await modalCancelBtn.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
    
    console.log('URL after modal cancel:', page.url());
    await page.screenshot({ path: path.join(SS, '42-after-modal-cancel.png'), fullPage: true });
    
    // Check for another modal or new page
    const modal2 = await page.$('[class*="modal"], [class*="Modal"], [role="dialog"], [class*="MuiDialog"]');
    if (modal2) {
      const modal2Text = await modal2.textContent();
      console.log('Second modal text:', modal2Text?.substring(0, 2000));
      await page.screenshot({ path: path.join(SS, '43-second-modal.png') });
      
      const modal2Btns = await modal2.$$eval('button, a', els =>
        els.map(e => ({ text: e.textContent?.trim()?.substring(0, 80) }))
      );
      console.log('Second modal buttons:', JSON.stringify(modal2Btns, null, 2));
      
      const modal2Inputs = await modal2.$$eval('input, textarea, select, [role="radio"]', els =>
        els.map(e => ({
          tag: e.tagName,
          type: e.type || '',
          placeholder: e.placeholder || '',
          name: e.name || '',
          labels: e.labels ? Array.from(e.labels).map(l => l.textContent?.trim()) : []
        }))
      );
      console.log('Second modal inputs:', JSON.stringify(modal2Inputs, null, 2));
    }
    
    // Check page content
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    console.log('Page text after cancel:\n', pageText.substring(0, 3000));
    
    // Check for success/error messages
    const messages = await page.$$eval('[class*="toast"], [class*="Toast"], [class*="snackbar"], [class*="Snackbar"], [class*="alert"], [class*="Alert"], [class*="notification"], [class*="success"], [class*="error"]', els =>
      els.filter(e => e.offsetParent !== null)
        .map(e => e.textContent?.trim()?.substring(0, 200))
        .filter(Boolean)
    );
    console.log('Messages/notifications:', messages);
    
    // Get all visible buttons
    const allBtns = await page.$$eval('button, [role="button"]', els =>
      els.filter(e => e.offsetParent !== null)
        .map(e => e.textContent?.trim()?.substring(0, 80))
        .filter(Boolean)
    );
    console.log('All visible buttons:', allBtns);
    
    // Check if subscription status changed
    const subStatus = await page.$$eval('*', els =>
      els.filter(e => e.children.length === 0)
        .map(e => e.textContent?.trim())
        .filter(t => t && (
          /cancel/i.test(t) || /active/i.test(t) || /expire/i.test(t) || 
          /resubscr/i.test(t) || /renew/i.test(t) || /ended/i.test(t)
        ))
    );
    console.log('Status-related text nodes:', [...new Set(subStatus)]);
    
  } else {
    console.log('Modal cancel button not found');
    // Try alternative selector
    const allButtons = await page.$$('button');
    for (const btn of allButtons) {
      const text = await btn.textContent();
      console.log('Button:', text?.trim()?.substring(0, 60));
    }
  }

  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  await browser.close();
  console.log('Done!');
})();
