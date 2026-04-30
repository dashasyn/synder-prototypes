const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = '.synder-state/manage-subscription';
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: '.synder-state/storage-state.json',
  });
  const page = await context.newPage();

  page.on('console', m => console.log('[console]', m.type(), m.text()));

  console.log('--> Navigating to demo.synderapp.com');
  await page.goto('https://demo.synderapp.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  console.log('URL after load:', page.url());

  await page.screenshot({ path: `${OUT_DIR}/01-landing.png`, fullPage: true });

  // Try to navigate to settings and then manage subscription
  // Click Settings in sidebar
  console.log('--> Looking for Settings link');
  const settingsCandidates = [
    'a:has-text("Settings")',
    'nav a[href*="settings" i]',
    '[data-testid*="settings" i]',
  ];
  let clicked = false;
  for (const sel of settingsCandidates) {
    try {
      const el = await page.locator(sel).first();
      if (await el.count()) {
        await el.click({ timeout: 2000 });
        console.log('Clicked Settings via', sel);
        clicked = true;
        break;
      }
    } catch (e) {}
  }
  if (!clicked) console.log('No Settings link found via known selectors');

  await page.waitForTimeout(3000);
  console.log('URL after Settings click:', page.url());
  await page.screenshot({ path: `${OUT_DIR}/02-settings.png`, fullPage: true });

  // Try direct URLs for manage subscription
  const candidateUrls = [
    'https://demo.synderapp.com/settings/subscription',
    'https://demo.synderapp.com/settings/manage-subscription',
    'https://demo.synderapp.com/settings/billing',
    'https://demo.synderapp.com/billing',
    'https://demo.synderapp.com/subscription',
    'https://demo.synderapp.com/organization/settings/subscription',
  ];
  for (const u of candidateUrls) {
    console.log('--> Trying', u);
    try {
      const resp = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);
      console.log('  status:', resp && resp.status(), 'url:', page.url());
      const slug = u.replace(/[^a-z0-9]/gi, '-').slice(-50);
      await page.screenshot({ path: `${OUT_DIR}/try-${slug}.png`, fullPage: true });
      const body = await page.innerText('body').catch(() => '');
      if (/subscription|plan|billing/i.test(body)) {
        console.log('  --> Page contains subscription text');
      }
    } catch (e) {
      console.log('  ERR', e.message);
    }
  }

  // Save URL/title list
  await context.storageState({ path: '.synder-state/storage-state.json' });
  await browser.close();
  console.log('done');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
