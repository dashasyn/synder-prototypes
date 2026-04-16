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

  // We're now at /organizations/billing?action=UNSUBSCRIBE
  // This is the "What you are leaving behind" page
  await page.goto('https://demo.synderapp.com/organizations/billing?action=UNSUBSCRIBE', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Loss aversion page:', page.url());
  await page.screenshot({ path: path.join(SS, '50-loss-aversion.png'), fullPage: true });

  const lossText = await page.evaluate(() => document.body.innerText);
  console.log('LOSS AVERSION PAGE TEXT:\n', lossText.substring(0, 3000));

  // Get all buttons
  const btns = await page.$$eval('button, a[role="button"], [class*="btn"]', els =>
    els.filter(e => e.offsetParent !== null)
      .map(e => ({
        text: e.textContent?.trim()?.substring(0, 80),
        href: e.href || '',
        className: e.className?.substring?.(0, 80) || ''
      }))
      .filter(e => e.text)
  );
  console.log('Buttons:', JSON.stringify(btns, null, 2));

  // Click "I'm fine with this" to continue
  const fineBtn = await page.$('text="I\'m fine with this"');
  if (fineBtn) {
    console.log('Clicking "I\'m fine with this"...');
    
    const apiCalls = [];
    page.on('response', resp => {
      if (resp.url().includes('synderapp.com') && !resp.url().match(/\.(js|css|png|jpg|svg|ico|woff)(\?|$)/)) {
        apiCalls.push({ url: resp.url(), status: resp.status(), method: resp.request().method() });
      }
    });
    
    await fineBtn.click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});
    
    console.log('URL after "I\'m fine":', page.url());
    await page.screenshot({ path: path.join(SS, '51-after-fine.png'), fullPage: true });
    
    console.log('API calls:', JSON.stringify(apiCalls.slice(-15), null, 2));
    
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('PAGE TEXT AFTER CANCEL:\n', pageText.substring(0, 5000));
    
    // Check for any modals
    const dialogs = await page.$$('[role="dialog"], [class*="MuiDialog"]');
    for (let i = 0; i < dialogs.length; i++) {
      const t = await dialogs[i].textContent();
      if (t?.trim()) {
        console.log(`Dialog ${i}:`, t.trim().substring(0, 500));
        await page.screenshot({ path: path.join(SS, `52-dialog-${i}.png`) });
      }
    }
    
    // Check for survey step
    const surveyEls = await page.$$eval('textarea, [class*="survey"], [class*="reason"]', els =>
      els.map(e => e.textContent?.trim()?.substring(0, 100) || e.placeholder || '')
        .filter(Boolean)
    );
    console.log('Survey elements:', surveyEls);
    
    // Wait more for async content
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SS, '53-final.png'), fullPage: true });
    
    const finalText = await page.evaluate(() => document.body.innerText);
    console.log('FINAL PAGE TEXT:\n', finalText.substring(0, 3000));
    
    // Look for success/confirmation text
    const importantText = await page.$$eval('*', els =>
      els.filter(e => e.children.length === 0 && e.offsetParent !== null)
        .map(e => e.textContent?.trim())
        .filter(t => t && t.length > 5 && (
          /cancel/i.test(t) || /unsub/i.test(t) || /confirm/i.test(t) || 
          /success/i.test(t) || /sorry/i.test(t) || /expire/i.test(t) ||
          /ended/i.test(t) || /thank/i.test(t) || /resubscr/i.test(t) ||
          /renew/i.test(t) || /feedback/i.test(t) || /reason/i.test(t)
        ))
    );
    console.log('Important text nodes:', [...new Set(importantText)]);
    
  } else {
    console.log('"I\'m fine with this" button not found!');
    // Look for all buttons
    const allBtns = await page.$$('button');
    for (const btn of allBtns) {
      const t = await btn.textContent();
      console.log('Button:', t?.trim());
    }
  }

  // Save state
  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  await browser.close();
  console.log('Done!');
})();
