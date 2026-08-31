/* Compare computed styles element-for-element between two versions of the same
   page and report every property the kit link changed. Structural properties
   only — the point is to separate "a colour resolved to a token" (intended)
   from "a kit rule leaked into a component the prototype owns" (not intended).

   Usage: node scripts/kit-collisions.cjs <beforeFile> <afterFile> */
const { chromium } = require('playwright');
const path = require('path');

const PROPS = [
  'height', 'min-height', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'margin-top', 'margin-bottom', 'border-top-width', 'border-bottom-width',
  'border-left-width', 'border-right-width', 'border-radius',
  'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform',
  'color', 'background-color', 'border-bottom-color', 'box-shadow', 'display', 'position',
];

async function snap(page, file) {
  await page.goto('file://' + file);
  await page.waitForTimeout(400);
  await page.evaluate(() => showPage('list'));
  await page.waitForTimeout(300);
  return page.evaluate((PROPS) => {
    const out = {};
    const els = [...document.querySelectorAll('body *')];
    els.forEach((el, i) => {
      const key = i + '|' + el.tagName + '.' + (typeof el.className === 'string' ? el.className : '');
      const cs = getComputedStyle(el);
      const rec = {};
      PROPS.forEach(p => rec[p] = cs.getPropertyValue(p));
      out[key] = rec;
    });
    return out;
  }, PROPS);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const a = await snap(page, path.resolve(process.argv[2]));
  const b = await snap(page, path.resolve(process.argv[3]));
  await browser.close();

  const keys = Object.keys(a);
  const byClassProp = {};
  let compared = 0;
  for (const k of keys) {
    if (!b[k]) continue;
    compared++;
    const cls = k.split('|')[1];
    for (const p of PROPS) {
      if (a[k][p] !== b[k][p]) {
        const id = cls + ' → ' + p;
        byClassProp[id] = byClassProp[id] || { n: 0, from: a[k][p], to: b[k][p] };
        byClassProp[id].n++;
      }
    }
  }
  const rows = Object.entries(byClassProp).sort((x, y) => y[1].n - x[1].n);
  console.log('elements compared: ' + compared);
  console.log('changed (class → property): ' + rows.length + '\n');
  rows.forEach(([id, v]) => console.log(`  ×${String(v.n).padEnd(3)} ${id}\n        ${v.from}  →  ${v.to}`));
})();
