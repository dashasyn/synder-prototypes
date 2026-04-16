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
  async function ss(name) {
    await page.screenshot({ path: `.synder-state/${name}.png`, fullPage: true });
    console.log(`📸 ${name}`);
  }
  async function nextStep() {
    const btn = await page.locator('button:has-text("Next step")').boundingBox();
    await clickAt(btn.x + 30, btn.y + 15);
    await page.waitForTimeout(4000);
    await page.waitForLoadState('networkidle').catch(() => {});
  }

  await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  let body = await page.innerText('body');

  // ─── SELECT INTEGRATIONS ───
  if (body.includes('Select the integrations')) {
    console.log('>>> Select integrations');
    
    const cards = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[alt="platform_card"]');
      return Array.from(imgs).map(img => {
        const r = img.getBoundingClientRect();
        return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
      });
    });
    
    // Sales row (y < 400): 0=Amazon, 1=eBay, 2=Shopify, 3=Etsy, 4=WooCommerce
    // Payment row (y > 400): 5=Stripe, 6=PayPal, 7=Square, 8=GoCardless, 9=Authorize.Net
    
    // Select Shopify (card 2)
    if (cards.length >= 3) {
      console.log('Selecting Shopify (card 2)...');
      await clickAt(cards[2].x, cards[2].y);
      await page.waitForTimeout(300);
    }
    
    // Select Stripe (card 5)
    if (cards.length >= 6) {
      console.log('Selecting Stripe (card 5)...');
      await clickAt(cards[5].x, cards[5].y);
      await page.waitForTimeout(300);
    }
    
    await ss('oneshot-01-integrations');
    await nextStep();
    body = await page.innerText('body');
    console.log('After integrations:', body.split('\n').filter(l=>l.trim()).slice(0,8).join(' | '));
  }

  // ─── SELECT ACCOUNTING ───
  if (body.includes('accounting software') || body.includes('Select accounting')) {
    console.log('\n>>> Select accounting');
    const cards = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[alt="platform_card"]');
      return Array.from(imgs).map(img => {
        const r = img.getBoundingClientRect();
        return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
      });
    });
    if (cards.length > 0) {
      console.log('Selecting QBO (first card)...');
      await clickAt(cards[0].x, cards[0].y);
    }
    await ss('oneshot-02-accounting');
    await nextStep();
    body = await page.innerText('body');
    console.log('After accounting:', body.split('\n').filter(l=>l.trim()).slice(0,8).join(' | '));
  }

  // ─── SYNC MODE ───
  if (body.includes('synchronization mode') || body.includes('Per transaction')) {
    console.log('\n>>> Sync mode — selecting Per transaction');
    const perTxn = await page.$('text=Per transaction');
    if (perTxn) await perTxn.click();
    await page.waitForTimeout(500);
    await ss('oneshot-03-syncmode');
    await nextStep();
    body = await page.innerText('body');
    console.log('After sync mode:', body.split('\n').filter(l=>l.trim()).slice(0,8).join(' | '));
  }

  // ─── CONNECT PLATFORMS ───
  console.log('\n>>> Connect platforms page:');
  body.split('\n').filter(l=>l.trim()).slice(0,30).forEach(l => console.log(' ', l.trim()));
  await ss('oneshot-04-connect');

  // List all buttons
  const buttons = await page.evaluate(() => {
    const btns = document.querySelectorAll('button, a');
    return Array.from(btns).filter(b => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }).map(b => ({
      text: b.textContent.trim().substring(0, 60),
      href: b.href || '',
      y: Math.round(b.getBoundingClientRect().y),
      x: Math.round(b.getBoundingClientRect().x)
    }));
  });
  console.log('\nButtons:');
  buttons.forEach(b => console.log(`  y=${b.y} x=${b.x} "${b.text}" ${b.href ? '→ ' + b.href.substring(0,80) : ''}`));

  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
