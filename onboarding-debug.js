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
  
  // Navigate to main page and trigger org creation
  await page.goto('https://demo.synderapp.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '.synder-state/debug-main.png' });
  const mainText = await page.innerText('body');
  console.log('Main page text:');
  mainText.split('\n').filter(l=>l.trim()).slice(0,20).forEach(l => console.log(' ', l.trim()));
  
  // Find org switcher - look for any element with "Dasha" or "DA" text
  const dashText = await page.$('text=DA');
  const dashText2 = await page.$('text=Dasha Test');
  console.log('\nFound "DA":', !!dashText);
  console.log('Found "Dasha Test":', !!dashText2);
  
  // Try clicking the org area in the sidebar top
  // Based on earlier screenshot, it's in the top-left of the sidebar
  // Let me look for dropdown triggers
  const dropdowns = await page.evaluate(() => {
    const els = document.querySelectorAll('[aria-haspopup], [aria-expanded], select, [class*="dropdown"], [class*="switcher"]');
    return Array.from(els).map(el => ({
      tag: el.tagName,
      ariaHaspopup: el.getAttribute('aria-haspopup'),
      class: el.className?.toString()?.substring(0,80),
      text: el.textContent?.trim()?.substring(0,50),
      x: Math.round(el.getBoundingClientRect().x),
      y: Math.round(el.getBoundingClientRect().y)
    }));
  });
  console.log('\nDropdown triggers:');
  dropdowns.forEach(d => console.log(`  ${d.tag} y=${d.y} class="${d.class.substring(0,50)}" text="${d.text}"`));
  
  // Try clicking at the top of the sidebar where the org name would be
  // From the earlier screenshot, it was "DA" circle + "Dasha Test Com..." text
  await page.mouse.click(50, 80); // rough click in sidebar header area
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.synder-state/debug-sidebar-click.png' });
  
  const afterClick = await page.innerText('body');
  if (afterClick.includes('Create organization')) {
    console.log('\nOrg menu opened! Found "Create organization"');
    await page.click('text=Create organization');
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  
  await page.screenshot({ path: '.synder-state/debug-after-org.png', fullPage: true });
  const finalText = await page.innerText('body');
  console.log('\nFinal page:');
  finalText.split('\n').filter(l=>l.trim()).slice(0,40).forEach(l => console.log(' ', l.trim()));
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
