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
  
  let body = await page.innerText('body').catch(() => '');
  console.log('Current page:', body.split('\n').filter(l=>l.trim()).slice(0,5).join(' | '));
  
  // We should be on sync mode selection — select Per Transaction and click Next
  if (body.includes('synchronization mode') || body.includes('Per transaction')) {
    console.log('\n=== On sync mode page ===');
    
    // Select Per transaction
    const perTxn = await page.$('text=Per transaction');
    if (perTxn) {
      await perTxn.click();
      await page.waitForTimeout(500);
      console.log('Per transaction selected');
    }
    
    // Click Next step
    const nextBtn = await page.locator('button:has-text("Next step")').boundingBox();
    await page.mouse.click(nextBtn.x + 30, nextBtn.y + 15);
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});
    
    body = await page.innerText('body').catch(() => '');
    console.log('\nAfter next:', body.split('\n').filter(l=>l.trim()).slice(0,5).join(' | '));
    await page.screenshot({ path: '.synder-state/finish-01.png', fullPage: true });
  }
  
  // Print full page content
  console.log('\n=== FULL PAGE ===');
  body.split('\n').filter(l=>l.trim()).slice(0,80).forEach(l => console.log(' ', l.trim()));
  
  // Look for connect buttons, skip options, etc.
  const buttons = await page.evaluate(() => {
    const btns = document.querySelectorAll('button, a[href]');
    return Array.from(btns).filter(b => b.getBoundingClientRect().width > 0).map(b => ({
      tag: b.tagName,
      text: b.textContent.trim().substring(0, 50),
      href: b.href || '',
      y: Math.round(b.getBoundingClientRect().y)
    }));
  });
  console.log('\nButtons/links:');
  buttons.forEach(b => console.log(`  ${b.tag} y=${b.y} text="${b.text}" href="${b.href.substring(0,60)}"`));
  
  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
