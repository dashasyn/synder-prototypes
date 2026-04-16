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

  // Navigate through the whole flow quickly to get to the sub-reason step
  await page.goto('https://demo.synderapp.com/organizations/settings/manageSubscription', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Step 1
  const cancelBtns1 = await page.$$('button:has-text("Cancel subscription")');
  await cancelBtns1[0].click();
  await page.waitForTimeout(1500);

  // Step 2 - confirm modal
  const cancelBtns2 = await page.$$('button:has-text("Cancel subscription")');
  await cancelBtns2[cancelBtns2.length - 1].click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle').catch(() => {});

  // Step 3 - I'm fine with this
  const fineBtn = await page.$('button.MuiButton-outlinedSecondary');
  await fineBtn.click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle').catch(() => {});

  // Step 4 - Main reason survey. Select first reason without apostrophe
  // Use JS click instead of text selector
  await page.evaluate(() => {
    const els = document.querySelectorAll('*');
    for (const el of els) {
      if (el.textContent.trim() === 'Too expensive' && el.children.length === 0) {
        el.click();
        return;
      }
    }
  });
  await page.waitForTimeout(500);
  
  // Check if "Too expensive" was selected visually
  await page.screenshot({ path: path.join(SS, 'S4b-reason-selected-v2.png') });
  
  // Click Next
  await page.click('button:has-text("Next")');
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle').catch(() => {});
  console.log('Sub-reason page URL:', page.url());
  await page.screenshot({ path: path.join(SS, 'S5-sub-reason.png'), fullPage: true });
  
  // Screenshot with validation error
  await page.click('button:has-text("Cancel subscription")').catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SS, 'S5b-sub-reason-validation.png') });
  
  // Now select a sub-reason using JS click
  await page.evaluate(() => {
    const els = document.querySelectorAll('*');
    for (const el of els) {
      if (el.textContent.trim() === 'Found a cheaper tool' && el.children.length === 0) {
        el.click();
        return;
      }
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SS, 'S5c-sub-reason-selected.png') });
  
  // Click Cancel subscription - final
  const apiCalls = [];
  page.on('response', resp => {
    if (resp.url().includes('synderapp.com') && !resp.url().match(/\.(js|css|png|jpg|svg|ico|woff|map)(\?|$)/)) {
      apiCalls.push({ method: resp.request().method(), url: resp.url().replace('https://demo.synderapp.com', ''), status: resp.status() });
    }
  });
  
  await page.click('button:has-text("Cancel subscription")');
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle').catch(() => {});
  
  console.log('URL after FINAL cancel:', page.url());
  await page.screenshot({ path: path.join(SS, 'S6-final.png'), fullPage: true });
  
  const finalText = await page.evaluate(() => document.body.innerText);
  console.log('FINAL STATE:\n', finalText.substring(0, 5000));
  console.log('API calls:', JSON.stringify(apiCalls.filter(c => c.method !== 'GET'), null, 2));
  
  // Wait a bit more
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SS, 'S7-final-settled.png'), fullPage: true });
  const finalText2 = await page.evaluate(() => document.body.innerText);
  if (finalText2 !== finalText) {
    console.log('CHANGED:\n', finalText2.substring(0, 3000));
  }

  // Also check the "Other" option - go back and check if it shows a text area
  // This requires starting fresh, let's do it in another script
  
  // List all screenshots
  const fs = require('fs');
  const files = fs.readdirSync(SS).filter(f => f.endsWith('.png')).sort();
  console.log('\nScreenshots taken:', files);

  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  await browser.close();
  console.log('Done!');
})();
