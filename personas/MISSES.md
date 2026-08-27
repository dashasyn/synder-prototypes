# MISSES — Validator Failure Corpus

Every scope line in a validator should come from something that actually went wrong. Trust is the
sharpest lens because it was written from one real bug; the rest were written top-down from theory.
This file is how that gets corrected over time.

**How to add one:** Ignat says it in chat — "you missed X". No form, no terminal. The orchestrator
logs it here, adds a scope line to the owning validator citing the case id, and keeps the prototype
as a regression case.

**How to use one:** before changing a validator prompt, re-run it against the regression cases
below. If it stops finding a known bug, the change is a regression regardless of how much better
the prompt reads.

| Case | Date | What was missed | Owning lens | Why it was missed | Regression case |
|---|---|---|---|---|---|
| FLT-2 | 2026-08 | Status dropdown read "Failed" while the table listed Ready-to-sync rows; a tab switch discarded the filter without resetting the display | Trust (created in response) | No lens owned state accuracy — UX covered friction, Fidelity covered spec, nobody asked "is this control telling the truth" | filtering-options prototype |
| PROTO-1 | 2026-08-04 | Variant 4 was unusable in a browser — a flat dropdown-layer list meant opening a filter closed its own popover. 60 jsdom checks passed | Recon (Step 3) | jsdom ignores layout, stacking and visibility; the suite asserted state, not liveness | `reports/filtering-options/` v4 |
| PROTO-2 | 2026-08-11 | V6 multiselect closed on second toggle; the test asserted `isChecked()` on a control inside a closed panel — correct state, zero liveness | Recon (Step 3) | Same class as PROTO-1, one week later. Assert visibility and hittability, never element state | filtering-options V6 |
| RECON-1 | 2026-08-18 | Two false flow-breaking findings on the Reconciliation details overlay ("upload is on the wrong side", "Any account removes the integration data source") — both artifacts of a half-filled form; a react-select click had silently missed, so dependent fields never rendered | Recon (Step 3) | Enumerated fields before the form was valid. Conditional fields render only after dependencies are satisfied | Synder demo · New reconciliation overlay |
| PROC-1 | 2026-08-03 → 2026-08-20 | Trust never ran once; caps exceeded 7× (145 findings vs 20); schema drifted to a `per_prototype` wrapper; `findings-log.json` never created | Protocol itself | Every volume control was an instruction with nothing verifying it. Fixed by `scripts/validator-check.js` | `.synder-state/settings-rework/validators-r3/` — replay it, the checker fails it on all four counts |

## RECON-2 · 2026-08-20 — the recon pass is now a single point of failure

Found by the first regression test, not by Ignat. Running v1 and v2 of the UX validator against
the same pre-fix V6 build (`da01381`, extracted to `.synder-state/regression/PROTO-2/`):

- Both found the target bug (multiselect panel collapses on the second toggle).
- v2 was cleaner: 3 findings, all evidenced, 29 items in `checked`, passes the health check. It
  also found a real follow-on the v1 arm missed — after the collapse the chip has no remove
  control and `Add filter` no longer offers the field, so the user is stuck.
- v1 produced 5 findings with **no evidence field at all** and no coverage array; the health check
  fails it outright. One of its three "Critical" findings was **false** — it described clicking a
  chip's `×`, and the chip has no `×` (verified in Chromium: zero remove controls).
- **But v1 also found a real bug v2 structurally could not.** Picking an option in the *date*
  single-select panel closes the panel before Apply is reachable — verified true. The v2 arm never
  saw it because `statemap.json` recorded only that the date panel *opens*; nobody tested picking
  an option inside it.

**The lesson:** v2 traded breadth for precision, and the recon pass is where breadth now lives.
If recon doesn't exercise an interaction, no validator downstream can find it — they are reading a
document, not a page. v1's sloppier "go look yourself" caught something our tidy pipeline was blind
to.

**Fix to make:** the recon pass needs a completeness rule of its own — for every control that opens
a panel, exercise a *commit path* (pick/toggle an option, then reach Apply), not just the open. And
validators should be permitted, in fact expected, to say "the state map doesn't cover X" as an
output rather than silently reasoning only from what they were handed.

Caveat on the comparison: the v1 arm used Playwright even though the v1 prompt told it to use
`web_fetch`, so it was *more* capable than a faithful v1 run. The bias favours v1, which makes
its false Critical and missing evidence more damning, not less.

## Evidence modes — why "reproduce it" isn't universal

Raised by Claude on 2026-08-20 and worth recording, because it splits the six lenses cleanly:

- **Interaction lenses** (UX, Trust, A11Y) find *behaviours*. Their gate is a reproduction step:
  name the action, name what happened. FLT-2, PROTO-1 and PROTO-2 above are all this shape.
- **Artifact lenses** (Domain, Clarity, Fidelity) find *strings*. "Reproduce it" is meaningless —
  a mislabelled button doesn't need clicking. Their gate is an exact quotation plus the authority
  it violates (`vocabulary.md` line, accounting rule, reference frame). Equally checkable: the
  quote either appears on the page or it doesn't, and the cited rule either exists or doesn't.

`validator-check.js` enforces the correct mode per lens. Without this split, artifact findings
would have been forced into a reproduction format they don't fit, and the gate would have become
a formality — agents writing "action: read the label" to satisfy a field.

## Open pattern, not yet closed

Four of the six entries above are the same shape: **a claim made before it was verified** — a field
declared missing, a test believed to prove usability, a validator assumed to have run. The Step 3
recon rules and the Step 7 verify gate address the mechanical half. The judgement half is
unaddressed, and Ignat noticing remains the only backstop.

## 2026-08-27 — `verify` conflated "second round" with "second iteration"

The Q-Explorer review ran two rounds over two *different* flows (create & manage; read a report),
each a first pass. `validator-check.js verify` failed round 2 on `EMPTY LOG`, because it treated
any `round > 1` as an iteration that must show resolved findings from the previous one. Nothing had
been applied between them — correctly, since round 2 was not a delta of round 1.

Left as-is, the protocol's "a failed verify voids the round" rule would void every multi-flow
review. Fixed by adding an explicit `--flow <label>` to `manifest`, which sets
`mode: "parallel-flow"` and skips the resolved-log check — and *requires* the label, so an
unlabelled parallel-flow round still fails. The check got narrower in scope, not weaker.

Worth noting because the temptation was to edit the round number instead. That would have made the
check pass by falsifying the artifact, which is exactly the v1 failure this file exists to record.
