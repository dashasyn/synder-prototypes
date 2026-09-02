/* Calibration scoring for the PROTO-2 regression case.

   Lays every arm's findings side by side against the reproduced ground truth so the
   hit/miss/false-positive call is made by reading, not by keyword matching. Keywords only
   *flag candidates* — a match is never scored automatically, because "the panel closes" and
   "the panel closes before Apply is reachable" are different findings and only one is BUG-B.

   Arms:
     v1  .synder-state/regression/PROTO-2/round-v1/ux.json   (2026-08-20, v1 prompt)
     v2  .synder-state/regression/PROTO-2/round-v2/ux.json   (2026-08-20, v2 prompt, blind map)
     C1  .synder-state/regression/PROTO-2/round-cal-C1/ux.json (current prompt, blind map)
     C2  .synder-state/regression/PROTO-2/round-cal-C2/ux.json (current prompt, commit-path map)
*/
const fs = require('fs'), path = require('path');
const R = '.synder-state/regression/PROTO-2';
const ARMS = [
  ['v1', `${R}/round-v1/ux.json`, 'v1 prompt · blind map'],
  ['v2', `${R}/round-v2/ux.json`, 'v2 prompt · blind map'],
  ['C1', `${R}/round-cal-C1/ux.json`, 'current prompt · blind map'],
  ['C2', `${R}/round-cal-C2/ux.json`, 'current prompt · commit-path map'],
];
const CAND = {
  'BUG-A (multiselect 2nd toggle)': /second (toggle|selection|click)|multiselect|two options|more than one platform/i,
  'BUG-B (date panel closes pre-Apply)': /date|90 days|single-select|Last 30/i,
  'FALSE-1 (chip has an ×)': /×|remove control|chip.{0,20}(remove|close)|dismiss the chip/i,
};

const gt = JSON.parse(fs.readFileSync(`${R}/round-cal-C2/groundtruth.json`, 'utf8'));
console.log('══ REPRODUCED GROUND TRUTH ══');
for (const [k, v] of Object.entries(gt)) {
  const verdict = k.startsWith('FALSE') ? `v1 claim true? ${v.v1_claim_true}` : `reproduced: ${v.reproduced}`;
  console.log(`  ${k.padEnd(9)} ${verdict.padEnd(24)} ${v.claim || v.claim_by_v1_arm}`);
}

for (const [id, file, desc] of ARMS) {
  console.log(`\n══ ARM ${id} — ${desc} ══`);
  if (!fs.existsSync(file)) { console.log('  (no payload)'); continue; }
  let p; try { p = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.log('  UNPARSEABLE:', e.message); continue; }
  const f = p.findings || [];
  console.log(`  findings ${f.length} · checked ${(p.checked || []).length} · gaps ${(p.gaps || []).length}` +
    `${Array.isArray(p.checked) ? '' : ' · NO checked ARRAY'}`);
  f.forEach(x => {
    const flags = Object.entries(CAND).filter(([, re]) =>
      re.test([x.element, x.finding, x.user_impact, x.evidence && x.evidence.action, x.evidence && x.evidence.observed].join(' '))
    ).map(([k]) => k.split(' ')[0]);
    console.log(`\n  ── ${x.id} [${x.severity} ${x.confidence}] ${flags.length ? 'candidate→ ' + flags.join(',') : ''}`);
    console.log(`     element : ${x.element}`);
    console.log(`     finding : ${x.finding}`);
    if (x.evidence) {
      console.log(`     action  : ${x.evidence.action || '(none)'}`);
      console.log(`     observed: ${x.evidence.observed || '(none)'}`);
    } else console.log('     evidence: NONE');
  });
  if ((p.gaps || []).length) {
    console.log('\n  declared gaps:');
    p.gaps.forEach(g => console.log(`     • ${g}`));
  }
}
