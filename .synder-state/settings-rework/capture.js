const { chromium } = require('playwright');
const fs = require('fs');

const OUT = '.synder-state/settings-rework';
fs.mkdirSync(OUT, { recursive: true });

const CREDS = { email: 'dasha.aibot@synder.com', password: 'BJ9BG5MbZHmiLet!' };

// Full inventory of an interactive page: every control, label, action, copy block.
async function inventory(page) {
  return page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const txt = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    const pick = (sel, fn) => Array.from(document.querySelectorAll(sel)).filter(vis).map(fn);

    return {
      url: location.href,
      title: document.title,
      h: pick('h1,h2,h3,h4,h5,h6', e => ({ tag: e.tagName, text: txt(e) })),
      buttons: pick('button,[role="button"],a.MuiButton-root', e => ({
        text: txt(e),
        disabled: e.disabled || e.getAttribute('aria-disabled') === 'true',
        cls: (e.className || '').toString().slice(0, 120),
      })),
      links: pick('a', e => ({ text: txt(e), href: e.getAttribute('href') })).filter(l => l.text || l.href),
      inputs: pick('input,textarea,select', e => {
        let label = '';
        if (e.id) { const l = document.querySelector(`label[for="${e.id}"]`); if (l) label = txt(l); }
        if (!label) { const w = e.closest('label'); if (w) label = txt(w); }
        if (!label) {
          const f = e.closest('.MuiFormControl-root,.MuiTextField-root,[class*="field" i]');
          if (f) label = txt(f.querySelector('label,[class*="label" i]') || f).slice(0, 120);
        }
        return {
          type: e.type || e.tagName.toLowerCase(),
          name: e.name || e.id || '',
          label,
          value: e.type === 'password' ? '***' : (e.value || '').slice(0, 120),
          placeholder: e.placeholder || '',
          checked: e.type === 'checkbox' || e.type === 'radio' ? e.checked : undefined,
          disabled: e.disabled,
          readOnly: e.readOnly,
          required: e.required,
          options: e.tagName === 'SELECT' ? Array.from(e.options).map(o => o.text) : undefined,
        };
      }),
      tabs: pick('[role="tab"],.MuiTab-root', e => ({ text: txt(e), selected: e.getAttribute('aria-selected') === 'true' })),
      tables: pick('table', t => ({
        headers: Array.from(t.querySelectorAll('thead th')).map(th => txt(th)),
        rowCount: t.querySelectorAll('tbody tr').length,
        firstRows: Array.from(t.querySelectorAll('tbody tr')).slice(0, 4).map(r => Array.from(r.cells).map(c => txt(c))),
      })),
      alerts: pick('[role="alert"],.MuiAlert-root,[class*="banner" i],[class*="notif" i]', e => txt(e)),
      // sectioned copy: card-like containers
      cards: pick('[class*="card" i],[class*="Paper" i],[class*="section" i]', e => txt(e)).filter(t => t.length > 20).slice(0, 40),
      bodyText: (document.body.innerText || '').replace(/\n{3,}/g, '\n\n').slice(0, 12000),
    };
  });
}

async function shoot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log('   shot ->', name);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({
    viewport: { width: 1512, height: 950 },
    deviceScaleFactor: 1,
    storageState: '.synder-state/settings-rework/state.json',
    extraHTTPHeaders: {
      'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
      'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde',
    },
  });
  const page = await ctx.newPage();

  // capture XHR that feeds these pages
  const api = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (!/synderapp|synder\.com/.test(u)) return;
    if (!/\/api\/|graphql|subscription|billing|plan|organization|tariff|price/i.test(u)) return;
    try {
      const ct = r.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      api.push({ url: u, status: r.status(), body: (await r.text()).slice(0, 20000) });
    } catch (e) {}
  });

  console.log('--> landing');
  await page.goto('https://demo.synderapp.com', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4000);
  console.log('URL:', page.url());

  if (/auth|login|sign/i.test(page.url())) {
    console.log('--> session expired, logging in');
    await page.fill('input[type="email"], input[name="email"]', CREDS.email);
    await page.fill('input[type="password"], input[name="password"]', CREDS.password);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(9000);
    console.log('URL after login:', page.url());
    if (/auth|login/i.test(page.url())) {
      await shoot(page, '00-login-FAILED');
      console.log('LOGIN FAILED — aborting, storage state untouched');
      await browser.close();
      process.exit(2);
    }
    fs.copyFileSync('.synder-state/storage-state.json', `.synder-state/storage-state.backup.${Date.now()}.json`);
    await ctx.storageState({ path: '.synder-state/storage-state.json' });
    console.log('storage state refreshed');
  }
  await shoot(page, '00-landing');

  const results = {};

  // ---- 1. Organization settings
  const orgUrls = [
    'https://demo.synderapp.com/organizations/settings',
  ];
  let orgOk = false;
  for (const u of orgUrls) {
    console.log('--> try', u);
    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(4500);
    const inv = await inventory(page);
    if (inv.bodyText.length > 400 && !/not found|404/i.test(inv.title)) {
      results.orgSettings = inv;
      await shoot(page, '01-org-settings');
      orgOk = true;
      console.log('   OK', page.url());
      break;
    }
  }
  if (!orgOk) {
    // fall back: navigate via UI
    console.log('--> org settings via UI');
    await page.goto('https://demo.synderapp.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    for (const sel of ['text=Organization settings', 'text=Go to Organization settings', '[aria-label*="settings" i]']) {
      const l = page.locator(sel).first();
      if (await l.count()) { await l.click().catch(() => {}); await page.waitForTimeout(4000); break; }
    }
    results.orgSettings = await inventory(page);
    await shoot(page, '01-org-settings');
  }

  // ---- 2. Manage subscription
  const subUrls = [
    'https://demo.synderapp.com/organizations/settings/manageSubscription',
  ];
  for (const u of subUrls) {
    console.log('--> try', u);
    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(5000);
    const inv = await inventory(page);
    if (inv.bodyText.length > 400 && /subscription|plan|billing|invoice/i.test(inv.bodyText)) {
      results.manageSubscription = inv;
      await shoot(page, '02-manage-subscription');
      console.log('   OK', page.url());
      break;
    }
  }

  // ---- 3. Update plan / pricing
  const planUrls = [
    'https://demo.synderapp.com/organizations/settings/manageSubscription/updatePlan',
    'https://demo.synderapp.com/organizations/settings/updatePlan',
  ];
  for (const u of planUrls) {
    console.log('--> try', u);
    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(5000);
    const inv = await inventory(page);
    if (inv.bodyText.length > 400 && /plan|month|transaction|per month|\$/i.test(inv.bodyText)) {
      results.updatePlan = inv;
      await shoot(page, '03-update-plan');
      console.log('   OK', page.url());
      break;
    }
  }

  // If update plan wasn't found by URL, click through from manage subscription
  if (!results.updatePlan && results.manageSubscription) {
    console.log('--> update plan via UI from manage subscription');
    await page.goto(results.manageSubscription.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    for (const t of ['Upgrade your plan', 'Update plan', 'Change plan', 'Upgrade']) {
      const l = page.locator(`text=${t}`).first();
      if (await l.count()) {
        console.log('   clicking', t);
        await l.click().catch(() => {});
        await page.waitForTimeout(6000);
        results.updatePlan = await inventory(page);
        await shoot(page, '03-update-plan');
        break;
      }
    }
  }

  fs.writeFileSync(`${OUT}/inventory.json`, JSON.stringify(results, null, 2));
  fs.writeFileSync(`${OUT}/api.json`, JSON.stringify(api, null, 2));
  console.log('\n=== SUMMARY ===');
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k}: ${v.url}`);
    console.log(`  headings: ${v.h.map(x => x.text).join(' | ').slice(0, 300)}`);
    console.log(`  buttons: ${v.buttons.map(b => b.text).filter(Boolean).join(' | ').slice(0, 400)}`);
    console.log(`  inputs: ${v.inputs.length}, tabs: ${v.tabs.map(t => t.text).join('/')}`);
  }
  console.log('api responses captured:', api.length);
  await browser.close();
})();
