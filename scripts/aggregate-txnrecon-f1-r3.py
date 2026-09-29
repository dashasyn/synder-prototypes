import json, html
R='/tmp/r3wt/projects/txnrecon-setup/round3/'
P={f:json.load(open(R+f+'.json')) for f in ['ux1','ux2','ux3','domain','clarity']}
get=lambda s: next(x for x in P[s.split(':')[0]]['findings'] if x['id']==s.split(':')[1])
T=[
 dict(t='Changing the account, integration or method silently deletes uploaded files',sev='High',src=['ux1:UX-2','ux2:UX-1','ux3:UX-1'],
  why='Upload the Stripe file for Stripe fees, then switch to Business Checking (or follow the reason line to the clearing account, or switch the method) and the file is gone. No confirm, no notice. The "Use automatic retrieval" link does ask first, so users have been taught to expect a warning.',
  fix='Use the same confirm, "Uploaded files on this screen will be cleared", whenever a change would drop files, and show the same "Uploaded files cleared" notice afterwards. This is separate from your period decision: changing the period keeps files, as decided.',
  proof='Re-checked in Chromium: Stripe fees + file → Account = Business Checking → 0 files, 0 dialogs.'),
 dict(t='The reason line reads as if everything turns manual, and points to only one clearing account',sev='High',src=['ux3:UX-3','domain:DOM-1'],
  why='"Automatic retrieval is only available for the Stripe clearing account…" sits right above QuickBooks still set to "Automated (recommended)". It doesn\'t say that only the Stripe side needs a file. It also points to the USD clearing account only, while the list has two ("Stripe mzkt.by · EUR" too). Someone reconciling EUR activity gets sent to the wrong one.',
  fix='Say it\'s the Stripe side only, and that QuickBooks is still pulled automatically. Say "clearing accounts" (plural), or point to the clearing account in the same currency as the chosen account.',
  proof='State map: fees → reason line + QuickBooks "Automated of [Automated/Manual]".'),
 dict(t='After "Set import methods", the page suggests automatic is off when it isn\'t',sev='Medium',src=['ux2:UX-2','ux3:UX-2'],
  why='Both sides show Automated, yet the link now says "Use automatic retrieval", and the "Synder pulls… a few hours… email" line has disappeared. Users think they\'ve left automatic mode, or click the link to "get back" when nothing changed.',
  fix='While both sides are Automated, keep the hours line visible and name the link for what it does, e.g. "Hide import methods". Switch it to "Use automatic retrieval" only once a side is Assisted or Manual.',
  proof='Two of three UX runs found this independently.'),
 dict(t='The upload error stays up after the file is uploaded',sev='Medium',src=['ux1:UX-1','ux1:UX-3'],
  why='Click Run without a file and you get "Upload the required file". Upload it and the error stays until you press Run again, so it looks as if the upload failed. On 1440×900 the drop zone it refers to is also at the bottom edge (y=882), with focus left on Run.',
  fix='Clear or recount the error as soon as files change, and scroll the first empty drop zone into view when Run is blocked by it.',
  proof='Re-checked in Chromium: error still visible after the upload.'),
 dict(t='"Clearing account" is the key term, and nothing explains it',sev='High',src=['clarity:CLR-1'],
  why='The account tooltip says "Prefer the clearing account… P&L accounts (fees, sales) usually aren\'t reconcilable here." Neither term is explained, and the right Stripe option is named "Stripe mzkt.by (required for Synder)", not "clearing". A first-timer picks the familiar "Business Checking" or "Stripe fees".',
  fix='Keep the terms and explain them in plain words: "the holding account Synder uses for your Stripe money". Say "fee or sales accounts" instead of "P&L".',
  proof='Business owner lens, quote verbatim.'),
 dict(t='Small wording: "on the platform", "close period"',sev='Medium',src=['clarity:CLR-2','domain:DOM-2','clarity:CLR-3'],
  why='The date tooltip says "…in QuickBooks and on the platform", but the page calls it "Integration". "The platform" can also be read as Synder. And "the usual close period" is bookkeeping jargon for a store owner.',
  fix='"Compares transactions dated in this range in your books and in Stripe." and "Last full month — most people check one finished month at a time."',
  proof='vocabulary.md: Integration, not platform.'),
 dict(t='A one-option "Manual" dropdown',sev='Medium',src=['ux1:UX-4'],
  why='For Stripe fees / Checking, the Stripe "Import method" is a required dropdown with Manual as its only option. It looks like a choice but isn\'t one.',
  fix='Show it as plain text ("Import method: Manual") next to the reason line.',
  proof='State map: integration "Manual of [Manual]".'),
]
DROPPED=['"Synder accounts (…)" group labels (Accountant lens): these are production\'s exact labels, so left as they are.']
agg={'round':3,'iteration':3,'target':'finalist-1-sketch.html @ 4c38dba','gates':{'statemap':'PASS','verify':'PASS'},'lenses_run':['ux×3','domain','clarity'],
 'lenses_skipped':{'trust':'Ignat: not needed','a11y':'Ignat: not needed','fidelity':'Ignat: not needed'},'total_findings':sum(len(p['findings']) for p in P.values()),
 'themes':[dict(title=t['t'],severity=t['sev'],source_ids=t['src']) for t in T],'dropped':DROPPED}
json.dump(agg,open(R+'aggregate.json','w'),indent=2,ensure_ascii=False)
E=html.escape
css=open('/tmp/r3wt/reports/txnrecon-f1-review/index.html').read().split('<style>')[1].split('</style>')[0]
o=['<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Validator round 3 — TxnRecon setup, Finalist 1</title><link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet"><style>'+css+'.sev.medium{color:var(--med);border-color:var(--med);background:#F7F8FA}</style></head><body><div class="wrap">',
 '<h1>Validator round 3 — TxnRecon setup, Finalist 1</h1>',
 '<p class="sub">Target: <a href="https://dashasyn.github.io/synder-prototypes/projects/txnrecon-setup/finalist-1-sketch.html">finalist-1-sketch.html</a> @ <code>4c38dba</code> · UX ×3, Accountant, Business owner only (Trust, A11Y, Fidelity not run — your call)</p>',
 '<div class="meta"><span class="pill ok">statemap gate: PASS</span><span class="pill ok">verify: PASS</span><span class="pill">17 controls · 11 states</span><span class="pill">0 page JS errors</span><span class="pill">%d findings → %d themes</span></div>'%(agg['total_findings'],len(T)),
 '<div class="verdict"><b>Verdict: Friday\'s four changes hold. Nothing critical. What\'s left is about files and wording.</b>QuickBooks stays Automated, the toggle no longer adds uploads, today can\'t be picked, and the reason line shows up. Validators confirmed all four and didn\'t re-flag them. The remaining issues: uploaded files are deleted without warning, the reason line and the expanded view each suggest more has turned manual than actually has, and the account choice depends on a term nobody explains.</div>',
 '<h2>Findings</h2>']
for n,t in enumerate(T,1):
    ev='<br>'.join('<b>'+E(s.split(':')[0])+'</b> — '+E(get(s)['evidence'].get('observed') or get(s)['evidence'].get('quote') or '')[:380] for s in t['src'])
    o.append('<div class="f"><div class="f-head"><span class="n">%d</span><span class="f-title">%s</span><span class="sev %s">%s</span><span class="lens">%s</span></div><p><span class="lbl">What happens</span>%s</p><p><span class="lbl">Fix</span>%s</p><div class="ev"><span class="lbl">Evidence</span>%s<br>%s</div></div>'%(n,E(t['t']),t['sev'].lower(),t['sev'],E(' · '.join(sorted({s.split(':')[0].rstrip('123') for s in t['src']}))),E(t['why']),E(t['fix']),E(t['proof']),ev))
o.append('<h2>Not flagged</h2><ul>'+''.join('<li>'+E(x)+'</li>' for x in DROPPED+['Everything you decided on 25 Sept (post-Run edits, file names, method descriptions, matching rules popup, period vs files, the hours line).'])+'</ul>')
o.append('<p class="foot">Round dir: projects/txnrecon-setup/round3. Previous: <a href="../txnrecon-f1-review-r2/">round 2</a>.</p></div></body></html>')
open('/tmp/r3wt/reports/txnrecon-f1-review-r3/index.html','w').write('\n'.join(o)); print('ok',len(T))
