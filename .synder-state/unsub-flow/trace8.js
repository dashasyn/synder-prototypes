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

  await page.goto('https://demo.synderapp.com/organizations/settings/manageSubscription', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Click first Cancel subscription (opens modal)
  const cancelButtons = await page.$$('button:has-text("Cancel subscription")');
  console.log(`Found ${cancelButtons.length} cancel buttons`);
  if (cancelButtons.length > 0) {
    await cancelButtons[0].click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SS, '41-cancel-modal.png') });
    
    // Now find the second Cancel subscription button (in modal)
    const allCancelBtns = await page.$$('button:has-text("Cancel subscription")');
    console.log(`After modal open: ${allCancelBtns.length} cancel buttons`);
    
    // The modal one should be the last one
    if (allCancelBtns.length >= 2) {
      console.log('Clicking modal cancel button...');
      
      // Intercept API calls to see what happens
      const apiCalls = [];
      page.on('response', resp => {
        if (resp.url().includes('synderapp.com') && !resp.url().includes('.js') && !resp.url().includes('.css') && !resp.url().includes('.png')) {
          apiCalls.push({ url: resp.url(), status: resp.status() });
        }
      });
      
      await allCancelBtns[allCancelBtns.length - 1].click();
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle').catch(() => {});
      
      console.log('URL after cancel confirm:', page.url());
      await page.screenshot({ path: path.join(SS, '42-after-cancel.png'), fullPage: true });
      
      // Log API calls
      console.log('API calls made:', JSON.stringify(apiCalls.slice(-10), null, 2));
      
      // Get full page text
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('FULL PAGE TEXT AFTER CANCEL:\n', pageText.substring(0, 5000));
      
      // Check for new modals
      const dialogs = await page.$$('[role="dialog"], [class*="MuiDialog"], [class*="modal"]');
      for (let i = 0; i < dialogs.length; i++) {
        const text = await dialogs[i].textContent();
        if (text?.trim()) {
          console.log(`Dialog ${i}:`, text.trim().substring(0, 500));
          await page.screenshot({ path: path.join(SS, `43-dialog-${i}.png`) });
        }
      }
      
      // Check for survey/feedback form
      const feedbackEls = await page.$$eval('textarea, [class*="survey"], [class*="Survey"], [class*="feedback"], [class*="Feedback"], [class*="reason"], [class*="Reason"]', els =>
        els.map(e => ({
          tag: e.tagName,
          className: e.className?.substring?.(0, 100) || '',
          placeholder: e.placeholder || '',
          text: e.textContent?.trim()?.substring(0, 100)
        }))
      );
      console.log('Feedback elements:', JSON.stringify(feedbackEls, null, 2));
      
      // Check for toast/snackbar
      await page.waitForTimeout(2000);
      const toasts = await page.$$eval('[class*="Snackbar"], [class*="toast"], [class*="notistack"]', els =>
        els.map(e => e.textContent?.trim()?.substring(0, 200)).filter(Boolean)
      );
      console.log('Toast messages:', toasts);

      // Screenshot again after waiting
      await page.screenshot({ path: path.join(SS, '44-final-state.png'), fullPage: true });
    }
  }

  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  await browser.close();
  console.log('Done!');
})();
