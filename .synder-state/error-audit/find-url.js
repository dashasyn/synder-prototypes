const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ 
    storageState: '/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json',
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) console.log('NAVIGATE:', frame.url());
  });
  
  await page.goto('https://demo.synderapp.com/controlPanel/index', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  
  // Find all links
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map(a => ({
      text: a.innerText.trim().substring(0, 80),
      href: a.href
    })).filter(l => l.text.length > 0);
  });
  
  console.log('All links:');
  links.forEach(l => console.log(' ', JSON.stringify(l)));
  
  // Click the "Settings" link (the one near mzkt.by)
  // There should be multiple "Settings" links - we want the integration one
  const settingsLinks = links.filter(l => l.text.includes('Settings'));
  console.log('\nSettings links:', JSON.stringify(settingsLinks, null, 2));
  
  // Try clicking the last "Settings" link or the one that links to integration settings
  const integSettingsLink = settingsLinks.find(l => l.href.includes('integration') || l.href.includes('sync'));
  const settingsLinkToClick = integSettingsLink || settingsLinks[settingsLinks.length - 1];
  
  if (settingsLinkToClick) {
    console.log('Clicking:', settingsLinkToClick.href);
    await page.goto(settingsLinkToClick.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    console.log('After click URL:', page.url());
    await page.screenshot({ path: '/home/ubuntu/.openclaw/workspace/.synder-state/error-audit/find-settings.png' });
    
    const text = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('Page text:', text.substring(0, 1500));
    
    // Also get all links on this page
    const newLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]')).map(a => ({
        text: a.innerText.trim().substring(0, 80),
        href: a.href
      })).filter(l => l.text.length > 0);
    });
    console.log('\nLinks on settings page:', JSON.stringify(newLinks.slice(0, 30), null, 2));
  }
  
  // Also try to click directly on the mzkt.by "Settings" button by finding it via HTML
  await page.goto('https://demo.synderapp.com/controlPanel/index', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  
  // Find mzkt.by element and its parent  
  const mzktText = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*')).filter(el => {
      return el.children.length === 0 && (el.innerText || '').trim() === 'mzkt.by';
    });
    if (els.length > 0) {
      let p = els[0];
      for (let i = 0; i < 10; i++) {
        p = p.parentElement;
        if (!p) break;
      }
      return p ? p.innerHTML.substring(0, 2000) : 'no parent found';
    }
    return 'mzkt.by text not found';
  });
  console.log('\nmzkt.by parent HTML:', mzktText);
  
  await browser.close();
})().catch(e => console.error('ERROR:', e.message));
