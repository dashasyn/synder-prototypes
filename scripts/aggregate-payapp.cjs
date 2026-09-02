/* Step 8 aggregate + Step 9/10 report for the payment-application validator round. */
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '../reports/payment-application-engine/review/round-1');
const OUT = path.resolve(__dirname, '../reports/payment-application-engine/review/index.html');
const j = f => JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'));

const auto = j('auto-findings.json');
const lenses = ['ux1', 'ux2', 'ux3', 'domain', 'clarity', 'fidelity', 'trust', 'a11y'];
const payloads = Object.fromEntries(lenses.map(l => [l, j(l + '.json')]));

// corroboration groups — one theme, the lenses that reported it independently
const THEMES = [
  { key: 'keyboard', title: 'The configurator cannot be operated by keyboard at all',
    severity: 'Critical', ids: ['a11y:A11Y-1', 'a11y:A11Y-2', 'auto:AUTO-4', 'auto:AUTO-3'],
    body: `With the rule switched off the overlay contains exactly three focusable elements — close, Cancel and Save. The master switch is a <code>&lt;span class="toggle"&gt;</code> with no role, no tabindex and no aria-checked, so it can never receive focus, so sections 1-3 are never rendered and there is nothing to configure. All six switches on the screen share that markup. Separately, every select and the day-count field computes an empty accessible name, because the visible labels are <code>&lt;span class="fld-l"&gt;</code> rather than <code>&lt;label for&gt;</code> — and on condition rows after the first, the label is emitted as an empty string, so those rows carry no label even visually.`,
    confirmed: 'Confirmed independently by the orchestrator: querying the overlay for focusables returns only <code>ov-close</code>, <code>ov-cancel</code>, <code>ov-save</code> while the engine is off; <code>document.getElementById("c-engine").focus()</code> leaves activeElement elsewhere; all six selects report <code>labels.length === 0</code> and <code>aria-label === null</code>.' },

  { key: 'prefill', title: '“Nothing is pre-filled” is false at the moment it matters',
    severity: 'High', ids: ['ux1:UX-2', 'ux3:UX-3', 'fidelity:FID-3'],
    body: `The non-editable reference card shown while the rule is off states “Nothing is pre-filled, so no existing configuration changes until you build a rule and save it.” Turning the switch on reveals a complete rule: all three scope rows on, a 90-day window, and one authored condition row — <em>Invoice note is equal to Memo on statement</em> — that the user never chose. Save is enabled immediately. Saving it commits a rule strictly narrower than the default matcher it replaces: invoices with an empty statement memo stop matching.`,
    confirmed: 'Confirmed: the card text matches, and on first turn-on the condition box holds 1 row with all three scope rows on.' },

  { key: 'query', title: 'The panel whose only job is proof prints the same value for every source',
    severity: 'High', ids: ['trust:TRU-3'],
    body: `“The exact request Synder will send to QuickBooks” always renders <code>DocNumber = 'INV-1042'</code>, whatever “Take the value from” is set to, because the literal comes from a ternary whose two branches are the same string. The engine resolves the real value from the chosen source, so for the panel's own stated sample payment the clause would be <code>'ORD-88431'</code> for invoice note, <code>'in_9f2c'</code> for invoice id, <code>'sub_881'</code> for subscription id and <code>''</code> for payment note. The panel also always prints the DocNumber line even when the source resolves to absent — including a blank metadata key — where the engine drops the clause entirely.`,
    confirmed: 'Confirmed in source: <code>const sample = s.match.source===\'payment_meta\' || s.match.source===\'invoice_meta\' ? \'INV-1042\' : \'INV-1042\';</code>' },

  { key: 'inert', title: 'With the prerequisite off, the screen declares itself inert and then reports success anyway',
    severity: 'High', ids: ['trust:TRU-1', 'ux3:UX-4'],
    body: `While “Apply payments to invoices” is off, the overlay's own banner reads “Payments are not being applied to invoices at all… it stays inert until you turn that setting on.” In the same scroll the sample-payment runner prints “<strong>Applied</strong> — Applied to INV-1042. No invoice created.”, “In plain terms” still asserts the payment is applied, the query panel is still titled “will send”, Save is enabled, the footer reads “Applies to Stripe — mzkt.by only.”, and after saving the GSP row shows a green “Custom rule” chip beside the corrective text “Turn on Apply payments to invoices first”. Nothing in the banner is actionable — it contains zero buttons or links, so the fix is in a different place than the warning.`,
    confirmed: 'Confirmed: warning and “Applied — Applied to INV-1042” render simultaneously, and Save is enabled.' },

  { key: 'isempty', title: '“is empty” disables the field it tests and keeps the field it ignores',
    severity: 'High', ids: ['ux2:UX-1', 'trust:TRU-4', 'fidelity:FID-1'],
    body: `Choosing <em>is empty</em> or <em>is not empty</em> greys out the “On the invoice” select — the conventional signal that the field no longer matters — while leaving “On the payment” fully editable. It is inverted: the operand tests only the invoice-side value, so the greyed control holds the only field being checked, frozen at whatever it happened to be. Worse, the engine still resolves the unread payment source first and skips the whole row as “not applicable” when it is absent, and validation still demands a metadata key for a value nothing reads. On the FDD's own worked example B the row is discarded even though the sole candidate satisfies it. Two of the ten operands the spec mandates are effectively unusable.`,
    confirmed: 'Confirmed in the engine: the empty/not-empty test reads only the invoice-side value; the source is resolved before any operand check.' },

  { key: 'shared', title: 'The shared cancel-sync setting has two different commit models — and the off state can be unsaveable',
    severity: 'High', ids: ['ux1:UX-3', 'trust:TRU-2', 'fidelity:FID-2'],
    body: `Both surfaces claim one value: “changing it in either place changes both.” On the GSP row the toggle commits the instant it is flipped. Inside the overlay it is a draft that only lands on Save and is silently discarded by Cancel, close or Escape — with no unsaved-changes prompt anywhere, so a whole multi-row rule also dies to one stray Escape. While any blocking validation error is present, Save is disabled, so a flipped overlay toggle has no commit path at all while still displaying its new value. The same validation runs regardless of the master switch, so a retained configuration carrying an error keeps Save disabled after the rule is switched off — the footer says “1 thing to fix before this can be saved” while sections 1-3 are hidden and no error field is on screen, which means the integration cannot be returned to the default matcher.`,
    confirmed: 'Confirmed: with a blank metadata key and the engine switched off, sections are hidden, no error field renders, and Save is still disabled with that footer message.' },

  { key: 'accounting', title: 'Two accounting statements the screen cannot support',
    severity: 'Critical', ids: ['domain:DOM-1', 'domain:DOM-2', 'clarity:CLR-1', 'ux2:UX-3', 'domain:DOM-3'],
    body: `<strong>“Open invoice.”</strong> Three labels call the candidate set open invoices, while the query panel states there is deliberately no balance filter so a fully paid invoice can still be a candidate. In accounting an open invoice is one with an unpaid balance; applying a payment to a zero-balance invoice posts an unapplied credit rather than settling anything. <strong>“Processed as usual.”</strong> The no-match outcome — the default branch, and half of what the user came to understand — is never translated into a document, although the screen names document types everywhere else. Whether an unmatched payment becomes a Sales Receipt (recognising revenue a second time) or an unapplied customer payment decides whether income is overstated, and the screen does not say. Related: the inheritance helper frames a missing customer as a data-completeness problem, when the real consequence is that a payment can be attributed to whichever customer sits on the invoice the reference happened to match — and the scope operands include contains / starts with / ends with.`,
    confirmed: 'Both quotes verified against the rendered text.' },

  { key: 'deadclick', title: 'The admin-gated date toggle is a silent dead click — the most corroborated finding in the round',
    severity: 'High', ids: ['ux3:UX-1', 'ux1:UX-4', 'ux2:UX-2'],
    body: `All three independent UX passes landed on this one. When the organization is not admin-enabled for no-limit, the toggle on the date row renders at full opacity, pixel-identical to the live toggles directly above and below it, and clicking it does nothing at all — no state change, no message, no acknowledgement. The only differences are <code>cursor:not-allowed</code> and a small grey lock glyph. The same screen renders its <em>other</em> blocked toggle — the plan-gated master switch — dimmed at 50% opacity, so the user has already been taught that unavailable toggles look dimmed. This is KF-4 exactly: the onboarding stepper labels are the densest dead-click zone in the product because they look like navigation and are not.`,
    confirmed: 'Confirmed: three clicks leave the class as <code>toggle on</code> with computed opacity 1; the handler returns early.' },

  { key: 'discard', title: 'Every exit path throws the rule away without asking, and the overlay is not a dialog',
    severity: 'High', ids: ['ux1:UX-1', 'ux3:UX-2', 'a11y:A11Y-3'],
    body: `Cancel, close and Escape all discard the entire configuration with no unsaved-changes prompt and no undo. Escape is bound at the document level with no dirty check and no target check, so it also fires while a native select is open or a text field is being edited — which is the standard gesture for reverting an entry, and the overlay is built almost entirely from native selects. On top of that the overlay is a plain div: no <code>role="dialog"</code>, no <code>aria-modal</code>, no accessible name, the page behind stays tabbable, focus never moves into it on open, and all four close paths leave focus on <code>&lt;body&gt;</code> rather than returning it to the button that opened it.`,
    confirmed: 'Confirmed: <code>#ov</code> reports <code>role === null</code>; pressing Escape mid-typing in the metadata key field closes the overlay and discards the rule.' },

  { key: 'errors', title: 'Blocking errors are neither announced nor findable',
    severity: 'High', ids: ['a11y:A11Y-4', 'ux2:UX-4'],
    body: `Each blocking error is a plain <code>div.err</code> with no id, no <code>role="alert"</code> and no <code>aria-live</code>; it is not referenced by the field's <code>aria-describedby</code> and the field carries no <code>aria-invalid</code>. Nothing is announced when it appears. Meanwhile the fixed footer reports only a count — “1 thing to fix before this can be saved” — while the offending row sits in a body that scrolls independently and may be far off screen, with no jump-to-error affordance, and the disabled Save button drops out of the tab order entirely, so a keyboard user tabbing forward from Cancel leaves the dialog without ever meeting Save or learning why it vanished.`,
    confirmed: 'Confirmed: the error div has no role, no aria-live and no id; the new condition key input has no aria-describedby and no aria-invalid.' },

  { key: 'jargon', title: '“Metadata key” is a blocking field written in developer vocabulary',
    severity: 'High', ids: ['clarity:CLR-2'],
    body: `Picking a metadata source reveals a free-text “Metadata key” field with the placeholder <em>e.g. invoices</em>, and the rule cannot be saved until it is filled. Nothing on screen says what a key is or where to find the one this store actually uses. The FDD's own validation section flags this exact class of risk — internal Synder concepts are “not understood by most CX specialists even” — and the hint above actively steers users here, because payment metadata is the only source that works for a simple charge.`,
    confirmed: 'Quote verified against the rendered error text.' }
];

const find = ref => { const [l, id] = ref.split(':'); if (l === 'auto') return auto.findings.find(f => f.id === id); return payloads[l].findings.find(f => f.id === id); };

const polish = [];
for (const l of lenses) for (const f of payloads[l].findings) {
  const claimed = THEMES.some(t => t.ids.includes(l + ':' + f.id));
  if (!claimed) polish.push({ lens: l, ...f });
}
for (const f of auto.findings) if (!THEMES.some(t => t.ids.includes('auto:' + f.id))) polish.push({ lens: 'auto', ...f });

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const sevClass = s => ({ Critical: 'crit', High: 'high', Medium: 'med' }[s] || 'med');

let html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Validator round 1 — Configurable payment application engine</title>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://dashasyn.github.io/synder-prototypes/ui-kit/synder-ui-kit.css">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Roboto,Arial,sans-serif;color:var(--color-grey);background:var(--color-grey-5);font-size:15px;line-height:1.55}
.wrap{max-width:900px;margin:0 auto;padding:40px 24px 80px}
h1{font-size:30px;font-weight:400;letter-spacing:-.3px;margin-bottom:6px}
.sub{color:var(--color-grey-50);margin-bottom:28px}
.bar{background:var(--color-white);border:1px solid var(--color-grey-20);border-radius:var(--r-md);padding:16px 20px;margin-bottom:28px;font-size:14px}
.bar table{width:100%;border-collapse:collapse;font-size:13.5px}
.bar td{padding:3px 8px 3px 0}
.bar td:first-child{font-weight:500;width:110px}
h2{font-size:20px;font-weight:500;margin:34px 0 10px}
.f{background:var(--color-white);border:1px solid var(--color-grey-20);border-radius:var(--r-md);margin-bottom:16px;overflow:hidden}
.f-h{padding:14px 20px;border-bottom:1px solid var(--color-grey-10);display:flex;align-items:flex-start;gap:12px}
.f-t{font-size:16px;font-weight:500;flex:1}
.f-b{padding:16px 20px}
.f-b p{margin-bottom:10px}
.tag{display:inline-flex;align-items:center;height:20px;padding:0 6px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;flex:0 0 auto}
.crit{background:var(--color-status-red-bg);color:var(--color-red)}
.high{background:var(--color-status-yellow-bg);color:var(--color-yellow)}
.med{background:var(--color-status-grey-bg);color:var(--color-grey-50)}
.corr{background:var(--color-purple-light);color:var(--color-purple)}
.lens{font-size:12px;color:var(--color-grey-50);margin-top:10px}
.conf{background:var(--color-green-light);border-left:3px solid var(--color-green);padding:10px 12px;border-radius:var(--r-sm);font-size:13.5px;margin-top:12px}
.fix{background:var(--color-primary-5);border-left:3px solid var(--color-primary);padding:10px 12px;border-radius:var(--r-sm);font-size:13.5px;margin-top:10px}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;background:var(--color-grey-10);padding:1px 5px;border-radius:3px}
table.p{width:100%;border-collapse:collapse;background:var(--color-white);border:1px solid var(--color-grey-20);border-radius:var(--r-md);font-size:13.5px}
table.p th{text-align:left;padding:9px 12px;border-bottom:1px solid var(--color-grey-20);color:var(--color-grey-50);font-weight:500}
table.p td{padding:9px 12px;border-bottom:1px solid var(--color-grey-10);vertical-align:top}
ul{margin:8px 0 8px 20px}
li{margin:4px 0}
.gapbox{background:var(--color-white);border:1px solid var(--color-grey-20);border-radius:var(--r-md);padding:16px 20px;font-size:13.5px}
</style></head><body><div class="wrap">
<h1>Validator round 1 — Configurable payment application engine</h1>
<div class="sub">Target: <code>projects/payment-application-engine/index.html</code> · SD-16243 Iteration 1 (QBO) · 2026-09-02</div>

<div class="bar"><table>
<tr><td>Ran</td><td>UX ×3 · Domain · Clarity · Fidelity · Trust · A11Y — all eight declared payloads produced. None skipped.</td></tr>
<tr><td>Gate</td><td><code>validator-check.js statemap</code> PASS (26 controls, 9 panel-opening controls all commit-path exercised, 2 declared gaps) · <code>verify</code> PASS (within caps, evidenced, schema-clean)</td></tr>
<tr><td>Volume</td><td>32 validator findings + ${auto.findings.length} automated · ${THEMES.length} themes kept · ${polish.length} to the polish list</td></tr>
<tr><td>Reference</td><td>FDD text extract, 27 normative rules. <strong>No Figma frames exist</strong>, so layout, spacing and component styling were not assessable — Fidelity judged presence, labels, component types and required states only. Fidelity found <strong>23 of 27 rules honoured</strong>, including all three outcome branches and the no-fallback-to-first-invoice guarantee.</td></tr>
</table></div>

<h2>Kept — Critical and High</h2>`;

THEMES.forEach((t, i) => {
  const fs_ = t.ids.map(find).filter(Boolean);
  const lensList = [...new Set(t.ids.map(r => r.split(':')[0].replace(/\d$/, '')))];
  const corroborated = t.ids.length > 1;
  html += `<div class="f"><div class="f-h"><span class="tag ${sevClass(t.severity)}">${t.severity}</span>`;
  if (corroborated) html += `<span class="tag corr">${t.ids.length}× corroborated</span>`;
  html += `<span class="f-t">${i + 1}. ${t.title}</span></div><div class="f-b"><p>${t.body}</p>`;
  html += `<div class="conf"><strong>Orchestrator re-check.</strong> ${t.confirmed}</div>`;
  const fixes = [...new Set(fs_.map(f => f.suggested_fix))];
  html += `<div class="fix"><strong>Fix</strong><ul>${fixes.map(x => '<li>' + esc(x) + '</li>').join('')}</ul></div>`;
  html += `<div class="lens">Raised by: ${t.ids.map(r => '<code>' + r + '</code>').join(' · ')} — ${lensList.length} independent lens${lensList.length > 1 ? 'es' : ''} (${lensList.join(', ')})</div>`;
  html += `</div></div>`;
});

html += `<h2>Polish list — Medium, and mechanical</h2><table class="p">
<tr><th>Lens</th><th>What</th><th>Fix</th></tr>`;
polish.sort((a, b) => (a.severity === 'High' ? -1 : 1) - (b.severity === 'High' ? -1 : 1));
polish.forEach(f => {
  html += `<tr><td><code>${f.lens}:${f.id}</code><br><span class="tag ${sevClass(f.severity)}">${f.severity}</span></td><td>${esc(f.finding)}</td><td>${esc(f.suggested_fix)}</td></tr>`;
});
html += `</table>`;

html += `<h2>Named gaps — what nobody could verify</h2><div class="gapbox">
<p>Each lens reports what its own judgement needed and the recon pass did not record. These are results, not omissions — an unexercised interaction is invisible to every lens downstream, so it is stated rather than guessed.</p><ul>`;
const gapSeen = new Set();
for (const l of lenses) for (const g of (payloads[l].gaps || [])) {
  if (gapSeen.has(g)) continue; gapSeen.add(g);
  html += `<li><strong>${l}</strong> — ${esc(g)}</li>`;
}
html += `</ul><p style="margin-top:12px">Two live bugs were found <em>inside</em> these gaps, by lenses that went past the map to the page: a single <code>ArrowUp</code> on the day-count field fires <code>change</code>, re-renders the overlay body, replaces the input node and drops focus to <code>&lt;body&gt;</code> — so the field cannot be stepped by keyboard and stepping it once ejects focus from the dialog; and <code>Escape</code> pressed while editing a text field (the standard gesture for reverting an entry) closes the whole overlay and discards the rule.</p></div>`;

html += `<h2>Dismissed automated check</h2><div class="gapbox"><ul>` +
  auto.dismissed.map(d => `<li><strong>${esc(d.check)}</strong> — ${esc(d.reason)}</li>`).join('') +
  `</ul></div>`;

html += `<p style="margin-top:28px;font-size:13px;color:var(--color-grey-50)">Round artifacts: <code>reports/payment-application-engine/review/round-1/</code> — manifest, statemap, per-lens slices, spec reference, eight payloads, automated findings.</p>
</div></body></html>`;

fs.writeFileSync(OUT, html);
console.log('report: ' + OUT);
console.log('themes: ' + THEMES.length + ', polish: ' + polish.length);
polish.forEach(f => console.log('  polish ' + f.lens + ':' + f.id + ' [' + f.severity + '] ' + f.finding.slice(0, 70)));
