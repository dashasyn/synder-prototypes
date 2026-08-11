import { chromium } from 'playwright';
import { readFileSync, existsSync, writeFileSync } from 'fs';

const OUT = '/home/ubuntu/.openclaw/workspace/.synder-state';
const STORAGE_PATH = `${OUT}/storage-state.json`;
const EMAIL = 'dasha.aibot@synder.com';
const PASSWORD = 'BJ9BG5MbZHmiLet!';
const CF_ID = 'd862d0014b770d750974d6e949c23004.access';
const CF_SECRET = '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde';

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  const ctxOpts = {
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      'CF-Access-Client-Id': CF_ID,
      'CF-Access-Client-Secret': CF_SECRET,
    },
  };

  if (existsSync(STORAGE_PATH)) {
    ctxOpts.storageState = STORAGE_PATH;
    console.log('Using saved session state');
  }

  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();

  await page.goto('https://demo.synderapp.com/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('URL after nav:', page.url());

  // If redirected to auth, log in
  if (page.url().includes('/auth') || page.url().includes('cloudflareaccess')) {
    console.log('Need to login...');
    // Try direct auth page
    await page.goto('https://demo.synderapp.com/auth', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Auth page URL:', page.url());

    try {
      await page.waitForSelector('input[placeholder="email@mail.com"]', { timeout: 8000 });
      await page.fill('input[placeholder="email@mail.com"]', EMAIL);
      await page.fill('input[type="password"]', PASSWORD);
      const buttons = await page.$$('button');
      for (let i = buttons.length - 1; i >= 0; i--) {
        const text = await buttons[i].textContent();
        if (text && text.trim() === 'Sign in') {
          await buttons[i].click();
          break;
        }
      }
      await page.waitForTimeout(5000);
      console.log('After login:', page.url());
    } catch (e) {
      console.log('Login form not found:', e.message);
      await page.screenshot({ path: `${OUT}/dash-login-fail.png` });
    }
  }

  await page.screenshot({ path: `${OUT}/dash-01-dashboard.png`, fullPage: false });
  console.log('📸 dashboard screenshot saved');

  // Check what org/mode we're in
  const title = await page.title();
  const url = page.url();
  console.log('Title:', title, '| URL:', url);

  // Try to navigate to the per-transaction dashboard specifically
  await page.goto('https://demo.synderapp.com/dashboard', { waitUntil: 'networkidle', timeout: 20000 });
  await page.screenshot({ path: `${OUT}/dash-02-pt-dashboard.png`, fullPage: true });
  console.log('📸 full dashboard saved');

  // Save updated session
  await ctx.storageState({ path: STORAGE_PATH });
  await browser.close();
  console.log('Done');
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
