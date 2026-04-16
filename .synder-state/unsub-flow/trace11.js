const { chromium } = require('playwright');
const path = require('path');

const SS = path.join(__dirname);
const CF = {
  'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
  'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde'
};

async function goToSurveyStep(page) {
  await page.goto('https://demo.synderapp.com/organizations/settings/manageSubscription', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Step 1: Click "Cancel subscription" (opens confirmation modal)
  const cancelBtns = await page.$$('button:has-text("Cancel subscription")');
  await cancelBtns[0].click();
  await page.waitForTimeout(1500);
  
  // Step 2: Confirm in modal
  const allCancelBtns = await page.$$('button:has-text("Cancel subscription")');
  await allCancelBtns[allCancelBtns.length - 1].click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle').catch(() => {});
  
  // Step 3: Click "I'm fine with this" on loss aversion page
  const fineBtn = await page.$('button.MuiButton-outlinedSecondary');
  await fineBtn.click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle').catch(() => {});
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: CF,
    storageState: path.join(__dirname, '..', 'storage-state.json')
  });
  const page = await context.newPage();

  await goToSurveyStep(page);
  console.log('Survey step URL:', page.url());
  await page.screenshot({ path: path.join(SS, '60-survey-step.png'), fullPage: true });

  // Get survey options
  const surveyText = await page.evaluate(() => document.body.innerText);
  console.log('SURVEY STEP TEXT:\n', surveyText.substring(0, 3000));

  // Get all interactive elements
  const els = await page.$$eval('button, input, label, [role="radio"], [role="checkbox"], [class*="reason"], [class*="option"]', elems =>
    elems.filter(e => e.offsetParent !== null).map(e => ({
      tag: e.tagName,
      type: e.type || '',
      text: e.textContent?.trim()?.substring(0, 100),
      className: e.className?.substring?.(0, 100) || ''
    }))
  );
  console.log('Interactive elements:', JSON.stringify(els, null, 2));

  // Check if reasons are clickable elements
  // Find li, div, p elements with the reason text
  const reasons = await page.$$eval('li, [class*="reason"], [class*="item"], [class*="option"]', elems =>
    elems.filter(e => e.offsetParent !== null).map(e => ({
      tag: e.tagName,
      text: e.textContent?.trim()?.substring(0, 100),
      className: e.className?.substring?.(0, 100) || ''
    })).filter(e => e.text)
  );
  console.log('Reason items:', JSON.stringify(reasons.slice(0, 20), null, 2));

  // Try clicking "Too expensive" as a reason
  const tooExpensive = await page.$('text="Too expensive"');
  if (tooExpensive) {
    await tooExpensive.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SS, '61-reason-selected.png') });
    console.log('Selected "Too expensive"');
    
    // Check what changed
    const selectedText = await page.evaluate(() => document.body.innerText);
    if (selectedText.includes('textarea') || selectedText !== surveyText) {
      console.log('Something changed after selection:', selectedText.substring(0, 2000));
    }
  }

  // Click Next
  const nextBtn = await page.$('button:has-text("Next")');
  if (nextBtn) {
    console.log('Clicking Next...');
    await nextBtn.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
    
    console.log('URL after Next:', page.url());
    await page.screenshot({ path: path.join(SS, '62-after-next.png'), fullPage: true });
    
    const afterNextText = await page.evaluate(() => document.body.innerText);
    console.log('AFTER NEXT TEXT:\n', afterNextText.substring(0, 5000));
    
    // Check for more steps, modals, etc.
    const dialogs = await page.$$('[role="dialog"]');
    for (let i = 0; i < dialogs.length; i++) {
      const t = await dialogs[i].textContent();
      console.log(`Dialog ${i}: ${t?.substring(0, 500)}`);
    }
    
    // Check buttons again
    const newBtns = await page.$$eval('button', btns =>
      btns.filter(b => b.offsetParent !== null)
        .map(b => b.textContent?.trim()?.substring(0, 80))
        .filter(Boolean)
    );
    console.log('Buttons on new page:', newBtns);
    
    // Click Next again if present
    const nextBtn2 = await page.$('button:has-text("Next")');
    if (nextBtn2) {
      console.log('Another Next button found, clicking...');
      await nextBtn2.click();
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle').catch(() => {});
      console.log('URL after 2nd Next:', page.url());
      await page.screenshot({ path: path.join(SS, '63-after-2nd-next.png'), fullPage: true });
      const finalText = await page.evaluate(() => document.body.innerText);
      console.log('AFTER 2ND NEXT:\n', finalText.substring(0, 5000));
    }
    
    // Check for "Submit" or final confirmation
    const submitBtn = await page.$('button:has-text("Submit"), button:has-text("Confirm"), button:has-text("Cancel subscription"), button:has-text("Done")');
    if (submitBtn) {
      const submitText = await submitBtn.textContent();
      console.log('Found submit-like button:', submitText?.trim());
    }
  } else {
    console.log('Next button not found!');
    const allBtns = await page.$$('button');
    for (const b of allBtns) {
      const t = await b.textContent();
      const cls = await b.evaluate(el => el.className);
      console.log(`  btn: "${t?.trim()}" class: ${cls?.substring(0, 60)}`);
    }
  }

  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });
  await browser.close();
  console.log('Done!');
})();
