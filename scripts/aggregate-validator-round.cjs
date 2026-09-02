/* Step 8 aggregation + Step 9/10 report for one round.
   Usage: node scripts/aggregate-validator-round.cjs <round-dir> [--title "..."]

   Order is the protocol's: AUTO findings first, Critical/High kept, Medium to a
   polish list, deduplicated by element across lenses, and anything two lenses
   hit independently ranked first and tagged corroborated.
*/
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) { console.error('usage: aggregate-validator-round.cjs <round-dir> [--title "..."]'); process.exit(2); }
const ti = process.argv.indexOf('--title');
const R = path.resolve(dir);
const manifest = JSON.parse(fs.readFileSync(path.join(R, 'manifest.json'), 'utf8'));
const auto = JSON.parse(fs.readFileSync(path.join(R, 'auto-findings.json'), 'utf8')).findings || [];
const map = JSON.parse(fs.readFileSync(path.join(R, 'statemap.json'), 'utf8'));
const title = ti > 0 ? process.argv[ti + 1] : map.target;

const expected = manifest.expect || manifest.payloads || [];
const files = (Array.isArray(expected) ? expected : []).map(e =>
  typeof e === 'string' ? (e.endsWith('.json') ? e : e + '.json') : e.file);

const rows = [];
const ran = [];
const missing = [];
const gaps = [];
const refGaps = [];

for (const f of files.length ? files : fs.readdirSync(R).filter(n => /^(ux\d?|domain|clarity|fidelity|trust|a11y)\.json$/.test(n))) {
  const p = path.join(R, f);
  if (!fs.existsSync(p)) { missing.push(f); continue; }
  const pay = JSON.parse(fs.readFileSync(p, 'utf8'));
  ran.push({ lens: pay.validator, file: f, checked: (pay.checked || []).length, findings: (pay.findings || []).length });
  (pay.gaps || []).forEach(g => gaps.push({ lens: pay.validator, text: typeof g === 'string' ? g : JSON.stringify(g) }));
  (pay.reference_gaps || []).forEach(g => refGaps.push({ lens: pay.validator, text: typeof g === 'string' ? g : JSON.stringify(g) }));
  (pay.findings || []).forEach(fd => rows.push({ ...fd, lens: pay.validator, instance: f.replace('.json', '') }));
}

/* dedupe by element+severity family across lenses */
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(('the a an and or of to in on is are it its this that with for from be been as at by not no any every user users screen page ' +
  'shown show shows only same one two while when what which how their there here then than' ).split(' '));
const bag = r => new Set(norm(r.element + ' ' + r.finding).split(' ').filter(w => w.length > 3 && !STOP.has(w)));
const jaccard = (a, b) => {
  let hit = 0;
  a.forEach(w => { if (b.has(w)) hit++; });
  return hit / (a.size + b.size - hit || 1);
};
// two lenses describing one defect in their own words must merge, or the report
// pads itself: the same required-field bug arrived three times in round 1
const clusters = [];
for (const r of rows) {
  const B = bag(r);
  const hit = clusters.find(c => jaccard(c.bag, B) >= 0.34);
  if (hit) { hit.items.push(r); hit.bag = new Set([...hit.bag].filter(w => B.has(w))); }
  else clusters.push({ bag: B, items: [r] });
}
const merged = clusters.map(c => c.items).map(g => {
  const lenses = [...new Set(g.map(x => x.instance))];
  const sev = ['Critical', 'High', 'Medium', 'Low'].find(s => g.some(x => x.severity === s)) || g[0].severity;
  // keep the longest statement of the defect, and every lens's evidence
  const lead = g.slice().sort((a, b) => String(b.finding).length - String(a.finding).length)[0];
  return {
    ...lead, severity: sev, lenses, corroborated: lenses.length > 1,
    also: g.filter(x => x !== lead).map(x => ({ lens: x.instance, id: x.id, finding: x.finding, evidence: x.evidence })),
  };
});

const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const keep = merged.filter(m => m.severity === 'Critical' || m.severity === 'High')
  .sort((a, b) => (b.corroborated - a.corroborated) || (rank[a.severity] - rank[b.severity]));
const polish = merged.filter(m => !(m.severity === 'Critical' || m.severity === 'High'))
  .sort((a, b) => rank[a.severity] - rank[b.severity]);

const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const ev = e => {
  if (!e) return '';
  if (e.action || e.observed) return `<b>Did:</b> ${esc(e.action)}<br><b>Saw:</b> ${esc(e.observed)}`;
  if (e.quote || e.source) return `<b>On screen:</b> “${esc(e.quote)}”<br><b>Against:</b> ${esc(e.source)}`;
  return esc(JSON.stringify(e));
};
const card = (f, i) => `<article class="f ${esc(f.severity)}">
  <header><span class="sev">${esc(f.severity)}</span><span class="id">${esc(f.id || '#' + (i + 1))}</span>
    ${f.corroborated ? '<span class="corr">corroborated</span>' : ''}
    <span class="lens">${esc((f.lenses || [f.lens || 'auto']).join(' + '))}</span></header>
  <h3>${esc(f.finding)}</h3>
  <p class="el"><b>Where:</b> ${esc(f.element)}</p>
  ${f.user_impact ? `<p><b>Impact:</b> ${esc(f.user_impact)}</p>` : ''}
  <p class="ev">${ev(f.evidence)}</p>
  ${(f.also || []).length ? `<details><summary>Also reported by ${f.also.map(a => esc(a.lens)).join(', ')}</summary>${
    f.also.map(a => `<p><b>${esc(a.lens)} ${esc(a.id || '')}:</b> ${esc(a.finding)}</p><p class="ev">${ev(a.evidence)}</p>`).join('')}</details>` : ''}
  ${f.suggested_fix ? `<p class="fix"><b>Fix:</b> ${esc(f.suggested_fix)}</p>` : ''}
</article>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Validator round ${manifest.round} — ${esc(title)}</title>
<link rel="stylesheet" href="https://dashasyn.github.io/synder-prototypes/ui-kit/synder-ui-kit.css">
<style>
 body{font-family:Roboto,system-ui,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:var(--color-grey-90,#212121);background:var(--color-grey-05,#fafafa)}
 h1{font-size:24px;margin:0 0 4px} .sub{color:var(--color-grey-60,#757575);margin:0 0 20px}
 table{border-collapse:collapse;width:100%;margin:12px 0 24px;background:#fff}
 th,td{border:1px solid var(--color-grey-20,#e0e0e0);padding:6px 10px;text-align:left;font-size:13px}
 th{background:var(--color-grey-10,#f5f5f5)}
 .f{background:#fff;border:1px solid var(--color-grey-20,#e0e0e0);border-radius:4px;padding:14px 16px;margin:10px 0}
 .f.Critical{border-left:4px solid #C62828} .f.High{border-left:4px solid #EF6C00}
 .f.Medium{border-left:4px solid #FBC02D} .f.Low{border-left:4px solid #9E9E9E}
 .f h3{font-size:16px;margin:8px 0} .f p{margin:6px 0;font-size:14px}
 header{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px}
 .sev{font-weight:700;text-transform:uppercase;letter-spacing:.04em}
 .id,.lens{color:var(--color-grey-60,#757575)}
 .corr{background:#0053CC;color:#fff;border-radius:2px;padding:1px 6px}
 .ev{background:var(--color-grey-05,#fafafa);border:1px solid var(--color-grey-20,#e0e0e0);border-radius:3px;padding:8px 10px}
 h2{font-size:18px;margin:28px 0 4px;padding-top:12px;border-top:1px solid var(--color-grey-20,#e0e0e0)}
 li{font-size:14px;margin:4px 0}
</style></head><body>
<h1>Validator round ${manifest.round} — ${esc(title)}</h1>
<p class="sub">${esc(manifest.flow || '')} · state map recorded ${esc(map.recorded)} · ${map.controls.length} controls driven · ${map.not_exercised.length} declared not exercised</p>

<h2>Which lenses ran</h2>
<table><tr><th>Lens</th><th>Payload</th><th>Items checked</th><th>Findings</th></tr>
${ran.map(r => `<tr><td>${esc(r.lens)}</td><td>${esc(r.file)}</td><td>${r.checked}</td><td>${r.findings}</td></tr>`).join('')}
${missing.map(m => `<tr><td colspan="4"><b>MISSING:</b> ${esc(m)} — treat as skipped, not passed</td></tr>`).join('')}
</table>

<h2>Automated checks (no LLM)</h2>
${auto.length ? auto.map(card).join('') : '<p>No deterministic failures: contrast, palette, radii, fonts, dead controls, accessible names and JS errors all clean.</p>'}

<h2>Critical and High (${keep.length})</h2>
${keep.length ? keep.map(card).join('') : '<p>None.</p>'}

<h2>Polish (${polish.length})</h2>
${polish.length ? polish.map(card).join('') : '<p>None.</p>'}

<h2>Gaps the validators flagged in the recon</h2>
${gaps.length ? '<ul>' + gaps.map(g => `<li><b>${esc(g.lens)}:</b> ${esc(g.text)}</li>`).join('') + '</ul>' : '<p>None.</p>'}

<h2>Reference gaps (the FDD is silent)</h2>
${refGaps.length ? '<ul>' + refGaps.map(g => `<li><b>${esc(g.lens)}:</b> ${esc(g.text)}</li>`).join('') + '</ul>' : '<p>None.</p>'}
</body></html>`;

fs.writeFileSync(path.join(R, 'report.html'), html);
fs.writeFileSync(path.join(R, 'aggregate.json'), JSON.stringify({
  target: title, round: manifest.round, ran, missing,
  auto, critical_high: keep, polish, gaps, reference_gaps: refGaps,
}, null, 2) + '\n');

console.log(`${path.basename(path.dirname(R))} r${manifest.round}: lenses ${ran.length}/${files.length || ran.length}` +
  (missing.length ? ` (MISSING ${missing.join(',')})` : '') +
  ` · auto ${auto.length} · critical/high ${keep.length} · polish ${polish.length}`);
if (keep.length) console.log(keep.map((f, i) => `  ${i + 1}. [${f.severity}${f.corroborated ? ' ×' + f.lenses.length : ''}] ${f.element}: ${f.finding}`).join('\n'));
