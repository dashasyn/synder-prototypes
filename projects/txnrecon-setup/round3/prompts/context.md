# Round 3 context — TxnRecon setup, Finalist 1 (commit 4c38dba)

## Primary task
A Synder user starts a transaction reconciliation: choose the integration and the account, supply files if the account needs them, and run it.

## Prototype
https://dashasyn.github.io/synder-prototypes/projects/txnrecon-setup/finalist-1-sketch.html
Local copy: /tmp/r3wt/projects/txnrecon-setup/finalist-1-sketch.html. Fetch only if the state map doesn't cover something.

## What changed since round 2 (the delta)
1. QuickBooks (Accounting side) stays on "Automated (recommended)" with Manual available for EVERY account, as in production. For a non-clearing account (Stripe fees, Checking) only the Integration side is Manual (one upload).
2. "Set import methods" opens with both sides on Automated; Assisted/Manual stay listed and uploads appear only once the user picks them.
3. A reason line shows in the data section when automatic retrieval isn't on offer:
   - non-clearing Stripe account: "Automatic retrieval is only available for the Stripe clearing account. Upload the Stripe file for this account, or pick “Stripe mzkt.by (required for Synder)” instead."
   - PayPal / Shopify: "Automatic retrieval isn’t available for PayPal — upload its files below."
4. Custom dates stop at yesterday; a range reaching today or later is refused with "The period must end before today".

## Evidence (read these, not the DOM)
- State map (real Chromium, round 3): /tmp/r3wt/projects/txnrecon-setup/round3/statemap.json — controls[] with before/action/after + liveness, states[] (full card text in 11 states), observations[], not_exercised[].
- Deterministic: /tmp/r3wt/projects/txnrecon-setup/round3/auto-findings.json (off-palette red, already covered — don't re-flag).

## Already resolved (do not re-flag)
Full list with proof: /tmp/r3wt/projects/txnrecon-setup/findings-log.json → `resolved`. Includes: blocked Run names its blocker; mode controls agree; confirm before clearing uploads; reversed/future/today date ranges refused; form locks on Run; "any account reconcilable" claim removed; QuickBooks no longer forced to Manual; toggle no longer adds uploads; reason line for no-automatic cases.

## Decided by Ignat — do NOT flag (findings-log.json → `declined`)
- Upload section editable after Run / status doesn't recap — the real product moves to the next page.
- Upload errors and Manual uploads not naming a specific report — the user can upload any file; we can't give directions.
- No per-method descriptions / "Assisted" not explained — selectors stay as they are.
- Matching rules popup content — production's popup will be used.
- Files kept when the period changes.
- "Large pulls can take a few hours — we’ll email you when it’s ready." is the wanted hours line.
- Also by design: desktop only; preset periods; Integration selector stays; nothing preselected; P&L accounts listed (production lists them too).

## Prototype mechanics to ignore
Browse fabricates a file; drag-and-drop not wired; ✕ inert; no results screen after "Reconciliation started"; no "No integration — GL account" option.

## Domain facts (SET spec Confluence 3701506049, TxnRecon FDDs, production demo v11.7.88)
- Matching: 3-pass ID cascade on ID + amount; dates never compared.
- One run = one clearing account; periods can't overlap for the same clearing account; today can't be selected.
- Account list groups: automated (the integration's clearing account) / manual (the rest).
- Modes: Stripe Automated/Assisted/Manual; PayPal Assisted/Manual; Shopify per spec Automated/Manual (prototype shows Assisted/Manual — open question for Ignat, may be flagged once); QuickBooks Automated/Manual.
- Production: QuickBooks stays Automated for non-clearing accounts; only the integration side goes Manual.

## Known real friction
- KF-9: friction is dominated by sync failures with a specific precondition (missing mappings, multi-currency off, closed period, lost QBO auth).
- Funnel: landing → create 73.6% drop; create → result 54.8% drop. The create screen is where users give up.
