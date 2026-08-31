/* Adopt ui-kit/synder-ui-kit.css in a prototype: link the kit, then replace raw
   hex values with kit var() references.

   Usage: node scripts/kit-adopt.cjs <file.html> <relative-kit-href> [--apply]

   Conversion rules (same as commit be0172c, kept reproducible):
     · exact value match  → any token holding that value
     · approximate match  → restricted to the published palette plus core
                            text/bg/border tokens, must share a hue family,
                            must fall inside weighted RGB distance 42
     · third-party brand colours are left raw on purpose
     · anything else is left raw and REPORTED, never guessed at
   Substitution is confined to CSS: the <style> block and style="" attributes.
   JS colour strings are never touched. */
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
const kitHref = process.argv[3];
const APPLY = process.argv.includes('--apply');
if (!file || !kitHref) { console.error('usage: kit-adopt.cjs <file.html> <kit-href> [--apply]'); process.exit(1); }

const kitCss = fs.readFileSync(path.resolve(__dirname, '../ui-kit/synder-ui-kit.css'), 'utf8');

/* ---- token table --------------------------------------------------------- */
const tokens = {};
for (const m of kitCss.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{3,6})\s*;/g)) {
  tokens[m[1]] = norm(m[2]);
}

/* Tokens an APPROXIMATE match is allowed to land on. Exact matches may land on
   any token. This is the guard that stops pale greens becoming greys. */
const APPROX_OK = new Set([
  '--color-primary', '--color-primary-50', '--color-primary-20', '--color-primary-10', '--color-primary-5',
  '--color-white', '--color-grey-5', '--color-grey-10', '--color-grey-20', '--color-grey-30', '--color-grey-50', '--color-grey',
  '--color-green', '--color-green-light', '--color-red', '--color-red-light',
  '--color-yellow', '--color-yellow-light', '--color-blue', '--color-blue-light',
  '--color-purple', '--color-purple-light',
  '--color-status-green-bg', '--color-status-red-bg', '--color-status-yellow-bg',
  '--color-status-blue-bg', '--color-status-purple-bg', '--color-status-grey-bg',
  '--text-primary', '--text-secondary', '--text-muted', '--text-placeholder', '--text-table-header',
  '--bg-page', '--bg-surface', '--bg-hover', '--bg-active', '--bg-subtle', '--bg-row-hover', '--bg-row-selected',
  '--border-light', '--border-default', '--border-strong', '--border-table',
]);

/* Deliberate palette migrations — NOT approximations, so they are declared
   rather than computed. Every entry is a value that exists in no Synder token
   and whose nearest token is further than the distance guard allows.

   The bulk of it is one decision: this prototype was built on the Material
   grey ramp (#424242/#616161/#757575/#9E9E9E/#BDBDBD, plus Google's #5F6368
   and #9AA0A6). Synder's greys are blue-tinted and sit at different steps, so
   the ramp is re-pointed level for level rather than matched value for value.
   #9E9E9E → --text-placeholder raises tertiary text from 2.8:1 to 3.4:1. */
const OVERRIDES = {
  // Material / Google grey ramp → Synder text ramp
  '#424242': '--text-primary',
  '#616161': '--text-secondary',
  '#5f6368': '--text-secondary',
  '#757575': '--text-secondary',
  '#4a5568': '--text-secondary',
  '#5a6072': '--text-secondary',
  '#9e9e9e': '--text-placeholder',
  '#9aa0a6': '--text-placeholder',
  '#bdbdbd': '--color-grey-30',
  '#c4c8cc': '--color-grey-30',
  // primary ramp
  '#0044a8': '--color-primary-active',
  '#0046b0': '--color-primary-active',
  '#1565c0': '--color-primary',
  '#6b9eee': '--color-primary-50',
  '#a8c4ec': '--color-primary-20',
  // warning: Figma <Status>/<Alert> warning text is --color-yellow
  '#b06000': '--color-yellow',
  '#e65100': '--color-yellow',
  '#ffa726': '--color-yellow',
  '#fff8e1': '--color-yellow-light',
  '#fffdf2': '--color-yellow-light',
  // pure black/white are not brand colours; they are the kit's own values
  '#ffffff': '--color-white',
  '#000000': '--text-primary',
  // success
  '#66bb6a': '--color-green',
  '#145a27': '--color-green',
  '#c6e3c8': '--border-default',
  // error
  '#f0b4b1': '--border-default',
  '#f0c7c4': '--border-default',
};

/* Third-party brand colours — not ours to tokenise. */
const BRAND = new Set([
  '#635bff', '#6772e5',            // Stripe
  '#ff9900', '#232f3e',            // Amazon
  '#2ca01c',                       // QuickBooks
  '#13b5ea',                       // Xero
  '#95bf47', '#96bf48', '#7ab55c', '#5e8e3e', // Shopify
  '#003087', '#009cde', '#0070ba', // PayPal
  '#e53238', '#0064d2', '#f5af02', // eBay
  '#3e4348',                       // Square
  '#0071ce',                       // Walmart
  '#f45800',                       // Etsy
  '#96588a',                       // WooCommerce
]);

function norm(h) {
  h = h.toLowerCase();
  if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  return h;
}
function rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
/* Weighted RGB distance — the "low-cost approximation" (Thiadmer Riemersma). */
function dist(a, b) {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  const rm = (r1 + r2) / 2, dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}
/* Chroma threshold is 8/255, not the 0.06 (≈15/255) the first pass used. At 15
   a pale tint like #E8F5E9 (chroma 13) counted as neutral and was free to land
   on a grey — the pale-green-onto-grey failure the hue guard exists to stop.
   A tint keeps its family; only a true neutral may cross into the grey ramp. */
function hue(h) {
  const [r, g, b] = rgb(h).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 8 / 255) return 'neutral';
  let x;
  if (max === r) x = ((g - b) / d) % 6; else if (max === g) x = (b - r) / d + 2; else x = (r - g) / d + 4;
  x = (x * 60 + 360) % 360;
  if (x < 20 || x >= 330) return 'red';
  if (x < 45) return 'orange';
  if (x < 70) return 'yellow';
  if (x < 165) return 'green';
  if (x < 200) return 'cyan';
  if (x < 260) return 'blue';
  return 'purple';
}

/* Synder's greys are blue-tinted (#DFE4EC, #B4BBCB, #6B778C), so a true
   neutral is allowed to land on them. That is the one crossing permitted. */
const GREY_ROLE = /^--(color-white|color-grey|color-grey-\d+|text-(primary|secondary|muted|placeholder|table-header)|bg-(page|surface|hover|subtle|row-hover)|border-(light|default|strong|table))$/;
function compatible(a, b, tokenName) {
  const ha = hue(a), hb = hue(b);
  if (ha === hb) return true;
  if (ha === 'neutral' && GREY_ROLE.test(tokenName)) return true;
  return false;
}

function match(hex) {
  const h = norm(hex);
  if (OVERRIDES[h]) return { token: OVERRIDES[h], kind: 'declared' };
  for (const [name, val] of Object.entries(tokens)) if (val === h) return { token: name, kind: 'exact' };
  let best = null;
  for (const [name, val] of Object.entries(tokens)) {
    if (!APPROX_OK.has(name)) continue;
    if (!compatible(h, val, name)) continue;
    const d = dist(h, val);
    if (d <= 42 && (!best || d < best.d)) best = { token: name, kind: 'approx', d: Math.round(d) };
  }
  return best;
}

/* ---- read + locate the CSS regions --------------------------------------- */
let html = fs.readFileSync(file, 'utf8');

if (!html.includes(kitHref)) {
  const linkTag = `<link rel="stylesheet" href="${kitHref}">\n`;
  html = html.replace(/<style>/, linkTag + '<style>');
  console.log('linked: ' + kitHref);
} else {
  console.log('kit already linked');
}

const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>', styleStart);

const stats = { exact: 0, approx: 0, declared: 0, brand: 0, unmapped: {} };

function convert(css) {
  return css.replace(/#[0-9A-Fa-f]{3,6}\b/g, (hex) => {
    const h = norm(hex);
    if (BRAND.has(h)) { stats.brand++; return hex; }
    const m = match(h);
    if (!m) { stats.unmapped[h] = (stats.unmapped[h] || 0) + 1; return hex; }
    stats[m.kind]++;
    return `var(${m.token})`;
  });
}

/* 1. the <style> block */
const before = html.slice(0, styleStart + 7);
const cssBlock = html.slice(styleStart + 7, styleEnd);
const after = html.slice(styleEnd);
let out = before + convert(cssBlock) + after;

/* 2. style="" attributes anywhere in the document (CSS, not JS strings) */
out = out.replace(/style="([^"]*)"/g, (full, decls) => decls.includes('#') ? 'style="' + convert(decls) + '"' : full);

/* 3. role pass.
   A value match is not a role match. #E0E0E0 lives in the kit as
   --control-track (the Toggle's off track) and #F5F5F5 as --control-thumb-off;
   an exact-value lookup will happily hand those to a table border or a page
   background. #FAFAFA resolves to --sds-gray-bg-light, which belongs to the
   GSP/Bootstrap stack and has no business in a React/MUI prototype. So after
   substitution, re-point tokens by the property they landed on. */
const ROLE_FIX = [
  [/(border[a-z-]*\s*:\s*[^;{}]*?)var\(--control-track\)/g, '$1var(--border-default)'],
  [/(background[a-z-]*\s*:\s*[^;{}]*?)var\(--control-track\)/g, '$1var(--color-grey-20)'],
  [/(color\s*:\s*)var\(--control-track\)/g, '$1var(--color-grey-30)'],
  [/(border[a-z-]*\s*:\s*[^;{}]*?)var\(--control-thumb-off\)/g, '$1var(--border-light)'],
  [/(background[a-z-]*\s*:\s*[^;{}]*?)var\(--control-thumb-off\)/g, '$1var(--color-grey-5)'],
  [/var\(--sds-gray-bg-light\)/g, 'var(--color-grey-5)'],
  [/(^|[;{"\s])color\s*:\s*var\(--color-grey\)/g, '$1color:var(--text-primary)'],
];
/* Runs over the whole document: the same tokens land in style="" attributes.
   Every pattern is anchored to a CSS property name, so nothing outside CSS
   can match. */
{
  let n = 0;
  for (const [re, to] of ROLE_FIX) {
    n += (out.match(re) || []).length;
    out = out.replace(re, to);
  }
  console.log(`role re-points: ${n}`);
}

console.log(`exact: ${stats.exact}  approx: ${stats.approx}  declared: ${stats.declared}  brand left raw: ${stats.brand}`);
const un = Object.entries(stats.unmapped).sort((a, b) => b[1] - a[1]);
console.log(`unmapped, left raw and reported: ${un.length} distinct / ${un.reduce((s, x) => s + x[1], 0)} uses`);
un.forEach(([h, n]) => console.log(`   ${h}  ×${n}   (hue ${hue(h)})`));

if (APPLY) { fs.writeFileSync(file, out); console.log('\nWRITTEN ' + file); }
else console.log('\ndry run — pass --apply to write');
