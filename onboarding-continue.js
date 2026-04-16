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
  page.setDefaultTimeout(15000);
  
  async function clickAt(x, y) { await page.mouse.click(x, y); await page.waitForTimeout(400); }
  async function screenshot(name) {
    await page.screenshot({ path: `.synder-state/${name}.png`, fullPage: true });
    console.log(`  📸 ${name}`);
  }

  await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  let body = await page.innerText('body').catch(() => '');
  console.log('Starting on:', body.split('\n').filter(l=>l.trim()).slice(0,5).join(' | '));
  await screenshot('continue-01-start');

  // ─── SELECT INTEGRATIONS ───
  if (body.includes('Select the integrations')) {
    console.log('\n=== STEP: Select integrations ===');
    
    // All integration cards are images. 
    // Sales row: cards 0-4 (y≈300-330)
    // Payment row: cards 5-9 (y≈440-460)
    // Stripe is card 5 (first in payment row)
    const cardPositions = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[alt="platform_card"]');
      return Array.from(imgs).map(img => {
        const r = img.getBoundingClientRect();
        // Get parent container center
        let parent = img.parentElement;
        for (let i = 0; i < 4; i++) { if (parent && parent.parentElement) parent = parent.parentElement; }
        const pr = parent?.getBoundingClientRect();
        return { imgX: Math.round(r.x), imgY: Math.round(r.y), centerX: Math.round(pr?.x + pr?.width/2 || r.x + 60), centerY: Math.round(pr?.y + pr?.height/2 || r.y + 40) };
      });
    });
    console.log('Card positions:', JSON.stringify(cardPositions));
    
    // Click Stripe (first payment card, y > 400)
    const payCards = cardPositions.filter(c => c.imgY > 400).sort((a,b) => a.imgX - b.imgX);
    if (payCards.length > 0) {
      console.log('Clicking Stripe at:', payCards[0]);
      await clickAt(payCards[0].centerX, payCards[0].centerY);
      await page.waitForTimeout(500);
    }
    
    // Also select a sales channel - Shopify (card 2, ~x=688)
    const salesCards = cardPositions.filter(c => c.imgY < 400).sort((a,b) => a.imgX - b.imgX);
    if (salesCards.length >= 3) {
      console.log('Clicking Shopify at:', salesCards[2]);
      await clickAt(salesCards[2].centerX, salesCards[2].centerY);
      await page.waitForTimeout(500);
    }
    
    await screenshot('continue-02-integrations-selected');
    
    // Next
    await clickAt(await page.locator('button:has-text("Next step")').boundingBox().then(b => b.x + 30), 
                  await page.locator('button:has-text("Next step")').boundingBox().then(b => b.y + 15));
    await page.waitForTimeout(4000);
    await page.waitForLoadState('networkidle').catch(() => {});
    
    body = await page.innerText('body').catch(() => '');
    console.log('After next:', body.split('\n').filter(l=>l.trim()).slice(0,5).join(' | '));
    await screenshot('continue-03-after-integrations');
  }

  // ─── SELECT ACCOUNTING ───
  if (body.includes('Select accounting') || body.includes('accounting software')) {
    console.log('\n=== STEP: Select accounting ===');
    
    // Click QuickBooks Online
    const qbo = await page.locator('text=QuickBooks (Online)').boundingBox().catch(() => null);
    if (qbo) {
      await clickAt(qbo.x + 60, qbo.y + 10);
      console.log('  QBO selected');
    }
    await screenshot('continue-04-accounting');
    
    // Next
    const nextBtn = await page.locator('button:has-text("Next step")').boundingBox();
    await clickAt(nextBtn.x + 30, nextBtn.y + 15);
    await page.waitForTimeout(4000);
    await page.waitForLoadState('networkidle').catch(() => {});
    
    body = await page.innerText('body').catch(() => '');
    console.log('After accounting:', body.split('\n').filter(l=>l.trim()).slice(0,8).join(' | '));
    await screenshot('continue-05-after-accounting');
  }

  // ─── CONNECT INTEGRATIONS / PLAN SELECTION ───
  console.log('\n=== CURRENT PAGE ===');
  body.split('\n').filter(l=>l.trim()).slice(0,70).forEach(l => console.log(' ', l.trim()));
  await screenshot('continue-06-final');

  // Look for Per Transaction option
  const lcBody = body.toLowerCase();
  if (lcBody.includes('per transaction') || lcBody.includes('transaction mode') || lcBody.includes('daily summary')) {
    console.log('\n=== Found sync mode selection! ===');
    // Click Per transaction
    const perTxn = await page.$('text=Per transaction');
    if (!perTxn) {
      // Try variations
      const options = ['Per transaction', 'per transaction', 'Transaction', 'Daily summary', 'Summarize'];
      for (const opt of options) {
        const el = await page.$(`text=${opt}`);
        if (el) { console.log(`Found: "${opt}"`); await el.click(); break; }
      }
    } else {
      await perTxn.click();
      console.log('Clicked Per transaction');
    }
    await page.waitForTimeout(500);
    await screenshot('continue-07-per-transaction');
  }

  // Check for Connect buttons
  if (lcBody.includes('connect') && (lcBody.includes('stripe') || lcBody.includes('shopify'))) {
    console.log('\nConnect integration page detected');
    // Look for "Skip" or "Connect later"
    const skip = await page.$('text=Skip');
    const later = await page.$('text=later');
    const finish = await page.$('text=Finish');
    const done = await page.$('text=Done');
    const goTo = await page.$('text=Go to');
    
    if (skip) { console.log('Skip found'); await skip.click(); }
    else if (later) { console.log('Later found'); await later.click(); }
    else if (finish) { console.log('Finish found'); await finish.click(); }
    else if (done) { console.log('Done found'); await done.click(); }
    else if (goTo) { console.log('Go to found'); await goTo.click(); }
    
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
    body = await page.innerText('body').catch(() => '');
    console.log('After connect:', body.split('\n').filter(l=>l.trim()).slice(0,10).join(' | '));
    await screenshot('continue-08-after-connect');
  }

  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
