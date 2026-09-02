/* Copy inventory for the Clarity validator: every visible string in the product UI,
   grouped by zone, with the presenter bar excluded. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'reports/payment-application-engine/review/round-1/slice-clarity.json');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
  await p.goto('file://' + path.join(ROOT, 'projects/payment-application-engine/index.html'));
  const grab = async (label) => ({ screen: label, strings: await p.evaluate(() => {
    const out = [];
    const root = document.querySelector('#ov.on') || document.body;
    root.querySelectorAll('*').forEach(el => {
      if (el.closest('#pbar')) return;
      if (el.offsetParent === null && el.tagName !== 'BODY') return;
      const t = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.replace(/\s+/g, ' ').trim()).join(' ');
      if (t && t.length > 1) out.push(t);
    });
    document.querySelectorAll('select option:checked').forEach(o => out.push('[select value] ' + o.textContent.trim()));
    document.querySelectorAll('input[placeholder]').forEach(i => out.push('[placeholder] ' + i.placeholder));
    return [...new Set(out)];
  }) });
  const screens = [];
  screens.push(await grab('GSP integration settings'));
  await p.click('#g-open');
  screens.push(await grab('overlay — rule off (default matching)'));
  await p.click('#c-engine');
  screens.push(await grab('overlay — rule on, default configuration'));
  await p.click('#c-cust');
  screens.push(await grab('overlay — customer off (inheritance required)'));
  await p.click('#c-match');
  screens.push(await grab('overlay — both bounding rows off (save blocked)'));
  await p.click('#c-match'); await p.click('#c-cust');
  await p.selectOption('#c-msrc', 'payment_meta');
  screens.push(await grab('overlay — metadata source, key blank (save blocked)'));
  await p.fill('#c-mkey', 'invoices');
  await p.click('#cd-0');
  screens.push(await grab('overlay — empty condition box'));
  await p.check('#p-generic');
  screens.push(await grab('overlay — generic customer warning'));
  await p.uncheck('#p-generic');
  await p.check('#p-admin'); await p.click('#c-date');
  screens.push(await grab('overlay — invoice date off (no limit)'));
  await p.click('#c-date'); await p.uncheck('#p-admin');
  for (const id of ['d-plain', 'd-sql', 'd-sim']) {
    if (!(await p.locator('#' + id).evaluate(e => e.open))) await p.locator('#' + id).locator('summary').click();
  }
  screens.push(await grab('overlay — all three disclosures open'));
  await p.uncheck('#p-apply');
  screens.push(await grab('overlay — Apply payments to invoices off (prerequisite unmet)'));
  await p.check('#p-apply');
  await p.keyboard.press('Escape');
  await p.selectOption('#p-plan', 'starter');
  screens.push(await grab('GSP — Starter plan (gated)'));
  fs.writeFileSync(OUT, JSON.stringify({ target: 'projects/payment-application-engine/index.html', note: 'presenter-bar chrome excluded', screens }, null, 2) + '\n');
  console.log('screens: ' + screens.length + ', strings: ' + screens.reduce((n, s) => n + s.strings.length, 0));
  await b.close();
})();
