#!/usr/bin/env node
/**
 * gd-prove-gates.cjs — put each bug back and check the gate fires.
 *
 * MUI_PORT_BRIEF.md §5: "Prove a gate by reintroducing the bug. A gate you
 * have never seen fail is not a gate you know works." Every mutation below
 * is a real bug that shipped once.
 *
 * Copies the port to a scratch directory, breaks one thing, runs
 * verify-gd-mui.cjs against the copy, and asserts the run fails with the
 * expected message. Never touches the real project.
 *
 * Needs the static server that serves the workspace root on :8777.
 * Usage: node scripts/gd-prove-gates.cjs
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC = path.resolve(__dirname, '../projects/grunddaten-mui');
const ROOT = path.resolve(__dirname, '..');
const SCRATCH = path.join(ROOT, '.gate-proof');          // served, so it must live under the root
const URL = 'http://localhost:8777/.gate-proof/index.html';

const MUTATIONS = [
  {
    name: 'layout gate — the page squeezed into a third of the window',
    why: '183 assertions once passed while the page was a third of the window wide',
    file: 'index.html',
    apply: s => s.replace('html, body, #root { height: 100%; margin: 0; }',
                          'html, body, #root { height: 100%; margin: 0; } #root { width: 33%; }'),
    expect: /full viewport width/,
  },
  {
    name: 'raw i18n key rendered as if it were a label',
    why: 't() returns the key on a miss, and snake_case looks like a label',
    file: 'views-stations.js',
    apply: s => s.replace("t('stations')", "t('stations_list_heading')"),
    expect: /raw i18n key/,
  },
  {
    name: "t('x') || 'fallback' — the fallback that never fires",
    why: 'a key is truthy, so the || branch is dead. This shipped three times',
    file: 'views-stations.js',
    apply: s => s.replace("t('colName')", "t('colName') || 'Name'"),
    expect: /no t\('x'\) \|\| 'fallback'/,
  },
  {
    name: 'the Material Icons font not loading',
    why: 'without it every icon renders as the literal word "chevron_right"',
    file: 'index.html',
    apply: s => s.replace(/<link href="https:\/\/fonts.googleapis.com\/icon[^>]*>/, ''),
    expect: /glyph, not as its ligature name|Material Icons font actually loaded/,
  },
  {
    name: 'an "All" option back in a dropdown',
    why: 'empty means everything; "All" was removed and the label replaced it',
    file: 'views-stations.js',
    apply: s => s.replace('options=${lineOptions}',
                          "options=${[{ value: 'all', label: state.lang === 'de' ? 'Alle Linien' : 'All lines' }, ...lineOptions]}")
                 .replace("value=${s.lineFilter}", "value=${s.lineFilter || 'all'}"),
    expect: /"All" value/,
  },
  {
    name: 'a card given back its shadow',
    why: 'flat is the house style — cards and buttons, measured off ETC\'s UI',
    file: 'ui.js',
    apply: s => s.replace("MuiCard:        { defaultProps: { variant: 'outlined' },",
                          "MuiCard:        { defaultProps: { variant: 'elevation', elevation: 3 },"),
    expect: /cards carry no shadow|1px #E7E7E7 hairline/,
  },
];

const copyDir = (from, to) => {
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    if (fs.statSync(path.join(from, f)).isDirectory()) continue;
    fs.copyFileSync(path.join(from, f), path.join(to, f));
  }
};

let proved = 0; const unproved = [];

// the unmutated copy must pass, or nothing below means anything
copyDir(SRC, SCRATCH);
try {
  execFileSync('node', [path.join(__dirname, 'verify-gd-mui.cjs'), URL],
    { env: { ...process.env, GD_DIR: SCRATCH }, encoding: 'utf8', stdio: 'pipe' });
  console.log('baseline          the untouched copy passes\n');
} catch (e) {
  console.error('BASELINE FAILED — fix the port before proving gates:\n' + (e.stdout || e.message));
  fs.rmSync(SCRATCH, { recursive: true, force: true });
  process.exit(1);
}

for (const m of MUTATIONS) {
  copyDir(SRC, SCRATCH);
  const p = path.join(SCRATCH, m.file);
  const before = fs.readFileSync(p, 'utf8');
  const after = m.apply(before);
  if (after === before) { unproved.push(`${m.name} — the mutation did not apply`); continue; }
  fs.writeFileSync(p, after);

  let out = '';
  let failed = false;
  try {
    execFileSync('node', [path.join(__dirname, 'verify-gd-mui.cjs'), URL],
      { env: { ...process.env, GD_DIR: SCRATCH }, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) { failed = true; out = (e.stdout || '') + (e.stderr || ''); }

  if (failed && m.expect.test(out)) { proved++; console.log(`proved            ${m.name}`); }
  else if (!failed) unproved.push(`${m.name} — the gate did NOT fire`);
  else unproved.push(`${m.name} — failed, but not with the expected message`);
}

fs.rmSync(SCRATCH, { recursive: true, force: true });
console.log(`\n${proved}/${MUTATIONS.length} gates proved by reintroducing the bug`);
unproved.forEach(u => console.log('  ✗ ' + u));
process.exit(unproved.length ? 1 : 0);
