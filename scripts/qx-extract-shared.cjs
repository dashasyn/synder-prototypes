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

/**
 * Match a balanced {...}, [...] or (...) starting at `from`.
 *
 * Skips strings, comments AND regex literals. That last one is not
 * pedantry: RPT_RECORDS contains /\)\s*\d*\s*([^\-–]+)/ , and counting the
 * `)` inside that regex as a closer truncated the whole IIFE, producing a
 * data.js that would not parse.
 */
function balanced(text, from) {
  const open = text[from];
  const close = open === '{' ? '}' : open === '[' ? ']' : ')';
  let depth = 0;
  // a `/` begins a regex (not division) when the last meaningful char is one
  // of these — enough for this source, and wrong only in cases it never hits
  const REGEX_OK = '(,=:[!&|?{};+-*%~^<>';
  let prev = '';
  for (let i = from; i < text.length; i++) {
    const c = text[i];

    if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && text[i + 1] === '*') { i += 2; while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i++; continue; }

    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < text.length) { if (text[i] === '\\') { i++; } else if (text[i] === q) break; i++; }
      prev = q; continue;
    }

    if (c === '/' && REGEX_OK.includes(prev)) {
      i++; let inClass = false;
      while (i < text.length) {
        if (text[i] === '\\') { i++; }
        else if (text[i] === '[') inClass = true;
        else if (text[i] === ']') inClass = false;
        else if (text[i] === '/' && !inClass) break;
        i++;
      }
      prev = '/'; continue;
    }

    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return text.slice(from, i + 1); }
    if (!/\s/.test(c)) prev = c;
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
    const cells = [...body.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x => x[1]);
    const tds = cells.map(x =>
      x.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
    // the group whose heading most recently precedes this row
    const group = groups.filter(x => x.at < m.index).pop();

    /* The ACTIONS a row offers, read out of its last cell.
       Ignat, 2026-09-17: "the preview are wrong". They were — the React port
       put preview+delete on every row, while the vanilla gives preview only to
       DONE rows, download instead of preview to raw_data, and delete-only to
       everything else. Two done trip_failures rows and every line_analysis row
       have no preview either. Rather than infer a rule from that (and get the
       exceptions wrong), the action list travels with the row. */
    const actionCell = cells[cells.length - 1] || '';
    const actions = [...actionCell.matchAll(
      /<button[^>]*>[\s\S]*?<span class="material-icons"[^>]*>\s*(\w+)/g)].map(x => x[1]);

    /* The vanilla adds a "Run again" button to every FAILED row at runtime, in
       annotateFailedRows() — it is not in the markup this reads, which is
       exactly why the port shipped without it and the parity checker agreed.
       (Fidelity validator, round 1, FID-1.) Reading the markup alone is a
       blind spot in this extractor: anything the vanilla injects after load is
       invisible to it, so a runtime rule has to be encoded deliberately. */
    if (status === 'failed') actions.unshift('refresh');

    rows.push({
      group: group ? group.key : 'punctuality',
      name, status,
      periodKey: attr('period') || 'other',
      von: attr('von'), bis: attr('bis'),
      period: tds[1] || '', created: tds[2] || '',
      actions,
    });
  }
}

/* ── 1b. the scheduled reports, also read out of the markup ──────────
   The port shipped three schedules I typed by hand while the vanilla has six,
   with different columns and a Last run it never showed. Same mistake as the
   evaluation rows, left in place after I said it would be fixed "next pass". */
const schedules = [];
{
  const i = src.indexOf('id="view-scheduled"');
  const j = src.indexOf('<div id="view-', i + 10);
  const section = src.slice(i, j > 0 ? j : undefined);
  const re = /<tr data-name="([^"]*)" data-freq="([^"]*)" data-status="([^"]*)">([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = re.exec(section))) {
    const [, name, freq, status, body] = m;
    const tds = [...body.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
      .map(x => x[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
    const keys = [...body.matchAll(/data-i18n="([^"]*)"/g)].map(x => x[1]);
    const actions = [...body.matchAll(
      /<button[^>]*>[\s\S]*?<span class="material-icons"[^>]*>\s*(\w+)/g)].map(x => x[1]);
    schedules.push({
      name, freq, status,
      freqKey: keys[0] || ('freq_' + freq),   // the badge's own wording
      next: tds[2] || '', last: tds[3] || '',
      actions,
    });
  }
  if (schedules.length < 2) {
    console.error('EXTRACTION INCOMPLETE — schedules not found in the markup');
    process.exit(1);
  }
}

/* ── 1c. the login lockup ────────────────────────────────────────────
   The Swiss flag and the QMS RPV CH wordmark are two inline SVGs, the second
   a 200-path lettering outline. Extracted rather than hand-copied for the
   usual reason, plus a practical one: it is far too big to retype correctly. */
let loginLogo = '';
{
  const i = src.indexOf('<div class="login-logo">');
  const j = src.indexOf('<div class="login-card">', i);
  if (i < 0 || j < 0) {
    console.error('EXTRACTION INCOMPLETE — login logo not found');
    process.exit(1);
  }
  loginLogo = src.slice(i + '<div class="login-logo">'.length, j)
    .replace(/<\/div>\s*$/, '').trim();
  if (!/login-flag/.test(loginLogo) || !/login-name/.test(loginLogo)) {
    console.error('EXTRACTION INCOMPLETE — login logo is missing the flag or the wordmark');
    process.exit(1);
  }
}

/* ── 1d. the Connection report's parameter chips ─────────────────────
   A read-only summary row — "15 TU's", "8 Kantone" — where the partial ones
   expand into the full membership list. Ignat, 2026-09-17: "and other". This
   was the "other": three expandable chips the port had no equivalent for, and
   a census of selects and tables could never see them. */
const chips = [];
{
  const i = src.indexOf('id="view-report-connection"');
  const j = src.indexOf('<div id="view-', i + 10);
  const section = src.slice(i, j > 0 ? j : undefined);
  const re = /<div class="rpt-chip-wrap">([\s\S]*?)<\/div>\s*<\/div>/g;
  let m;
  while ((m = re.exec(section))) {
    const w = m[1];
    const icon = (w.match(/<span class="material-icons">(\w+)<\/span>/) || [, ''])[1];
    const label = (w.match(/<\/span>([^<]+)<span class="material-icons rpt-chip-caret">/) || [, ''])[1].trim();
    const headerKey = (w.match(/rpt-chip-dd-header" data-i18n="([^"]+)"/) || [, ''])[1];
    const items = [...w.matchAll(/<div class="rpt-chip-dd-item">([^<]*)<\/div>/g)].map(x => x[1].trim());
    if (label) chips.push({ icon, label, headerKey, items });
  }
  if (!chips.length) {
    console.error('EXTRACTION INCOMPLETE — connection parameter chips not found');
    process.exit(1);
  }
}

// Actions must survive the trip. A markup change that stops the cell matching
// would otherwise hand the port a list where nothing is clickable, silently.
{
  const noActions = rows.filter(r => !r.actions.length).map(r => r.name);
  const kinds = new Set(rows.flatMap(r => r.actions));
  if (noActions.length) {
    console.error('EXTRACTION INCOMPLETE — rows with no actions:', noActions.join(', '));
    process.exit(1);
  }
  for (const need of ['visibility', 'download', 'delete', 'refresh']) {
    if (!kinds.has(need)) {
      console.error(`EXTRACTION INCOMPLETE — no row offers "${need}"`);
      process.exit(1);
    }
  }
}

/* ── 2. the domain constants ─────────────────────────────────────── */
// Shell/browser plumbing stays behind; only the domain model travels.
const SKIP = new Set(['MUI_SELECT_OPEN', 'VIEW_HASH', 'HASH_VIEW', 'EVAL_TYPES',
                      'INFO_ICONS', 'INFO_DOCS', 'INFO_TITLES']);
const consts = [];
// NOT just object and array literals. Four of the most important constants
// -- PUNCT_RECORDS, RPT_RECORDS, PUNCT_RAW, RPT_RAW -- are IIFEs that derive
// their rows from the base data, and an earlier version of this regex matched
// only `{` and `[`, so it skipped them SILENTLY. They are precisely the record
// sets the Aufschlüsseln breakdown runs on.
const constRe = /^  const ([A-Z][A-Z0-9_]*)\s*=\s*/gm;
let c;
while ((c = constRe.exec(js))) {
  const name = c[1];
  if (SKIP.has(name)) continue;
  const at = c.index + c[0].length;
  const first = js[at];
  let body;
  if (first === '{' || first === '[' || first === '(') {
    body = balanced(js, at);
    if (!body) continue;
    // an IIFE needs its trailing call
    if (first === '(') {
      const after = js.slice(at + body.length).match(/^\s*\(\s*\)/);
      if (after) body += after[0];
    }
  } else {
    // a scalar or expression: take the rest of the statement
    // (PROTO_TODAY is a `new Date(...)`, the thresholds are numbers)
    let depth = 0, inStr = null, i = at;
    for (; i < js.length; i++) {
      const ch = js[i];
      if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) depth--;
      else if (ch === ';' && depth === 0) break;
    }
    body = js.slice(at, i).trim();
  }
  consts.push({ name, body });
}

// A miss must be loud. Every top-level SHOUTY const in the source either comes
// across or is deliberately skipped -- anything else stops the extraction.
{
  const all = [...js.matchAll(/^  const ([A-Z][A-Z0-9_]*)\s*=/gm)].map(m => m[1]);
  const got = new Set(consts.map(x => x.name));
  const missed = all.filter(n => !got.has(n) && !SKIP.has(n));
  if (missed.length) {
    console.error('EXTRACTION INCOMPLETE — not carried across:', missed.join(', '));
    process.exit(1);
  }
}

/* ── 2b. lowercase module-level helpers ──────────────────────────────
   PUNCT_RECORDS' rows are getters that call scl()/sclPunkt(), and those are
   lowercase arrow consts, so the SHOUTY-only sweep above missed them and the
   data threw ReferenceError the moment anything read a row. Carried by name,
   with the scale variables they close over. */
const HELPERS = ['scl', 'sclPunkt', '_punctScale', '_punctPctShift', '_rptScale'];
const helpers = [];
for (const name of HELPERS) {
  const re = new RegExp('^  (?:const|let|var) ' + name + '\\s*=\\s*', 'm');
  const m = js.match(re);
  if (!m) continue;
  const at = m.index + m[0].length;
  let depth = 0, inStr = null, i = at;
  for (; i < js.length; i++) {
    const ch = js[i];
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    else if (ch === ';' && depth === 0) break;
  }
  helpers.push({ name, body: js.slice(at, i).trim() });
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

/* The extracted code calls t() while building its record sets, and the
   vanilla's t() closes over a module-level lang. Rather than duplicate the
   lookup in the React app, that binding lives here and the app drives it
   through setDataLang() -- one implementation of t(), not two that can drift. */
var lang = 'de';
function setDataLang(l) { lang = l; }

/** The evaluations list, read out of the vanilla prototype's markup. */
var EVALUATIONS = ${JSON.stringify(rows, null, 2)};

/** The login lockup: Swiss flag + QMS RPV CH wordmark, verbatim. */
var LOGIN_LOGO_SVG = ${JSON.stringify(loginLogo)};

/** The Connection report's read-only parameter chips. */
var CONNECTION_CHIPS = ${JSON.stringify(chips, null, 2)};

/** The scheduled reports, likewise. */
var SCHEDULES = ${JSON.stringify(schedules, null, 2)};

${helpers.map(x => `var ${x.name} = ${x.body};`).join('\n')}

${consts.map(x => `var ${x.name} = ${x.body};`).join('\n\n')}

${pure.map(x => x.src).join('\n\n')}
`;

fs.writeFileSync(OUT, out);

// The real completeness gate: execute what was just written, together with
// the i18n it depends on, and touch every record set. An earlier version
// produced a data.js that parsed fine and threw ReferenceError on first read.
{
  const vm = require('vm');
  const ctx = { console };
  vm.createContext(ctx);
  try {
    const i18n = fs.readFileSync(path.resolve(__dirname, '../projects/q-explorer-mui/i18n.js'), 'utf8');
    vm.runInContext(i18n + '\n' + out, ctx);
    // touching a row is what actually exercises the getters
    JSON.stringify(ctx.PUNCT_RECORDS && ctx.PUNCT_RECORDS[0]);
    JSON.stringify(ctx.RPT_RECORDS && ctx.RPT_RECORDS[0]);
    ctx.punctBuildTree(ctx.PUNCT_RECORDS, ['tu']);
    ctx.rptBuildTree(ctx.RPT_RECORDS, ['tu']);
    console.log('self-check      data.js executes and every record set reads');
  } catch (e) {
    console.error('SELF-CHECK FAILED —', e.message);
    process.exit(1);
  }
}
console.log(`evaluation rows   ${rows.length}`);
console.log(`schedules         ${schedules.length}`);
console.log(`param chips       ${chips.length}  (${chips.map(c => c.label).join(', ')})`);
console.log(`login logo        ${(loginLogo.length / 1024).toFixed(1)} KB of SVG`);
console.log(`domain constants  ${consts.length}  (${consts.map(x => x.name).slice(0, 8).join(', ')}…)`);
console.log(`pure functions    ${pure.length}`);
console.log(`written           ${path.relative(process.cwd(), OUT)}  ${(out.length / 1024).toFixed(1)} KB`);
