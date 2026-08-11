/*
 * Validator protocol Step 3 — auto-scan across all 11 manage-subscription prototypes.
 * 3a discover interactive elements · 3b click everything and detect breakage · 3c style check
 * Broken elements become AUTO- criticals without needing a validator.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const REPO = '/home/ubuntu/synder-prototypes';
const OUT = '.synder-state/settings-rework/autoscan';
fs.mkdirSync(OUT, { recursive: true });

const TARGETS = [
  { id: 'A',        name: 'A — One page + drawer',       f: 'projects/settings-rework/proto-a.html' },
  { id: 'B',        name: 'B — Split + matrix',          f: 'projects/settings-rework/proto-b.html' },
  { id: 'C',        name: 'C — Overview + cart',         f: 'projects/settings-rework/proto-c.html' },
  { id: 'v2',       name: 'v2 — Production depth',       f: 'projects/settings-rework/manage-subscription-v2.html' },
  { id: 'concepts', name: 'Concepts 3-in-1',             f: 'manage-subscription/concepts-v1v2v3.html' },
  { id: 'V1',       name: 'V1 Unified Settings',         f: 'reports/manage-subscription/v1-unified.html' },
  { id: 'V2',       name: 'V2 Billing Hub',              f: 'reports/manage-subscription/v2-billing.html' },
  { id: 'V3',       name: 'V3 Org Health Dashboard',     f: 'reports/manage-subscription/v3-dashboard.html' },
  { id: 'sk1',      name: 'Sketch V1 Billing+Org',       f: 'reports/manage-subscription/sketch-v1.html' },
  { id: 'sk2',      name: 'Sketch V2 Tabbed',            f: 'reports/manage-subscription/sketch-v2.html' },
  { id: 'sk2long',  name: 'Sketch V2 Long page',         f: 'reports/manage-subscription/sketch-v2-longpage.html' },
];

// DESIGN_RULES.md, plus the token file both round-2 and round-1 prototypes should be drawing from
const PALETTE = new Set([
  '#0053cc','#0047b3','#80a9e5','#ccddf5','#e0ebfd','#f2f6fc','#e8f0fc',
  '#ffffff','#fff','#f7f8fa','#eff1f5','#dfe4ec','#b4bbcb','#6b778c','#1a1b24','#1a1a2e',
  '#1f8940','#ecfddc','#cc2929','#ffece8','#cb7515','#fff1dd','#3c4eac','#d6ebff','#310bb0','#e2d7ff',
  '#f9fafb','#e5e7eb','#6b7280','#9ca3af','#dc2626','#d97706','#16a34a','#c8c7cc','#dddddd','#f6f6f6',
  'transparent','currentcolor','inherit','initial','none','#000','#000000',
]);

const norm = (c) => {
  if (!c) return '';
  c = c.trim().toLowerCase();
  const m = c.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return '#' + [1,2,3].map(i => (+m[i]).toString(16).padStart(2,'0')).join('');
  if (/^#[0-9a-f]{3}$/.test(c)) return '#' + c.slice(1).split('').map(x=>x+x).join('');
  return c;
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];

  for (const t of TARGETS) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 160)); });

    const file = path.join(REPO, t.f);
    if (!fs.existsSync(file)) { console.log('MISSING', t.f); await ctx.close(); continue; }
    await page.goto('file://' + file, { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    // ── 3a: interactive element inventory
    const inv = await page.evaluate(() => {
      const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const label = el => (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').replace(/\s+/g,' ').trim().slice(0,60);
      const all = Array.from(document.querySelectorAll('button,[role="button"],a,input,select,textarea,[onclick],summary,[role="tab"]'));
      const seen = new Set(); const out = [];
      for (const el of all) {
        if (!vis(el)) continue;
        const key = el.tagName + '|' + label(el) + '|' + (el.className||'').toString().slice(0,40);
        if (seen.has(key)) continue; seen.add(key);
        out.push({ tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || el.getAttribute('role') || '',
                   label: label(el), href: el.getAttribute('href') || '',
                   hasHandler: !!(el.getAttribute('onclick') || el.getAttribute('onchange') || el.getAttribute('oninput')),
                   disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true' });
      }
      return out;
    });

    // ── 3b: click every enabled, non-navigating control; detect no-ops and errors
    const clickable = await page.$$('button:not([disabled]), [role="button"], summary, [role="tab"], [onclick]');
    let tested = 0, noop = 0, changed = 0;
    const deadLabels = [];
    for (let i = 0; i < Math.min(clickable.length, 70); i++) {
      const el = clickable[i];
      let lbl = '';
      try {
        if (!(await el.isVisible()) || !(await el.isEnabled())) continue;
        lbl = ((await el.innerText().catch(() => '')) || '').replace(/\s+/g,' ').trim().slice(0, 48);
        const before = await page.evaluate(() => document.body.innerHTML.length + '|' + document.body.innerText.length);
        await el.click({ timeout: 2500, noWaitAfter: true });
        await page.waitForTimeout(260);
        const after = await page.evaluate(() => document.body.innerHTML.length + '|' + document.body.innerText.length);
        tested++;
        if (before === after) { noop++; if (lbl) deadLabels.push(lbl); } else changed++;
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(90);
      } catch (e) { /* detached or overlaid — not necessarily a defect */ }
    }

    // ── 3c: style consistency
    const style = await page.evaluate(() => {
      const fonts = new Set(), colors = new Set(), radii = new Set(), sizes = new Set();
      for (const el of Array.from(document.querySelectorAll('*')).slice(0, 2500)) {
        const s = getComputedStyle(el);
        if (s.fontFamily) fonts.add(s.fontFamily.split(',')[0].replace(/["']/g,'').trim());
        if (s.color) colors.add(s.color);
        if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(s.backgroundColor);
        if (s.fontSize) sizes.add(s.fontSize);
        const tag = el.tagName.toLowerCase();
        if (tag === 'button' || el.classList.contains('btn')) radii.add(s.borderRadius);
      }
      return { fonts: [...fonts], colors: [...colors], radii: [...radii], sizes: [...sizes] };
    });
    const badFonts = style.fonts.filter(f => f && !/^(Roboto|ui-monospace|monospace|inherit)$/i.test(f));
    const offPalette = [...new Set(style.colors.map(norm))].filter(c => c && !PALETTE.has(c));
    const bigRadii = style.radii.filter(r => { const n = parseFloat(r); return n > 4 && n < 50; });

    await page.screenshot({ path: `${OUT}/${t.id}.png`, fullPage: true }).catch(() => {});
    const h = await page.evaluate(() => document.documentElement.scrollHeight);

    results.push({
      id: t.id, name: t.name, file: t.f,
      pageHeightPx: h, viewports: +(h / 950).toFixed(1),
      interactive: inv.length,
      linksNoHref: inv.filter(e => e.tag === 'a' && (!e.href || e.href === '#')).length,
      disabledNoReason: inv.filter(e => e.disabled).map(e => e.label).filter(Boolean),
      clickTested: tested, clickChanged: changed, clickNoop: noop,
      deadClickLabels: [...new Set(deadLabels)].slice(0, 12),
      jsErrors: [...new Set(errors)].slice(0, 6),
      badFonts, offPaletteCount: offPalette.length, offPaletteSample: offPalette.slice(0, 8),
      buttonRadiiOver4px: [...new Set(bigRadii)],
      fontSizes: style.sizes.length,
    });
    console.log(`${t.id.padEnd(9)} h=${String(h).padStart(5)}px (${(h/950).toFixed(1)}vp) interactive=${String(inv.length).padStart(3)} clicked=${String(tested).padStart(3)} noop=${String(noop).padStart(3)} jsErr=${errors.length} fonts=${badFonts.join(',')||'ok'} offPalette=${offPalette.length}`);
    await ctx.close();
  }

  fs.writeFileSync(`${OUT}/autoscan.json`, JSON.stringify(results, null, 2));
  console.log('\n=== DEAD-CLICK CANDIDATES (no DOM change on click) ===');
  for (const r of results) if (r.deadClickLabels.length) console.log(` ${r.id}: ${r.deadClickLabels.join(' · ')}`);
  console.log('\n=== JS ERRORS ===');
  for (const r of results) if (r.jsErrors.length) console.log(` ${r.id}: ${r.jsErrors.join(' | ')}`);
  console.log('\n=== DISABLED CONTROLS (protocol: disabled without a reason is a finding) ===');
  for (const r of results) if (r.disabledNoReason.length) console.log(` ${r.id}: ${r.disabledNoReason.join(' · ')}`);
  await browser.close();
})();
