/*
 * Fidelity evidence: does each prototype still expose the 43 functions inventoried
 * from the live pages? Round-2 prototypes carry data-fn tags; round-1 ones don't,
 * so detection falls back to visible-text signatures. Text matching is weaker than
 * a tag, so a miss here means "not detected", not proven absent — reported as such.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const REPO = '/home/ubuntu/synder-prototypes';
const TARGETS = [
  ['A','projects/settings-rework/proto-a.html'],
  ['B','projects/settings-rework/proto-b.html'],
  ['C','projects/settings-rework/proto-c.html'],
  ['v2','projects/settings-rework/manage-subscription-v2.html'],
  ['concepts','manage-subscription/concepts-v1v2v3.html'],
  ['V1','reports/manage-subscription/v1-unified.html'],
  ['V2','reports/manage-subscription/v2-billing.html'],
  ['V3','reports/manage-subscription/v3-dashboard.html'],
  ['sk1','reports/manage-subscription/sketch-v1.html'],
  ['sk2','reports/manage-subscription/sketch-v2.html'],
  ['sk2long','reports/manage-subscription/sketch-v2-longpage.html'],
];

// One text signature per inventoried function. Every alternative is matched case-insensitively
// against the page's full visible text (all states expanded where possible).
const FN = {
  // Organization settings
  O1:  ['plan',            ['essential','pro','premium','plan']],
  O2:  ['reach billing',   ['manage subscription','manage billing','billing','subscription']],
  O3:  ['integrations',    ['stripe','integration']],
  O4:  ['reconnect integ', ['reconnect']],
  O5:  ['add integration', ['add integration','connect platform','add platform']],
  O6:  ['integ row menu',  ['⋯','...','more options','⁝']],
  O7:  ['accounting co',   ['quickbooks','accounting company','accounting platform']],
  O8:  ['connect books',   ['connect to quickbooks','reconnect quickbooks','connect quickbooks','reconnect']],
  O9:  ['new org',         ['create a new organization','new organization','create organization']],
  O10: ['users list',      ['role','manager','member','seats','users']],
  O11: ['invite user',     ['add user','invite user','invite','send invitation']],
  O12: ['user row menu',   ['⋯','...','remove','change role']],
  O13: ['accounting firm', ['firm id','accounting firm']],
  O14: ['org name',        ['organization name','company name']],
  O15: ['org address',     ['address line','zip','postal code','city']],
  O16: ['notif frequency', ['weekly','daily','notify','activity summary','notification']],
  O17: ['recon reminder',  ['reconciliation reminder','reminder']],
  // Manage subscription
  S1:  ['plan + price',    ['$92','$115','/month','per month','/mo']],
  S2:  ['itemised receipt',['unit price','breakdown','what you\'re paying','total per month','amount']],
  S3:  ['card on file',    ['4242','•••• ','card ending','payment method']],
  S4:  ['change card',     ['change card','update card','change payment method','payment method']],
  S5:  ['next billing',    ['next billing','next charge','renews','active till','billing date']],
  S6:  ['see plans',       ['upgrade','compare plans','choose your plan','change plan','see plans']],
  S7:  ['cancel sub',      ['cancel subscription','cancel my subscription','start cancellation']],
  S8:  ['get invoices',    ['invoice','get subscription invoices','billing portal','download invoices']],
  S9:  ['autocharge',      ['autocharge','auto-charge','automatically charge']],
  S10: ['buy tx / seats',  ['monthly transactions','additional users','transactions']],
  S11: ['invoicing addon', ['invoicing','invoices add-on','up to 20 invoices','up to 50 invoices']],
  S12: ['smart rules addon',['smart rule']],
  S13: ['historical tx',   ['historical transaction','historical sync','historical']],
  S14: ['free tx referral', ['free','refer','make more credits','get more transactions']],
  // Update plan
  P1:  ['plan comparison', ['essential','pro','premium']],
  P2:  ['per-plan qty',    ['monthly transactions','smart rules','additional users','invoicing']],
  P3:  ['pro standard/max',['max','standard']],
  P4:  ['stay on plan',    ['stay on plan','keep current plan','keep my','selected','your plan']],
  P5:  ['switch plan',     ['update plan','choose pro','confirm change','switch plan','review change']],
  P6:  ['custom pricing',  ['talk to us','custom pricing','contact us','request a quote']],
  P7:  ['per-plan details',['what\'s included','breakdown','itemis','itemiz','full breakdown']],
  P8:  ['card from plan',  ['change card','payment method']],
  P9:  ['feature compare', ['core functionalities','compare all features','compare plans','feature']],
  P10: ['special plan',    ['need a special plan','special plan','contact us']],
  P11: ['coupon',          ['coupon','promo code','apply code']],
  P12: ['faq',             ['faq','frequently asked','billing questions','common questions']],
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const rows = [];
  for (const [id, f] of TARGETS) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    await page.goto('file://' + REPO + '/' + f, { waitUntil: 'load' });
    await page.waitForTimeout(900);

    // expand everything we can so hidden content counts
    await page.evaluate(() => {
      document.querySelectorAll('details').forEach(d => d.open = true);
      document.querySelectorAll('[hidden]').forEach(e => e.removeAttribute('hidden'));
    });
    // click every tab-like control to reveal alternate panes, collecting text as we go
    let text = await page.evaluate(() => document.body.innerText);
    const tabs = await page.$$('[role="tab"], .tab, .tabs button, .synder-tab, .pill, .switcher button');
    for (const t of tabs.slice(0, 12)) {
      try { await t.click({ timeout: 1200, noWaitAfter: true }); await page.waitForTimeout(220);
        await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
        text += '\n' + await page.evaluate(() => document.body.innerText);
      } catch (e) {}
    }
    const html = await page.content();
    const hay = (text + '\n' + html).toLowerCase();

    const tagged = new Set();
    for (const m of html.matchAll(/data-fn="([^"]+)"/g)) m[1].split(/\s+/).forEach(x => tagged.add(x));

    const found = [], missing = [];
    for (const [k, [, alts]] of Object.entries(FN)) {
      const hit = tagged.has(k) || alts.some(a => hay.includes(a.toLowerCase()));
      (hit ? found : missing).push(k);
    }
    rows.push({ id, file: f, tagged: tagged.size, found: found.length, total: Object.keys(FN).length, missing });
    console.log(`${id.padEnd(9)} ${String(found.length).padStart(2)}/43 detected` +
                (tagged.size ? `  (${tagged.size} via data-fn)` : '  (text-signature only)') +
                (missing.length ? `  not detected: ${missing.join(' ')}` : ''));
    await ctx.close();
  }
  fs.writeFileSync('.synder-state/settings-rework/coverage.json', JSON.stringify(rows, null, 2));
  await browser.close();
})();
