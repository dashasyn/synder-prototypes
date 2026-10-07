const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const URL = 'https://dashasyn.github.io/synder-prototypes/projects/stripe-invoice-date/?v=' + Date.now();
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(URL, { waitUntil: 'networkidle' }); const small = {}, radii = {}, overflow = [];
  const runs = [[1,'pro'],[1,'below'],[1,'rrinv'],[2,null],[5,null],[3,'pro'],[3,'below'],[4,'rrinv'],[6,'rrinv']];
  for (const [n, s] of runs) {
    await p.click('#sc-' + n); if (s) await p.click('#st-' + s).catch(() => {});
    if (n === 1 && s === 'below') await p.click('#inv-date');
    const r = await p.evaluate(() => { const o = { small: [], radii: [], of: document.documentElement.scrollWidth > innerWidth };
      document.querySelectorAll('body *').forEach(el => { const rc = el.getBoundingClientRect(); if (!rc.width || !rc.height) return;
        const cs = getComputedStyle(el); const own = [...el.childNodes].some(x => x.nodeType === 3 && x.textContent.trim());
        if (own && parseFloat(cs.fontSize) < 14) o.small.push(cs.fontSize + ' ' + el.textContent.trim().slice(0, 40));
        if (el.matches('button.btn,select') && parseFloat(cs.borderRadius) > 4) o.radii.push(cs.borderRadius + ' ' + el.tagName); });
      return o; });
    r.small.forEach(x => small[x] = 1); r.radii.forEach(x => radii[x] = 1); if (r.of) overflow.push(n + '/' + s);
  }
  const out = { small_text: Object.keys(small), button_radius_over_4: Object.keys(radii), horizontal_overflow: overflow };
  fs.writeFileSync(path.join(__dirname, 'round-1', 'auto.json'), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out)); await b.close();
})();
