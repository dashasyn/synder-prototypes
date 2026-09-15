#!/usr/bin/env node
/**
 * qx-typography-compare.cjs — the whole point of the React + MUI spike.
 *
 * Ignat asked whether rewriting would fix typography and details. The
 * earlier answer counted CSS declarations in the source. This measures the
 * RENDERED result in both prototypes, which is the honest comparison:
 * every visible text node's computed font-size / weight / line-height.
 *
 * MUI's ramp is the set of values its own variants produce. Anything else
 * is a value somebody typed by hand.
 */
const { chromium } = require('playwright');
const path = require('path');

const RAMP = [12, 13, 14, 16, 20, 24, 34, 48, 60, 96];  // px, MUI v5 variants

const TARGETS = [
  { name: 'vanilla (hand-written CSS)', file: '../projects/q-explorer-prototype/index.html', login: true,
    // Sweep views: most of the hand-written sizes live on screens that are
    // not rendered on load, so measuring only the landing view flatters it.
    views: ['reports-list', 'wizard', 'scheduled', 'rohdaten', 'report-punct', 'raw-punct'] },
  { name: 'React + MUI (real library)', file: '../projects/q-explorer-mui/index.html', login: false },
];

async function measure(page, t) {
  await page.goto('file://' + path.resolve(__dirname, t.file), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  if (t.login) {
    await page.fill('#login-email', 'a@b.c');
    await page.fill('#login-password', 'x');
    await page.click('.btn-login');
    await page.waitForTimeout(600);
  }
  const collect = () => page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.offsetParent === null) continue;
      if (el.className && String(el.className).includes('material-icons')) continue;
      if (String(el.className).includes('spike-bar') || String(el.className).includes('variant-switch')) continue;
      const text = [...el.childNodes]
        .filter(n => n.nodeType === 3 && n.textContent.trim())
        .map(n => n.textContent.trim()).join(' ');
      if (!text) continue;
      const s = getComputedStyle(el);
      out.push({
        size: Math.round(parseFloat(s.fontSize) * 100) / 100,
        weight: s.fontWeight,
        lh: s.lineHeight,
        text: text.slice(0, 24),
      });
    }
    return out;
  });

  if (!t.views) return collect();
  const all = [];
  for (const v of t.views) {
    await page.evaluate(n => window.showView && window.showView(n), v);
    await page.waitForTimeout(350);
    all.push(...await collect());
  }
  return all;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const results = [];

  for (const t of TARGETS) {
    const nodes = await measure(page, t);
    const sizes = [...new Set(nodes.map(n => n.size))].sort((a, b) => a - b);
    const offRamp = sizes.filter(s => !RAMP.includes(s));
    const offRampNodes = nodes.filter(n => offRamp.includes(n.size)).length;
    const noLineHeight = nodes.filter(n => n.lh === 'normal').length;
    results.push({ name: t.name, nodes: nodes.length, sizes, offRamp, offRampNodes, noLineHeight });
  }

  await browser.close();

  console.log('\nRendered typography, visible text nodes only\n');
  for (const r of results) {
    console.log(`── ${r.name}`);
    console.log(`   text nodes            ${r.nodes}`);
    console.log(`   distinct font sizes   ${r.sizes.length}  [${r.sizes.join(', ')}]`);
    console.log(`   sizes OFF MUI's ramp  ${r.offRamp.length}  [${r.offRamp.join(', ') || '—'}]`);
    console.log(`   nodes at an off-ramp size  ${r.offRampNodes}  (${Math.round(r.offRampNodes / r.nodes * 100)}%)`);
    console.log(`   nodes with NO line-height  ${r.noLineHeight}  (${Math.round(r.noLineHeight / r.nodes * 100)}%)`);
    console.log('');
  }

  const [v, m] = results;
  console.log('── verdict');
  console.log(`   off-ramp sizes   ${v.offRamp.length} → ${m.offRamp.length}`);
  console.log(`   text on an off-ramp size  ${Math.round(v.offRampNodes / v.nodes * 100)}% → ${Math.round(m.offRampNodes / m.nodes * 100)}%`);
  console.log(`   text with no line-height  ${Math.round(v.noLineHeight / v.nodes * 100)}% → ${Math.round(m.noLineHeight / m.nodes * 100)}%`);
})();
