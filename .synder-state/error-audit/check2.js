const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const c = await b.newContext({
    storageState: '/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json',
    viewport: { width: 1440, height: 900 }
  });
  const p = await c.newPage();
  
  await p.goto('https://demo.synderapp.com/controlPanel/index', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForTimeout(4000);
  console.log('Current URL:', p.url());
  await p.screenshot({ path: '/home/ubuntu/.openclaw/workspace/.synder-state/error-audit/check-01.png', fullPage: true });
  
  // Get ALL links on page
  const allLinks = await p.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.map(l => ({ href: l.href, text: l.textContent.trim().substring(0, 40) }))
      .filter(x => x.text.length > 0);
  });
  console.log('ALL links:', JSON.stringify(allLinks, null, 2));
  
  // Get page structure
  const structure = await p.evaluate(() => {
    const nav = document.querySelector('nav, [class*="sidebar"], [class*="menu"], [class*="navigation"]');
    return nav ? nav.innerHTML.substring(0, 2000) : 'no nav found';
  });
  console.log('Nav structure:', structure.substring(0, 1000));
  
  // Get page text
  const bodyText = await p.evaluate(() => document.body.innerText.substring(0, 2000));
  console.log('Body text:', bodyText);
  
  await b.close();
})().catch(e => console.error('ERR:', e.message));
