const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
  
  try {
    const state = JSON.parse(fs.readFileSync('.synder-state/storage-state.json', 'utf8'));
    if (state.cookies) await context.addCookies(state.cookies);
  } catch(e) {}

  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  
  async function clickAt(x, y) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(300);
  }
  
  async function screenshot(name) {
    await page.screenshot({ path: `.synder-state/${name}.png`, fullPage: true });
    console.log(`  📸 ${name}.png`);
  }

  // ─────────────────────────────────────────────
  // Start fresh org creation
  // ─────────────────────────────────────────────
  console.log('=== Starting from Synder main page ===');
  await page.goto('https://demo.synderapp.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Open org switcher
  console.log('Opening org switcher...');
  const orgText = await page.$('text=Dasha Test');
  if (orgText) {
    await orgText.click();
    await page.waitForTimeout(1000);
  }
  
  // Click Create organization
  const createOrg = await page.$('text=Create organization');
  if (createOrg) {
    await createOrg.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
    console.log('  Created, URL:', page.url());
  } else {
    console.log('  Create org not found, trying direct navigate...');
    await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 30000 });
  }
  await page.waitForTimeout(2000);
  await screenshot('e2e-01-start');

  // ─────────────────────────────────────────────
  // STEP 1: Tell us about you (might be first step)
  // ─────────────────────────────────────────────
  const bodyText1 = await page.innerText('body').catch(() => '');
  if (bodyText1.includes('Tell us about you') && !bodyText1.includes('Provide business details')) {
    console.log('\n=== STEP 1: Tell us about you ===');
    // This step might have name/role fields
    await screenshot('e2e-02-step1');
    const lines = bodyText1.split('\n').filter(l=>l.trim()).slice(0, 30);
    lines.forEach(l => console.log(' ', l.trim()));
    // Try clicking Next
    const nextBtn = await page.$('text=Next step');
    if (nextBtn) { await nextBtn.click(); await page.waitForTimeout(2000); }
  }

  // ─────────────────────────────────────────────
  // STEP 2: Provide business details
  // ─────────────────────────────────────────────
  console.log('\n=== STEP 2: Business details ===');
  
  // 1. Business name
  const nameInput = page.locator('input[placeholder="Type any name here..."]');
  await nameInput.click();
  await nameInput.type('Dasha Per-Txn Test', { delay: 15 });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  console.log('  Name filled:', await nameInput.inputValue());

  // 2. Country (select #1)
  const countryBox = await page.$$eval('[class*="select__control"]', els => {
    const el = els[1]; const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await clickAt(countryBox.x, countryBox.y);
  await page.keyboard.type('United States', { delay: 15 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  console.log('  Country: done');

  // 3. Industry (react-select multi with checkboxes)
  const iLabelBox = await page.locator('text=Industry').first().boundingBox();
  await clickAt(iLabelBox.x + 200, iLabelBox.y + 40);
  await page.waitForTimeout(800);
  await page.keyboard.type('Retail', { delay: 20 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  console.log('  Industry: done');

  // 4. Duration (select #2)
  const durBox = await page.$$eval('[class*="select__control"]', els => {
    // Find the one that still says Select... (duration), y > 500
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const ph = el.querySelector('[class*="placeholder"]');
      if (ph && r.y > 500) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    const el = els[2]; const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await clickAt(durBox.x, durBox.y);
  await page.waitForTimeout(500);
  const dur13 = await page.locator('text=1-3 years').boundingBox().catch(() => null);
  if (dur13) { await clickAt(dur13.x + 20, dur13.y + 10); }
  else { await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); }
  await page.waitForTimeout(500);
  console.log('  Duration: done');

  // 5. Revenue (if appeared)
  const revLabel = await page.locator('text=Your revenue').boundingBox().catch(() => null);
  if (revLabel) {
    const revBox = await page.$$eval('[class*="select__control"]', els => {
      const el = els[els.length-1]; const r = el.getBoundingClientRect();
      return { x: r.x + r.width/2, y: r.y + r.height/2 };
    });
    await clickAt(revBox.x, revBox.y);
    await page.waitForTimeout(500);
    const firstOpt = await page.locator('[class*="option"]').first().boundingBox().catch(() => null);
    if (firstOpt) { await clickAt(firstOpt.x + 20, firstOpt.y + 10); }
    else { await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); }
    await page.waitForTimeout(500);
    console.log('  Revenue: done');
  }

  // 6. No accountant radio
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const radioInfo = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    return Array.from(radios).map(r => {
      const rect = r.getBoundingClientRect();
      return { value: r.value, x: rect.x, y: rect.y };
    });
  });
  const noRadio = radioInfo.find(r => r.value === 'No');
  if (noRadio) { await clickAt(noRadio.x + 10, noRadio.y + 10); }
  console.log('  No accountant: done');
  
  await screenshot('e2e-03-details-filled');
  
  // Next step
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const nextBox = await page.locator('text=Next step').boundingBox();
  await clickAt(nextBox.x + 30, nextBox.y + 15);
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle').catch(() => {});
  
  const url2 = page.url();
  console.log('  After next URL:', url2);
  const body2 = await page.innerText('body').catch(() => '');
  console.log('  Next page preview:', body2.split('\n').filter(l=>l.trim()).slice(0,5).join(' | '));

  // ─────────────────────────────────────────────
  // STEP 3: Select integrations
  // ─────────────────────────────────────────────
  if (body2.includes('Select the integrations')) {
    console.log('\n=== STEP 3: Select integrations ===');
    await screenshot('e2e-04-integrations');
    
    // Payment cards are at y~440. Stripe is first (leftmost x)
    const cardInfo = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[alt="platform_card"]');
      return Array.from(imgs).map(img => {
        const rect = img.getBoundingClientRect();
        return { x: Math.round(rect.x), y: Math.round(rect.y) };
      });
    });
    
    const paymentCards = cardInfo.filter(c => c.y > 400).sort((a,b) => a.x - b.x);
    if (paymentCards.length > 0) {
      console.log('  Clicking Stripe (first payment card)...');
      await clickAt(paymentCards[0].x + 30, paymentCards[0].y + 20);
      await page.waitForTimeout(500);
      console.log('  Done');
    }
    
    await screenshot('e2e-05-integration-selected');
    
    const nextBox2 = await page.locator('text=Next step').boundingBox();
    await clickAt(nextBox2.x + 30, nextBox2.y + 15);
    await page.waitForTimeout(4000);
    await page.waitForLoadState('networkidle').catch(() => {});
    
    const body3 = await page.innerText('body').catch(() => '');
    console.log('  Next page preview:', body3.split('\n').filter(l=>l.trim()).slice(0,5).join(' | '));
    
    // ─────────────────────────────────────────────
    // Possible sub-step: Select accounting
    // ─────────────────────────────────────────────
    if (body3.includes('Select accounting') || body3.includes('accounting software')) {
      console.log('\n=== SUB-STEP: Select accounting ===');
      await screenshot('e2e-06-accounting');
      
      // Click QuickBooks Online (text should be visible)
      const qbo = await page.$('text=QuickBooks (Online)');
      if (qbo) {
        await qbo.click();
        await page.waitForTimeout(500);
        console.log('  QBO selected');
      } else {
        // Click first accounting card by image
        const acctImgs = await page.$$('img[alt="platform_card"]');
        if (acctImgs.length > 0) {
          const box = await acctImgs[0].boundingBox();
          await clickAt(box.x + 30, box.y + 20);
          console.log('  Clicked first accounting card');
        }
      }
      await screenshot('e2e-07-accounting-selected');
      
      const nextBox3 = await page.locator('text=Next step').boundingBox();
      await clickAt(nextBox3.x + 30, nextBox3.y + 15);
      await page.waitForTimeout(4000);
      await page.waitForLoadState('networkidle').catch(() => {});
      
      const body4 = await page.innerText('body').catch(() => '');
      console.log('  Next page:', body4.split('\n').filter(l=>l.trim()).slice(0,5).join(' | '));
      await screenshot('e2e-08-after-accounting');
    }
  }
  
  // ─────────────────────────────────────────────
  // STEP 4: Connect integrations / Choose plan / Per transaction
  // ─────────────────────────────────────────────
  const bodyFinal = await page.innerText('body').catch(() => '');
  console.log('\n=== CURRENT PAGE ===');
  bodyFinal.split('\n').filter(l=>l.trim()).slice(0, 60).forEach(l => console.log(' ', l.trim()));
  await screenshot('e2e-09-final');
  
  // If we see "per transaction" option, select it
  if (bodyFinal.toLowerCase().includes('per transaction') || bodyFinal.toLowerCase().includes('transaction mode')) {
    console.log('\nFound Per Transaction option!');
    const perTxn = await page.$('text=Per transaction');
    if (perTxn) { await perTxn.click(); await page.waitForTimeout(500); }
  }
  
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  
  console.log('\n=== DONE ===');
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
