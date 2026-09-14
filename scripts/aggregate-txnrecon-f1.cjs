/**
 * Step 8/9 — aggregate the verified round into findings.json + a published HTML report.
 * Corroboration = an element flagged independently by 2+ lenses, ranked first.
 */
const fs = require('fs');
const path = require('path');
const R = '/home/ubuntu/.openclaw/workspace/projects/txnrecon-setup/round1';
const OUTDIR = '/home/ubuntu/.openclaw/workspace/reports/txnrecon-f1-review';

const load = f => JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'));
const payloads = ['ux1', 'ux2', 'ux3', 'domain', 'clarity', 'trust', 'a11y'].map(n => ({ n, ...load(n + '.json') }));
const auto = load('auto-findings.json');

// Themes, assembled by hand from the verified payloads: each names the finding ids that
// independently reported it. Corroboration is what ranks them, not the self-reported score.
const THEMES = [
  {
    t: 'A blocked "Run reconciliation" never says what is blocking it',
    sev: 'Critical', lenses: ['UX ×3', 'Trust', 'Clarity', 'A11Y'],
    ids: ['ux1:UX-1', 'ux2:UX-2', 'ux3:UX-2', 'ux3:UX-4', 'clarity:CLR-1', 'a11y:A11Y-1'],
    what: 'Every time the run is blocked the primary button is simply set <code>disabled</code> — no tooltip, no <code>aria-describedby</code>, no inline list, and no highlight on the upload block that is still empty. Two different routes reach this dead end: removing one of three files, and switching the integration to PayPal or Shopify, which also deletes the automatic-retrieval card and the "Upload manually" toggle from the page with no explanation.',
    impact: 'The user is left with a dead primary action and has to guess which panel is incomplete. This is the generic-blocker dead end that KF-9 identifies as the top source of production friction. For a keyboard user it is worse: a native disabled button drops out of the tab order entirely, so the primary action disappears with no announced reason.',
    fix: 'Keep the button focusable and attach a named blocker line beside it — "Add the Balance change from activity file to start" — and mark the specific empty block. When an integration has no automatic option, leave the card in place in an unavailable state saying so, instead of removing it and its toggle.',
    ev: 'Selected PayPal → automatic card visible=false, toggle visible=false, Run disabled=true, nothing on screen explains why. Filled all three blocks (Run enabled) → clicked Remove → chips 3→2, Run disabled=true with no message naming what is missing.',
  },
  {
    t: 'Three controls set the data source and they disagree — and "Upload manually" does not go manual',
    sev: 'Critical', lenses: ['UX ×3', 'Trust'],
    ids: ['ux2:UX-1', 'ux3:UX-1', 'ux1:UX-2', 'trust:TRU-3'],
    what: 'The mode toggle and the two per-card "Import method" selects all write the same dimension with no precedence. Picking "Automated (recommended)" in the Integration card from inside the manual panel removes every upload block, leaves the page in the manual panel with the automatic card still hidden, keeps Run disabled, and leaves the toggle above still reading "Use automatic retrieval". Separately, clicking "Upload manually" leaves the Accounting side on "Automated" and only flips the integration side to "Assisted" — a hybrid, not manual upload.',
    impact: 'The user reaches a state with zero controls left to act on and a dead Run button, and cannot tell which mode is active. The hybrid case is worse than confusing: someone who chose manual upload precisely because they distrust the automatic QuickBooks pull still gets the automatic pull on the books side, and believes they supplied both halves of the comparison.',
    fix: 'Make the per-source "Import method" selects the single source of truth and derive the panel and the toggle label from them, or have "Upload manually" set both cards to a manual method. Render one explicit line above Run: "QuickBooks: automatic · Stripe: upload".',
    ev: 'Opened the manual panel, set Integration Import method to "Automated (recommended)" → upload blocks=0, Run disabled=true, automatic card visible=false, toggle still labelled "Use automatic retrieval". Click "Upload manually" from default → Accounting method "Automated", Integration method "Assisted".',
  },
  {
    t: 'Switching back to automatic silently destroys every uploaded file',
    sev: 'High', lenses: ['UX ×3', 'Trust'],
    ids: ['ux1:UX-5', 'ux2:UX-3', 'ux3:UX-5', 'trust:TRU-4'],
    what: 'Toggling from the manual panel to automatic retrieval discards all attached files with no warning before and no notice after. Run re-enables immediately, which reads as progress rather than loss; returning to manual shows empty drop zones and a disabled Run that (per the first theme) names nothing.',
    impact: 'A user who flips over to re-read the "can take a few hours" copy before committing loses all of their upload work. Because the loss is silent and the button state moves in the reassuring direction, they may not notice at all.',
    fix: 'Preserve attached files across mode switches, or warn before discarding them: "Switching to automatic retrieval will remove the 3 files you added."',
    ev: 'Filled all blocks (chips=3, Run enabled) → clicked "Use automatic retrieval" → automatic card back, Run enabled, chips silently discarded → clicked "Upload manually" → empty drop zones, Run disabled, no message.',
  },
  {
    t: 'The custom date range has no validation at all',
    sev: 'High', lenses: ['UX ×3', 'Domain'],
    ids: ['ux1:UX-4', 'ux2:UX-5', 'ux3:UX-3', 'domain:DOM-3'],
    what: 'An end date before the start date, and a range lying entirely in the future, are both accepted. The hint echoes the nonsense range back as if it were normal, there is no error element anywhere on the page, and "Run reconciliation" stays enabled.',
    impact: 'The user starts a run the copy says can take hours, over a window that cannot contain a transaction, and gets the same "Reconciliation started" confirmation as a valid run. Domain put it more sharply: an empty comparison window must never be reportable as a completed reconciliation, or a client\'s books get signed off on a comparison that never happened.',
    fix: 'Validate on change — block end-before-start, flag ranges with no elapsed days, show the error against the date inputs rather than only disabling the button, and render the period in the canonical MM/DD/YYYY rather than ISO.',
    ev: 'Custom selected, end set to 2026-08-01 with start 2026-08-31 → hint "2026-08-31 – 2026-08-01", error elements on page = 0, Run disabled=false. Range 2027-01-01..2027-12-31 → same.',
  },
  {
    t: 'The account list offers accounts that cannot be reconciled, and the tooltip says they can',
    sev: 'Critical', lenses: ['Domain', 'Clarity'],
    ids: ['domain:DOM-1', 'clarity:CLR-3'],
    what: 'The "About account" tooltip states <em>"Any QuickBooks account can be reconciled."</em> The dropdown duly offers "Stripe fees" and "Stripe sales" — profit-and-loss accounts — beside the clearing account, warning only that they are <em>shared across connections</em>, never that a P&amp;L account has no balance to reconcile against a processor. Run stays fully enabled on that choice.',
    impact: 'An accountant picks "Stripe fees", the run starts, and every processor transaction comes back as a discrepancy against an account that was never meant to carry a reconcilable balance — a bogus variance list that gets chased, or adjusted away with a journal entry. Clarity added that the warning uses "connections", a word that appears nowhere else on a screen that labels the same thing "Integration", never names the account to pick instead, and takes over the same hint slot that was showing the currency.',
    fix: 'Restrict "Account to reconcile" to balance-sheet accounts (bank, credit card, clearing, undeposited funds). Replace the tooltip claim with the real rule: "Reconcile the balance sheet account that holds this integration\'s balance. Income and expense accounts can\'t be reconciled." Keep the precise term and explain it inline rather than relabelling. In the shared-account warning, name the account to use and keep the currency.',
    ev: 'Quote on screen: "Any QuickBooks account can be reconciled. Prefer the account tied to this integration connection." Picked "Stripe fees" → hint became the shared-account warning, currency line gone, Run disabled=false.',
  },
  {
    t: 'After the run starts, the form stays editable but inert',
    sev: 'High', lenses: ['UX', 'Trust'],
    ids: ['ux2:UX-4', 'trust:TRU-2'],
    what: 'Clicking Run sets the button to "Running…" and reveals "Reconciliation started". Every setup control above stays enabled and accepts new values that the started run ignores. Nothing states which period, integration and account the run actually locked in, and there is no cancel.',
    impact: 'A user who spots a wrong period right after clicking — likely, since the default is last month while KF-3 shows people routinely need 1–2 years back — changes the date range, watches the control accept it, and waits for a result that silently covers the old period.',
    fix: 'On Run, freeze the form or replace it with a read-only summary of exactly what was submitted (period, integration, account, data source), put that summary inside the status region, and offer cancel or "change and re-run".',
    ev: 'Clicked Run with automatic retrieval → label "Running…", disabled=true, #running visible with "Reconciliation started"; select#f-per still enabled=true and accepts a new value.',
  },
  {
    t: 'The manual panel is unusable by keyboard, and two of its dropdowns have no name',
    sev: 'High', lenses: ['A11Y'],
    ids: ['a11y:A11Y-2', 'a11y:A11Y-3', 'a11y:A11Y-4'],
    what: 'Every control inside the manual panel calls a render that rebuilds the whole sources grid via <code>innerHTML</code>, so the focused element is destroyed on each interaction. Both "Import method" selects emit a label that neither wraps the select nor carries <code>for</code>, and the select has no id and no aria-label — so both expose an empty accessible name. The Matching rules dialog declares <code>aria-modal="true"</code> but never moves focus into itself, never traps it, and does not return it on close.',
    impact: 'A keyboard user is thrown back to the top of the document after each of the three required file picks and after every accordion toggle. A screen-reader user meets two unnamed comboboxes that decide how each side of the data arrives, and is told the page behind the dialog is inert while their focus is still in it.',
    fix: 'Update only the affected block instead of replacing the grid, and restore focus to the equivalent control after any re-render. Give each Import method select a unique id with a matching <code>for</code>, named per side. On dialog open move focus into it, cycle Tab within it, and restore focus to the trigger on close.',
    ev: 'Focus after accordion toggle = body (lost); after Browse = body (lost); after the Accounting method change = the mode toggle in a different card. Tab order lists the two method selects as bare "select" while every labelled field appears as select#f-per / #f-int / #f-acc. Opened the dialog → focus stayed on the link outside it; three Tabs landed on "Remove" behind it; Close → focus = body.',
  },
];

const POLISH = [
  ['Vocabulary', 'The automatic card says <em>"Synder <strong>pulls</strong> QuickBooks and Stripe for this period. Large <strong>pulls</strong> can take a few hours"</em>. vocabulary.md bans "pull" and "fetch" in favour of <strong>Import</strong>, and the thing being imported is the <strong>books</strong>, not the accounting company. Suggest: "Automatic import — Synder imports your books and Stripe data for this period."', 'domain:DOM-2'],
  ['Copy', '"Assisted" sits between "Automated (recommended)" and "Manual" with no explanation, and asks for <strong>2</strong> files where "Manual" asks for 1 — the middle option is more work than the manual one. Add one line saying what each option asks of the user.', 'clarity:CLR-2'],
  ['Copy', 'A note to the designer is rendering inside the product UI: <em>"Example steps — confirm the real report path for this integration."</em> (PayPal and Shopify, Assisted method).', 'recon observation'],
  ['Copy', 'Two timezone hint formats on the same control: <em>"Timezone: Europe/Minsk"</em> for Stripe vs <em>"Timezone: UTC +3:00, Vilnius"</em> for PayPal. The first is a raw IANA identifier.', 'recon observation'],
  ['States', 'The date-range hint carries helper copy only for "Last month"; picking "Last week" or "Last quarter" leaves the line empty rather than removing it.', 'ux1/ux2/ux3 checked'],
  ['States', 'No wrong-file-type, oversized-file or parse error state exists behind the "CSV or XLSX formats, up to 100MB" promise, and no progress state after a file is added. Run enables purely on the count of attached blocks.', 'trust:TRU-1'],
  ['Tokens', 'The required asterisk uses <code>#C9372C</code>; the kit token is <code>--color-red #CC2929</code>. Everything else is clean — contrast passes AA on every text element measured, fonts, radii and spacing all match the kit, and the inlined kit copy is byte-identical to the canonical file.', 'AUTO-1'],
];

const GAPS = [
  'No results / matched-unmatched screen exists after the run starts, so how the outcome is communicated could not be checked at all.',
  'Automatic-retrieval failure and empty-result states are not implemented — which means the KF-9 precondition failures this flow most needs to name (closed accounting periods, lost QBO authorization, missing account mappings, multicurrency off) are untested, not passing. A failed import and a genuine zero-discrepancy result must never look alike.',
  'Browse fabricates a file and there is no real file input, so wrong-type, oversized and parse-failure behaviour was never reached.',
  'The Close (✕) does nothing observable, so whether it discards a filled setup — and therefore whether the missing confirmation is a real data-loss risk — is unknown.',
  'Changing the Integration while files are attached was not exercised, so whether it discards them the way the mode toggle does is unknown.',
  'No screen reader was run: the A11Y evidence is focus position plus DOM/ARIA inspection, so claims about what is announced are inferred.',
  'Fidelity did not run — no Figma frame or Jira ticket exists for this variant. Skipped is not passed.',
];

const esc = s => String(s).replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;');
const sevClass = s => s.toLowerCase();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Validator round 1 — TxnRecon setup, Finalist 1</title>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>
  :root{--blue:#0053CC;--ink:#1A1B24;--grey:#6B778C;--line:#DFE4EC;--bg:#F7F8FA;
        --crit:#CC2929;--high:#CB7515;--med:#6B778C}
  *{box-sizing:border-box}
  body{margin:0;font-family:Roboto,Arial,sans-serif;color:var(--ink);background:var(--bg);
       font-size:14px;line-height:1.55}
  .wrap{max-width:900px;margin:0 auto;padding:40px 24px 80px}
  h1{font-size:24px;font-weight:500;margin:0 0 4px}
  .sub{color:var(--grey);margin:0 0 4px}
  .sub a{color:var(--blue)}
  .verdict{background:#fff;border:1px solid var(--line);border-radius:6px;padding:16px 20px;margin:24px 0 8px}
  .verdict b{display:block;margin-bottom:6px}
  .meta{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 32px}
  .pill{background:#fff;border:1px solid var(--line);border-radius:12px;padding:3px 12px;
        font-size:12px;color:var(--grey)}
  .pill.ok{color:#1F8940;border-color:#1F8940}
  .pill.skip{color:var(--high);border-color:var(--high)}
  h2{font-size:16px;font-weight:500;margin:40px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line)}
  .f{background:#fff;border:1px solid var(--line);border-radius:6px;padding:20px;margin:0 0 16px}
  .f-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:12px}
  .n{font-size:20px;font-weight:500;color:var(--grey);min-width:24px}
  .f-title{font-size:16px;font-weight:500;flex:1;min-width:240px}
  .sev{font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.04em;
       padding:2px 8px;border-radius:10px;border:1px solid}
  .sev.critical{color:var(--crit);border-color:var(--crit);background:#FFECE8}
  .sev.high{color:var(--high);border-color:var(--high);background:#FFF1DD}
  .lens{font-size:12px;color:var(--grey)}
  .f p{margin:0 0 10px}
  .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--grey);
       font-weight:500;display:block;margin-bottom:2px}
  .ev{background:var(--bg);border-left:2px solid var(--line);padding:10px 14px;margin-top:12px;
      font-size:13px;color:var(--grey)}
  code{background:var(--bg);padding:1px 5px;border-radius:3px;font-size:12.5px}
  ul{margin:0 0 12px;padding-left:20px}
  li{margin-bottom:8px}
  .polish li b{font-weight:500}
  .tag{display:inline-block;font-size:11px;color:var(--grey);border:1px solid var(--line);
       border-radius:3px;padding:0 5px;margin-right:6px;background:#fff}
  .foot{color:var(--grey);font-size:12px;margin-top:40px;padding-top:16px;border-top:1px solid var(--line)}
</style>
</head>
<body>
<div class="wrap">
  <h1>Validator round 1 — TxnRecon setup, Finalist 1</h1>
  <p class="sub">Target: <a href="https://dashasyn.github.io/synder-prototypes/projects/txnrecon-setup/team-compare.html#f1">team-compare.html#f1</a> → <code>projects/txnrecon-setup/finalist-1-sketch.html</code></p>
  <p class="sub">Recon and all assertions run in real Chromium. Liveness (visible / hittable) after every interaction, never element state.</p>

  <div class="meta">
    <span class="pill ok">statemap gate: PASS</span>
    <span class="pill ok">verify: PASS</span>
    <span class="pill">16 controls exercised</span>
    <span class="pill">0 page JS errors</span>
    <span class="pill">29 findings → 7 themes</span>
    <span class="pill skip">Fidelity skipped — no spec</span>
  </div>

  <div class="verdict">
    <b>Verdict: strong bones, two blocking problems.</b>
    The structure is right — period, what, how, run — and the design-system hygiene is the cleanest
    I have measured: contrast passes AA everywhere, the inlined kit is byte-identical to the
    canonical file, and there are no JS errors. What fails is the <em>how we get the data</em>
    section, where three controls write one value and disagree, and the blocked state of the
    primary button, which never names its blocker. Both are reachable in under five clicks from
    the default state.
  </div>

  <h2>Findings — ranked by corroboration, then severity</h2>
${THEMES.map((f, i) => `  <div class="f">
    <div class="f-head">
      <span class="n">${i + 1}</span>
      <span class="f-title">${f.t}</span>
      <span class="sev ${sevClass(f.sev)}">${f.sev}</span>
    </div>
    <p class="lens">Reported independently by: ${f.lenses.join(' · ')} &nbsp;—&nbsp; ${f.ids.length} finding${f.ids.length > 1 ? 's' : ''} (${f.ids.join(', ')})</p>
    <p><span class="lbl">What happens</span>${esc(f.what)}</p>
    <p><span class="lbl">Why it matters</span>${esc(f.impact)}</p>
    <p><span class="lbl">Suggested fix</span>${esc(f.fix)}</p>
    <div class="ev"><span class="lbl">Evidence — reproduced in Chromium</span>${esc(f.ev)}</div>
  </div>`).join('\n')}

  <h2>Polish list — Medium, not blocking</h2>
  <ul class="polish">
${POLISH.map(([tag, body, src]) => `    <li><span class="tag">${tag}</span>${body} <span class="lens">(${src})</span></li>`).join('\n')}
  </ul>

  <h2>What this round could <em>not</em> check</h2>
  <p class="sub" style="margin-bottom:12px">An untested control must not read as a tested one that passed.</p>
  <ul>
${GAPS.map(g => `    <li>${esc(g)}</li>`).join('\n')}
  </ul>

  <h2>Lens coverage</h2>
  <ul>
    <li><b>UX ×3</b> — 5 findings each, 41 / 39 / 34 items inspected. High-stakes triple pass; four themes came back from all three instances.</li>
    <li><b>Domain (accountant)</b> — 3 findings, 26 items inspected.</li>
    <li><b>Clarity (business owner)</b> — 3 findings, 28 items inspected.</li>
    <li><b>Trust (does the UI lie?)</b> — 4 findings, 22 items inspected.</li>
    <li><b>A11Y (keyboard / focus / semantics)</b> — 4 findings, 26 items inspected.</li>
    <li><b>Fidelity</b> — <b>did not run.</b> There is no Figma frame or Jira ticket for this variant to check against. Skipped is not passed.</li>
  </ul>

  <p class="foot">
    Round artifacts: <code>projects/txnrecon-setup/round1/</code> — manifest.json, statemap.json,
    seven validator payloads, auto-findings.json.
    Gates: <code>node scripts/validator-check.js statemap|verify projects/txnrecon-setup/round1</code>.
    Recon: <code>scripts/recon-txnrecon-f1.cjs</code> · deterministic checks: <code>scripts/step4-txnrecon-f1.cjs</code>.
  </p>
</div>
</body>
</html>
`;

fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(path.join(OUTDIR, 'index.html'), html);
fs.writeFileSync(path.join(R, 'aggregate.json'), JSON.stringify({
  round: 1,
  target: payloads[0].target,
  gates: { statemap: 'PASS', verify: 'PASS' },
  lenses_run: ['ux×3', 'domain', 'clarity', 'trust', 'a11y'],
  lenses_skipped: [{ lens: 'fidelity', reason: 'no Figma frame or Jira ticket exists for this variant' }],
  total_findings: payloads.reduce((n, p) => n + p.findings.length, 0) + auto.findings.length,
  themes: THEMES.map(t => ({ title: t.t, severity: t.sev, lenses: t.lenses, source_ids: t.ids })),
  polish: POLISH.map(([tag, body, src]) => ({ tag, src })),
  gaps: GAPS,
}, null, 2) + '\n');
console.log('report: ' + path.join(OUTDIR, 'index.html'));
console.log('themes: ' + THEMES.length + ' · polish: ' + POLISH.length + ' · gaps: ' + GAPS.length);
