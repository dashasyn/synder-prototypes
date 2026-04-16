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
  
  await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Find all image parent containers (the cards)
  const cardInfo = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img[alt="platform_card"]');
    return Array.from(imgs).map(img => {
      // Walk up to find a clickable parent
      let el = img;
      for (let i = 0; i < 5; i++) {
        el = el.parentElement;
        if (!el) break;
        if (el.onclick || el.getAttribute('role') === 'button' || 
            el.tagName === 'BUTTON' || 
            el.style.cursor === 'pointer' ||
            window.getComputedStyle(el).cursor === 'pointer') {
          break;
        }
      }
      const rect = img.getBoundingClientRect();
      const parentRect = el?.getBoundingClientRect();
      
      // Try to decode SVG to find platform name
      const src = img.src || '';
      let svgText = '';
      if (src.startsWith('data:image/svg+xml;base64,')) {
        try {
          svgText = atob(src.substring('data:image/svg+xml;base64,'.length)).substring(0, 200);
        } catch(e) {}
      }
      
      return {
        imgY: Math.round(rect.y),
        imgX: Math.round(rect.x),
        parentTag: el?.tagName,
        parentClass: el?.className?.toString()?.substring(0, 80),
        parentX: Math.round(parentRect?.x || 0),
        parentY: Math.round(parentRect?.y || 0),
        parentW: Math.round(parentRect?.width || 0),
        svgHint: svgText.substring(0, 100)
      };
    });
  });
  
  console.log('Cards found:');
  cardInfo.forEach((c, i) => console.log(`  Card ${i}: img at (${c.imgX},${c.imgY}), parent ${c.parentTag} at (${c.parentX},${c.parentY}) w=${c.parentW}`));
  console.log('\nSVG hints:');
  cardInfo.forEach((c, i) => console.log(`  Card ${i}: ${c.svgHint}`));
  
  // Cards y~308-320 = Sales row (5 cards: Amazon, eBay, Shopify, Etsy, WooCommerce)
  // Cards y~440-460 = Payment row (5 cards: Stripe, PayPal, Square, GoCardless, Authorize.Net)
  // Click on the first payment card (Stripe) - lowest y in payment row
  
  const paymentCards = cardInfo.filter(c => c.imgY > 400);
  console.log('\nPayment row cards:', paymentCards.length);
  
  if (paymentCards.length > 0) {
    // Sort by X to get left-to-right order
    paymentCards.sort((a, b) => a.imgX - b.imgX);
    const stripeCard = paymentCards[0]; // Stripe is first (leftmost)
    console.log('Clicking Stripe (first payment card) at:', stripeCard.imgX, stripeCard.imgY);
    await page.mouse.click(stripeCard.imgX + 30, stripeCard.imgY + 20);
    await page.waitForTimeout(800);
    await page.screenshot({ path: '.synder-state/onboard-stripe-selected.png', fullPage: true });
  }
  
  // Check selection state
  const selectionCheck = await page.evaluate(() => {
    // Look for selected/checked state on cards
    const allEls = document.querySelectorAll('[class*="selected"], [class*="active"], [class*="checked"], [aria-checked="true"], [aria-selected="true"]');
    return Array.from(allEls).map(el => ({
      tag: el.tagName,
      class: el.className?.toString()?.substring(0, 80),
      text: el.textContent?.trim()?.substring(0, 50)
    }));
  });
  console.log('Selected state:', JSON.stringify(selectionCheck));
  
  // Also check if the card has a visual change (look for checkmark or border)
  const cardStates = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img[alt="platform_card"]');
    return Array.from(imgs).map(img => {
      let el = img.parentElement;
      for (let i = 0; i < 5; i++) {
        if (!el) break;
        const style = window.getComputedStyle(el);
        if (style.border !== 'medium' && style.borderColor !== 'rgba(0, 0, 0, 0)') {
          return { hasStyle: true, border: style.border?.substring(0,50), background: style.background?.substring(0,50) };
        }
        el = el.parentElement;
      }
      return { hasStyle: false };
    });
  });
  console.log('Card borders:', JSON.stringify(cardStates.slice(5))); // Payment row
  
  // Proceed to next step regardless
  console.log('\nClicking Next step...');
  await page.click('button:has-text("Next step")');
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle').catch(() => {});
  
  console.log('URL:', page.url());
  await page.screenshot({ path: '.synder-state/onboard-step4.png', fullPage: true });
  
  const nextText = await page.innerText('body').catch(() => '');
  const nextLines = nextText.split('\n').filter(l => l.trim()).slice(0, 60);
  console.log('\n=== NEXT PAGE ===');
  nextLines.forEach(l => console.log('  ', l.trim()));
  
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
