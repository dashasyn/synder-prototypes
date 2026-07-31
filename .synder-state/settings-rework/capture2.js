const { chromium } = require('playwright');
const fs = require('fs');

const OUT = '.synder-state/settings-rework';
const SUB = 'https://demo.synderapp.com/organizations/settings/manageSubscription';
const ORG = 'https://demo.synderapp.com/organizations/settings';

const inv = async (page) => page.evaluate(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; };
  const txt = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  const pick = (sel, fn) => Array.from(document.querySelectorAll(sel)).filter(vis).map(fn);
  return {
    url: location.href,
    h: pick('h1,h2,h3,h4', e => txt(e)),
    buttons: pick('button,[role="button"]', e => ({ t: txt(e), dis: e.disabled })),
    inputs: pick('input,select,textarea', e => ({ type: e.type || e.tagName, name: e.name || e.id, value: e.value, checked: e.checked })),
    dialog: pick('[role="dialog"],.MuiDialog-root,.MuiPopover-root,.MuiModal-root', e => txt(e).slice(0, 2000)),
    bodyText: (document.body.innerText || '').replace(/\n{3,}/g, '\n\n').slice(0, 14000),
  };
});

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({
    viewport: { width: 1512, height: 950 },
    storageState: `${OUT}/state.json`,
    extraHTTPHeaders: {
      'CF-Access-Client-Id': 'd862d0014b770d750974d6e949c23004.access',
      'CF-Access-Client-Secret': '51853375c79b6a7c35e462194f2bd91474ff7216d51540093d04f185d24efdde',
    },
  });
  const page = await ctx.newPage();
  const out = {};

  const step = async (name, url, action, { full = true } = {}) => {
    console.log('\n=== ' + name);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4500);
    if (action) { try { await action(page); } catch (e) { console.log('  action err:', e.message.slice(0, 120)); } }
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
    out[name] = await inv(page);
    console.log('  url:', out[name].url);
    console.log('  h:', out[name].h.join(' | ').slice(0, 250));
    console.log('  btns:', out[name].buttons.map(b => b.t).filter(Boolean).join(' | ').slice(0, 350));
    if (out[name].dialog.length) console.log('  DIALOG:', out[name].dialog[0].slice(0, 500));
  };

  const click = (t) => async (p) => {
    const l = p.locator(`text="${t}"`).first();
    if (await l.count()) { console.log('  clicking:', t); await l.click({ timeout: 8000 }); }
    else console.log('  NOT FOUND:', t);
  };

  // --- Update plan flow (the 3rd page)
  await step('10-upgrade-your-plan', SUB, click('Upgrade your plan'));
  await step('11-update-plan-modal', SUB, click('Update plan'));
  await step('12-whats-included', SUB, click("What's included?"), { full: false });
  await step('13-change-card', SUB, click('Change card'), { full: false });
  await step('14-get-invoices', SUB, click('Get subscription invoices'), { full: false });
  await step('15-free-transactions', SUB, click('Get more transactions for free'));
  await step('16-purchase-historical', SUB, click('Purchase historical transactions'));
  // cancel: capture first modal only, never confirm
  await step('17-cancel-step1', SUB, click('Cancel subscription'), { full: false });

  // --- quantity steppers: what changes when you bump monthly transactions
  await step('18-qty-bumped', SUB, async (p) => {
    const plus = p.locator('button:near(:text("Monthly transactions"))');
    const n = await plus.count();
    console.log('  stepper buttons near label:', n);
    for (let i = 0; i < n; i++) {
      const t = await plus.nth(i).innerText().catch(() => '');
      console.log('   btn', i, JSON.stringify(t));
    }
    // click the "+" (usually svg-only button, last of the pair)
    const svgBtns = p.locator('div:has-text("Monthly transactions") button');
    if (await svgBtns.count() >= 2) await svgBtns.last().click().catch(() => {});
  });

  // --- Org settings interactions
  await step('20-org-user-menu', ORG, async (p) => {
    const dots = p.locator('table button, tbody [role="button"]').last();
    if (await dots.count()) await dots.click({ timeout: 8000 });
  }, { full: false });
  await step('21-org-add-user', ORG, click('Add user'), { full: false });
  await step('22-org-accounting-firm', ORG, click('Accounting firm'));
  await step('23-org-integration-menu', ORG, async (p) => {
    const dots = p.locator('[class*="integration" i] button, div:has-text("mzkt.by") button').first();
    if (await dots.count()) await dots.click({ timeout: 8000 });
  }, { full: false });

  // --- responsive
  for (const [w, h, tag] of [[1280, 900, 'r-1280'], [1024, 800, 'r-1024'], [768, 900, 'r-768'], [390, 844, 'r-390']]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(SUB, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${OUT}/30-sub-${tag}.png`, fullPage: true });
    await page.goto(ORG, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${OUT}/31-org-${tag}.png`, fullPage: true });
    console.log('responsive', tag, 'done');
  }

  fs.writeFileSync(`${OUT}/interactions.json`, JSON.stringify(out, null, 2));
  await browser.close();
})();
