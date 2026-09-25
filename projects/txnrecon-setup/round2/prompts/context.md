# Round 2 context — TxnRecon setup, Finalist 1

## Primary task
A Synder user starts a transaction reconciliation: choose the integration and the account, supply files if the account needs them, and run it.

## Prototype
https://dashasyn.github.io/synder-prototypes/projects/txnrecon-setup/finalist-1-sketch.html (commit 18913e7)
Local copy: /tmp/r2wt/projects/txnrecon-setup/finalist-1-sketch.html. Fetch it only if the state map doesn't cover something.

## What changed since round 1 (the delta)
1. Nothing is preselected. Integration and Account both start at "Select...". Account stays disabled until an integration is picked, with the hint "Select an integration first".
2. "How we get the data" is hidden until integration AND account are both chosen, then fades in.
3. The import method now follows the account. The account list is grouped the way production groups it: "Synder accounts (automated data retrieval)" holds the integration's clearing accounts, if the integration supports Automated; "Synder accounts (manual file upload required)" holds the rest.
   - Clearing account → automatic retrieval card.
   - Any other account → both sides are forced to Manual, with a QuickBooks upload and an integration upload.
   - PayPal and Shopify have no Automated method, so every account sits in the manual group.
4. Changing the integration clears the account.
5. The run error sits at the top of the card, `role=alert`, and names the first missing thing. The field is marked invalid and gets focus.
6. Reversed custom date ranges are refused. After the run starts, the form is disabled.

## Evidence files (read these, not the DOM)
- State map (real Chromium recon, round 2): /tmp/r2wt/projects/txnrecon-setup/round2/statemap.json
  - `controls[]`: every interaction with before/action/after and liveness.
  - `states[]`: the full visible text of the card in 11 states.
  - `observations[]`
  - `not_exercised[]`
- Deterministic findings are already covered, so don't re-flag them: /tmp/r2wt/projects/txnrecon-setup/round2/auto-findings.json (1 item: off-palette #C9372C).

## Already resolved (do not re-flag)
Source: /tmp/r2wt/projects/txnrecon-setup/findings-log.json. Summary:
- Theme 1 RESOLVED: a blocked Run now names its blocker, marks the field invalid and moves focus.
- Theme 2 RESOLVED: the data-source controls no longer disagree. There is one toggle plus per-side Import method selects.
- Theme 3 RESOLVED: going back to automatic confirms before clearing uploads.
- Theme 4 PARTIAL: reversed ranges are refused. Future-only ranges and ranges ending today are still accepted, and you MAY flag those.
- Theme 5 PARTIAL: the "any account can be reconciled" claim is gone. P&L accounts are still listed, which production also does. You MAY comment on the tooltip copy.
- Theme 6 PARTIAL: the form is disabled while running. The status still doesn't name what was submitted, and you MAY flag that.

## Known issues to ignore
- Desktop-only product. No responsive, mobile or tablet findings.
- Prototype mechanics:
  - "Browse" fabricates a file instead of opening an OS dialog.
  - Drag-and-drop isn't wired.
  - ✕ Close is inert.
  - There is no results screen after "Reconciliation started".
  - Flag none of these as product bugs.
- Long date ranges are allowed by design (confirmed by Ignat). Preset periods replacing free date entry is Ignat's decision.
- Keeping an Integration selector is Ignat's decision.
- The off-palette red is already an AUTO finding.

## Domain facts (sourced: SET spec Confluence 3701506049, TxnRecon FDDs)
- Matching is a 3-pass ID cascade on ID + amount. Dates are never compared when matching.
- One run = one clearing account. Periods for the same clearing account cannot overlap; deleted reconciliations don't block. Today's date cannot be selected.
- Account list per spec has two groups:
  - "automated reconciliation available": the clearing account in SalesBankAccount.
  - "manual reconciliation": everything else.
- Modes per spec:
  - Stripe: Automated / Assisted / Manual
  - PayPal: Assisted / Manual
  - Amazon: Automated / Manual
  - Shopify: Automated / Manual. The prototype shows Assisted/Manual, which is a known open question for Ignat — you may flag it once, as spec vs prototype.
  - Others: Manual.
  - "No integration / any GL account": Manual only.
- Changing the integration clears the account.

## Known real friction to check against
- KF-9: friction is dominated by sync failures with a specific precondition: missing account mappings, multi-currency off, closed periods, lost QBO authorization. Does the design say *which* precondition failed and how to fix it? Generic errors are a dead end.
- Funnel baseline: reconciliation landing → create has a 73.6% drop (795 → 210), and create → result has a 54.8% drop (210 → 95). The create screen is where users give up.
