const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

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
  console.log('Settings page URL:', page.url());
  await page.screenshot({ path: path.join(SS, '01-settings-page.png'), fullPage: true });

  // Find the Unsubscribe element
  const unsubElements = await page.$$eval('*', els =>
    els.filter(e => e.textContent?.trim() === 'Unsubscribe' || e.textContent?.trim() === 'UN')
      .map(e => ({
        tag: e.tagName,
        text: e.textContent?.trim()?.substring(0, 60),
        className: e.className?.substring?.(0, 100) || '',
        href: e.href || '',
        id: e.id || ''
      }))
  );
  console.log('Unsubscribe elements:', JSON.stringify(unsubElements, null, 2));

  // Get the full top section / sidebar text
  const topArea = await page.evaluate(() => {
    const body = document.body.innerText;
    return body.substring(0, 2000);
  });
  console.log('Page text:\n', topArea);

  // Find and click "Unsubscribe"
  const unsubButton = await page.$('text="Unsubscribe"');
  if (unsubButton) {
    console.log('Found Unsubscribe button/link, clicking...');
    
    // Check if it opens a modal or navigates
    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 5000 }).catch(() => null),
      unsubButton.click()
    ]);
    
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle').catch(() => {});
    console.log('After clicking Unsubscribe:', page.url());
    await page.screenshot({ path: path.join(SS, '02-after-unsub-click.png'), fullPage: true });
    
    // Check for modal/dialog
    const modal = await page.$('[class*="modal"], [class*="Modal"], [role="dialog"], [class*="popup"], [class*="Popup"]');
    if (modal) {
      console.log('Modal appeared!');
      const modalText = await modal.textContent();
      console.log('Modal text:', modalText?.substring(0, 1000));
      await page.screenshot({ path: path.join(SS, '03-unsub-modal.png') });
      
      // Look for buttons in the modal
      const modalButtons = await modal.$$eval('button, a', els =>
        els.map(e => ({ tag: e.tagName, text: e.textContent?.trim()?.substring(0, 60) }))
      );
      console.log('Modal buttons:', JSON.stringify(modalButtons, null, 2));
    }
    
    // Check for new page content
    const newPageText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('Page text after click:\n', newPageText.substring(0, 2000));
    
    // Get all interactive elements on the new page
    const interactiveEls = await page.$$eval('button, a, input, select, textarea, [role="button"]', els =>
      els.filter(e => e.offsetParent !== null) // visible only
        .map(e => ({
          tag: e.tagName,
          type: e.type || '',
          text: e.textContent?.trim()?.substring(0, 80),
          placeholder: e.placeholder || '',
          value: e.value || '',
          href: e.href || ''
        }))
    );
    console.log('Visible interactive elements:', JSON.stringify(interactiveEls, null, 2));
  } else {
    console.log('No Unsubscribe element found!');
    
    // Maybe it's in the sidebar, look more carefully
    const sidebar = await page.$eval('body', el => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const texts = [];
      while (walker.nextNode()) {
        if (walker.currentNode.textContent.includes('nsubscrib')) {
          const parent = walker.currentNode.parentElement;
          texts.push({
            text: walker.currentNode.textContent.trim(),
            parentTag: parent?.tagName,
            parentClass: parent?.className?.substring(0, 100)
          });
        }
      }
      return texts;
    });
    console.log('Text nodes with "unsubscrib":', JSON.stringify(sidebar, null, 2));
  }

  await browser.close();
  console.log('Done!');
})();
