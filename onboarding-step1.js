const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // Load existing state
  try {
    const state = JSON.parse(fs.readFileSync('.synder-state/storage-state.json', 'utf8'));
    if (state.cookies) await context.addCookies(state.cookies);
  } catch(e) {
    console.log('No existing state');
  }

  const page = await context.newPage();
  
  // Go to Synder
  console.log('Loading Synder...');
  await page.goto('https://demo.synderapp.com', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('URL:', page.url());
  
  // Look for org switcher / create new org option
  // Usually in top-left corner with the org name
  await page.screenshot({ path: '.synder-state/onboard-01-start.png', fullPage: false });
  
  // Click on the org name/switcher in the sidebar
  const orgSelector = await page.$('[class*="organization"], [class*="company"], [data-testid*="org"]');
  
  // Try clicking the org name area in top-left
  console.log('Looking for org switcher...');
  const orgText = await page.$('text=Dasha Test Com');
  if (orgText) {
    console.log('Found org name, clicking...');
    await orgText.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '.synder-state/onboard-02-org-menu.png', fullPage: false });
    console.log('URL after click:', page.url());
    
    // Look for "Create new" or "Add organization" option
    const pageText = await page.innerText('body').catch(() => '');
    const lines = pageText.split('\n').filter(l => l.trim()).slice(0, 50);
    console.log('Visible text (first 50 lines):');
    lines.forEach(l => console.log('  ', l.trim()));
  } else {
    console.log('Could not find org name. Trying other selectors...');
    // Try to find any dropdown or menu in the sidebar header area
    const sidebar = await page.$$('nav a, aside a, [class*="sidebar"] a, [class*="menu"] a');
    console.log('Found', sidebar.length, 'sidebar links');
    
    const bodyText = await page.innerText('body').catch(() => '');
    const lines = bodyText.split('\n').filter(l => l.trim()).slice(0, 30);
    console.log('Page text:');
    lines.forEach(l => console.log('  ', l.trim()));
  }
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
