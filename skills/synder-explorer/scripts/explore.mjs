#!/usr/bin/env node
/**
 * Synder Explorer — Playwright-based navigation, screenshots, and text extraction.
 *
 * Usage:
 *   node explore.mjs login                         # Log in, save session
 *   node explore.mjs goto <url> [--screenshot]     # Navigate to URL, optionally screenshot
 *   node explore.mjs screenshot [filename]          # Screenshot current page
 *   node explore.mjs extract                        # Extract visible text from current page
 *   node explore.mjs html [selector]                # Dump inner HTML of selector (default: body)
 *   node explore.mjs eval <js>                      # Evaluate JS in page context
 *   node explore.mjs session                        # Check if session is alive
 *   node explore.mjs close                          # Close browser
 *
 * Environment:
 *   SYNDER_EMAIL, SYNDER_PASSWORD — credentials (falls back to .synder-creds)
 *   SYNDER_BASE — base URL (default: https://demo.synderapp.com)
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const WORKSPACE = process.env.WORKSPACE || '/home/ubuntu/.openclaw/workspace';
const STATE_DIR = resolve(WORKSPACE, '.synder-state');
const STATE_FILE = resolve(STATE_DIR, 'storage-state.json');
const SCREENSHOTS_DIR = resolve(WORKSPACE, 'synder-screenshots');
const CREDS_FILE = resolve(WORKSPACE, '.synder-creds');
const BASE_URL = process.env.SYNDER_BASE || 'https://demo.synderapp.com';

// Ensure directories exist
[STATE_DIR, SCREENSHOTS_DIR].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

function loadCreds() {
  if (process.env.SYNDER_EMAIL && process.env.SYNDER_PASSWORD) {
    return { email: process.env.SYNDER_EMAIL, password: process.env.SYNDER_PASSWORD };
  }
  if (existsSync(CREDS_FILE)) {
    const raw = readFileSync(CREDS_FILE, 'utf8');
    const email = raw.match(/email=(.+)/)?.[1]?.trim();
    const password = raw.match(/password=(.+)/)?.[1]?.trim();
    if (email && password) return { email, password };
  }
  throw new Error('No credentials found. Set SYNDER_EMAIL/SYNDER_PASSWORD or create .synder-creds');
}

async function launchBrowser() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    executablePath: '/snap/chromium/current/usr/lib/chromium-browser/chrome',
  });
  return browser;
}

async function getContext(browser) {
  const opts = {
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  };
  if (existsSync(STATE_FILE)) {
    opts.storageState = STATE_FILE;
  }
  return browser.newContext(opts);
}

async function saveState(context) {
  const state = await context.storageState();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// --- Commands ---

async function cmdLogin() {
  const { email, password } = loadCreds();
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log(`Navigating to ${BASE_URL}/auth ...`);
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle', timeout: 30000 });

  // Try to find email input
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]').first();
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(email);

  // Find password input
  const pwInput = page.locator('input[type="password"]').first();
  await pwInput.fill(password);

  // Find and click submit button
  const submitBtn = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first();
  await submitBtn.click();

  // Wait for navigation away from auth page
  await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 30000 });
  console.log(`Logged in! Current URL: ${page.url()}`);

  await saveState(context);
  console.log('Session saved.');

  // Take a screenshot of the landing page
  const ssPath = resolve(SCREENSHOTS_DIR, 'after-login.png');
  await page.screenshot({ path: ssPath, fullPage: false });
  console.log(`Screenshot: ${ssPath}`);

  await browser.close();
}

async function cmdGoto(url, doScreenshot) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  const browser = await launchBrowser();
  const context = await getContext(browser);
  const page = await context.newPage();

  console.log(`Navigating to ${fullUrl} ...`);
  await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`Current URL: ${page.url()}`);

  // Check if redirected to auth
  if (page.url().includes('/auth')) {
    console.log('⚠️  Redirected to login — session expired. Run: node explore.mjs login');
    await browser.close();
    process.exit(1);
  }

  await saveState(context);

  if (doScreenshot) {
    const name = url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60) + '.png';
    const ssPath = resolve(SCREENSHOTS_DIR, name);
    await page.screenshot({ path: ssPath, fullPage: false });
    console.log(`Screenshot: ${ssPath}`);
  }

  // Extract page title and visible text summary
  const title = await page.title();
  console.log(`Title: ${title}`);

  await browser.close();
}

async function cmdScreenshot(filename) {
  const browser = await launchBrowser();
  const context = await getContext(browser);
  const page = await context.newPage();

  // Navigate to last known URL or dashboard
  await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle', timeout: 30000 });
  if (page.url().includes('/auth')) {
    console.log('⚠️  Session expired. Run: node explore.mjs login');
    await browser.close();
    process.exit(1);
  }

  const ssPath = resolve(SCREENSHOTS_DIR, filename || 'screenshot.png');
  await page.screenshot({ path: ssPath, fullPage: false });
  console.log(`Screenshot: ${ssPath}`);

  await browser.close();
}

async function cmdExtract(url) {
  const fullUrl = url ? (url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`) : BASE_URL;
  const browser = await launchBrowser();
  const context = await getContext(browser);
  const page = await context.newPage();

  await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
  if (page.url().includes('/auth')) {
    console.log('⚠️  Session expired. Run: node explore.mjs login');
    await browser.close();
    process.exit(1);
  }

  console.log(`URL: ${page.url()}`);
  console.log(`Title: ${await page.title()}`);
  console.log('---');

  // Extract all visible text
  const text = await page.evaluate(() => {
    const walk = (el) => {
      if (!el || el.offsetParent === null && el.tagName !== 'BODY') return '';
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return '';
      let result = '';
      for (const child of el.childNodes) {
        if (child.nodeType === 3) result += child.textContent.trim() + ' ';
        else if (child.nodeType === 1) result += walk(child);
      }
      return result;
    };
    return walk(document.body);
  });

  // Clean up and output
  const cleaned = text.replace(/\s+/g, ' ').trim();
  console.log(cleaned.substring(0, 8000));
  if (cleaned.length > 8000) console.log(`\n... (truncated, total ${cleaned.length} chars)`);

  await browser.close();
}

async function cmdHtml(selector) {
  const browser = await launchBrowser();
  const context = await getContext(browser);
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  if (page.url().includes('/auth')) {
    console.log('⚠️  Session expired.');
    await browser.close();
    process.exit(1);
  }

  const html = await page.locator(selector || 'body').innerHTML();
  console.log(html.substring(0, 10000));
  await browser.close();
}

async function cmdEval(js) {
  const browser = await launchBrowser();
  const context = await getContext(browser);
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  const result = await page.evaluate(js);
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

async function cmdFullExplore(url) {
  const fullUrl = url ? (url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`) : BASE_URL;
  const browser = await launchBrowser();
  const context = await getContext(browser);
  const page = await context.newPage();

  await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
  if (page.url().includes('/auth')) {
    console.log('⚠️  Session expired. Run: node explore.mjs login');
    await browser.close();
    process.exit(1);
  }

  console.log(`URL: ${page.url()}`);
  console.log(`Title: ${await page.title()}`);

  // Screenshot
  const name = (url || 'page').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60) + '.png';
  const ssPath = resolve(SCREENSHOTS_DIR, name);
  await page.screenshot({ path: ssPath, fullPage: false });
  console.log(`Screenshot: ${ssPath}`);

  // Extract nav links
  const links = await page.evaluate(() => {
    return [...document.querySelectorAll('a[href], nav a, [role="navigation"] a')].map(a => ({
      text: a.textContent.trim().substring(0, 80),
      href: a.href,
    })).filter(l => l.text && l.href);
  });
  if (links.length > 0) {
    console.log(`\nNavigation links (${links.length}):`);
    const unique = [...new Map(links.map(l => [l.href, l])).values()].slice(0, 30);
    unique.forEach(l => console.log(`  ${l.text} → ${l.href}`));
  }

  // Extract visible text
  const text = await page.evaluate(() => document.body.innerText);
  const cleaned = text.replace(/\n{3,}/g, '\n\n').trim();
  console.log(`\n--- Page text ---`);
  console.log(cleaned.substring(0, 5000));

  await saveState(context);
  await browser.close();
}

// --- Main ---
const [,, cmd, ...args] = process.argv;

try {
  switch (cmd) {
    case 'login':
      await cmdLogin();
      break;
    case 'goto':
      await cmdGoto(args[0], args.includes('--screenshot'));
      break;
    case 'screenshot':
      await cmdScreenshot(args[0]);
      break;
    case 'extract':
      await cmdExtract(args[0]);
      break;
    case 'html':
      await cmdHtml(args[0]);
      break;
    case 'eval':
      await cmdEval(args.join(' '));
      break;
    case 'explore':
      await cmdFullExplore(args[0]);
      break;
    default:
      console.log('Usage: node explore.mjs <login|goto|screenshot|extract|html|eval|explore> [args]');
      console.log('  login              — Log in and save session');
      console.log('  goto <url> [--screenshot] — Navigate, optionally screenshot');
      console.log('  screenshot [name]  — Take screenshot');
      console.log('  extract [url]      — Extract visible text');
      console.log('  explore [url]      — Full explore: screenshot + links + text');
      process.exit(1);
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
