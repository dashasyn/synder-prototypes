/**
 * Step 4 — deterministic checks for TxnRecon Finalist 1.
 * No LLM. CSS values + computed styles + contrast, diffed against the canonical
 * kit (ui-kit/synder-ui-kit.css) and DESIGN_RULES.md. Output: auto-findings.json
 */
const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const fs = require('fs');

const FILE = '/home/ubuntu/.openclaw/workspace/projects/txnrecon-setup/finalist-1-sketch.html';
const KIT = '/home/ubuntu/.openclaw/workspace/ui-kit/synder-ui-kit.css';
const OUT = '/home/ubuntu/.openclaw/workspace/projects/txnrecon-setup/round1/auto-findings.json';
const URL = 'https://dashasyn.github.io/synder-prototypes/projects/txnrecon-setup/finalist-1-sketch.html';

const html = fs.readFileSync(FILE, 'utf8');
const lines = html.split('\n');
// the page's own CSS: everything after the inlined kit closes
const pageCssStart = lines.findIndex(l => l.includes('<style id="inlined-proto">')) + 1;
const pageCss = lines.slice(pageCssStart).join('\n').split('</body>')[0];

const kit = fs.readFileSync(KIT, 'utf8');
const palette = new Set(
  [...kit.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => m[0].toUpperCase())
);
const findings = [];
let n = 0;
const add = (severity, element, finding, user_impact, suggested_fix, evidence) =>
  findings.push({ id: 'AUTO-' + (++n), severity, element, finding, user_impact, suggested_fix, evidence });

/* ---- 1. off-palette colours in the page's own CSS ---- */
// Third-party brand colours are not kit drift — a Stripe dot must be Stripe purple.
const BRAND = new Set(['#635BFF', '#003087', '#95BF47', '#2CA01C']);
const seen = {};
for (const m of pageCss.matchAll(/(^|[^-\w])#([0-9a-fA-F]{3,8})\b/g)) {
  const hex = ('#' + m[2]).toUpperCase();
  if (palette.has(hex) || BRAND.has(hex)) continue;
  const idx = m.index;
  // a var() fallback never renders while the token exists — not drift either
  const before = pageCss.slice(Math.max(0, idx - 48), idx + 1);
  if (/var\(\s*--[a-z0-9-]+\s*,\s*[^)]*$/i.test(before)) continue;
  const line = pageCss.slice(0, idx).split('\n').length + pageCssStart;
  (seen[hex] = seen[hex] || []).push(line);
}
const offPalette = Object.entries(seen);
if (offPalette.length) {
  add('Medium', 'page stylesheet',
    'Colours used that are not in the canonical kit palette: ' +
      offPalette.map(([h, ls]) => `${h} (line${ls.length > 1 ? 's' : ''} ${ls.slice(0, 4).join(', ')})`).join('; '),
    'Small colour drift compounds: the screen stops matching production and the kit stops being the source of truth.',
    'Replace each with the nearest kit token, or add the value to the kit if it is genuinely new.',
    { quote: offPalette.map(x => x[0]).join(', '), source: 'ui-kit/synder-ui-kit.css palette' });
}

/* ---- 2/3/4. computed styles, radii, grid, contrast ---- */
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto(URL, { waitUntil: 'networkidle' });
  // put the page into a state where every measured control is actually rendered
  await p.selectOption('#f-per', 'custom');
  await p.locator('#mode-toggle').click();
  await p.waitForTimeout(300);

  const data = await p.evaluate(() => {
    const px = v => parseFloat(v) || 0;
    const grab = (sel, name) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        name, sel,
        font: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight,
        color: cs.color, bg: cs.backgroundColor, border: cs.borderColor,
        radius: cs.borderTopLeftRadius, height: Math.round(r.height),
        padT: px(cs.paddingTop), padL: px(cs.paddingLeft),
        mgB: px(cs.marginBottom), gap: cs.gap,
      };
    };
    const out = [
      grab('#run', 'Run reconciliation (primary button)'),
      grab('#f-per', 'Date range select'),
      grab('#f-int', 'Integration select'),
      grab('#d-from', 'Custom start date input'),
      grab('.bar h1', 'Page title'),
      grab('.grp h3', 'Section heading'),
      grab('.hint', 'Field hint'),
      grab('.hint.warn', 'Shared-account warning hint'),
      grab('.rec-chip', 'Recommended chip'),
      grab('#mode-toggle', 'Upload manually link-button'),
      grab('.side-title', 'Accounting / Integration card title'),
      grab('.db', 'Browse button'),
      grab('.dm', 'CSV or XLSX hint'),
      grab('.egnote', 'Example-steps note'),
      grab('.acc-h', 'How-to accordion header'),
      grab('.safe', 'Read-only badge'),
      grab('.src', 'Source card'),
      grab('.card', 'Form card'),
    ].filter(Boolean);
    // every distinct font-family on the page
    const fams = new Set();
    document.querySelectorAll('*').forEach(el => fams.add(getComputedStyle(el).fontFamily));
    return { out, fams: [...fams] };
  });

  // contrast
  const contrast = await p.evaluate(() => {
    const lum = c => {
      const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const bgOf = el => {
      let e = el;
      while (e) {
        const c = getComputedStyle(e).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return parse(c);
        e = e.parentElement;
      }
      return [255, 255, 255];
    };
    const res = [];
    const targets = ['.hint', '.hint.warn', '.dm', '.dt', '.egnote', '.side-title', '.rec-chip', '.safe', '.msel-lab', '#mode-toggle', '.sz', '.aa-body', '.req', '.star'];
    for (const sel of targets) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const cs = getComputedStyle(el);
      const fg = parse(cs.color), bg = bgOf(el);
      const L1 = lum(fg), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(cs.fontSize), w = parseInt(cs.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && w >= 700);
      res.push({ sel, text: (el.innerText || '').trim().slice(0, 48), color: cs.color, bg: `rgb(${bg.join(', ')})`, size, ratio: Math.round(ratio * 100) / 100, required: large ? 3 : 4.5 });
    }
    return res;
  });

  const bad = contrast.filter(c => c.ratio < c.required);
  if (bad.length) {
    add('High', bad.map(c => c.sel).join(', '),
      'Text below the WCAG AA contrast minimum: ' + bad.map(c => `${c.sel} "${c.text}" ${c.ratio}:1 on ${c.bg} (needs ${c.required}:1)`).join(' · '),
      'Low-vision users and anyone on a dim laptop screen cannot read it; on this screen the failing text carries the warnings and the file requirements.',
      'Darken to a kit token that clears 4.5:1 (--text-secondary #6B778C is 4.6:1 on white; --text-muted #B4BBCB is not).',
      { quote: bad.map(c => c.text).join(' | '), source: 'WCAG 2.1 AA 1.4.3' });
  }

  const nonRoboto = data.fams.filter(f => !/Roboto/.test(f));
  if (nonRoboto.length) {
    add('Medium', 'page', 'Font families in use that are not Roboto: ' + nonRoboto.join(' / '),
      'Typography drifts from production.', 'Use the kit font stack everywhere.',
      { quote: nonRoboto.join(' / '), source: 'DESIGN_RULES.md — Font family: Roboto' });
  }

  const radiusBad = data.out.filter(d => /button|Browse/i.test(d.name) && parseFloat(d.radius) > 4);
  if (radiusBad.length) {
    add('Medium', radiusBad.map(d => d.name).join(', '),
      'Action-button radius over 4px: ' + radiusBad.map(d => `${d.name} = ${d.radius}`).join(', '),
      'Buttons read as a different component family than production.',
      'Use --radius-sm (4px) on action buttons.',
      { quote: radiusBad.map(d => d.radius).join(', '), source: 'DESIGN_RULES.md — no border-radius > 4px for action buttons' });
  }

  const offGrid = data.out.filter(d => d.padT && d.padT % 4 !== 0);
  if (offGrid.length) {
    add('Medium', offGrid.map(d => d.name).join(', '),
      'Padding off the 4/8px grid: ' + offGrid.map(d => `${d.name} padding-top ${d.padT}px`).join(', '),
      'Vertical rhythm drifts from the rest of the product.',
      'Snap to --space-1..--space-8.',
      { quote: offGrid.map(d => d.padT + 'px').join(', '), source: 'DESIGN_RULES.md — 8px grid (strict)' });
  }

  const inputs = data.out.filter(d => /select|input/i.test(d.name));
  const wrongH = inputs.filter(d => d.height !== 32 && d.height !== 36);
  if (wrongH.length) {
    add('Medium', wrongH.map(d => d.name).join(', '),
      'Control height off the kit: ' + wrongH.map(d => `${d.name} = ${d.height}px`).join(', ') + ' (kit --input-height 32px, --btn-height-lg 36px)',
      'Controls sit at a different height than production inputs.',
      'Set to 32px (or 36px for the large variant).',
      { quote: wrongH.map(d => d.height + 'px').join(', '), source: 'ui-kit/synder-ui-kit.css --input-height: 32px' });
  }

  fs.writeFileSync(OUT, JSON.stringify({ target: URL, computed: data.out, contrast, findings }, null, 2) + '\n');
  console.log('auto findings: ' + findings.length);
  findings.forEach(f => console.log('  ' + f.id + ' [' + f.severity + '] ' + f.finding.slice(0, 200)));
  console.log('\ncontrast table:');
  contrast.forEach(c => console.log(`  ${c.ratio >= c.required ? 'ok  ' : 'FAIL'} ${c.sel.padEnd(14)} ${String(c.ratio).padEnd(6)} need ${c.required}  ${c.color} on ${c.bg}  "${c.text}"`));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
