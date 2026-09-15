#!/usr/bin/env node
/**
 * qx-extract-shared.cjs — pull the domain data and pure logic OUT of the
 * vanilla prototype and into a module the React port consumes.
 *
 * Ignat, 2026-09-15: "Now you lost almost all logic." Correct. The first
 * React pass retyped a handful of sample rows instead of carrying the real
 * model across, which is how the two would have silently drifted apart.
 *
 * So nothing is retyped. This script is the single source of truth's
 * delivery mechanism: re-run it and the port resyncs with the vanilla
 * prototype. The vanilla file is never modified.
 *
 * What comes across:
 *   · the 28 evaluation rows, read out of the reports-list markup
 *   · the 50 top-level domain constants (DATA, RPT_*, FA_*, PUNCT_*,
 *     DQI_*, RD_*, …) — every report type's real dataset
 *   · the pure helper functions (no document/DOM references)
 *
 * What does NOT come across, because it cannot: the 175 DOM-coupled
 * functions (~3,150 lines). Those are rewritten as React, view by view.
 *
 * Usage: node scripts/qx-extract-shared.cjs
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../projects/q-explorer-prototype/index.html');
const OUT = path.resolve(__dirname, '../projects/q-explorer-mui/data.js');

const src = fs.readFileSync(SRC, 'utf8');
const js = src.slice(src.lastIndexOf('<script>') + 8, src.lastIndexOf('</script>'));

/** Match a balanced {...} or [...] starting at `from`. */
function balanced(text, from) {
  const open = text[from];
  const close = open === '{' ? '}' : ']';
  let depth = 0, inStr = null;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return text.slice(from, i + 1); }
  }
  return null;
}

/* ── 1. the evaluation rows, read out of the markup ──────────────── */
const rows = [];
{
  const listStart = src.indexOf('id="view-reports-list"');
  const listEnd = src.indexOf('id="view-scheduled"');
  const section = src.slice(listStart, listEnd > 0 ? listEnd : undefined);

  // each group heading names the evaluation type the rows below belong to
  const groupRe = /<span class="group-title" data-i18n="(type_[a-z_]+)"/g;
  const groups = [];
  let g;
  while ((g = groupRe.exec(section))) groups.push({ key: g[1].replace('type_', ''), at: g.index });

  const trRe = /<tr data-status="([^"]*)" data-name="([^"]*)"([^>]*)>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = trRe.exec(section))) {
    const [, status, name, rest, body] = m;
    const attr = k => (rest.match(new RegExp(`data-${k}="([^"]*)"`)) || [, ''])[1];
    const tds = [...body.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x =>
      x[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
    // the group whose heading most recently precedes this row
    const group = groups.filter(x => x.at < m.index).pop();
    rows.push({
      group: group ? group.key : 'punctuality',
      name, status,
      periodKey: attr('period'),
      von: attr('von'), bis: attr('bis'),
      period: tds[1] || '', created: tds[2] || '',
    });
  }
}

/* ── 2. the domain constants ─────────────────────────────────────── */
// Shell/browser plumbing stays behind; only the domain model travels.
const SKIP = new Set(['MUI_SELECT_OPEN', 'VIEW_HASH', 'HASH_VIEW', 'EVAL_TYPES',
                      'INFO_ICONS', 'INFO_DOCS', 'INFO_TITLES']);
const consts = [];
const constRe = /^  const ([A-Z][A-Z0-9_]*)\s*=\s*([\{\[])/gm;
let c;
while ((c = constRe.exec(js))) {
  const name = c[1];
  if (SKIP.has(name)) continue;
  const body = balanced(js, c.index + c[0].length - 1);
  if (body) consts.push({ name, body });
}

/* ── 3. the pure functions ───────────────────────────────────────── */
const pure = [];
const fnRe = /^  function (\w+)\(([^)]*)\)\s*\{/gm;
let f;
while ((f = fnRe.exec(js))) {
  const body = balanced(js, f.index + f[0].length - 1);
  if (!body) continue;
  if (/document\.|getElementById|querySelector|innerHTML|classList|\.style\.|window\./.test(body)) continue;
  pure.push({ name: f[1], src: `function ${f[1]}(${f[2]}) ${body}` });
}

/* ── write ───────────────────────────────────────────────────────── */
const out = `/* ══════════════════════════════════════════════════════════════════
   GENERATED — do not edit. Run: node scripts/qx-extract-shared.cjs

   Extracted from projects/q-explorer-prototype/index.html so the React
   port and the vanilla prototype share one source of truth for the domain
   model. Re-run to resync; the vanilla file is never modified.

   ${rows.length} evaluation rows · ${consts.length} domain constants · ${pure.length} pure functions
   ══════════════════════════════════════════════════════════════════ */

/** The evaluations list, read out of the vanilla prototype's markup. */
var EVALUATIONS = ${JSON.stringify(rows, null, 2)};

${consts.map(x => `var ${x.name} = ${x.body};`).join('\n\n')}

${pure.map(x => x.src).join('\n\n')}
`;

fs.writeFileSync(OUT, out);
console.log(`evaluation rows   ${rows.length}`);
console.log(`domain constants  ${consts.length}  (${consts.map(x => x.name).slice(0, 8).join(', ')}…)`);
console.log(`pure functions    ${pure.length}`);
console.log(`written           ${path.relative(process.cwd(), OUT)}  ${(out.length / 1024).toFixed(1)} KB`);
