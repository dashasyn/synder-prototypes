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

## Open pattern, not yet closed

Four of the six entries above are the same shape: **a claim made before it was verified** — a field
declared missing, a test believed to prove usability, a validator assumed to have run. The Step 3
recon rules and the Step 7 verify gate address the mechanical half. The judgement half is
unaddressed, and Ignat noticing remains the only backstop.
