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
  
  await page.goto('https://demo.synderapp.com/onboarding/index', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Explore clickable elements on the integrations page
  const clickableInfo = await page.evaluate(() => {
    const els = document.querySelectorAll('img, [class*="card"], [class*="integration"], [class*="logo"], [role="button"], button, [onclick], a');
    const visible = Array.from(els).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 20 && rect.height > 20;
    });
    return visible.map(el => ({
      tag: el.tagName,
      src: el.src || el.getAttribute('src') || '',
      alt: el.alt || '',
      class: el.className?.toString()?.substring(0, 100) || '',
      text: el.textContent?.trim()?.substring(0, 50) || '',
      x: Math.round(el.getBoundingClientRect().x),
      y: Math.round(el.getBoundingClientRect().y),
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height),
    }));
  });
  
  console.log('Clickable elements:');
  clickableInfo.forEach(el => {
    if (el.src?.includes('stripe') || el.alt?.toLowerCase().includes('stripe') || 
        el.class?.toLowerCase().includes('stripe') || el.text?.toLowerCase().includes('stripe') ||
        el.y > 200) { // Show elements in the main content area
      console.log(`  ${el.tag} y=${el.y} h=${el.h} src="${el.src.substring(0,80)}" alt="${el.alt}" class="${el.class.substring(0,60)}" text="${el.text}"`);
    }
  });
  
  // Also look for all images
  const images = await page.$$('img');
  console.log('\nAll images:');
  for (const img of images) {
    const box = await img.boundingBox();
    const src = await img.getAttribute('src') || '';
    const alt = await img.getAttribute('alt') || '';
    if (box) console.log(`  y=${Math.round(box.y)} src="${src.substring(0,80)}" alt="${alt}"`);
  }
  
  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
