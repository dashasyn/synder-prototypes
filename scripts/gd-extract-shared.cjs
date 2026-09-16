#!/usr/bin/env node
/**
 * gd-extract-shared.cjs — pull the domain data, the i18n table and the pure
 * logic OUT of the vanilla Grunddaten editor and into the two modules the
 * React/MUI port consumes.
 *
 * Same rule as the Q-Explorer port (MUI_PORT_BRIEF.md §4): nothing is
 * retyped. Ignat, 2026-09-15 — "Now you lost almost all logic." Re-run this
 * script to resync; projects/grunddaten-editor/index.html is never modified.
 *
 *   projects/grunddaten-mui/i18n.js  ← the i18n table + t() + the lang state
 *   projects/grunddaten-mui/data.js  ← domain constants + pure functions
 *
 * Three gates, each because the Q-Explorer port shipped broken without it:
 *   1. completeness  — every top-level const either travels or is on SKIP
 *   2. resolvability — every function a carried function calls is defined
 *   3. self-check    — execute the written file and READ A ROW from every
 *                      record set, then run the real logic entry points
 *
 * Usage: node scripts/gd-extract-shared.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC       = path.resolve(__dirname, '../projects/grunddaten-editor/index.html');
const OUT_DIR   = path.resolve(__dirname, '../projects/grunddaten-mui');
const OUT_DATA  = path.join(OUT_DIR, 'data.js');
const OUT_I18N  = path.join(OUT_DIR, 'i18n.js');

const src = fs.readFileSync(SRC, 'utf8');
const js  = src.slice(src.lastIndexOf('<script>') + 8, src.lastIndexOf('</script>'));

/**
 * Match a balanced {...}, [...] or (...) starting at `from`.
 * Skips strings, template literals, comments AND regex literals — a `)`
 * inside a regex literal counts as a closer otherwise and truncates the output.
 */
function balanced(text, from) {
  const open = text[from];
  const close = open === '{' ? '}' : open === '[' ? ']' : ')';
  let depth = 0;
  const REGEX_OK = '(,=:[!&|?{};+-*%~^<>';
  let prev = '';
  for (let i = from; i < text.length; i++) {
    const c = text[i];

    if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && text[i + 1] === '*') { i += 2; while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i++; continue; }

    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < text.length) { if (text[i] === '\\') i++; else if (text[i] === q) break; i++; }
      prev = q; continue;
    }
    // template literals nest ${ } which may itself contain quotes and braces
    if (c === '`') {
      i++;
      let td = 0;
      while (i < text.length) {
        if (text[i] === '\\') { i++; }
        else if (text[i] === '$' && text[i + 1] === '{') { td++; i++; }
        else if (text[i] === '}' && td > 0) { td--; }
        else if (text[i] === '`' && td === 0) break;
        i++;
      }
      prev = '`'; continue;
    }

    if (c === '/' && REGEX_OK.includes(prev)) {
      i++; let inClass = false;
      while (i < text.length) {
        if (text[i] === '\\') i++;
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

/**
 * Take a whole statement starting at `from`, up to the top-level `;`.
 *
 * Regex-aware for the same reason balanced() is, and it cost a run to learn
 * it twice: `esc` ends `.replace(/"/g, '&quot;')`, and a scanner that treats
 * that `"` as the start of a string runs on to the next quote 2,800 lines
 * later, swallowing half the file into one constant.
 */
function statement(text, from) {
  let depth = 0, i = from, prev = '';
  const REGEX_OK = '(,=:[!&|?{};+-*%~^<>';
  for (; i < text.length; i++) {
    const ch = text[i];

    if (ch === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (ch === '/' && text[i + 1] === '*') { i += 2; while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i++; continue; }

    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch; i++;
      while (i < text.length) { if (text[i] === '\\') i++; else if (text[i] === q) break; i++; }
      prev = q; continue;
    }

    if (ch === '/' && REGEX_OK.includes(prev)) {
      i++; let inClass = false;
      while (i < text.length) {
        if (text[i] === '\\') i++;
        else if (text[i] === '[') inClass = true;
        else if (text[i] === ']') inClass = false;
        else if (text[i] === '/' && !inClass) break;
        i++;
      }
      prev = '/'; continue;
    }

    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    else if (ch === ';' && depth === 0) break;
    if (!/\s/.test(ch)) prev = ch;
  }
  return text.slice(from, i).trim();
}

/* ── 1. the i18n table and t(), lifted verbatim ───────────────────── */
let i18nBody, tSrc;
{
  const m = js.match(/^const i18n\s*=\s*/m);
  if (!m) { console.error('i18n table not found'); process.exit(1); }
  i18nBody = balanced(js, m.index + m[0].length);
  if (!i18nBody) { console.error('i18n table did not close'); process.exit(1); }

  const f = js.match(/^function t\(([^)]*)\)\s*\{/m);
  const body = balanced(js, f.index + f[0].length - 1);
  tSrc = `function t(${f[1]}) ${body}`;
}

const langCount = (() => {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext('var i18n = ' + i18nBody + ';', ctx);
  return Object.fromEntries(Object.keys(ctx.i18n).map(l => [l, Object.keys(ctx.i18n[l]).length]));
})();

/* ── 2. the domain constants ──────────────────────────────────────── */
// Only the domain model travels. The rest is either React's job or DOM plumbing.
const SKIP = new Set([
  'state',      // view state — React owns it
  'i18n',       // goes to i18n.js instead
  'dragCtx',    // HTML5 drag plumbing, rebuilt in React
]);

const consts = [];
const constRe = /^(?:const|let|var) ([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*/gm;
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
    if (first === '(') {                       // an IIFE needs its trailing call
      const after = js.slice(at + body.length).match(/^\s*\(\s*\)/);
      if (after) body += after[0];
    }
  } else {
    body = statement(js, at);                  // scalar or expression
  }
  consts.push({ name, body });
}

// A miss must be loud.
{
  const all = [...js.matchAll(/^(?:const|let|var) ([A-Za-z_$][A-Za-z0-9_$]*)\s*=/gm)].map(m => m[1]);
  const got = new Set(consts.map(x => x.name));
  const missed = all.filter(n => !got.has(n) && !SKIP.has(n));
  if (missed.length) {
    console.error('EXTRACTION INCOMPLETE — not carried across:', missed.join(', '));
    process.exit(1);
  }
}

/* ── 3. the pure functions ────────────────────────────────────────── */
// DOM-coupled render code does not travel; it is rewritten as React, view by
// view. Everything that is just logic over the data does.
const DOM = /document\.|getElementById|querySelector|innerHTML|classList|\.style\.|window\.|\balert\(|\bconfirm\(|setTimeout\(|requestAnimationFrame\(|\brender\(/;

const candidates = [];
const fnRe = /^function (\w+)\(([^)]*)\)\s*\{/gm;
let f;
while ((f = fnRe.exec(js))) {
  if (f[1] === 't') continue;                  // lives in i18n.js
  const body = balanced(js, f.index + f[0].length - 1);
  if (!body) continue;
  if (DOM.test(body)) continue;
  // reads view state other than the language → belongs to a React component
  const stateReads = [...body.matchAll(/\bstate\.(\w+)/g)].map(m => m[1]);
  if (stateReads.some(k => k !== 'lang')) continue;
  candidates.push({ name: f[1], params: f[2], body, src: `function ${f[1]}(${f[2]}) ${body}` });
}

/* Gate 2 — resolvability. A function that survives the DOM filter can still
   call one that did not (the vanilla's saveSchedule calls closeModal). Drop
   those, iterating until the set is closed, and report what went. A carried
   function that throws ReferenceError on first call is worse than a missing
   one, because it looks like it works. */
const BUILTIN = new Set([
  'String','Number','Boolean','Array','Object','Date','Math','JSON','Set','Map','RegExp',
  'parseInt','parseFloat','isNaN','isFinite','encodeURIComponent','decodeURIComponent',
  'console','Promise','Error','Symbol','BigInt','structuredClone','t','if','for','while',
  'switch','catch','return','typeof','function','of','in','new','do','else','case',
]);
const constNames = new Set(consts.map(x => x.name));

let pure = candidates.slice();
const dropped = [];
for (;;) {
  const defined = new Set([...pure.map(x => x.name), ...constNames, ...BUILTIN]);
  const bad = [];
  for (const fn of pure) {
    // identifiers used in call position, minus this function's own parameters
    // and anything bound inside it (params of inner arrows, locals)
    const localRe = /(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)|\(?\s*([A-Za-z_$][\w$]*)\s*\)?\s*=>/g;
    const locals = new Set(fn.params.split(',').map(s => s.trim().replace(/[.\s=].*$/, '')).filter(Boolean));
    let lm;
    while ((lm = localRe.exec(fn.body))) { if (lm[1]) locals.add(lm[1]); if (lm[2]) locals.add(lm[2]); }
    const calls = [...fn.body.matchAll(/(?:^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]);
    const missing = [...new Set(calls)].filter(n => !defined.has(n) && !locals.has(n));
    if (missing.length) bad.push({ fn, missing });
  }
  if (!bad.length) break;
  for (const b of bad) dropped.push({ name: b.fn.name, missing: b.missing });
  const badNames = new Set(bad.map(b => b.fn.name));
  pure = pure.filter(x => !badNames.has(x.name));
}

/* ── write i18n.js ────────────────────────────────────────────────── */
const i18nOut = `/* ══════════════════════════════════════════════════════════════════
   GENERATED — do not edit. Run: node scripts/gd-extract-shared.cjs

   The ${Object.entries(langCount).map(([l, n]) => `${n} ${l.toUpperCase()}`).join(' + ')} strings are lifted VERBATIM out of
   projects/grunddaten-editor/index.html. Re-translating them would be a way
   to introduce drift between the two prototypes for no benefit.

   t() is the vanilla's own implementation, not a second one that can drift
   from it. The React app drives the language through setDataLang(), so the
   extracted logic in data.js and the components share one lookup.
   ══════════════════════════════════════════════════════════════════ */

var i18n = ${i18nBody};

/* The only field of the vanilla's \`state\` the extracted logic reads. */
var state = { lang: 'de' };
function setDataLang(l) { state.lang = l; }

${tSrc}
`;
fs.writeFileSync(OUT_I18N, i18nOut);

/* ── write data.js ────────────────────────────────────────────────── */
const dataOut = `/* ══════════════════════════════════════════════════════════════════
   GENERATED — do not edit. Run: node scripts/gd-extract-shared.cjs

   Extracted from projects/grunddaten-editor/index.html so the React/MUI port
   and the vanilla prototype share one source of truth for the domain model.
   Re-run to resync; the vanilla file is never modified.

   ${consts.length} domain constants · ${pure.length} pure functions
   Depends on i18n.js for t() and state.lang — load it first.
   ══════════════════════════════════════════════════════════════════ */

${consts.map(x => `var ${x.name} = ${x.body};`).join('\n\n')}

${pure.map(x => x.src).join('\n\n')}
`;
fs.writeFileSync(OUT_DATA, dataOut);

/* ── Gate 3 — self-check: execute what was just written ───────────── */
{
  const ctx = { console };
  vm.createContext(ctx);
  try {
    vm.runInContext(i18nOut + '\n' + dataOut, ctx);
  } catch (e) {
    console.error('SELF-CHECK FAILED — generated files do not execute:', e.message);
    process.exit(1);
  }

  // Parsing proves nothing. Read a row out of every record set.
  const RECORD_SETS = ['soundFiles', 'specialSoundFiles', 'playlists', 'radioStreams',
                       'musicEvents', 'stationSchedules', 'specialAnnouncements',
                       'displayTexts', 'lineData', 'stations'];
  for (const name of RECORD_SETS) {
    const set = ctx[name];
    if (!Array.isArray(set) || !set.length) {
      console.error(`SELF-CHECK FAILED — record set ${name} is empty or missing`);
      process.exit(1);
    }
    try { JSON.stringify(set[0]); JSON.stringify(set[set.length - 1]); }
    catch (e) { console.error(`SELF-CHECK FAILED — ${name} row does not read:`, e.message); process.exit(1); }
  }

  // …and run the real logic entry points, in both languages.
  try {
    for (const lang of ['de', 'en']) {
      ctx.setDataLang(lang);
      const ev = ctx.musicEvents[0];
      ctx.evPeriod(ev); ctx.evStatus(ev); ctx.evKind(ev); ctx.srcRefName(ev.source);
      ctx.evConflicts(ev);
      ctx.evLineGroups(ev); ctx.evLineChips(ev); ctx.evSourceChip(ev);
      const sch = ctx.stationSchedules[0];
      ctx.entryTimes(sch.entries[0]); ctx.validityLabel(sch.entries[0]);
      ctx.schedKey(sch.stationId, sch.lineId);
      ctx.plDuration(ctx.playlists[0]);
      ctx.trackUsage(ctx.soundFiles.find(x => x.type === 'music').id);
      ctx.getStation(ctx.stations[0].id);
      ctx.schedSummary(ctx.stations.find(s => s.transferAnnouncements && s.transferAnnouncements.length)
        ?.transferAnnouncements[0] || { schedule: [] });
      ctx.findStationsUsingSound('SND-001');
      ctx.getLine('U2'); ctx.fmtDMY('2026-12-24'); ctx.dayLabel('Mon');
    }
    console.log('self-check        both files execute; every record set reads; logic runs in de+en');
  } catch (e) {
    console.error('SELF-CHECK FAILED — logic entry point threw:', e.stack);
    process.exit(1);
  }
}

console.log(`i18n              ${Object.entries(langCount).map(([l, n]) => `${n} ${l}`).join(' + ')} strings`);
console.log(`domain constants  ${consts.length}  (${consts.map(x => x.name).join(', ')})`);
console.log(`pure functions    ${pure.length}`);
if (dropped.length) {
  console.log(`not carried       ${dropped.length} (call DOM-coupled code — rewritten as React):`);
  for (const d of dropped) console.log(`                  ${d.name} → ${d.missing.join(', ')}`);
}
console.log(`written           ${path.relative(process.cwd(), OUT_I18N)}  ${(i18nOut.length / 1024).toFixed(1)} KB`);
console.log(`written           ${path.relative(process.cwd(), OUT_DATA)}  ${(dataOut.length / 1024).toFixed(1)} KB`);
