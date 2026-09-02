# SYSTEM_AS_BUILT.md — what actually runs, verified 2026-09-02

Written on request, before building any more harness. Deliberately unpolished. Every claim carries
a marker:

- **[CONFIRMED]** — I ran it, read the file, or checked the artifact during this session (2026-09-02).
- **[UNVERIFIED]** — the protocol or a doc asserts it and I did not check.
- **[WRONG]** — a doc in this repo asserts it and the repo contradicts it.

Companion docs: `VALIDATOR_PROTOCOL.md` (the intent), `WORKFLOW_AS_IS.md` (written 2026-08-19/20,
now partly stale), `MISSES.md` (failure corpus), `PERMISSIONS.md` (tiers). This file supersedes
`WORKFLOW_AS_IS.md` on anything they disagree about, because that one was written before three of
the eight rounds now on disk existed.

---

## 0 · Corrections to the premises of the request

Four things in the brief that prompted this document are out of date. Stating them first so the
rest reads correctly.

**0.1 "Before we build the manifest/health-check script."** It was built on 2026-08-20 and last
edited 2026-08-27. `scripts/validator-check.js`, 369 lines, three subcommands (`manifest`,
`statemap`, `verify`). It is not a plan. **[CONFIRMED — read the file, ran all three commands]**

**0.2 "findings-log.json (even though it doesn't exist — say so)."** It exists in six places:

| Path | `resolved[]` entries |
|---|---|
| `reports/payment-application-engine/review/findings-log.json` | 22 |
| `reports/transactions-prototype/review/findings-log.json` | 0 |
| `projects/q-explorer-prototype/findings-log.json` | not counted |
| `projects/q-explorer-prototype/review-2026-08-27/findings-log.json` | not counted |
| `projects/etc-message-generator/findings-log.json` | not counted |
| `.synder-state/regression/PROTO-2/findings-log.json` | not counted |

**[CONFIRMED — `find` + parsed the first two]**. The payapp one is the real thing: 22 resolved
themes each with `was` / `fix` / `verified_by` / `raised_by`. It was written today.

**0.3 "Trust never spawned."** True for the 2026-08-03 round and for 17 days after. Not true now —
Trust has produced output in 4 of the 8 rounds on disk, including 4 findings and 26 `checked`
items in the payapp round. **[CONFIRMED — read `trust.json`, ran `verify`]**

**0.4 "Caps applied per-variant / schema drift."** True of the 2026-08-03 round, still on disk and
still broken. Not true of any round since. All six post-harness rounds are flat-schema and within
cap. **[CONFIRMED — ran `verify` on all 8 round directories]**

The genuine current gaps are different, and are in section 6.

---

## 1 · The validator roster

Six lenses. Files in `personas/validators/`. Caps and floors are duplicated in two places — the
protocol table (prose) and `SPEC` in `validator-check.js` (enforced). I checked them against each
other: **they agree.** **[CONFIRMED]**

```js
// scripts/validator-check.js:27-36 — the enforced version
const SPEC = {
  ux:       { prefix: 'UX',   cap: 5, evidence: 'interaction' },
  domain:   { prefix: 'DOM',  cap: 3, evidence: 'artifact'    },
  clarity:  { prefix: 'CLR',  cap: 3, evidence: 'artifact'    },
  fidelity: { prefix: 'FID',  cap: 5, evidence: 'artifact'    },
  trust:    { prefix: 'TRU',  cap: 4, evidence: 'interaction' },
  a11y:     { prefix: 'A11Y', cap: 4, evidence: 'interaction' },
};
const CONFIDENCE_FLOOR = 70;
const SEVERITIES = ['Critical', 'High', 'Medium'];
```

One floor, 70, for all six. The 70/75 split in v1 had no stated justification and was removed.
Max instances is not a property of the lens — it is whatever `--expect` declares. The protocol
says run UX 3× on high-stakes passes and never triple-run the narrow lenses; **nothing in the code
enforces that**, `--expect trust,trust,trust` would be accepted. **[CONFIRMED — read `writeManifest`]**

### 1.1 UX — `ux-validator.md`

**Persona:** none. Opens "You are a UX validation agent. Your ONLY job is to check for severe
usability problems." The only lens with no character. **[CONFIRMED]**

**Scope, verbatim:**

```
## Scope — check ONLY these:
- **Cognitive overload**: too much information at once, unclear hierarchy, competing focal points
- **Hierarchy problems**: primary action unclear, visual weight misaligned with task priority
- **Friction/blockers**: steps that will cause users to stop, fail, or loop back
- **Missing affordances**: interactive elements that don't look clickable; non-interactive elements that do
- **Inconsistent interactions**: same action works differently in different places on the same screen
- **State clarity**: empty, loading, and error states that don't tell the user what happened or what to
  do next. A dead-end error is a task-completion blocker and belongs to you, not to Fidelity.

## Hard limits — do NOT report:
- Visual taste opinions ("I would make this blue", "this looks dated")
- Redesign suggestions ("Consider a sidebar instead")
- Accessibility mechanics — tab order, focus, ARIA, semantics (A11Y Validator owns those)
- Anything below 70 confidence
- More than 5 findings total — pick the most severe

## Severity definitions:
- **Critical**: user cannot complete the primary task
- **High**: significant confusion or friction, likely causes task failure for many users
- **Medium**: noticeable friction, task still completable
```

**Method:** three phases — Inventory (three groups: layout & hierarchy · interaction & task
completion · states — "all three must appear in `checked`, because the third is the one that gets
skipped"), Interrogate, Select. Evidence mode: interaction (`action` + `observed`).

### 1.2 Domain — `domain-validator.md`

**Persona, verbatim:** "You are a senior accountant with 12+ years managing books for ecommerce and
SaaS clients. You use QuickBooks Online daily, know Xero well, and have used Sage Intacct for
larger clients. You are skeptical of 'AI' marketing but appreciate genuine automation. Every
accounting error is a real liability."

**Scope, verbatim:**

```
## Scope — check ONLY these:
- **Incorrect terminology**: wrong use of reconciliation, journal entry, COGS, chart of accounts,
  accounts payable/receivable, debit/credit, accrual, cash basis, revenue recognition
- **Misleading labels**: descriptions that would cause a bookkeeper to misclassify a transaction
- **Missing distinctions**: flows that blur payment vs. invoice vs. transaction vs. payout
- **Data integrity risks**: actions without confirmation that could affect the books irreversibly
- **Multi-client workflow gaps**: anything that would break when managing 40+ clients

## Hard limits — do NOT report:
- UI design opinions
- Anything unrelated to accounting correctness or financial terminology
- Anything below 70 confidence
- More than 3 findings total — pick the highest risk ones

## Severity definitions:
- **Critical**: could cause a real accounting error, misclassification, or data integrity problem
- **High**: wrong or ambiguous terminology that would confuse or mislead an accountant
- **Medium**: imprecise wording a careful accountant would question or need to verify
```

**Tiebreak clause, verbatim:** "on any term that is book-affecting or compliance-relevant
(reconciliation, journal entry, debit/credit, accrual vs cash, revenue recognition), the precise
term stays." Clarity's concern is then satisfied by tooltip / helper text / "what's this?" link,
"never by relabelling."

Evidence mode: artifact (`quote` + `source`). Receives `vocabulary.md`.

### 1.3 Clarity — `clarity-validator.md`

**Persona, verbatim:** "You are a first-time small business owner. You run an online store
(~$150K/year) selling on Shopify and Amazon. You use accounting software because your accountant
told you to, but you barely understand it. You are afraid of making irreversible mistakes. You have
abandoned 3 tools before because setup felt too complicated. / You are NOT an expert. You do NOT
know what 'reconciliation', 'journal entry', 'COGS', or 'accrual' means without explanation."

**Scope, verbatim:**

```
## Scope — check ONLY these:
- **Jargon**: every term a non-accountant wouldn't understand — flag the exact word, not a vague area
- **Anxiety triggers**: irreversible-looking actions, scary warnings without explanation, choices
  with unclear consequences
- **Quit-risk moments**: steps where a confused user would close the tab and try a competitor
- **Discoverability**: key actions that are hard to find because labels are unclear
- **Missing reassurance**: flows that need a "this is safe" or "you can undo this" signal

## Hard limits — do NOT report:
- UI layout or visual design opinions
- Technical implementation issues
- Accounting correctness (not your job)
- Anything below 70 confidence
- More than 3 findings total — pick the highest quit-risk ones

## Severity definitions:
- **Critical**: user would stop and not proceed at all
- **High**: user would be confused and likely choose the wrong option
- **Medium**: user would hesitate or feel unsure but proceed
```

Note the asymmetry: Clarity's Critical is "user would stop", UX's Critical is "user cannot complete
the task". A screen can be Critical to Clarity and fine to UX. That is intentional but it means
severity is **not comparable across lenses**, and the aggregation step in section 2 sorts them as
if it were. Unresolved — see 6.7.

Evidence mode: artifact. Receives `vocabulary.md`.

### 1.4 Fidelity — `fidelity-validator.md`

**Persona, verbatim:** "You are a QA engineer. Your only job is to check whether the prototype
accurately implements its reference (Figma design, Jira spec, or existing screen). You compare what
exists against what was specified. **You are a diff, nothing more — this narrowness is the point.**"

**Scope, verbatim:**

```
## Scope — check ONLY these:
- **Missing elements**: things in the reference that are absent from the prototype
- **Wrong labels**: text in the prototype that differs from the reference
- **Wrong component types**: e.g. dropdown used where radio buttons were specified
- **Missing states**: empty, loading, error, disabled — if the reference requires them and they're absent
- **Significant layout deviations**: major spacing or structural differences from reference

## Hard limits — do NOT report:
- Redesign suggestions ("it would be better if…")
- Opinions about what is clearer or prettier
- Whether a state is any *good* — you check only that it exists as specified (UX owns quality)
- Anything not traceable to a specific reference discrepancy
- Anything below 70 confidence
- More than 5 findings total
```

Self-disabling clause: "If no reference exists, do not run — return an empty payload with
`reference_gaps: ['no reference supplied']`." Has a `reference_gaps` array for incomplete frame
sets. Evidence mode: artifact.

**Ran in 1 of 8 rounds** (payapp, where a Confluence FDD served as reference). **[CONFIRMED]**

### 1.5 Trust — `trust-validator.md`

**Persona, verbatim:** "You are a skeptical QA engineer who assumes the interface is lying until
proven otherwise. Synder is a financial tool: if the UI displays a state that is not the actual
state, users make wrong decisions about real money."

Written from one real bug, quoted in the file: "This validator exists because of a real bug
(FLT-2): a status dropdown showed 'Failed' selected while the table displayed Ready-to-sync
records. Switching tabs silently discarded the dropdown value without resetting its visual state.
No other validator's scope caught it."

**Scope, verbatim — nine items, the longest scope of any lens:**

```
- **Stale indicators**: a control shows one value while the content reflects another
- **Silent overrides**: control A discards control B's value without telling the user or resetting B
- **Duplicate controls on one dimension**: two controls that set the same thing, no defined precedence
- **Unacknowledged state**: an action changed something but nothing in the UI confirms it
- **Phantom progress**: spinners or "in progress" states with no completion or failure path
- **Optimistic lies**: UI shows success before the operation succeeded, no rollback shown on failure
- **Hidden defaults**: a filter or setting is active but invisible (e.g. a 90-day window, no chip)
- **Count mismatches**: a badge or total that could disagree with the visible rows
- **Ambiguous scope on bulk actions**: "select all" that could mean this page or all matching records
```

**Severity, verbatim:** "Critical: the user cannot know the true state, and acting on the displayed
state could affect their books or cause data loss." Ranked by **money-consequence first**, not by
task-completion. Cap 4.

Unique to Trust — the **temporal checklist**, verbatim:

```
1. **Status at the moment of action** — what does the control read before anything happens?
2. **Status immediately after the action** — did it update, and does it match the content?
3. **Status after switching tab, filter, or screen and coming back** — did the value survive,
   was it silently discarded, and does the display still claim the old value?
```

Also unique: a **cross-zone duty** clause requiring it to ask what other zones a control could
contradict even when handed one zone. Extra output fields `claims` and `actual` that no other lens
has — and which `validator-check.js` does **not** require. **[CONFIRMED — `required` list is only
`element, finding, user_impact, suggested_fix`]** So a Trust payload omitting `claims`/`actual`
passes the gate.

Evidence mode: interaction. Gets the whole state map, not a slice.

### 1.6 A11Y — `a11y-validator.md`

Sixth lens, added in v2. Persona: "You are a QA engineer who tests with a keyboard and a screen
reader, not a mouse." Exists because "nobody owned accessibility."

Scope: tab order · focus visibility · focus traps and returns · element semantics ·
screen-reader label correctness · keyboard-only dead ends. Explicitly **banned from colour
contrast** — "the deterministic style script owns that, it's mechanical." Cap 4, evidence mode
interaction, gets the whole map.

Empirically the sharpest lens on the last round: A11Y-1 and A11Y-2 became the single Critical theme
(the configurator was entirely keyboard-inoperable). **[CONFIRMED — read `findings-log.json` theme 1]**

### 1.7 What all six share

Added in v2, identical wording in all six files — the `gaps` clause:

```
## When the state map is incomplete
If your lens needs a behaviour the state map doesn't record — a control whose commit path was
never exercised, a state nobody reached, anything in its `not_exercised` list — say so in a
`gaps` array. Do not quietly reason only from what you were handed, and do not guess.
A named gap is a useful result; a silent one is how a real bug survives a clean-looking round.
```

This is the highest-yield thing in the system right now, and it was nearly invisible. The last
round produced **38 gap notes** across 8 agents. Several are better than the findings — the A11Y
agent's gap note records that it went and exercised arrow-key stepping itself, found focus ejected
from the dialog and the value stuck at 91. **[CONFIRMED — counted in `verify` output]**

### How Critical vs lower is decided — honestly

There is **no cross-lens severity model.** Each file defines its own three-line ladder, anchored to
a different thing: UX to task completion, Domain to book damage, Clarity to abandonment, Fidelity
to spec coverage, Trust to money consequence, A11Y to task impossibility for keyboard users. The
gate checks only that the string is one of `Critical|High|Medium`. **[CONFIRMED — `SEVERITIES`
array is a membership test, nothing more]** Everything past that is the agent's judgement, and it
is not calibrated. **[CONFIRMED — no calibration data exists; `WORKFLOW_AS_IS.md` also admits this]**

---

## 2 · End-to-end flow, as actually executed

Marked **[CODE]** if a script does it, **[ME]** if I do it by hand in the session, **[GATE]** if a
script refuses to continue.

The single most important structural fact, and it surprised me when I checked:

> **No script spawns validators.** `grep -rln "sessions_spawn|Task(|subagent" scripts/` returns
> nothing. **[CONFIRMED]** The fan-out is me issuing N parallel agent calls by hand, every time.
> The harness verifies the *artifacts* around the fan-out; it never performs it.

So the "pipeline" is: coded gates at the entrance and exit, hand-work in the middle.

| # | Step | Who | Files read | Files written |
|---|---|---|---|---|
| 0 | Resolve target, state it in line 1 of the report | **[ME]** | conversation; `ls -t projects/*/index.html reports/*/index.html` | — |
| 1 | Scope contract: one-sentence primary task, name the zones, note whether a reference exists | **[ME]** | the prototype | nothing persisted — **lives only in the chat message and later inside `statemap.json` as `primary_task`** |
| 2 | Build (only `Build + Review`) | **[ME]** | `synder-design-tokens.css`, `DESIGN_RULES.md` | `projects/<slug>/index.html` |
| 2b | Jira/Confluence fetch if a ticket is named | **[ME]** | `scripts/jira-fetch.sh`, Confluence API | `reference.json` |
| 3 | Recon in a real browser: every control, every commit path, screenshots | **[CODE]**, hand-written per project | the prototype via Playwright | `statemap.json`, `auto-findings.json`, `shots/` |
| 3b | **Statemap gate** | **[GATE]** | `statemap.json` | — |
| 4 | Deterministic checks — contrast, tokens, grid, dead handlers | **[CODE]**, same file as step 3 | prototype DOM + computed styles | `auto-findings.json` (`AUTO-n`) |
| 5 | Declare the round | **[CODE]** | — | `manifest.json` |
| 6 | Slice the map per lens, assemble each prompt, **spawn the agents** | **[ME]** | validator `.md`, `statemap.json`, `vocabulary.md`, `KNOWN_FRICTION.md`, `findings-log.json`, `reference.json` | `slice-*.json`, `prompts/*.txt`, then `ux1.json` … `a11y.json` |
| 7 | **Verify gate** | **[GATE]** | `manifest.json`, all payloads, `statemap.json`, `../findings-log.json` | — |
| 8 | Aggregate: dedupe, theme, rank | **[CODE]**, hand-written per project | all payloads + `auto-findings.json` | `review/index.html` |
| 9 | Report to you in chat, max 7 items, no ids | **[ME]** | the aggregate | the Telegram message |
| 10 | Apply fixes, re-verify in a browser, write the log, push | **[ME]** + **[CODE]** | — | prototype, `findings-log.json`, git |
| 11 | Loop, max 3, never re-flag `resolved[]` | **[ME]** | `findings-log.json` | — |

**Steps 3, 4 and 8 are code — but not reusable code.** `recon-payapp.cjs` (24 KB),
`verify-payapp-v4.cjs` (37 KB) and `aggregate-payapp.cjs` (20 KB) are bespoke to one prototype.
`scripts/` holds **34 files**, of which ~24 are one-off `browser-*`/`verify-*`/`shots-*` scripts for
specific past prototypes. Only `validator-check.js` is generic. **[CONFIRMED — `ls scripts/`]**
So every new prototype re-pays the recon and aggregation cost as fresh bespoke code, and each of
those files is a chance to reintroduce a bug the previous one had already solved. This is the
biggest unaddressed cost in the system and it is not in anyone's gap list. See 6.1.

Also worth saying plainly: **the aggregation themes in `aggregate-payapp.cjs` are hardcoded.** The
`THEMES` array literally contains the prose of each finding group written out by hand, including
`confirmed:` strings recording what I checked myself. **[CONFIRMED — read lines 10-40]** It is a
report generator with the conclusions baked in, not a merge algorithm. It works and the output is
good, but calling step 8 "automated" would be false.

---

## 3 · Every file the protocol depends on

| File | Supposed to do | Actually used? |
|---|---|---|
| `personas/VALIDATOR_PROTOCOL.md` (311 ln) | Orchestrator instructions, v2 | **Yes** — I read it this session; AGENTS.md points at it before any review **[CONFIRMED]** |
| `personas/VALIDATOR_PROTOCOL-v1-archived.md` | Historical | Not read in any round. Kept because `MISSES.md` cites it **[CONFIRMED it exists]** |
| `personas/validators/*.md` × 6 | Lens system prompts | **Yes** — pasted verbatim as SYSTEM in `prompts/*.txt` **[CONFIRMED — `prompts/domain.txt` reproduces the whole file, headings intact]** |
| `scripts/validator-check.js` | The only enforcement | **Yes**, 8 rounds have manifests **[CONFIRMED — ran it]** |
| `vocabulary.md` (162 ln) | Canonical terms, authority for Domain/Clarity/Fidelity | **Yes, genuinely inlined.** `prompts/domain.txt` contains a `## Canonical terminology (vocabulary.md)` section followed by 14 of vocabulary's own headings — General Rules, Synder Product Names, Statuses, Toast Patterns … **[CONFIRMED — grepped headings out of the sent prompt]** This was a v2 fix; before it, no validator had ever seen the file |
| `personas/KNOWN_FRICTION.md` (KF-1…KF-9) | Real LogRocket friction to check designs against; **only 2-3 relevant entries per prompt, never all nine** | **Yes — all 7 prompts in the txn round contain `KF-` references** **[CONFIRMED — grep]**. Whether only 2-3 were passed rather than all nine: **[UNVERIFIED]**, I didn't diff the entries per prompt |
| `findings-log.json` | Makes round 2 a delta; never re-flag resolved | **Exists in 6 places, enforced by `verify`.** Only the payapp one has real content (22 themes). The txn one has `resolved: []` and its round was round 1, so it passed legitimately **[CONFIRMED]** |
| `manifest.json` | Declares the round before spawning | **Yes — 8 on disk** **[CONFIRMED]** |
| `statemap.json` | The single expensive read; everything downstream reads it, not the DOM | **Yes — 8 on disk**, gate refuses without it **[CONFIRMED]** |
| `slice-*.json` / `slices/*.json` | Per-lens zone slice | **Yes.** Keys: `target, primary_task, zones, not_exercised, controls, facts` **[CONFIRMED]**. Note the two rounds use two different layouts (`slice-ux.json` vs `slices/ux1.json`) — inconsistent, harmless |
| `prompts/*.txt` | Record of what was actually sent | **Only for the txn round.** 7 files, 10-21 KB each, 101 KB total **[CONFIRMED]**. The payapp round did **not** save prompts — so for the most recent and most thorough round there is no record of what each agent actually received. Real gap, see 6.4 |
| `auto-findings.json` | `AUTO-n` deterministic findings that never enter a prompt | **Yes** — 4 in the payapp round, AUTO-1 is 10 sub-AA contrast text nodes with measured ratios **[CONFIRMED]** |
| `reference.json` | Jira/Confluence spec for Fidelity | **Yes, once** (payapp). `WORKFLOW_AS_IS.md` line 168 says it "has never been produced" — **[WRONG]**, that doc is 13 days stale |
| `personas/TASK_BRIEF.md` | Form for `Build + Review` | **Never filled in, still.** Protocol's own note: "which says the form is the wrong instrument, not that he lacks discipline" **[CONFIRMED]** |
| `personas/MISSES.md` | Failure corpus; every scope line should trace to a real miss | **Read and maintained** — 6 table rows + 4 prose sections **[CONFIRMED]**. But see 6.5: one of its claims is now false |
| `personas/WORKFLOW_AS_IS.md` | Hand-to-a-reviewer description | Stale in 3 places (0.2, reference.json, "no calibration") **[CONFIRMED]** |
| `personas/HOW_WE_WORK.md` | — | Exists. **[UNVERIFIED]** — I did not open it this session |
| `personas/onboarding-review-2026-03-31.md` | Old review | Dormant **[UNVERIFIED]** |
| `DESIGN_RULES.md` | Style rules for step 4 | **Read by step 4 scripts.** Header claims source of truth is `synder-design-tokens.css`, and AGENTS.md separately warns its type scale and colours are **stale** — a validator-input file that contradicts the tokens it cites. 🟡 by the file test, unfixed **[CONFIRMED — read both]** |
| `PERMISSIONS.md` | Tiers | **Still marked DRAFT v2 — Ignat to approve** at line 3 **[CONFIRMED]** |
| `personas/index.html`, `workflow.html` | Published pages | **[UNVERIFIED]** |

---

## 4 · Verified vs assumed — the honest ledger

**Confirmed this session, by running it:**

- All three `validator-check.js` subcommands work. **8 round directories on disk.** Verdicts:

| Round | Verdict | Notes |
|---|---|---|
| `reports/payment-application-engine/review/round-1` | **PASS** | 8 payloads, 32 findings, 255 `checked` items |
| `reports/transactions-prototype/review/round-1` | **PASS** | 7 payloads, 27 findings (no Fidelity — no reference) |
| `projects/q-explorer-prototype/review-2026-08-27/round1` | **PASS** | 6 payloads |
| `projects/q-explorer-prototype/review-2026-08-27/round2` | **PASS** | `mode: parallel-flow`, labelled |
| `projects/etc-message-generator/round1` | **PASS** | `parallel-flow`, **UX only** — 3 payloads, no Domain/Clarity/Trust/A11Y |
| `.synder-state/regression/PROTO-2/round-v1` | **FAIL** | intentional — the v1-prompt arm. No `checked`, 5 unevidenced findings |
| `.synder-state/regression/PROTO-2/round-v2` | **PASS** | the v2-prompt arm |
| `.synder-state/settings-rework/validators-r3` | **error, no manifest** | the 2026-08-03 disaster round |

- The statemap gate passes on the payapp round: **26 controls, 9 panel-openers, 9 commit paths
  exercised, 2 declared `not_exercised`.**
- The 2026-08-03 round, measured rather than remembered: 5 payloads, `per_prototype` wrappers,
  **11 prototype variants in a single payload**, and **218 findings** — `clarity 33 · domain 33 ·
  ux1 42 · ux2 55 · ux3 55`. Compound ids (`UX-A1`, `UX-A2`…). Extra top-level keys `instance`,
  `ranking`, `verdict`.
- `vocabulary.md` really is inlined into the artifact-lens prompts.
- No script anywhere spawns an agent.

**Protocol says it, I did not check:**

- That only 2-3 `KNOWN_FRICTION` entries reach each prompt rather than all nine.
- That the Domain/Clarity tiebreak has ever actually fired in a real aggregation.
- That "max 7 items in chat" was honoured in past reports — I did not audit sent messages.
- That the `--flow` label is always accurate rather than a convenient way past the log check.
- Whether `HOW_WE_WORK.md` and the published `personas/*.html` still match the protocol.
- Whether the `not_exercised` list is honest, i.e. whether items land there because they truly
  couldn't be reached or because exercising them was awkward. **Nothing can check this** — the gate
  accepts any string as a reason.

**Two things this repo asserts that are false:**

- `WORKFLOW_AS_IS.md`: "`reference.json` has never been produced" → it has, once.
- `MISSES.md` PROC-1: "`.synder-state/settings-rework/validators-r3/` — replay it, the checker
  fails it on all four counts." → **it doesn't.** `verify` dies at the first hurdle with
  `error: no manifest.json`, exit 2, and never reaches the cap, schema or log checks. The claim is
  morally right and mechanically wrong, which is the exact species of unverified claim `MISSES.md`
  exists to catch. **[CONFIRMED — ran it]**

---

## 5 · The real output format

### 5.1 Current — flat, one payload per lens per target

Real, unedited, from `reports/payment-application-engine/review/round-1/trust.json`, trimmed only
by cutting `checked` from 26 items to 2 and findings from 4 to 1:

```json
{
  "validator": "trust",
  "round": 1,
  "target": "projects/payment-application-engine/index.html",
  "checked": [
    { "zone": "gsp settings",
      "item": "GSP Cancel sync toggle vs section 3 Cancel sync toggle (duplicate controls, one declared value)" },
    { "zone": "disclosures",
      "item": "disclosure open/closed state surviving re-render — no staleness found" }
  ],
  "findings": [
    {
      "id": "TRU-2",
      "severity": "High",
      "confidence": 85,
      "element": "Cancel sync toggle in section 3 of the overlay, against the identically named toggle in GSP integration settings",
      "finding": "An existing, already-live production setting is presented as a single shared value but has two different commit semantics — instant on GSP, Save-gated and silently discardable in the overlay — and is uncommittable while the rule has a validation error.",
      "user_impact": "A user who opens the overlay only to switch cancel-on-no-match off, sees the toggle read Off, and closes with Escape or Cancel walks away believing unmatched payments will now sync as usual, while Synder keeps cancelling them — or the mirror case.",
      "suggested_fix": "Commit the shared cancel-sync value immediately on click in the overlay too, independent of the rule draft and of the Save gate; if it must stay Save-gated, label it in place as a pending change and warn on Cancel/Escape that the shared setting will revert.",
      "evidence": {
        "action": "On GSP note Cancel sync reads Off. Click Configure, turn the rule on, in section 3 click Cancel sync so it reads On, then press Escape. Read the GSP row.",
        "observed": "After Escape the GSP row still reads Off — closeOverlay() only removes a class and never writes cfg back to saved, and no warning is shown, despite the changing it in either place changes both claim."
      }
    }
  ],
  "gaps": [
    "overlay Cancel-sync toggle: the state map records it only as toggled in place, never toggled-then-closed-via-Cancel/Escape, so the discard behaviour is read from the handler rather than an exercised interaction",
    "Starter plan: reaching the overlay on Starter was never exercised, so whether a Starter user can open, edit and attempt to save a rule is unverified"
  ]
}
```

Note it omits `claims` and `actual` — fields its own prompt specifies. Nothing caught that.

### 5.2 The drifted version — still on disk, unmigrated

Real head of `.synder-state/settings-rework/validators-r3/ux1.json`:

```json
{
 "validator": "ux",
 "instance": 1,
 "per_prototype": [
  {
   "prototype": "A",
   "findings": [
    {
     "id": "UX-A1",
     "severity": "High",
     "confidence": 88,
     "element": "Three commit models on one page: instant-save toggles (notifications, autocharge), the sticky `.savebar` triggered by `dirty()` on the details form, and the drawer's 'Review & confirm'",
     "finding": "One screen teaches three different rules for when a change takes effect, and the only thing distinguishing them is a sentence of body copy under the Notifications heading.",
     "user_impact": "Users who learn one model apply it to the others — either walking away from unsaved address edits or waiting for a save bar that will never appear for a toggle.",
     "suggested_fix": "Pick one commit model for the whole page, or give instantly-saved controls a persistent visual marker (inline '✓ Saved' on every one) so the two classes are distinguishable without reading prose."
    }
   ]
  }
 ],
 "ranking": [ … 11 entries … ],
 "verdict": "…"
}
```

Every payload in that round: 11 variants × per-lens cap, so the cap held *per variant* and the
payload was 11× over. No `checked`, no `evidence`, ids carry variant letters. `verify` now names
the wrapper explicitly in its error text (line 128-129) — the one piece of migration that exists.

### 5.3 `findings-log.json` — the shape that makes round 2 a delta

Real, from the payapp log, one of 22:

```json
{
  "theme": 1,
  "severity": "Critical",
  "raised_by": ["a11y:A11Y-1", "a11y:A11Y-2", "auto:AUTO-4", "auto:AUTO-3"],
  "was": "The configurator could not be operated by keyboard at all: all six switches were <span class=\"toggle\">, every field label was a <span class=\"fld-l\">, and condition rows after the first emitted an empty label.",
  "fix": "Every switch is now <input type=\"checkbox\" class=\"switch\" role=\"switch\"> inside its own <label>, named by aria-labelledby on the row title. Every field label is a real <label for>, emitted on every condition row and .sr-only after the first.",
  "verified_by": ["Space on #c-engine turns the rule on", "all selects report labels.length > 0", "AUTO-3 and AUTO-4 gates pass", "0 .toggle elements remain"]
}
```

`verified_by` is the best-designed field in the system: it records *how* the fix was proven, which
is precisely the discipline four of six `MISSES.md` entries were missing. It is **not enforced** —
`verify` only checks that `resolved` is an array. **[CONFIRMED]**

---

## 6 · Known gaps and failures, plainly

Historical, all fixed and confirmed fixed: Trust never spawning · caps per-variant · schema drift ·
no findings-log · the dead `projects/prototypes/` glob. Not repeating those. What's live:

**6.1 Recon and aggregation are bespoke per prototype.** ~24 one-off scripts in `scripts/`. Each
new prototype means writing a new 20-40 KB Playwright recon script and a new aggregator with the
themes hardcoded. The generic part of the system is one 369-line file. **This is the largest real
cost and it appears in no existing gap list.** **[CONFIRMED — `ls scripts/`]**

**6.2 The scope contract is never persisted as its own artifact.** Step 1 asks for the primary task
and the zone split "before anything is spawned." It survives only inside `statemap.json` and the
chat message. There is no `scope.json` and no gate on it, so a round can be declared and verified
without anyone checking that the zone list was ever written down or that it matches the map.
**[CONFIRMED — no such file in any round dir]**

**6.3 Two round directories exist with no round in them.** `reports/payment-application-v4/review/round-1/`
holds only `reference.json`; `reports/payment-application-ignat-v26/review/round-1/` holds
`reference.json` + `target.html`. No manifest, no statemap, no payloads. Both **untracked in git**
(`??`). So the v4 build — today's work, five commits deep — has had **no validator round at all**,
while its directory structure implies one. Nothing detects a round dir that was created and
abandoned. **[CONFIRMED — `ls` + `git status --porcelain`]**

**6.4 The most thorough round saved no prompts.** The txn round saved all 7 `prompts/*.txt`. The
payapp round saved slices but no prompts. So for the round we most rely on, what each agent
actually received is unrecoverable — only what I *intended* to send, via the slices. Prompt capture
is not in the protocol and not gated. **[CONFIRMED]**

**6.5 `MISSES.md` PROC-1 contains a false replay claim** (see section 4). Small, but it is the
failure mode the file was written to prevent, sitting inside the file.

**6.6 `verify` doesn't enforce lens-specific fields.** Trust's `claims`/`actual` and Fidelity's
`reference_gaps` are specified in the prompts and unchecked in code. The last Trust payload omitted
both and passed. **[CONFIRMED]**

**6.7 Severity is not comparable across lenses, but aggregation treats it as if it were.** Step 8
says "keep Critical and High" across all six lenses, each of which anchors Critical to a different
consequence. A Clarity Critical ("user would stop") and a UX Critical ("cannot complete the task")
enter the same bucket. No lens weighting exists. **[CONFIRMED — read step 8 + all six ladders]**

**6.8 `--expect` is unconstrained.** Nothing prevents `--expect trust,trust,trust`, or a round
declaring only UX (which `etc-message-generator/round1` did, and it PASSED). The gate checks that
what you declared arrived — never that what you declared was a sensible round. A round can be
complete, in-cap, evidenced, schema-clean **and** blind on five of six lenses. **[CONFIRMED]**

**6.9 `not_exercised` reasons are unfalsifiable.** Any string satisfies the gate. The escape hatch
that keeps the statemap gate honest is also the one that can quietly empty it.

**6.10 No calibration has ever been run.** `MISSES.md` holds regression cases specifically so
prompt changes can be tested against known bugs. One comparison has ever been done (v1 vs v2 UX on
PROTO-2, 2026-08-20). No prompt change since has been measured. Every scope line added since is
unfalsified. **[CONFIRMED — `WORKFLOW_AS_IS.md` "Still open" agrees, and no newer artifacts exist]**

**6.11 The judgement half is still unaddressed.** `MISSES.md`: four of six failures are "a claim
made before it was verified." Steps 3 and 7 fixed the mechanical half. **You noticing remains the
only backstop for the rest** — and this document found two more instances of exactly that shape
inside our own documentation (section 4).

**6.12 Scope-aware gating was designed and never built.** On 2026-08-26 you asked how to review only
the relevant flow instead of all 15 controls. I proposed diff-driven scoping — git tells us what
changed, the rest goes to `not_exercised` with an auto reason. It's 🔴 (it loosens a gate) and you
never said go. **Unbuilt, still an open ask.** **[CONFIRMED — no such code in `validator-check.js`]**

**6.13 Three protocol changes are still queued on your yes:** `PERMISSIONS.md` v2 approval (the file
still says DRAFT at line 3), scope-aware gating (6.12), and writing the `Rethink:` production-review
flow into the protocol. All three from 2026-08-26. **[CONFIRMED — read the files]**

---

## 7 · Permission tiers, current text + what's unresolved

Full text: `PERMISSIONS.md`, 106 lines, **status line still reads "DRAFT v2 — Ignat to approve."**

**The file test** — decides most cases. Tier by *who reads a file*, not who wrote it:

| The file is… | Tier | Examples |
|---|---|---|
| Read only by me, as a log | 🟢 | `memory/`, daily logs, `PROJECTS.md`, `FRICTION_REGISTER.md`, `MISSES.md` |
| Read by a validator, script, or cron as input | 🟡 **even for a typo** | `KNOWN_FRICTION.md`, `vocabulary.md`, `DESIGN_RULES.md`, token CSS, `reference.json` |
| A validator definition, the protocol, or a gate's threshold | 🔴 | `personas/validators/*.md`, `VALIDATOR_PROTOCOL.md`, caps in `validator-check.js` |

**🟢** read anything · LogRocket/Galileo queries, **up to 3 retries** then 🟡 · screenshots and
browser · web research · update log-tier files · fix typos in log-tier files only · **up to 10
parallel agents** (a normal round is 7).

**🟡, and say what changed and where** — fix something **measurably wrong** (provably off against a
token, spec or reference: off-palette colour, off-8px-grid spacing, radius > 4px, dead handler,
missing declared state, contrast below threshold — *not* "feels tight", that's 🔴) · apply findings
you approved · publish/push · **fix the query a cron runs** · add a validator scope line after you
say "you missed X" · correct a stale value in a validator-input file · **add a new check to the
harness** (a new gate can only fail more) · commit log-tier files.

**🔴** build a new screen/prototype/variant, including "improving" one you didn't mention ·
restructure or delete non-log-tier · anything leaving this machine · gateway config, approval
policies, my own instructions · a cron's schedule/target/delivery · **loosen or remove any existing
gate, cap or threshold** · install a skill · > 10 parallel agents · rewrite a validator's scope or
the protocol's shape (adding a *line* is 🟡, changing the *shape* is 🔴).

**Three overrides:** ① an unanswered question is not a yes · ② "let's continue with X" is never
permission to build · ③ **verify before any claim — absence, presence and process.** Monthly
review, first one 2026-09-26.

### Unresolved from the last review round

1. **v2 is not approved.** Everything above is a draft I'm following voluntarily.
2. **What tier is writing a bespoke recon/aggregation script?** (6.1) "Add a new check to the
   harness" is 🟡, but a 24 KB Playwright script that decides what gets exercised is more than a
   check — it *is* the coverage. Currently unplaced; I've been treating it as 🟡.
3. **What tier is `--expect`?** Choosing to run 3 lenses instead of 8 changes what gets checked as
   much as loosening a gate does, and it takes no file edit at all. Unplaced. (6.8)
4. **Retry cap lives in prose, not code.** Agreed as 3; nothing enforces it. My own argument at the
   time was that a number in a document is a suggestion and a number in a script is a limit — and
   then I put it in the document.
5. **"Report it" has no artifact.** 🟡 obliges me to tell you what changed in the same message.
   Nothing records that I did, so a missed report is undetectable — same shape as Trust's silence.
6. **Monthly review is a calendar note, not a cron.** I said it was worth a cron; there isn't one.

---

## 8 · If I had to fix three things

Not asked for, one paragraph, ignore if you want the analysis clean.

**One:** generalise recon (6.1) — it's the only gap that's costing time on every single round.
**Two:** persist the scope contract as `scope.json` and gate it (6.2) — it's the cheapest fix here
and it's the step where a round goes wrong before any agent runs. **Three:** run one calibration
pass against the PROTO-2 regression cases (6.10), because until one exists every prompt change we
make — including all six scope lines added since 2026-08-20 — is unfalsifiable, and this document
is full of confident claims about lenses whose sharpness has never been measured.
