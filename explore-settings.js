const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STATE_PATH = '/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json';
const OUT = '/home/ubuntu/.openclaw/workspace/.synder-state/settings-audit';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function dismissModals(page) {
  for (let i = 0; i < 3; i++) {
    try {
      const closeBtn = await page.$('button:has-text("Close")');
      if (closeBtn && await closeBtn.isVisible()) {
        await closeBtn.click();
        await sleep(1000);
      }
    } catch(e) {}
    try {
      // Dismiss any MUI dialog by pressing Escape
      await page.keyboard.press('Escape');
      await sleep(500);
    } catch(e) {}
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  
  const browser = await chromium.launch({ 
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  
  const context = await browser.newContext({
    storageState: STATE_PATH,
    viewport: { width: 1440, height: 1200 }
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  
  await page.goto('https://demo.synderapp.com/organizations/generalSettings/general', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  await dismissModals(page);
  await sleep(500);
  
  // Scroll down to find Per transaction radio  
  await page.evaluate(() => window.scrollTo(0, 500));
  await sleep(500);
  
  // Find Per transaction element more precisely - look for the radio button near "Per transaction" text
  const clickResult = await page.evaluate(() => {
    // Find all text nodes containing "Per transaction"
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.trim() === 'Per transaction') {
        const el = walker.currentNode.parentElement;
        // Find the nearest radio input or MuiRadio
        const container = el.closest('[class*="FormControlLabel"], label, [class*="radio-group"], div[class*="sync"]') || el.parentElement;
        // Try clicking the radio input
        const radio = container?.querySelector('input[type="radio"]') || container?.querySelector('[class*="Radio"]');
        if (radio) {
          radio.click();
          return { clicked: 'radio', tag: radio.tagName, class: radio.className.substring(0, 50) };
        }
        // Try clicking the label/container itself
        el.click();
        return { clicked: 'text', tag: el.tagName };
      }
    }
    return { clicked: false };
  });
  console.log('Click result:', JSON.stringify(clickResult));
  
  await sleep(3000);
  await dismissModals(page);
  await sleep(1000);
  
  await page.screenshot({ path: path.join(OUT, '07-per-txn-attempt.png'), fullPage: true });
  console.log('URL:', page.url());
  
  // Check if per-transaction interface appeared
  const bodyText = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(path.join(OUT, '07-full-text.txt'), bodyText);
  
  const hasAutoImport = bodyText.includes('Auto-import');
  const hasDefault = bodyText.includes('Default');
  console.log('Has Auto-import:', hasAutoImport);
  console.log('Has Default tab:', hasDefault);
  
  // If the "How to change" link exists, try clicking it
  if (!hasAutoImport) {
    console.log('Per txn interface not loaded, trying "How to change" link...');
    const howToChange = await page.$('text=How to change');
    if (howToChange) {
      await howToChange.click();
      await sleep(3000);
      await dismissModals(page);
      await page.screenshot({ path: path.join(OUT, '08-how-to-change.png'), fullPage: true });
      const text2 = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log('After How to change:', text2);
    }
  }
  
  // If still no luck, maybe we need to use a direct URL
  // Let's capture ALL the text on the settings page for analysis anyway
  
  // Also try the "How to change mode" link from Ignat's screenshot
  const howToChangeMode = await page.$('text=How to change mode');
  if (howToChangeMode) {
    console.log('Found "How to change mode"');
    await howToChangeMode.click();
    await sleep(2000);
    await page.screenshot({ path: path.join(OUT, '09-change-mode.png'), fullPage: true });
  }
  
  await context.storageState({ path: STATE_PATH });
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
