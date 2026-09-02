/* Assembles one prompt file per (round, lens) from the gated state map.
   Step 6 of VALIDATOR_PROTOCOL: each agent gets its slice and nothing more.
   Usage: node scripts/build-validator-prompts.cjs <round-dir> */
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) { console.error('usage: build-validator-prompts.cjs <round-dir>'); process.exit(2); }
const R = path.resolve(dir);
const map = JSON.parse(fs.readFileSync(path.join(R, 'statemap.json'), 'utf8'));
const log = JSON.parse(fs.readFileSync(path.resolve(R, '..', 'findings-log.json'), 'utf8'));
const OUTD = path.join(R, 'prompts');
fs.mkdirSync(OUTD, { recursive: true });

const PRODUCT = c => c.zone !== 'prototype chrome';
const zone = (...zs) => map.controls.filter(c => zs.includes(c.zone));
const fmt = list => list.map(c =>
  `- [${c.zone}] ${c.type} — "${String(c.label).replace(/\s+/g, ' ').trim()}"\n    on interaction: ${c.after_interaction}` +
  (c.commit_path ? `\n    commit path: ${JSON.stringify(c.commit_path)}` : '')).join('\n');

const notEx = map.not_exercised.length
  ? map.not_exercised.map(n => `- ${n.control} — ${n.reason}`).join('\n')
  : '- (none)';

const resolved = (log.resolved && log.resolved.length)
  ? log.resolved.map(r => '- ' + (r.summary || r.finding || JSON.stringify(r))).join('\n')
  : '- (nothing resolved yet — this is the first round on this variant)';

const target = map.target;
const url = /v4/.test(target)
  ? 'projects/payment-application-v4/gsp.html (the overlay lives in projects/payment-application-v4/overlay.html)'
  : path.relative(process.cwd(), path.join(R, 'target.html'));

const FRICTION = `- Users repeatedly re-open a settings panel to check whether their change was saved: no
  persistent confirmation of the saved state.
- Users toggle a setting, see no immediate effect anywhere on screen, and toggle it back.
- Users abandon a multi-field setup when a field's required-ness only becomes clear on submit.`;

const LENSES = {
  ux1: { file: 'ux-validator.md', slice: () => zone('how to match', 'narrow the search'), extra: '' },
  ux2: { file: 'ux-validator.md', slice: () => zone('then refine', 'outcomes'), extra: '' },
  ux3: { file: 'ux-validator.md', slice: () => zone('gsp settings', 'overlay chrome'), extra: '' },
  domain: { file: 'domain-validator.md', slice: () => zone('narrow the search', 'then refine', 'outcomes'), vocab: true },
  clarity: { file: 'clarity-validator.md', slice: () => map.controls.filter(PRODUCT), vocab: true },
  fidelity: { file: 'fidelity-validator.md', slice: () => map.controls.filter(PRODUCT), vocab: true, ref: true },
  trust: { file: 'trust-validator.md', slice: () => map.controls, whole: true },
  a11y: { file: 'a11y-validator.md', slice: () => map.controls, whole: true },
};

for (const [key, L] of Object.entries(LENSES)) {
  const spec = fs.readFileSync(path.resolve(__dirname, '../personas/validators/', L.file), 'utf8');
  const out = path.join(R, key + '.json');
  const body = `You are running as a validator under the specification below. Follow it exactly.
Write your strict JSON payload to this exact path, and output nothing else to the user:

  ${path.relative(process.cwd(), out)}

Use \`validator: "${key.replace(/\d$/, '')}"\`, \`round: 1\`, \`target: "${target}"\`.
Allowed top-level keys only: validator, round, target, checked, findings, gaps, reference_gaps.
The \`checked\` array is mandatory and must list what you actually inspected.

================ VALIDATOR SPECIFICATION ================
${spec}
================ END SPECIFICATION ================

## Primary task
${map.primary_task}

## Target
${target}
Prototype file (read it only if the state map below does not cover something you need):
  ${url}

## Your slice of the state map${L.whole ? ' (whole map — your failures are cross-zone by nature)' : ''}
Recorded ${map.recorded}. Environment: page behind the overlay inert while open = ${map.environment.page_behind_inert_while_open}; JS errors during recon = ${map.environment.js_errors}.

${fmt(L.slice())}

## Not exercised during recon (do not treat as passing)
${notEx}
${L.vocab ? `
## Canonical terminology
Read \`vocabulary.md\` in the workspace root and hold the copy to it.` : ''}${L.ref ? `
## Reference
Read \`${path.relative(process.cwd(), path.join(R, 'reference.json'))}\` — the FDD extract for SD-16243
Iteration 1 (normative rules R1–R27, open questions Q1–Q6). Judge the screen against those rules
only. Where the FDD is silent, that is a \`reference_gaps\` entry, not a finding.` : ''}

## Known real friction to check against
${FRICTION}

## Already resolved (do not re-flag)
${resolved}

## Known issues to ignore
- The presenter bar / admin toggle is prototype chrome, not product UI.
- Wording marked in the UI as an assumption (A1–A6) is awaiting a product decision; flag it only
  if the assumption itself would mislead a user, not merely because it is provisional.

Return the strict JSON payload by writing the file. Return NOTHING else.
`;
  fs.writeFileSync(path.join(OUTD, key + '.txt'), body);
}
console.log('prompts written to ' + path.relative(process.cwd(), OUTD) + ': ' + Object.keys(LENSES).join(', '));
