import json, html, re
R='/tmp/r2wt/projects/txnrecon-setup/round2/'
P={}
for f in ['ux1','ux2','ux3','domain','clarity','trust','a11y','fidelity']:
    P[f]=json.load(open(R+f+'.json'))
def get(src):
    f,i=src.split(':'); return next(x for x in P[f]['findings'] if x['id']==i)
THEMES=[
 dict(t='After "Run", the upload section can still be changed, and the status never says what is running',sev='Critical',
  src=['trust:TRU-1','ux3:UX-3'],
  why='Period, integration and account are locked once the run starts. The import-method selects, Browse and Remove are not. You can remove a file the run depends on while it still says "Reconciliation started". The status also never repeats what was submitted.',
  fix='Lock everything in "How we get the data" when the run starts. Have the status repeat the period, account and methods, and name the files.',
  proof='Re-checked in Chromium: after Run, all 6 controls inside the sources panel report disabled=false, and Remove still removes a chip.'),
 dict(t='The Matching rules popup says dates are matched. They are not',sev='Critical',
  src=['domain:DOM-1','trust:TRU-2','fidelity:FID-3'],
  why='The popup reads "Primary ID, Amount, Date" and "Fuzzy amount ±0.01 · same calendar day". The spec: a 3-pass ID cascade on ID + amount, and dates are never compared. This is invented copy shown as product copy.',
  fix='Replace the text with the real ID + amount cascade, or mark it [live copy not captured] until production\'s popup text is captured.',
  proof='Quote is verbatim from the page; the rule is from SET spec 3701506049.'),
 dict(t='A manual account forces QuickBooks to Manual as well. The demo does not',sev='High',
  src=['fidelity:FID-1','ux1:UX-3','ux2:UX-5','ux3:UX-2','ux3:UX-1','clarity:CLR-2'],
  why='For Stripe fees or Checking, the prototype locks both sides to a one-option "Manual" and asks for a QuickBooks General ledger upload. Production keeps the Accounting side on Automated, with Manual available. Only the Stripe side becomes Manual. The prototype also treats the same group label differently: PayPal and Shopify accounts in the "manual" group keep QuickBooks on Automated. And nothing explains why automatic retrieval disappeared.',
  fix='Force only the Integration side to Manual, as the demo does. Add one line saying why ("This isn\'t the Stripe clearing account, so the Stripe file has to be uploaded").',
  proof='Demo capture (v11.7.88): Stripe fees → Accounting Import method menu "Automated | Recommended … | Manual", page shows "Automated".'),
 dict(t='"Set import methods" quietly switches Stripe to Assisted and adds two required uploads',sev='High',
  src=['ux1:UX-1','ux2:UX-4','ux3:UX-4'],
  why='On the clearing account (fully automatic), opening "Set import methods" to have a look changes the Integration method to Assisted and adds two required uploads. Run is then blocked with "Upload the required file".',
  fix='Open the panel on the current methods (both Automated). Uploads appear only when the user picks Assisted or Manual.',
  proof='All three UX runs found this independently.'),
 dict(t='Upload errors don\'t say which file, and the Stripe Manual upload never names its report',sev='High',
  src=['ux1:UX-5','ux2:UX-1','ux3:UX-5','a11y:A11Y-4','ux1:UX-2','ux2:UX-3'],
  why='With two drop zones, the error just says "Upload the required file", and focus goes to Run instead of the missing zone. Both buttons are named "Browse". On Manual, the Stripe upload only says "How to get this file", while Assisted names "Balance change from activity" and "Payouts".',
  fix='Name the missing file in the error ("Upload the Stripe Payouts file"), move focus to that Browse, and name the report in the Manual upload label.',
  proof='role=alert text and focus target recorded in the state map; A11Y confirmed by keyboard.'),
 dict(t='Future-only and today-inclusive date ranges start a run',sev='High',
  src=['domain:DOM-2','ux1:UX-4','ux2:UX-2','ux3:UX-3','trust:TRU-4','fidelity:FID-4'],
  why='Custom Nov 1–30 and Sep 1–25 (today) both run with no error. The spec says today cannot be selected. The inputs have no min or max. This was left open in round 1.',
  fix='Set max = yesterday on both inputs, and refuse ranges that reach today or later with a named message, as reversed ranges already are.',
  proof='Six lenses hit this one.'),
 dict(t='Uploaded files survive a period change, but vanish silently on an account change',sev='High',
  src=['trust:TRU-3'],
  why='Change Last month → Last quarter with files attached: the files stay, although they were exported for the month. Change the account: the files are wiped with no notice. The "back to automatic" path does confirm first.',
  fix='On a period change with files present, flag the chips as "exported for the previous period". On an account change, show the same "Uploaded files cleared" notice.',
  proof='Re-checked in Chromium: 2 chips after the period change, 0 after the account change, notice empty.'),
 dict(t='Keyboard and screen reader: three round-1 issues still open',sev='High',
  src=['a11y:A11Y-1','a11y:A11Y-2','a11y:A11Y-3'],
  why='The Matching rules dialog doesn\'t take focus or trap Tab, and Escape doesn\'t return focus. Both "Import method" selects have no accessible name. Opening a how-to, Browse and Remove each drop focus to the page body.',
  fix='Focus into the dialog and trap Tab; add label-for with a side name ("QuickBooks import method" / "Stripe import method"); restore focus after each re-render.',
  proof='Same four checks still fail in regress-txnrecon-f1-r2.'),
 dict(t='"Clearing account" and "Assisted" are never explained',sev='High',
  src=['clarity:CLR-1','clarity:CLR-3','fidelity:FID-5'],
  why='The account tooltip says "Prefer the clearing account … P&L accounts …", but no option contains the word "clearing". "Assisted" sits next to "Manual" with no difference shown. Production gives every method a one-line description, and the prototype dropped them.',
  fix='Keep the terms and add explanations: bring back production\'s method descriptions, and show "clearing account" on the recommended option itself.',
  proof='Production: "Assisted — Upload required files — Synder will handle mapping, normalization, and matching."'),
 dict(t='"No integration — reconcile a GL account" is missing',sev='High',
  src=['fidelity:FID-2'],
  why='Production\'s Integration list ends with this option (174 GL accounts, Manual only). The prototype drops it silently.',
  fix='Add it, or record it as a deliberate cut.',
  proof='Demo capture, Integration menu.'),
]
POLISH=[('Spec question','domain:DOM-3','Shopify: the spec says Automated/Manual; the prototype shows Assisted/Manual with every account in the manual group. Still waiting on your answer.'),
 ('Tokens','AUTO-1','Error red #C9372C is not in the kit palette (4 places).'),
 ('Vocabulary','domain gap','"on the platform" in the date tooltip (vocabulary: Integration); "Synder pulls" (vocabulary: Import).'),
 ('Format','fidelity checked','Custom range hint shows ISO 2026-06-01; production and the vocabulary use MM/DD/YYYY. PayPal timezone reads "UTC +3:00, Vilnius" where the others read "Europe/…".'),
 ('Copy','recon','"Example steps — confirm the real report path…" note still renders inside the PayPal/Shopify how-tos.')]
DEMO_MATCH=['Named connections in the Integration list ("mzkt.by (Stripe)")','Account groups "Synder accounts (automated data retrieval)" / "(manual file upload required)" (production shows them in caps)','"Timezone: …" after the integration, "Currency: …" after the account','Changing the integration clears the account','Clearing account → Automated / Assisted / Manual; other accounts → Stripe side Manual + "Upload file *" "CSV or XLSX formats, up to 100MB"','Last full month as the default period','P&L accounts are listed in both']
DEMO_DIFF=['QuickBooks side forced to Manual for non-clearing accounts (demo keeps Automated)','"No integration — reconcile a GL account" option missing','Per-method descriptions dropped (Automated / Assisted / Manual one-liners)','"Automatic file retrieval can take some time — up to a few hours." reworded to "Large pulls can take a few hours — we’ll email you when it’s ready." (the email promise isn\'t in production)']
DEMO_INTENDED=['One card instead of the left "Get started" rail plus two columns','Preset periods instead of two free date inputs','Top error banner naming the blocker, instead of inline "Required"','Import methods hidden until integration + account are chosen (the demo shows the QuickBooks method from the start)','No site footer inside the overlay']
RESOLVED=['A blocked Run now names the blocker, marks the field and moves focus (round-1 critical)','The data-source controls agree with each other; "Upload manually" no longer lies','Going back to automatic asks before clearing uploads','Reversed date ranges are refused; the form locks when the run starts (partly — see #1)','The "any account can be reconciled" tooltip claim is gone']
agg={'round':2,'iteration':2,'target':'projects/txnrecon-setup/finalist-1-sketch.html @ 18913e7 vs demo.synderapp.com v11.7.88',
 'gates':{'statemap':'PASS','verify':'PASS (after removing a stray duplicate "lens" key from fidelity.json — schema only, no content change)'},
 'lenses_run':['ux×3','domain','clarity','trust','a11y','fidelity'],'lenses_skipped':[],'total_findings':sum(len(p['findings']) for p in P.values()),
 'themes':[dict(title=t['t'],severity=t['sev'],source_ids=t['src'],lenses=sorted({s.split(':')[0].rstrip('123') for s in t['src']})) for t in THEMES],
 'polish':[dict(tag=a,src=b,text=c) for a,b,c in POLISH],'demo':{'matches':DEMO_MATCH,'differs':DEMO_DIFF,'intended_departures':DEMO_INTENDED},
 'gaps':['Retrieval failure / KF-9 precondition states not built','Overlapping-period rule never exercised','No results screen after "Reconciliation started"','Demo has no PayPal/Shopify connection, so those can\'t be compared']}
json.dump(agg,open(R+'aggregate.json','w'),indent=2,ensure_ascii=False)
E=html.escape
css=open('/tmp/r2wt/reports/txnrecon-f1-review/index.html').read().split('<style>')[1].split('</style>')[0]
out=['<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Validator round 2 — TxnRecon setup, Finalist 1 vs demo</title><link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet"><style>'+css+'.cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}.cols .f{margin:0}.cols h3{font-size:13px;font-weight:500;margin:0 0 8px}.ok-h{color:#1F8940}.bad-h{color:var(--crit)}.int-h{color:var(--grey)}.done li{color:var(--grey)}</style></head><body><div class="wrap">']
out.append('<h1>Validator round 2 — TxnRecon setup, Finalist 1 vs production demo</h1>')
out.append('<p class="sub">Target: <a href="https://dashasyn.github.io/synder-prototypes/projects/txnrecon-setup/finalist-1-sketch.html">finalist-1-sketch.html</a> @ <code>18913e7</code> · Reference: demo.synderapp.com transaction reconciliation create, app v11.7.88, captured read-only 2026-09-25 (nothing submitted)</p>')
out.append('<p class="sub">Recon and all spot-checks run in real Chromium; liveness via elementFromPoint, never element state.</p>')
out.append('<div class="meta"><span class="pill ok">statemap gate: PASS</span><span class="pill ok">verify: PASS</span><span class="pill">17 controls · 11 states</span><span class="pill">0 page JS errors</span><span class="pill">%d findings → %d themes</span><span class="pill ok">all 8 lenses ran incl. Fidelity</span></div>'%(agg['total_findings'],len(THEMES)))
out.append('<div class="verdict"><b>Verdict: the round-1 blockers are fixed. The new account-based logic is one step stricter than production, and the upload path is where it wobbles.</b>Nothing preselected, grouped accounts and the named blocker all work and match the demo closely. What\'s left clusters in two places: the manual/upload branch (QuickBooks forced to Manual, unnamed files, a toggle that adds uploads, files that drift out of sync with the period) and two things that tell the user something untrue (dates in the matching rules; the section you can still edit after Run).</div>')
out.append('<h2>Fixed since round 1</h2><ul class="done">'+''.join('<li>'+E(x)+'</li>' for x in RESOLVED)+'</ul>')
out.append('<h2>Prototype vs current demo</h2><div class="cols"><div class="f"><h3 class="ok-h">Same as demo</h3><ul>'+''.join('<li>'+E(x)+'</li>' for x in DEMO_MATCH)+'</ul></div><div class="f"><h3 class="bad-h">Differs — demo is right</h3><ul>'+''.join('<li>'+E(x)+'</li>' for x in DEMO_DIFF)+'</ul></div><div class="f"><h3 class="int-h">Deliberate redesign</h3><ul>'+''.join('<li>'+E(x)+'</li>' for x in DEMO_INTENDED)+'</ul></div></div>')
out.append('<h2>Findings — ranked by severity, then how many lenses hit them</h2>')
for n,t in enumerate(THEMES,1):
    lenses=agg['themes'][n-1]['lenses']
    ev=[]
    for s in t['src']:
        f=get(s); e=f['evidence']
        ev.append('<b>'+E(s.split(':')[0])+'</b> — '+E(e.get('quote') or e.get('observed') or '')[:400])
    out.append('<div class="f"><div class="f-head"><span class="n">%d</span><span class="f-title">%s</span><span class="sev %s">%s</span><span class="lens">%s</span></div><p><span class="lbl">What happens</span>%s</p><p><span class="lbl">Fix</span>%s</p><div class="ev"><span class="lbl">Evidence</span>%s<br>%s</div></div>'%(n,E(t['t']),t['sev'].lower(),t['sev'],E(' · '.join(lenses)),E(t['why']),E(t['fix']),E(t['proof']),'<br>'.join(ev)))
out.append('<h2>Polish &amp; open questions</h2><ul class="polish">'+''.join('<li><span class="tag">%s</span>%s</li>'%(E(a),E(c)) for a,b,c in POLISH)+'</ul>')
out.append('<h2>Not covered</h2><ul>'+''.join('<li>'+E(g)+'</li>' for g in agg['gaps'])+'</ul>')
out.append('<p class="foot">Round directory: projects/txnrecon-setup/round2 (statemap, 8 payloads, manifest, reference.json + raw demo text). Round 1: <a href="../txnrecon-f1-review/">report</a>.</p></div></body></html>')
open('/tmp/r2wt/reports/txnrecon-f1-review-r2/index.html','w').write('\n'.join(out))
print('themes',len(THEMES),'findings',agg['total_findings'])
