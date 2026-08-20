#!/usr/bin/env node
/**
 * validator-check.js — protocol health check for validator rounds.
 *
 * Why this exists: every volume-control rule in VALIDATOR_PROTOCOL.md used to be
 * an instruction in a markdown file. Nothing verified them, so on 2026-08-03 a
 * round produced 145 findings against a cap of 20, the Trust validator never ran
 * at all, and nobody noticed for two weeks. Instructions are not enforcement.
 *
 * Usage:
 *   node scripts/validator-check.js manifest <round-dir> --target <url-or-path> \
 *        --round <n> --expect ux,ux,ux,domain,clarity,trust,a11y
 *   node scripts/validator-check.js verify <round-dir>
 *
 * verify exits 1 if anything is missing, malformed, over cap, or unevidenced.
 */

const fs = require('fs');
const path = require('path');

const SPEC = {
  ux:       { prefix: 'UX',   cap: 5 },
  domain:   { prefix: 'DOM',  cap: 3 },
  clarity:  { prefix: 'CLR',  cap: 3 },
  fidelity: { prefix: 'FID',  cap: 5 },
  trust:    { prefix: 'TRU',  cap: 4 },
  a11y:     { prefix: 'A11Y', cap: 4 },
};
const CONFIDENCE_FLOOR = 70;
const SEVERITIES = ['Critical', 'High', 'Medium'];

function die(msg) { console.error(`error: ${msg}`); process.exit(2); }

function arg(argv, name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith('--')) die(`--${name} needs a value`);
  return v;
}

/* ---------------------------------------------------------------- manifest */
// Declares what the round is supposed to produce, BEFORE any agent is spawned.
// Without a declared expectation, a missing validator is undetectable — which is
// exactly how Trust stayed silent.
function writeManifest(argv) {
  const dir = argv[0];
  if (!dir) die('manifest needs a round directory');
  const expect = arg(argv, 'expect', '').split(',').map(s => s.trim()).filter(Boolean);
  if (!expect.length) die('--expect is required (e.g. ux,ux,ux,domain,clarity,trust,a11y)');

  const unknown = expect.filter(v => !SPEC[v]);
  if (unknown.length) die(`unknown validator(s): ${unknown.join(', ')}`);

  // repeated lens (e.g. ux x3) => ux1, ux2, ux3
  const counts = {};
  expect.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const slots = [];
  const seen = {};
  for (const v of expect) {
    if (counts[v] > 1) {
      seen[v] = (seen[v] || 0) + 1;
      slots.push({ validator: v, file: `${v}${seen[v]}.json` });
    } else {
      slots.push({ validator: v, file: `${v}.json` });
    }
  }

  fs.mkdirSync(dir, { recursive: true });
  const manifest = {
    round: Number(arg(argv, 'round', '1')),
    target: arg(argv, 'target', ''),
    confidence_floor: CONFIDENCE_FLOOR,
    expected: slots.map(s => ({ ...s, cap: SPEC[s.validator].cap, prefix: SPEC[s.validator].prefix })),
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`manifest written: ${path.join(dir, 'manifest.json')}`);
  console.log(`expecting ${slots.length} payload(s): ${slots.map(s => s.file).join(', ')}`);
}

/* ------------------------------------------------------------------ verify */
function verify(argv) {
  const dir = argv[0];
  if (!dir) die('verify needs a round directory');
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    die(`no manifest.json in ${dir} — the round was never declared, so completeness cannot be checked. Run "manifest" before spawning validators.`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const problems = [];
  const summary = [];

  for (const slot of manifest.expected) {
    const file = path.join(dir, slot.file);
    const label = slot.file.replace(/\.json$/, '');

    if (!fs.existsSync(file)) {
      problems.push(`MISSING · ${label} was expected and never produced output`);
      summary.push({ label, status: 'missing', findings: 0, checked: 0 });
      continue;
    }

    let payload;
    try {
      payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      problems.push(`UNPARSEABLE · ${label}: ${e.message}`);
      summary.push({ label, status: 'unparseable', findings: 0, checked: 0 });
      continue;
    }

    if (payload.validator !== slot.validator) {
      problems.push(`WRONG LENS · ${label}: payload says "${payload.validator}", expected "${slot.validator}"`);
    }
    if (!Array.isArray(payload.findings)) {
      const hint = payload.per_prototype
        ? ' — found a "per_prototype" wrapper; the contract is one payload per validator per target, so split multi-variant reviews into one round per variant'
        : '';
      problems.push(`SCHEMA · ${label}: "findings" must be an array${hint}`);
      summary.push({ label, status: 'bad-schema', findings: 0, checked: 0 });
      continue;
    }
    // Coverage: a validator that inspected nothing and one that inspected
    // everything both return []. `checked` is what tells them apart.
    if (!Array.isArray(payload.checked)) {
      problems.push(`NO COVERAGE · ${label}: "checked" array missing — cannot tell an empty result from an unexamined one`);
    } else if (payload.checked.length === 0) {
      problems.push(`NO COVERAGE · ${label}: "checked" is empty`);
    }

    const extraKeys = Object.keys(payload).filter(
      k => !['validator', 'round', 'target', 'checked', 'findings'].includes(k)
    );
    if (extraKeys.length) {
      problems.push(`SCHEMA DRIFT · ${label}: unexpected top-level key(s) ${extraKeys.join(', ')} (flat contract only — no per_prototype wrappers)`);
    }

    if (payload.findings.length > slot.cap) {
      problems.push(`OVER CAP · ${label}: ${payload.findings.length} findings, cap is ${slot.cap}`);
    }

    const idRe = new RegExp(`^${slot.prefix}-\\d+$`);
    payload.findings.forEach((f, i) => {
      const at = `${label}[${i}]`;
      if (!idRe.test(f.id || '')) {
        problems.push(`BAD ID · ${at}: "${f.id}" must match ${slot.prefix}-<number> (no variant suffixes)`);
      }
      if (!SEVERITIES.includes(f.severity)) {
        problems.push(`BAD SEVERITY · ${at}: "${f.severity}" not one of ${SEVERITIES.join('/')}`);
      }
      if (typeof f.confidence !== 'number' || f.confidence < CONFIDENCE_FLOOR) {
        problems.push(`BELOW FLOOR · ${at}: confidence ${f.confidence} < ${CONFIDENCE_FLOOR}`);
      }
      for (const req of ['element', 'finding', 'user_impact', 'suggested_fix']) {
        if (!f[req] || !String(f[req]).trim()) {
          problems.push(`INCOMPLETE · ${at}: "${req}" is empty`);
        }
      }
      // The evidence gate. A confidence score is self-reported and uncalibrated;
      // a reproduction step is checkable. This is the real filter.
      const ev = f.evidence;
      if (!ev || !ev.action || !ev.observed) {
        problems.push(`UNEVIDENCED · ${at}: needs evidence.action (what was done) and evidence.observed (what happened) — drop the finding if it cannot be reproduced`);
      }
    });

    summary.push({
      label,
      status: 'ok',
      findings: payload.findings.length,
      checked: Array.isArray(payload.checked) ? payload.checked.length : 0,
    });
  }

  // The check must also verify its own downstream artifact — same failure class,
  // one level up. A log that was never written looks exactly like a clean round.
  const logPath = path.join(dir, '..', 'findings-log.json');
  if (!fs.existsSync(logPath)) {
    problems.push(`NO LOG · findings-log.json missing at ${path.resolve(logPath)} — delta mode and the never-re-flag rule cannot work, so every round is a cold re-review`);
  } else {
    // An empty or unparseable log is indistinguishable from a clean one at a glance.
    try {
      const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      if (!log || typeof log !== 'object' || !Array.isArray(log.resolved)) {
        problems.push(`BAD LOG · findings-log.json has no "resolved" array — round 2 cannot run as a delta`);
      } else if (manifest.round > 1 && log.resolved.length === 0) {
        problems.push(`EMPTY LOG · this is round ${manifest.round} but findings-log.json records nothing resolved — either nothing was applied, or the log was never written`);
      }
    } catch (e) {
      problems.push(`BAD LOG · findings-log.json is unparseable: ${e.message}`);
    }
  }
  // The round directory itself must hold the recon artifact everything downstream reads.
  if (!fs.existsSync(path.join(dir, 'statemap.json'))) {
    problems.push(`NO STATE MAP · statemap.json missing in ${dir} — validators were given raw HTML or nothing, which is the condition v2 exists to prevent`);
  }

  console.log(`\nRound ${manifest.round} · ${manifest.target || '(no target recorded)'}`);
  console.log('─'.repeat(60));
  for (const s of summary) {
    const line = s.status === 'ok'
      ? `${s.findings} finding(s), ${s.checked} item(s) inspected`
      : s.status.toUpperCase();
    console.log(`  ${s.label.padEnd(12)} ${line}`);
  }
  const total = summary.reduce((n, s) => n + s.findings, 0);
  console.log('─'.repeat(60));
  console.log(`  total findings: ${total}`);

  if (problems.length) {
    console.log(`\n${problems.length} problem(s):\n`);
    problems.forEach(p => console.log(`  • ${p}`));
    console.log('\nFAIL — do not report these findings until the problems above are resolved.\n');
    process.exit(1);
  }
  console.log('\nPASS — round is complete, within caps, evidenced, and schema-clean.\n');
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'manifest') writeManifest(rest);
else if (cmd === 'verify') verify(rest);
else {
  console.log('usage:');
  console.log('  node scripts/validator-check.js manifest <round-dir> --target <t> --round <n> --expect ux,ux,ux,domain,clarity,trust,a11y');
  console.log('  node scripts/validator-check.js verify <round-dir>');
  process.exit(2);
}
