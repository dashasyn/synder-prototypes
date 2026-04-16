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

  // ===== CLEAN SCREENSHOT RUN =====
  
  // STEP 1: Manage subscription page
  await page.goto('https://demo.synderapp.com/organizations/settings/manageSubscription', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: path.join(SS, 'S1-manage-subscription.png'), fullPage: true });
  console.log('S1 done: Manage Subscription page');

  // STEP 2: Click Cancel subscription → modal
  const cancelBtns1 = await page.$$('button:has-text("Cancel subscription")');
  await cancelBtns1[0].click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SS, 'S2-cancel-confirmation-modal.png') });
  console.log('S2 done: Confirmation modal');

  // STEP 3: Confirm in modal → loss aversion page
  const cancelBtns2 = await page.$$('button:has-text("Cancel subscription")');
  await cancelBtns2[cancelBtns2.length - 1].click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.screenshot({ path: path.join(SS, 'S3-loss-aversion.png'), fullPage: true });
  console.log('S3 done: Loss aversion page');
  console.log('URL S3:', page.url());

  // STEP 4: Click "I'm fine with this" → survey
  const fineBtn = await page.$('button.MuiButton-outlinedSecondary');
  await fineBtn.click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.screenshot({ path: path.join(SS, 'S4-survey-main-reason.png'), fullPage: true });
  console.log('S4 done: Survey main reason');
  
  // Get all reason texts
  const surveyBody = await page.evaluate(() => document.body.innerText);
  console.log('Survey text:', surveyBody.substring(0, 1000));
  
  // Click "Too expensive" to see sub-reasons
  await page.click('text="Too expensive"');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SS, 'S4b-survey-reason-selected.png') });
  console.log('S4b done: Reason selected');
  
  // Click Next
  await page.click('button:has-text("Next")');
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.screenshot({ path: path.join(SS, 'S5-survey-sub-reason.png'), fullPage: true });
  console.log('S5 done: Sub-reason page');
  
  const subReasonText = await page.evaluate(() => document.body.innerText);
  console.log('Sub-reason text:', subReasonText.substring(0, 1500));
  
  // Get the sub-reason options
  const subOptions = await page.$$eval('*', els =>
    els.filter(e => e.children.length === 0 && e.offsetParent !== null)
      .map(e => e.textContent?.trim())
      .filter(t => t && t.length > 5 && t.length < 100)
  );
  console.log('Sub-options:', [...new Set(subOptions)]);
  
  // Click a sub-reason
  const subBtn = await page.$('text="The price doesn\'t match the value I got"');
  const subBtn2 = await page.$('text="My business can\'t afford it right now"');
  const anySubReason = subBtn || subBtn2;
  if (anySubReason) {
    await anySubReason.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SS, 'S5b-sub-reason-selected.png') });
    console.log('Sub-reason selected');
  }

  // Click Cancel subscription (final)
  const finalCancelBtn = await page.$('button:has-text("Cancel subscription")');
  if (finalCancelBtn) {
    console.log('Clicking final Cancel subscription...');
    
    const apiCalls = [];
    page.on('response', resp => {
      if (resp.url().includes('synderapp.com') && !resp.url().match(/\.(js|css|png|jpg|svg|ico|woff|map)(\?|$)/)) {
        const method = resp.request().method();
        apiCalls.push({ method, url: resp.url().replace('https://demo.synderapp.com', ''), status: resp.status() });
      }
    });
    
    await finalCancelBtn.click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});
    
    console.log('URL after final cancel:', page.url());
    await page.screenshot({ path: path.join(SS, 'S6-final-state.png'), fullPage: true });
    
    const finalText = await page.evaluate(() => document.body.innerText);
    console.log('FINAL STATE TEXT:\n', finalText.substring(0, 5000));
    console.log('API calls:', JSON.stringify(apiCalls.slice(-10), null, 2));
    
    // Wait for success messages
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SS, 'S7-final-settled.png'), fullPage: true });
    const finalText2 = await page.evaluate(() => document.body.innerText);
    if (finalText2 !== finalText) {
      console.log('PAGE CHANGED after 3s:\n', finalText2.substring(0, 3000));
    } else {
      console.log('Page unchanged after 3s');
    }
  } else {
    console.log('Final cancel button not found!');
    const allBtns = await page.$$('button');
    for (const b of allBtns) {
      const t = await b.textContent();
      if ((t?.trim()?.length || 0) > 0) console.log('  btn:', t?.trim());
    }
  }

  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  await browser.close();
  console.log('Done!');
})();
