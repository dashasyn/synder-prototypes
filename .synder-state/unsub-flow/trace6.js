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

  // Go directly to manage subscription page
  await page.goto('https://demo.synderapp.com/organizations/settings/manageSubscription', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Manage sub page:', page.url());
  await page.screenshot({ path: path.join(SS, '40-manage-sub.png'), fullPage: true });

  // Click "Cancel subscription"
  const cancelBtn = await page.$('button:has-text("Cancel subscription")');
  if (cancelBtn) {
    console.log('Clicking "Cancel subscription"...');
    await cancelBtn.click();
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle').catch(() => {});
    
    console.log('URL after cancel click:', page.url());
    await page.screenshot({ path: path.join(SS, '41-after-cancel-click.png'), fullPage: true });
    
    // Check for modal/dialog
    const modal = await page.$('[class*="modal"], [class*="Modal"], [role="dialog"], [class*="popup"], [class*="Popup"], [class*="MuiDialog"], [class*="MuiModal"]');
    if (modal) {
      console.log('=== MODAL FOUND ===');
      const modalText = await modal.textContent();
      console.log('Modal text:', modalText?.substring(0, 2000));
      await page.screenshot({ path: path.join(SS, '42-cancel-modal.png') });
      
      // Get all buttons/links in modal
      const modalBtns = await modal.$$eval('button, a, [role="button"]', els =>
        els.map(e => ({
          tag: e.tagName,
          text: e.textContent?.trim()?.substring(0, 80),
          href: e.href || '',
          className: e.className?.substring?.(0, 100) || ''
        }))
      );
      console.log('Modal buttons:', JSON.stringify(modalBtns, null, 2));

      // Check for radio buttons, checkboxes, text inputs in modal
      const modalInputs = await modal.$$eval('input, textarea, select, [role="radio"], [role="checkbox"]', els =>
        els.map(e => ({
          tag: e.tagName,
          type: e.type || '',
          name: e.name || '',
          value: e.value || '',
          placeholder: e.placeholder || '',
          checked: e.checked || false,
          labels: e.labels ? Array.from(e.labels).map(l => l.textContent?.trim()?.substring(0, 60)) : []
        }))
      );
      console.log('Modal inputs:', JSON.stringify(modalInputs, null, 2));

      // Check for reason selection (common in unsubscribe flows)
      const radioLabels = await modal.$$eval('label, [class*="radio"], [class*="Radio"], [class*="reason"], [class*="Reason"]', els =>
        els.map(e => e.textContent?.trim()?.substring(0, 100)).filter(Boolean)
      );
      console.log('Labels/reasons:', radioLabels);
    } else {
      console.log('No modal found. Checking page content...');
      const pageText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
      console.log('Page text:', pageText.substring(0, 3000));
      
      // Get all visible interactive elements
      const allEls = await page.$$eval('button, a, input, textarea, select, [role="button"], [role="radio"], [role="checkbox"]', els =>
        els.filter(e => e.offsetParent !== null)
          .map(e => ({
            tag: e.tagName,
            type: e.type || '',
            text: e.textContent?.trim()?.substring(0, 80),
            placeholder: e.placeholder || '',
            value: e.value || '',
            name: e.name || ''
          }))
      );
      console.log('Interactive elements:', JSON.stringify(allEls, null, 2));
    }
  } else {
    console.log('Cancel subscription button not found!');
  }

  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  await browser.close();
  console.log('Done!');
})();
