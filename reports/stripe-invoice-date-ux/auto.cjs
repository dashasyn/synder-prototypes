const { chromium } = require('playwright'); const fs = require('fs');
const URL = 'https://dashasyn.github.io/synder-ux-prototypes/prototypes/stripe-invoice-date/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(URL); const small = {}, radii = {}, fonts = new Set();
  for (const v of ['pt-pro','pt-upgrade','pt-revrec','pt-sales','summary','revrec']) {
    await p.click(`.vbar .tab[data-variant="${v}"]`); await p.waitForTimeout(80);
    if (v === 'revrec') { await p.selectOption('#sel-schedule-start','issued'); }
    const r = await p.evaluate(() => { const out = { small: [], radii: [], fonts: [] };
      document.querySelectorAll('body *').forEach(el => { const rc = el.getBoundingClientRect(); if (!rc.width || !rc.height) return;
        const cs = getComputedStyle(el); const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (own) { const fs = parseFloat(cs.fontSize); out.fonts.push(cs.fontFamily.split(',')[0]);
          if (fs < 14) out.small.push(fs + 'px · ' + (el.closest('.vbar') ? '[variant bar] ' : '') + el.textContent.trim().replace(/\s+/g,' ').slice(0, 50)); }
        if (el.matches('button,.btn,select') && parseFloat(cs.borderRadius) > 4 && !el.closest('.vbar')) out.radii.push(cs.borderRadius + ' · ' + el.tagName + ' ' + el.textContent.trim().slice(0, 30)); });
      return out; });
    r.small.forEach(s => small[s] = (small[s] || []).concat(v)); r.radii.forEach(s => radii[s] = 1); r.fonts.forEach(f => fonts.add(f));
    if (v === 'revrec') await p.click('#modal-cancel');
  }
  fs.writeFileSync('reports/stripe-invoice-date-ux/round-1/auto.json', JSON.stringify({ small_text: small, button_radius_over_4: Object.keys(radii), fonts: [...fonts] }, null, 1));
  console.log(Object.keys(small).length, 'small;', Object.keys(radii).length, 'radii;', [...fonts]); await b.close();
})();
