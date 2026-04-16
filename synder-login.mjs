/**
 * synder-login.mjs
 * 
 * Logs into Synder, handling Cloudflare Access.
 * - If CF_Authorization cookie is still valid: skips CF step entirely
 * - If expired: prompts for email code (or accepts it as argument)
 * 
 * Usage:
 *   node synder-login.mjs              — interactive (waits for code input)
 *   node synder-login.mjs 123456       — pass code as arg
 * 
 * Saves session to .synder-state/storage-state.json
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const STORAGE_PATH = '.synder-state/storage-state.json';
const EMAIL = 'dasha.aibot@synder.com';
const PASSWORD = 'BJ9BG5MbZHmiLet!';

async function isCFValid() {
  if (!existsSync(STORAGE_PATH)) return false;
  try {
    const state = JSON.parse(readFileSync(STORAGE_PATH, 'utf8'));
    const cfCookie = (state.cookies || []).find(c =>
      c.name === 'CF_Authorization' && c.domain === 'demo.synderapp.com'
    );
    if (!cfCookie) return false;
    const expiresMs = cfCookie.expires * 1000;
    const bufferMs = 10 * 60 * 1000; // 10 min buffer
    const valid = expiresMs > Date.now() + bufferMs;
    console.log(`CF_Authorization expires: ${new Date(expiresMs).toISOString()} — ${valid ? 'VALID' : 'EXPIRED'}`);
    return valid;
  } catch {
    return false;
  }
}

async function run() {
  const codeArg = process.argv[2];
  const cfValid = await isCFValid();

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = cfValid
    ? await browser.newContext({ storageState: STORAGE_PATH })
    : await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://demo.synderapp.com/auth', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Initial URL:', page.url());

  // Handle Cloudflare Access if needed
  if (!cfValid && page.url().includes('cloudflareaccess.com')) {
    console.log('CF Access required. Sending email code...');
    await page.fill('input[type="email"]', EMAIL);
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(2000);

    let code = codeArg;
    if (!code) {
      // Read from stdin
      process.stdout.write('Enter Cloudflare code: ');
      code = await new Promise(resolve => {
        process.stdin.resume();
        process.stdin.once('data', d => { process.stdin.pause(); resolve(d.toString().trim()); });
      });
    }

    console.log('Entering code:', code);
    await page.fill('input[name="code"], input[type="text"]', code);
    await page.click('button:has-text("Sign in"), input[type="submit"]');
    await page.waitForTimeout(5000);
    console.log('After CF verify:', page.url());
  }

  // Now handle Synder login
  if (page.url().includes('/auth') || page.url().includes('synderapp.com/auth')) {
    console.log('On Synder login page, logging in...');
    await page.waitForSelector('input[placeholder="email@mail.com"]', { timeout: 10000 });
    await page.fill('input[placeholder="email@mail.com"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    // Click the form submit button (not SSO ones)
    const buttons = await page.$$('button');
    for (let i = buttons.length - 1; i >= 0; i--) {
      const text = await buttons[i].textContent();
      if (text.trim() === 'Sign in') {
        await buttons[i].click();
        break;
      }
    }
    try {
      await page.waitForNavigation({ timeout: 10000 });
    } catch { /* may not navigate */ }
    await page.waitForTimeout(5000);
    console.log('After Synder login:', page.url());
  }

  // Save session
  await context.storageState({ path: STORAGE_PATH });
  const cookies = await context.cookies();
  writeFileSync('.synder-state/cookies.json', JSON.stringify(cookies, null, 2));

  const cfCookie = cookies.find(c => c.name === 'CF_Authorization' && c.domain === 'demo.synderapp.com');
  if (cfCookie) {
    console.log(`✅ CF_Authorization valid until: ${new Date(cfCookie.expires * 1000).toISOString()}`);
  }

  const synderSession = cookies.find(c => c.name === 'JSESSIONID');
  console.log(synderSession ? '✅ Synder session active' : '⚠️  No JSESSIONID found');
  console.log(`Session saved to ${STORAGE_PATH}`);

  await browser.close();
}

run().catch(e => { console.error('Login failed:', e.message); process.exit(1); });
