const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const c = await b.newContext({
    storageState: '/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json',
    viewport: { width: 1440, height: 900 }
  });
  const p = await c.newPage();
  
  // listen for navigation
  p.on('response', r => {
    if (r.status() >= 300 && r.status() < 400) console.log('REDIRECT', r.status(), r.url().substring(0, 80));
  });
  
  await p.goto('https://demo.synderapp.com/controlPanel/index', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForTimeout(3000);
  console.log('Current URL:', p.url());
  await p.screenshot({ path: '/home/ubuntu/.openclaw/workspace/.synder-state/error-audit/check-00.png' });
  
  // Get sidebar links
  const navLinks = await p.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.map(l => ({ href: l.href, text: l.textContent.trim() }))
      .filter(x => x.href.includes('controlPanel') && x.text.length > 0 && x.text.length < 50);
  });
  console.log('Nav links:', JSON.stringify(navLinks.slice(0, 40), null, 2));
  
  await b.close();
})().catch(e => console.error('ERR:', e.message, e.stack));
