const { chromium } = require('playwright');
const path = require('path');

const SS = path.join(__dirname);
const CF = {
  'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
  'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde'
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: CF
  });
  const page = await context.newPage();

  // Login
  await page.goto('https://demo.synderapp.com/auth', { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[placeholder="email@mail.com"]', 'dasha.aibot@synder.com');
  await page.fill('input[type="password"]', 'BJ9BG5MbZHmiLet!');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('**/transactions**', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  console.log('After login:', page.url());
  await page.screenshot({ path: path.join(SS, '01-dashboard.png') });

  // Save state
  await context.storageState({ path: path.join(__dirname, '..', 'storage-state.json') });

  // Now find subscription/billing area
  // Check settings page first
  await page.goto('https://demo.synderapp.com/settings', { waitUntil: 'networkidle', timeout: 20000 });
  console.log('Settings URL:', page.url());
  await page.screenshot({ path: path.join(SS, '02-settings.png'), fullPage: true });

  // Get all tabs/links on settings page
  const settingsTabs = await page.$$eval('[role="tab"], .ant-tabs-tab, [class*="tab"], [class*="Tab"]', els =>
    els.map(e => e.textContent?.trim()?.substring(0, 60)).filter(Boolean)
  );
  console.log('Settings tabs:', settingsTabs);

  // Look for plan/billing/subscription anywhere
  const allLinks = await page.$$eval('a', els =>
    els.map(e => ({ text: e.textContent?.trim()?.substring(0, 60), href: e.href }))
      .filter(e => e.text && (
        /plan|billing|subscri|cancel|unsub|upgrade|downgrade/i.test(e.text) ||
        /plan|billing|subscri/i.test(e.href)
      ))
  );
  console.log('Plan/billing links:', JSON.stringify(allLinks, null, 2));

  // Try clicking on user menu / avatar / org settings
  const avatarOrMenu = await page.$('[class*="avatar"], [class*="Avatar"], [class*="user-menu"], [class*="UserMenu"], [class*="profile"], [class*="org"]');
  if (avatarOrMenu) {
    await avatarOrMenu.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SS, '03-user-menu.png') });
    const menuItems = await page.$$eval('[role="menuitem"], [class*="menu-item"], [class*="MenuItem"], li a', els =>
      els.map(e => e.textContent?.trim()?.substring(0, 60)).filter(Boolean)
    );
    console.log('Menu items:', menuItems);
  }

  // Try direct subscription URL patterns
  const urls = [
    'https://demo.synderapp.com/subscription',
    'https://demo.synderapp.com/billing',
    'https://demo.synderapp.com/settings/billing',
    'https://demo.synderapp.com/settings/subscription',
    'https://demo.synderapp.com/settings/plan',
    'https://demo.synderapp.com/plan',
    'https://demo.synderapp.com/account',
    'https://demo.synderapp.com/organization',
  ];

  for (const url of urls) {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    const finalUrl = page.url();
    if (!finalUrl.includes('/auth') && finalUrl !== 'https://demo.synderapp.com/auth') {
      console.log(`✓ ${url} → ${finalUrl}`);
      if (finalUrl !== 'https://demo.synderapp.com/transactions') {
        const slug = url.split('/').pop();
        await page.screenshot({ path: path.join(SS, `04-${slug}.png`), fullPage: true });
      }
    } else {
      console.log(`✗ ${url} → redirected to auth`);
    }
  }

  // Check the left sidebar more carefully
  await page.goto('https://demo.synderapp.com/transactions', { waitUntil: 'networkidle', timeout: 20000 });
  const sidebar = await page.$$eval('nav a, [class*="sidebar"] a, [class*="Sidebar"] a, [class*="side-menu"] a, aside a', els =>
    els.map(e => ({ text: e.textContent?.trim()?.substring(0, 60), href: e.href })).filter(e => e.text)
  );
  console.log('Sidebar links:', JSON.stringify(sidebar, null, 2));

  // Look for bottom-left user/org section  
  const bottomSection = await page.$$eval('[class*="bottom"] a, [class*="footer"] a, [class*="upgrade"] *, [class*="Upgrade"] *', els =>
    els.map(e => ({ text: e.textContent?.trim()?.substring(0, 60), tag: e.tagName, href: e.href || '' })).filter(e => e.text)
  );
  console.log('Bottom/upgrade elements:', JSON.stringify(bottomSection, null, 2));

  await browser.close();
  console.log('Done!');
})();
