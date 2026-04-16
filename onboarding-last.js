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
  page.setDefaultTimeout(10000);
  
  await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  async function clickAt(x, y) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(300);
  }

  // 1. Business name
  const nameInput = page.locator('input[placeholder="Type any name here..."]');
  await nameInput.click();
  await nameInput.type('Dasha Per-Txn Test', { delay: 15 });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);

  // 2. Country
  const countryBox = await page.$$eval('[class*="select__control"]', els => {
    const el = els[1];
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await clickAt(countryBox.x, countryBox.y);
  await page.keyboard.type('United States', { delay: 15 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  // 3. Industry
  const iLabelBox = await page.locator('text=Industry').first().boundingBox();
  await clickAt(iLabelBox.x + 200, iLabelBox.y + 40);
  await page.waitForTimeout(800);
  const retailBox = await page.locator('text=Retail / E-Commerce').boundingBox().catch(() => null);
  if (retailBox) await clickAt(retailBox.x + 20, retailBox.y + 10);
  await page.waitForTimeout(300);
  await clickAt(iLabelBox.x, iLabelBox.y - 80);
  await page.waitForTimeout(300);

  // 4. Duration
  const durBox = await page.$$eval('[class*="select__control"]', els => {
    const el = els[2];
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await clickAt(durBox.x, durBox.y);
  await page.waitForTimeout(500);
  const dur13Box = await page.locator('text=1-3 years').boundingBox().catch(() => null);
  if (dur13Box) await clickAt(dur13Box.x + 20, dur13Box.y + 10);
  await page.waitForTimeout(500);

  // 5. Revenue
  const revLabel = await page.locator('text=Your revenue').boundingBox().catch(() => null);
  if (revLabel) {
    const revBox = await page.$$eval('[class*="select__control"]', els => {
      const el = els[els.length - 1];
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await clickAt(revBox.x, revBox.y);
    await page.waitForTimeout(500);
    const firstOpt = await page.locator('[class*="option"]').first().boundingBox().catch(() => null);
    if (firstOpt) await clickAt(firstOpt.x + 20, firstOpt.y + 10);
    await page.waitForTimeout(500);
  }

  // 6. No accountant — scroll down first, then find by radio value
  console.log('6. Scrolling and clicking No accountant...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.synder-state/onboard-scrolled.png' });

  // Try clicking based on radio index
  const radioInfo = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    return Array.from(radios).map(r => {
      const rect = r.getBoundingClientRect();
      return { value: r.value, checked: r.checked, x: rect.x, y: rect.y, visible: rect.width > 0 };
    });
  });
  console.log('Radios:', JSON.stringify(radioInfo));

  // Click the No radio directly by coordinates
  const noRadio = radioInfo.find(r => r.value === 'No' && r.visible);
  if (noRadio) {
    // Click the radio circle itself + a bit to the right
    await clickAt(noRadio.x + 10, noRadio.y + 10);
    console.log('Clicked No radio at', noRadio.x, noRadio.y);
  } else {
    // Radio might be off-screen; click the label text approach
    const result = await page.evaluate(() => {
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        if (el.textContent.trim() === "No, I don't have an accountant/bookkeeper" && el.children.length === 0) {
          el.click();
          return 'clicked: ' + el.tagName;
        }
      }
      // Try the span inside radio label
      const labels = document.querySelectorAll('label');
      for (const label of labels) {
        if (label.textContent.includes("No, I don't have")) {
          label.click();
          return 'clicked label';
        }
      }
      return 'not found';
    });
    console.log('Fallback click result:', result);
  }
  await page.waitForTimeout(500);

  const radios2 = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    return Array.from(radios).map(r => ({ value: r.value, checked: r.checked }));
  });
  console.log('Radios after click:', JSON.stringify(radios2));

  // Screenshot
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: '.synder-state/onboard-final-check.png', fullPage: true });

  const bodyText = await page.innerText('body').catch(() => '');
  const lines = bodyText.split('\n').filter(l => l.trim()).slice(0, 55);
  console.log('\n=== FORM STATE ===');
  lines.forEach(l => console.log('  ', l.trim()));

  // Click Next
  console.log('\n>>> Next step...');
  const nextBox = await page.locator('text=Next step').boundingBox();
  await clickAt(nextBox.x + 30, nextBox.y + 15);
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle').catch(() => {});

  const newUrl = page.url();
  console.log('URL:', newUrl);
  await page.screenshot({ path: '.synder-state/onboard-step3-final.png', fullPage: true });

  const nextText = await page.innerText('body').catch(() => '');
  const nextLines = nextText.split('\n').filter(l => l.trim()).slice(0, 60);
  console.log('\n=== NEXT PAGE ===');
  nextLines.forEach(l => console.log('  ', l.trim()));

  const storageState = await context.storageState();
  fs.writeFileSync('.synder-state/storage-state.json', JSON.stringify(storageState, null, 2));
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
