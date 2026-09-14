#!/usr/bin/env node
/**
 * qx-mui-adopt.cjs — restyles the Q-Explorer prototype onto MUI v5 (MD2).
 *
 * Reproducible on purpose: re-runnable from the committed source, so the
 * conversion can be argued with rather than taken on trust. Mirrors the
 * kit-adopt.cjs approach used for the transactions prototype.
 *
 * The theme is MUI v5 DEFAULT except for four deviations measured off ETC's
 * own product (Ignat's screenshots, 2026-09-14) — see scripts/sample-etc-screenshots.cjs:
 *   primary #2196F3 (not #1976D2) · AppBar navy #1C2848 at a dense 48px ·
 *   cards Paper variant="outlined" (1px #E7E7E7, no shadow) · TableHead #F4F4F4.
 * Ignat, 2026-09-14: tabs, dialogs and snackbars stay MUI default.
 *
 * Usage: node scripts/qx-mui-adopt.cjs [--dry]
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '../projects/q-explorer-prototype/index.html');
const DRY = process.argv.includes('--dry');

const TOKENS = `
  /* ============================================================
     MUI v5 (Material Design 2) theme tokens.
     MUI defaults unless the comment says otherwise. The four
     non-default values are measured from ETC's own product, not
     chosen — see scripts/sample-etc-screenshots.cjs.
     ============================================================ */
  :root {
    /* palette — primary is Blue 500, NOT MUI's default Blue 700 #1976D2 */
    --primary-main:   #2196F3;
    --primary-dark:   #1769AA;
    --primary-light:  #64B5F6;
    --primary-08:     rgba(33,150,243,0.08);
    --primary-12:     rgba(33,150,243,0.12);
    --primary-04:     rgba(33,150,243,0.04);
    --primary-50:     rgba(33,150,243,0.5);

    --error-main:     #D32F2F;
    --error-dark:     #C62828;
    --success-dark:   #1B5E20;
    --warning-dark:   #A34D00;
    --appbar-navy-dark: #141D36;
    --error-08:       rgba(211,47,47,0.08);
    --warning-main:   #ED6C02;
    --warning-08:     rgba(237,108,2,0.08);
    --success-main:   #2E7D32;
    --success-08:     rgba(46,125,50,0.08);
    --info-main:      #0288D1;

    /* text + surfaces — MUI defaults */
    --text-primary:   rgba(0,0,0,0.87);
    --text-secondary: rgba(0,0,0,0.6);
    --text-disabled:  rgba(0,0,0,0.38);
    --divider:        rgba(0,0,0,0.12);
    --outline:        rgba(0,0,0,0.23);
    --action-hover:   rgba(0,0,0,0.04);
    --action-selected:rgba(0,0,0,0.08);
    --bg-paper:       #FFFFFF;
    --bg-subtle:      #FAFAFA;

    /* filled TextField — MUI defaults; measured #F0F0F0 in their product,
       which is exactly rgba(0,0,0,0.06) over white */
    --filled-bg:        rgba(0,0,0,0.06);
    --filled-bg-hover:  rgba(0,0,0,0.09);
    --filled-disabled:  rgba(0,0,0,0.12);
    --filled-underline: rgba(0,0,0,0.42);

    /* measured deviations */
    --appbar-navy:    #1C2848;
    --card-border:    #E7E7E7;
    --table-head-bg:  #F4F4F4;

    --radius: 4px;

    /* Only overlays keep an elevation. Surfaces are flat: Ignat asked for
       buttons without shadows, and their cards measure as outlined. */
    --elev8:  0px 5px 5px -3px rgba(0,0,0,0.2), 0px 8px 10px 1px rgba(0,0,0,0.14), 0px 3px 14px 2px rgba(0,0,0,0.12);
    --elev24: 0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,0.14), 0px 9px 46px 8px rgba(0,0,0,0.12);
  }
`;

/** Raw value → token. Longest keys first so #F9FAFB doesn't eat #F9FAFB0. */
const COLOUR_MAP = {
  // ── blues: the Tailwind blue ramp the prototype was built on ──
  '#2563EB': 'var(--primary-main)',
  '#1D4ED8': 'var(--primary-dark)',
  '#1E40AF': 'var(--primary-dark)',
  '#3B82F6': 'var(--primary-main)',
  '#60A5FA': 'var(--primary-light)',
  '#93C5FD': 'var(--primary-light)',
  '#BFDBFE': 'var(--primary-12)',
  '#DBEAFE': 'var(--primary-12)',
  '#EFF6FF': 'var(--primary-08)',
  '#EEF4FF': 'var(--primary-08)',
  '#C7D9FF': 'var(--primary-12)',
  '#1976D2': 'var(--primary-main)',   // partial earlier pass
  '#1565C0': 'var(--primary-dark)',

  // ── greys: Tailwind ramp → MUI text/divider roles ──
  '#111827': 'var(--text-primary)',
  '#1F2937': 'var(--text-primary)',
  '#374151': 'var(--text-primary)',
  '#4B5563': 'var(--text-secondary)',
  '#6B7280': 'var(--text-secondary)',
  '#9CA3AF': 'var(--text-disabled)',
  '#D1D5DB': 'var(--outline)',
  '#E5E7EB': 'var(--card-border)',
  '#F3F4F6': 'var(--table-head-bg)',
  '#F9FAFB': 'var(--bg-subtle)',
  '#F5F7FA': 'var(--bg-subtle)',
  '#FAFAFA': 'var(--bg-subtle)',
  '#F0F0F0': 'var(--table-head-bg)',

  // ── semantic ──
  '#DC2626': 'var(--error-main)',
  '#B91C1C': 'var(--error-dark)',
  '#C62828': 'var(--error-dark)',
  '#EF4444': 'var(--error-main)',
  '#FEF2F2': 'var(--error-08)',
  '#FEE2E2': 'var(--error-08)',
  '#10B981': 'var(--success-main)',
  '#059669': 'var(--success-main)',
  '#2E7D32': 'var(--success-main)',
  '#E8F5E9': 'var(--success-08)',
  '#D1FAE5': 'var(--success-08)',
  '#F59E0B': 'var(--warning-main)',
  '#D97706': 'var(--warning-main)',
  '#FEF9C3': 'var(--warning-08)',
  '#FEF3C7': 'var(--warning-08)',

  // ── second pass: the long tail, classified by the role its selector plays ──
  // blues/indigos doing UI work
  '#1565C0': 'var(--primary-dark)',
  '#2E6BB8': 'var(--primary-dark)',
  '#1E73D2': 'var(--primary-main)',
  '#2C5F8D': 'var(--primary-dark)',
  '#90CAF9': 'var(--primary-light)',
  '#4F46E5': 'var(--primary-main)',
  '#3730A3': 'var(--primary-dark)',
  '#4527A0': 'var(--primary-dark)',
  '#3949AB': 'var(--primary-main)',
  '#C7D2FE': 'var(--primary-12)',
  '#C5D9F9': 'var(--primary-12)',
  '#E8F0FE': 'var(--primary-08)',
  // pale row-hover tints — all of these were one-off near-whites
  '#F1F4F8': 'var(--action-hover)',
  '#F5F7FF': 'var(--action-hover)',
  '#F0F5FF': 'var(--action-hover)',
  '#F8FAFF': 'var(--action-hover)',
  // NOT a hover tint: #F0F2F5 is the login page's opaque background.
  // Mapping an opaque SURFACE onto an alpha OVERLAY token made the login
  // screen 4%-transparent, so the app showed through it. Surfaces take
  // surface tokens. (Caught by Ignat, 2026-09-14.)
  '#F0F2F5': 'var(--bg-subtle)',
  '#F8F9FA': 'var(--bg-subtle)',
  '#F8F8F8': 'var(--bg-subtle)',
  // dividers
  '#E8EAED': 'var(--card-border)',
  '#EAECEF': 'var(--card-border)',
  // dark text
  '#1A1A2E': 'var(--text-primary)',
  '#323232': 'var(--text-primary)',
  // navy (login button hover is a darker brand navy)
  '#253563': 'var(--appbar-navy-dark)',
  // success family
  '#34D399': 'var(--success-main)',
  '#6EE7B7': 'var(--success-main)',
  '#065F46': 'var(--success-dark)',
  '#ECFDF5': 'var(--success-08)',
  '#F1FBF2': 'var(--success-08)',
  '#F7FDF8': 'var(--success-08)',
  // warning family
  '#D97706': 'var(--warning-main)',
  '#F59E0B': 'var(--warning-main)',
  '#E65100': 'var(--warning-dark)',
  '#F57F17': 'var(--warning-main)',
  '#BF360C': 'var(--warning-dark)',
  '#92400E': 'var(--warning-dark)',
  '#FFFBEB': 'var(--warning-08)',
  '#FFF3E0': 'var(--warning-08)',
  '#FFF8E1': 'var(--warning-08)',
  '#FFFBF5': 'var(--warning-08)',
  '#FFF9F2': 'var(--warning-08)',
  '#FDE68A': 'var(--warning-main)',
  // error family
  '#EF4444': 'var(--error-main)',
  '#E53935': 'var(--error-main)',
  '#B71C1C': 'var(--error-dark)',
  '#991B1B': 'var(--error-dark)',
  '#FCA5A5': 'var(--error-08)',
  '#FECACA': 'var(--error-08)',
  '#FFF8F8': 'var(--error-08)',
  // purple tint used as a surface, not as series identity
  '#F6F1FD': 'var(--primary-08)',
  '#FAF6FF': 'var(--primary-08)',
  // final stragglers — all pale surface tints
  '#EEF2FF': 'var(--primary-08)',
  '#E3F2FD': 'var(--primary-08)',
  '#BBDEFB': 'var(--primary-12)',
  '#F8FAFC': 'var(--bg-subtle)',
  '#FFEBEE': 'var(--error-08)',
  '#EDE7F6': 'var(--primary-08)',
};

/**
 * Categorical colours — deliberately NOT tokenised.
 * These carry identity, not role: the FA table's column-group scale
 * (Material 100-300 tints via nth-child) and the Ersatz-row brown.
 * Folding them into the semantic palette would make three different
 * column groups render identically. Same call as the three brand
 * colours left raw in the transactions prototype.
 */
const CATEGORICAL = new Set([
  '#A5D6A7', '#C8E6C9', '#81C784',  // green group
  '#CE93D8',                        // purple group
  '#FFCC80',                        // orange group
  '#FFCDD2', '#E57373',             // red group
  '#795548',                        // Ersatz rows
]);

/** Brand values that must NOT be tokenised away. */
const KEEP = new Set([
  '#1C2848', '#141D36', '#FFF', '#FFFFFF', '#000', '#FFF8', '#2196F3',
  ...CATEGORICAL,
]);

function convert(css) {
  const report = { colours: 0, shadows: 0, unmapped: new Map() };

  // 1 — colours
  const keys = Object.keys(COLOUR_MAP).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const re = new RegExp(k.replace('#', '#'), 'gi');
    css = css.replace(re, () => { report.colours++; return COLOUR_MAP[k]; });
  }

  // 2 — surfaces go flat; only overlays keep elevation.
  //     An overlay is a rule whose selector names a modal/menu/dropdown/popover.
  css = css.replace(/([^{}]+)\{([^{}]*)\}/g, (full, sel, body) => {
    if (!/box-shadow/.test(body)) return full;
    const isOverlay = /modal|dialog|dropdown|menu|popover|listbox|tooltip|toast|snackbar|sheet|overlay|popup/i.test(sel);
    const isFocusRing = /0 0 0 \d+px/.test(body);
    if (isOverlay || isFocusRing) return full;
    report.shadows++;
    return `${sel}{${body.replace(/box-shadow:\s*[^;]+;?/g, 'box-shadow: none;')}}`;
  });

  // 3 — anything still raw gets reported, not silently left
  for (const m of css.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)) {
    const v = m[0].toUpperCase();
    if (KEEP.has(v)) continue;
    report.unmapped.set(v, (report.unmapped.get(v) || 0) + 1);
  }
  return { css, report };
}

const html = fs.readFileSync(FILE, 'utf8');
const open = html.indexOf('<style>');
const close = html.indexOf('</style>');
if (open < 0 || close < 0) throw new Error('no <style> block found');

let css = html.slice(open + 7, close);
const hadTokens = css.includes('--primary-main');
const { css: out, report } = convert(css);
const final = (hadTokens ? '' : TOKENS) + out;

console.log(`colours tokenised : ${report.colours}`);
console.log(`shadows flattened : ${report.shadows}`);
console.log(`root block        : ${hadTokens ? 'already present' : 'inserted'}`);
if (report.unmapped.size) {
  console.log('\nstill raw (decide each):');
  [...report.unmapped].sort((a, b) => b[1] - a[1])
    .forEach(([v, n]) => console.log(`  ${v}  x${n}`));
} else {
  console.log('\nno unmapped raw colours.');
}

if (!DRY) {
  fs.writeFileSync(FILE, html.slice(0, open + 7) + final + html.slice(close));
  console.log('\nwritten.');
} else {
  console.log('\n(dry run, nothing written)');
}
