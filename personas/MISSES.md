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
| PROC-1 | 2026-08-03 → 2026-08-20 | Trust never ran once; caps exceeded ~10× (**218 findings** across 5 payloads — `clarity 33 · domain 33 · ux1 42 · ux2 55 · ux3 55` — measured 2026-09-02, not the 145 recorded here earlier); schema drifted to a `per_prototype` wrapper holding 11 variants in one payload; `findings-log.json` never created | Protocol itself | Every volume control was an instruction with nothing verifying it. Fixed by `scripts/validator-check.js` | `.synder-state/settings-rework/validators-r3/` — see the correction note below |

## Correction · 2026-09-02 — PROC-1's own replay claim was false

This row used to end: *"replay it, the checker fails it on all four counts."* Ran it. It doesn't.

```
$ node scripts/validator-check.js verify .synder-state/settings-rework/validators-r3
error: no manifest.json in .synder-state/settings-rework/validators-r3 — the round was
never declared, so completeness cannot be checked.
```

Exit 2 at the first hurdle. It never reaches the cap check, the schema check or the log check,
because a round with no manifest can't be evaluated for completeness at all. The claim was
morally right — that round violates all four rules — and mechanically wrong about what the tool
demonstrates.

**Which makes this the seventh entry in the corpus, and the same shape as the other four: a claim
made before it was verified.** Written into the file whose purpose is to catch that. The finding
number was also wrong (145, actually 218) because it was copied forward from a summary instead of
recounted. Both errors survived two weeks of the file being read and cited.

Lesson, and it's narrower than "verify things": **a claim about what a tool outputs must be made
by running the tool and pasting the output**, not by reasoning from what the tool checks. The two
diverge exactly when an early guard short-circuits the rest — which is the normal case for
anything with a fail-fast design.

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

## CAL-1 · 2026-09-02 — first real calibration run against PROTO-2

The second calibration in the system's history, and the first to test any scope line added after
2026-08-20. Ignat's reasoning for doing it before anything else: every change since then — the
`gaps` clause, A11Y as a sixth lens, state-quality in UX, the Domain/Clarity tiebreak — was
unfalsified, so nobody knew whether six months of edits made the lenses sharper or just noisier.

**Ground truth was re-derived, not taken from this file.** `scripts/recon-proto2.cjs` reproduced
all three claims in real Chromium against the frozen build (`round-cal-C2/groundtruth.json`):

| | claim | result |
|---|---|---|
| BUG-A | Platform multiselect collapses on the 2nd toggle, before Apply | **reproduced** — Apply hittable after toggle 1, not after toggle 2 |
| BUG-B | Date panel closes on pick, before Apply is reachable | **reproduced** — and worse than recorded: the trigger still reads "Last 90 days", so the pick is discarded entirely |
| FALSE-1 | v1's claim that the user can recover via the chip's `×` | **still false** — 0 remove controls on an uncommitted chip; `Add filter` also no longer offers the field |

**Two arms, both single-lens UX, both blinded** (build copied to a neutral path, all
`regression` / `PROTO-2` / `calibration` strings stripped from the prompts — verified by grep):

- **C1** — current prompt, **the same blind state map that defeated the v2 arm**. Isolates the
  prompt.
- **C2** — current prompt, fresh commit-path state map. Tests the pipeline end to end.

Both PASS `verify`. Scored by reading each finding against ground truth; the scorer's keyword
matcher only flags candidates.

| Arm | BUG-A | BUG-B | FALSE-1 | evidence | `checked` | `gaps` |
|---|---|---|---|---|---|---|
| v1 (2026-08-20) | hit | hit | **false Critical @ 95** | none | absent | 0 |
| v2 (2026-08-20) | hit | **silent miss** | avoided | full | 29 | 0 |
| **C1** (current, blind map) | hit | **miss, but declared as a gap** | avoided | full | 23 | 5 |
| **C2** (current, commit map) | hit | **hit** | avoided | full | 21 | 6 |

### What it actually showed

**1 · The `gaps` clause works, and this is the result worth keeping.** C1 ran on the identical
blind map that made v2 structurally blind. It also failed to find BUG-B — but it said so, unasked:
*"Baseline date chip: no option was ever picked in the state map, so its Apply/commit behaviour is
unknown."* The scope line converts a silent miss into a visible one, which is the whole point.
Tested against a known blind spot, it held.

**2 · The pipeline now catches what only the sloppy arm caught.** C2 found BUG-B with the correct
mechanism and the discarded-value detail, at High 90. v1 found it too — but bought it with a false
Critical and zero evidence. C2 got it with neither.

**3 · No regression.** BUG-A found by all four arms. Nothing the earlier prompts caught was lost.

**4 · Confidence is uncalibrated, measured rather than asserted.** v1's **false** finding scored
**Critical 95**; C2's **true** BUG-B scored **High 90**. A wrong finding outranked a right one.
The protocol already says the confidence number is not the safety mechanism — this is the
measurement behind that sentence. Never rank by it.

**5 · A finding neither old arm produced.** C2 UX-4: the same "pick a value" gesture means three
different things on one bar — segments commit on click, the Add filter menu commits on pick with no
Apply, panels show an Apply that is unreachable or single-use. Real, and only visible once every
commit path had been exercised.

### What this run could NOT test — and why the corpus needs a second case

PROTO-2 is a filter bar. It has no accounting terminology, no reference spec, and no interesting
keyboard surface, so it cannot calibrate:

- **A11Y as a sixth lens** — no known a11y bug on this build, so no ground truth
- **The Domain/Clarity tiebreak** — no book-affecting term for the two lenses to disagree about;
  per `SYSTEM_AS_BUILT.md` §4 it has never been confirmed to fire at all
- **Severity comparability across lenses** (`SYSTEM_AS_BUILT.md` §6.7) — a single-lens run
  structurally cannot surface it

**Proposed second regression case (not built — awaiting Ignat):** the payment-application-engine
round already has 22 resolved themes with `was`/`fix`/`verified_by`, a real Confluence FDD as
reference, one Critical keyboard defect found by A11Y, and dense accounting vocabulary. Freezing
its pre-fix build would give a corpus case with ground truth for A11Y, Fidelity and Domain/Clarity
at once — the three things PROTO-2 can't reach.

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
