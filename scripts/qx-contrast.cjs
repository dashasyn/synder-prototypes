#!/usr/bin/env node
/**
 * qx-contrast.cjs — WCAG AA check for the Q-Explorer prototype after the
 * MUI restyle. The restyle moved every text colour onto MUI's alpha-based
 * roles (0.87 / 0.6 / 0.38 black), so contrast has to be re-earned, not
 * assumed. Same lesson as the transactions prototype's kit adoption.
 *
 * Composites alpha backgrounds up the ancestor chain — a naive checker
 * reads rgba(46,125,50,0.08) as if it were opaque and reports nonsense.
 *
 * Usage: node scripts/qx-contrast.cjs [url-or-path]
 */
const { chromium } = require('playwright');
const path = require('path');

const target = process.argv[2] ||
  'file://' + path.resolve(__dirname, '../projects/q-explorer-prototype/index.html');

const VIEWS = ['reports-list', 'scheduled', 'type-selection', 'wizard'];

const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(target, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.fill('#login-email', 'a@b.c');
  await page.fill('#login-password', 'x');
  // the vanilla's submit is .btn-login, the React port's is #login-submit
  await page.click((await page.$('.btn-login')) ? '.btn-login' : '#login-submit');
  await page.waitForTimeout(600);
  // the React port has no window.showView; it routes through React state
  const hasShowView = await page.evaluate(() => typeof window.showView === 'function');

  const all = [];
  for (const v of (hasShowView ? VIEWS : ['reports-list'])) {
    if (hasShowView) { await page.evaluate(n => window.showView(n), v); }
    await page.waitForTimeout(250);
    const nodes = await page.evaluate(view => {
      const parse = s => {
        const m = String(s).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
        return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
      };
      const over = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
      // Composite every ancestor background down onto white, in paint order.
      const bgOf = el => {
        const stack = [];
        for (let e = el; e; e = e.parentElement) {
          const c = parse(getComputedStyle(e).backgroundColor);
          if (c && c[3] > 0) stack.push(c);
          if (c && c[3] === 1) break;
        }
        let base = [255, 255, 255];
        for (const c of stack.reverse()) base = over(c, base);
        return base;
      };
      const out = [];
      // The React port has no #view-<name> containers — scoping to them
      // scanned nothing and reported "0 below AA", which reads exactly like a
      // clean result. Fall back to the whole body when the id is absent.
      const root = document.getElementById('view-' + view) || document.body;
      for (const el of root.querySelectorAll('*')) {
        if (el.offsetParent === null) continue;
        const txt = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim())
          .map(n => n.textContent.trim()).join(' ');
        if (!txt) continue;
        const s = getComputedStyle(el);
        // Material icon ligatures are glyphs, not prose; AA text rules don't apply.
        if (String(el.className).includes('material-icons')) continue;
        const fg = parse(s.color); if (!fg) continue;
        const bg = bgOf(el);
        out.push({ txt: txt.slice(0, 32), fg: over(fg, bg), bg,
                   fs: parseFloat(s.fontSize), fw: +s.fontWeight,
                   cls: String(el.className).slice(0, 34), view });
      }
      return out;
    }, v);
    all.push(...nodes);
  }

  const fails = [];
  for (const n of all) {
    const cr = ratio(n.fg, n.bg);
    const large = n.fs >= 24 || (n.fs >= 18.66 && n.fw >= 700);
    const min = large ? 3 : 4.5;
    if (cr < min) fails.push({ ...n, cr: +cr.toFixed(2), min });
  }

  console.log(`text nodes checked : ${all.length}`);
  console.log(`below WCAG AA      : ${fails.length}`);
  const byRule = new Map();
  for (const f of fails) {
    const k = `${f.cls || '(no class)'} @${f.fs}px`;
    if (!byRule.has(k)) byRule.set(k, f);
  }
  if (byRule.size) {
    console.log('\ndistinct offenders:');
    [...byRule.values()].sort((a, b) => a.cr - b.cr).slice(0, 20)
      .forEach(f => console.log(`  ${String(f.cr).padStart(5)} (need ${f.min})  ${f.view.padEnd(15)} ${f.cls.padEnd(34)} "${f.txt}"`));
  }

  // The one that matters most, computed from two solid colours:
  const white = [255, 255, 255];
  for (const [name, hex] of [['#2196F3 (measured, in use)', [33, 150, 243]],
                             ['#1769AA (primary.dark)', [23, 105, 170]],
                             ['#1976D2 (MUI default)', [25, 118, 210]]]) {
    console.log(`white on ${name.padEnd(28)} ${ratio(white, hex).toFixed(2)}:1  ${ratio(white, hex) >= 4.5 ? 'AA pass' : 'AA FAIL for normal text'}`);
  }

  await browser.close();
})();
