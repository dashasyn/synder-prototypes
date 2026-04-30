const { chromium } = require('playwright');
const fs = require('fs');

const OUT_DIR = '.synder-state/manage-subscription';
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: '.synder-state/storage-state.json',
  });
  const page = await context.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('[console.err]', m.text()); });

  console.log('--> Goto landing');
  await page.goto('https://demo.synderapp.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  console.log('URL:', page.url());

  // Click "Go to Organization settings"
  console.log('--> Clicking Organization settings link');
  try {
    await page.locator('text=Go to Organization settings').first().click({ timeout: 5000 });
  } catch (e) {
    console.log('Could not click via text, trying href');
    const links = await page.$$eval('a', as => as.map(a => ({ text: a.innerText.trim(), href: a.href })).filter(x => /organization/i.test(x.text + x.href)));
    console.log('matching links:', JSON.stringify(links).slice(0, 1000));
  }
  await page.waitForTimeout(3000);
  console.log('URL after:', page.url());
  await page.screenshot({ path: `${OUT_DIR}/03-org-settings.png`, fullPage: true });

  // Find all links within the page that mention subscription / billing / plan
  const allLinks = await page.$$eval('a', as => as.map(a => ({ text: (a.innerText || '').trim(), href: a.href })).filter(x => x.text || x.href));
  const subLinks = allLinks.filter(l => /subscription|billing|plan|manage|payment/i.test(l.text + ' ' + l.href));
  console.log('\nSubscription-relevant links on org settings:');
  subLinks.forEach(l => console.log('  ', JSON.stringify(l)));

  // Try clicking any "Manage subscription" link or text
  let foundSub = false;
  for (const sel of ['text=Manage subscription', 'text=Subscription', 'text=Billing', 'a:has-text("Subscription")']) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.count()) {
        console.log('--> Clicking', sel);
        await loc.click({ timeout: 5000 });
        await page.waitForTimeout(3000);
        console.log('URL after click:', page.url());
        await page.screenshot({ path: `${OUT_DIR}/04-manage-subscription.png`, fullPage: true });
        foundSub = true;
        break;
      }
    } catch (e) {}
  }

  if (foundSub) {
    // Extract page details: dropdowns, options, copy
    const details = await page.evaluate(() => {
      const result = {
        url: location.href,
        title: document.title,
        h1: Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => ({ tag: h.tagName, text: h.innerText.trim() })),
        cards: [],
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t).slice(0, 80),
        links: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.text).slice(0, 60),
        selects: Array.from(document.querySelectorAll('select')).map(s => ({ name: s.name, options: Array.from(s.options).map(o => o.text) })),
        toggles: Array.from(document.querySelectorAll('input[type="checkbox"], [role="switch"]')).map(t => ({ checked: t.checked, label: (t.closest('label') || t.parentElement || {}).innerText || '' })),
        textBlocks: Array.from(document.querySelectorAll('p, span, div')).map(d => d.innerText.trim()).filter(t => t.length > 5 && t.length < 300).slice(0, 200),
      };
      return result;
    });
    fs.writeFileSync(`${OUT_DIR}/page-details.json`, JSON.stringify(details, null, 2));
    console.log('\nSaved page details JSON');

    // Also dump body innerText
    const bodyText = await page.innerText('body');
    fs.writeFileSync(`${OUT_DIR}/body-text.txt`, bodyText);
    console.log('Saved body text');

    // Now try to click each select/dropdown and screenshot
    const selectButtons = await page.$$('button[role="combobox"], button[aria-haspopup], [role="button"][aria-haspopup]');
    console.log(`\nFound ${selectButtons.length} dropdown candidates`);
    for (let i = 0; i < Math.min(selectButtons.length, 10); i++) {
      try {
        await selectButtons[i].scrollIntoViewIfNeeded();
        await selectButtons[i].click({ timeout: 2000 });
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${OUT_DIR}/dropdown-${i}.png`, fullPage: true });
        // Try to capture dropdown options
        const opts = await page.$$eval('[role="option"], [role="menuitem"], li[role="presentation"]', els => els.map(e => e.innerText.trim()).filter(Boolean));
        console.log(`dropdown ${i} options:`, opts.slice(0, 30));
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(300);
      } catch (e) {
        console.log(`dropdown ${i} click err:`, e.message.slice(0, 80));
      }
    }

    // Also try "Upgrade your plan" / "Change card"
    for (const linkText of ['Upgrade your plan', 'What\'s included?', 'Change card', 'Get subscription invoices']) {
      try {
        const l = page.locator(`text=${linkText}`).first();
        if (await l.count()) {
          console.log(`--> Clicking link: ${linkText}`);
          await l.click({ timeout: 3000 });
          await page.waitForTimeout(2500);
          const slug = linkText.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
          await page.screenshot({ path: `${OUT_DIR}/link-${slug}.png`, fullPage: true });
          // navigate back
          await page.goBack().catch(() => {});
          await page.waitForTimeout(1500);
        }
      } catch (e) {
        console.log(`link ${linkText} click err:`, e.message.slice(0, 80));
      }
    }
  }

  await context.storageState({ path: '.synder-state/storage-state.json' });
  await browser.close();
})().catch(e => { console.error('FATAL', e.stack || e); process.exit(1); });
