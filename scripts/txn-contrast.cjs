/* Text-contrast comparison between two versions of the same page.
   The kit adoption re-points a Material grey ramp onto Synder's; this checks
   that no visible text got harder to read as a result.
   Usage: node scripts/txn-contrast.cjs <beforeFile> <afterFile> */
const { chromium } = require('playwright');
const path = require('path');

async function measure(page, file) {
  await page.goto('file://' + path.resolve(file));
  await page.waitForTimeout(400);
  await page.evaluate(() => showPage('list'));
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const lum = ([r, g, b]) => {
      const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const parse = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const bgOf = el => {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return parse(c);
        n = n.parentElement;
      }
      return [255, 255, 255];
    };
    const out = {};
    [...document.querySelectorAll('body *')].forEach((el, i) => {
      const txt = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
      if (!txt) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') return;
      const fg = parse(cs.color), bg = bgOf(el);
      const l1 = lum(fg), l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      out[i + '|' + el.tagName + '.' + (typeof el.className === 'string' ? el.className : '')] =
        { ratio: Math.round(ratio * 100) / 100, txt: txt.slice(0, 40), size: parseFloat(cs.fontSize), weight: cs.fontWeight };
    });
    return out;
  });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const a = await measure(page, process.argv[2]);
  const b = await measure(page, process.argv[3]);
  await browser.close();

  const worse = [], better = [];
  for (const k of Object.keys(a)) {
    if (!b[k]) continue;
    const d = b[k].ratio - a[k].ratio;
    if (d < -0.05) worse.push([k, a[k], b[k], d]);
    if (d > 0.05) better.push([k, a[k], b[k], d]);
  }
  const large = x => x.size >= 24 || (x.size >= 18.66 && +x.weight >= 700);
  const failsAA = x => x.ratio < (large(x) ? 3 : 4.5);

  console.log(`text nodes compared: ${Object.keys(a).length}`);
  console.log(`contrast improved: ${better.length}   reduced: ${worse.length}\n`);
  if (worse.length) {
    console.log('REDUCED (worst first):');
    worse.sort((x, y) => x[3] - y[3]).slice(0, 15).forEach(([k, x, y, d]) =>
      console.log(`  ${x.ratio} → ${y.ratio}  (${d.toFixed(2)})  ${k.split('|')[1]}  "${y.txt}"`));
  }
  const failBefore = Object.values(a).filter(failsAA).length;
  const failAfter = Object.values(b).filter(failsAA).length;
  console.log(`\nAA failures — before: ${failBefore}   after: ${failAfter}`);
  const introduced = Object.keys(a).filter(k => b[k] && !failsAA(a[k]) && failsAA(b[k]));
  console.log(`\nNEWLY failing AA (${introduced.length}):`);
  const grouped = {};
  introduced.forEach(k => {
    const cls = k.split('|')[1];
    grouped[cls] = grouped[cls] || { n: 0, from: a[k].ratio, to: b[k].ratio, size: b[k].size, ex: b[k].txt };
    grouped[cls].n++;
  });
  Object.entries(grouped).sort((x, y) => y[1].n - x[1].n).forEach(([cls, v]) =>
    console.log(`  x${v.n}  ${cls}  ${v.from} -> ${v.to}  @${v.size}px  "${v.ex}"`));
})();
