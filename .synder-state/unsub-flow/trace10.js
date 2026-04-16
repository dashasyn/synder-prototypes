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

  await page.goto('https://demo.synderapp.com/organizations/billing?action=UNSUBSCRIBE', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: path.join(SS, '50-loss-aversion.png'), fullPage: true });

  // Find the outlined secondary button (I'm fine with this)
  const fineBtnHandle = await page.$('button.MuiButton-outlinedSecondary');
  if (fineBtnHandle) {
    const text = await fineBtnHandle.textContent();
    console.log('Found button:', text?.trim());
    
    const apiCalls = [];
    page.on('response', resp => {
      if (resp.url().includes('synderapp.com') && !resp.url().match(/\.(js|css|png|jpg|svg|ico|woff|map)(\?|$)/)) {
        const method = resp.request().method();
        if (method !== 'GET' || resp.url().includes('/v1/')) {
          apiCalls.push({ method, url: resp.url().replace('https://demo.synderapp.com', ''), status: resp.status() });
        }
      }
    });
    
    await fineBtnHandle.click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});
    
    console.log('URL after fine click:', page.url());
    await page.screenshot({ path: path.join(SS, '51-after-fine.png'), fullPage: true });
    console.log('API calls:', JSON.stringify(apiCalls.slice(-15), null, 2));
    
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('PAGE TEXT:\n', pageText.substring(0, 5000));

    // Check for dialogs
    const dialogs = await page.$$('[role="dialog"]');
    for (let i = 0; i < dialogs.length; i++) {
      const t = await dialogs[i].textContent();
      if (t?.trim()) {
        console.log(`Dialog ${i}:`, t.trim().substring(0, 500));
        await page.screenshot({ path: path.join(SS, `52-dialog-${i}.png`) });
        
        // Get dialog buttons
        const dBtns = await dialogs[i].$$eval('button', btns =>
          btns.map(b => ({ text: b.textContent?.trim(), className: b.className }))
        );
        console.log('Dialog buttons:', JSON.stringify(dBtns, null, 2));
        
        // Get dialog inputs
        const dInputs = await dialogs[i].$$eval('input, textarea, select, [role="radio"], [role="checkbox"], label', els =>
          els.map(e => ({
            tag: e.tagName,
            type: e.type || '',
            text: e.textContent?.trim()?.substring(0, 100),
            placeholder: e.placeholder || ''
          }))
        );
        console.log('Dialog inputs/labels:', JSON.stringify(dInputs, null, 2));
      }
    }
    
    // Wait longer for any async dialogs
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SS, '53-2-seconds-later.png'), fullPage: true });
    
    // Check for new dialogs after waiting
    const dialogs2 = await page.$$('[role="dialog"]');
    if (dialogs2.length !== dialogs.length) {
      console.log(`New dialogs appeared: ${dialogs2.length}`);
      for (const d of dialogs2) {
        console.log('New dialog:', (await d.textContent())?.substring(0, 500));
        await page.screenshot({ path: path.join(SS, '54-new-dialog.png') });
      }
    }
    
  } else {
    console.log('Button not found. All buttons:');
    const btns = await page.$$('button');
    for (const b of btns) {
      const t = await b.textContent();
      const cls = await b.evaluate(el => el.className);
      console.log(`  "${t?.trim()}" [${cls}]`);
    }
  }

  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  await browser.close();
  console.log('Done!');
})();
