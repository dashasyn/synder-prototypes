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

// Evidence mode differs by lens because "reproduce it" doesn't apply uniformly.
//   interaction — the finding is a behaviour: name the action and what happened.
//   artifact    — the finding is a string on screen: quote it exactly and cite the
//                 authority it violates (vocabulary.md line, accounting rule,
//                 reference frame). Checkable the same way: the quote either
//                 appears on the page or it doesn't.
const SPEC = {
  ux:       { prefix: 'UX',   cap: 5, evidence: 'interaction' },
  domain:   { prefix: 'DOM',  cap: 3, evidence: 'artifact'    },
  clarity:  { prefix: 'CLR',  cap: 3, evidence: 'artifact'    },
  fidelity: { prefix: 'FID',  cap: 5, evidence: 'artifact'    },
  trust:    { prefix: 'TRU',  cap: 4, evidence: 'interaction' },
  a11y:     { prefix: 'A11Y', cap: 4, evidence: 'interaction' },
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
    expected: slots.map(s => ({ ...s, cap: SPEC[s.validator].cap, prefix: SPEC[s.validator].prefix, evidence: SPEC[s.validator].evidence })),
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
      k => !['validator', 'round', 'target', 'checked', 'findings', 'gaps', 'reference_gaps'].includes(k)
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
      // evidence is checkable. This is the real filter.
      const ev = f.evidence || {};
      const mode = slot.evidence || SPEC[slot.validator].evidence;
      if (mode === 'interaction') {
        if (!ev.action || !ev.observed) {
          problems.push(`UNEVIDENCED · ${at}: needs evidence.action (what was done) and evidence.observed (what happened) — drop the finding if it cannot be reproduced`);
        }
      } else {
        if (!ev.quote || !ev.source) {
          problems.push(`UNEVIDENCED · ${at}: needs evidence.quote (the exact text on screen) and evidence.source (the authority it violates — vocabulary.md line, accounting rule, or reference frame)`);
        }
      }
    });

    if (Array.isArray(payload.gaps) && payload.gaps.length) {
      payload.gaps.forEach(g => console.log(`  note · ${label} reported a state-map gap: ${g}`));
    }
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

// ── statemap ────────────────────────────────────────────────────────────────
// Verifies the recon pass actually exercised what it claims to cover, BEFORE
// validators are spawned. RECON-2: the map said the date panel "opens", nobody
// picked a date, and picking one closes the panel before Apply is reachable.
// Every validator downstream was blind to it — they read the map, not the page.
// The commit-path rule was prose in Step 3 with nothing checking it, which is
// the same shape as PROC-1. This is the check.
function statemap(argv) {
  const dir = argv[0];
  if (!dir) die('statemap needs a round directory');
  const p = path.join(dir, 'statemap.json');
  if (!fs.existsSync(p)) {
    die(`no statemap.json in ${dir} — Step 3 recon never produced a map, so nothing downstream can be trusted.`);
  }

  let map;
  try {
    map = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    die(`statemap.json is unparseable: ${e.message}`);
  }

  const problems = [];
  const controls = [];

  // Accept either a flat controls array or zone-grouped controls.
  if (Array.isArray(map.controls)) controls.push(...map.controls);
  if (Array.isArray(map.zones)) {
    for (const z of map.zones) {
      if (Array.isArray(z.controls)) {
        controls.push(...z.controls.map(c => ({ ...c, zone: c.zone || z.zone || z.name })));
      }
    }
  }

  if (!controls.length) {
    die('statemap.json records no controls — either the map is empty or the shape is wrong (expected `controls[]` or `zones[].controls[]`).');
  }

  const notExercised = Array.isArray(map.not_exercised) ? map.not_exercised : null;
  if (!notExercised) {
    problems.push('NO GAP LIST · `not_exercised` array missing — an untested control must not look like a tested one that passed. Use [] if everything was exercised.');
  }
  const excused = new Set(
    (notExercised || []).map(e => (typeof e === 'string' ? e : e.control || e.label || '')).filter(Boolean)
  );

  // A control that opens a panel needs a commit path: open → pick/toggle →
  // reach Apply. "It opens" is not coverage.
  const OPENS = /panel|dropdown|select|menu|popover|sheet|modal|picker|accordion|combobox/i;
  const stats = { total: controls.length, openers: 0, committed: 0, excused: 0, stateOnly: 0 };

  for (const c of controls) {
    const label = c.label || c.name || c.selector || '(unlabelled control)';
    const where = c.zone ? `${c.zone} · ${label}` : label;
    const type = String(c.type || '');
    const opensPanel = c.opens_panel === true || OPENS.test(type) || OPENS.test(label);

    if (!opensPanel) continue;
    stats.openers++;

    if (excused.has(label)) { stats.excused++; continue; }

    const committed = c.commit_path && (c.commit_path.picked || c.commit_path.toggled);
    const reachedApply = c.commit_path && c.commit_path.reached_apply !== undefined;
    const repeated = c.commit_path && c.commit_path.second_interaction !== undefined;

    if (!c.commit_path) {
      problems.push(`NO COMMIT PATH · ${where}: opens a panel but no \`commit_path\` recorded. Open it, pick or toggle something, then try to reach Apply — twice. (RECON-2)`);
      continue;
    }
    if (!committed) {
      problems.push(`OPEN ONLY · ${where}: \`commit_path\` records no picked/toggled option. "It opens" is not coverage.`);
      continue;
    }
    if (!reachedApply) {
      problems.push(`APPLY UNVERIFIED · ${where}: picked an option but never recorded whether Apply was reachable afterwards — this is the exact RECON-2 failure.`);
      continue;
    }
    if (!repeated) {
      problems.push(`SINGLE PASS · ${where}: interacted once. PROTO-2 (multiselect closing on the *second* toggle) only appears on repeat — record \`second_interaction\`.`);
      continue;
    }
    stats.committed++;

    // Liveness, not element state. isChecked() passes inside a closed panel.
    if (c.commit_path.still_visible === undefined && c.commit_path.still_clickable === undefined) {
      problems.push(`STATE NOT LIVENESS · ${where}: records no \`still_visible\`/\`still_clickable\` after interaction. Element state passes against controls inside a closed panel (PROTO-1, PROTO-2).`);
      stats.stateOnly++;
    }
  }

  console.log(`\nStatemap · ${dir}`);
  console.log('─'.repeat(60));
  console.log(`  controls recorded      ${stats.total}`);
  console.log(`  panel-opening controls ${stats.openers}`);
  console.log(`  commit path exercised  ${stats.committed}`);
  console.log(`  declared not_exercised ${excused.size}`);
  console.log('─'.repeat(60));

  if (problems.length) {
    console.log(`\n${problems.length} problem(s):\n`);
    problems.forEach(x => console.log(`  • ${x}`));
    console.log('\nFAIL — do not spawn validators. They read this map, not the page:');
    console.log('       an unexercised interaction is invisible to every lens downstream.\n');
    process.exit(1);
  }
  console.log('\nPASS — every panel-opening control has a commit path or a declared reason.\n');
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'manifest') writeManifest(rest);
else if (cmd === 'statemap') statemap(rest);
else if (cmd === 'verify') verify(rest);
else {
  console.log('usage:');
  console.log('  node scripts/validator-check.js manifest <round-dir> --target <t> --round <n> --expect ux,ux,ux,domain,clarity,trust,a11y');
  console.log('  node scripts/validator-check.js statemap <round-dir>   # run after Step 3, before spawning');
  console.log('  node scripts/validator-check.js verify <round-dir>');
  process.exit(2);
}
