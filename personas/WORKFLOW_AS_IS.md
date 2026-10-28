# Design Review Workflow — As-Is Description

**Purpose of this document:** hand it to a reviewer (human or agent) and get suggestions.
It describes what the workflow *is*, and marks honestly which parts actually execute.

Written 2026-08-19, updated 2026-08-20 after the v2 rework. Verified against the repo, not from
memory. Authoritative source for the pipeline: `personas/VALIDATOR_PROTOCOL.md` (v2). v1 is kept
at `VALIDATOR_PROTOCOL-v1-archived.md` because the audit findings below refer to it.

---

## Context

Dasha is a UX research assistant for one designer (Ignat) working on Synder — accounting
automation connecting 30+ sales platforms (Stripe, Shopify, Amazon…) to books
(QuickBooks, Xero, Sage Intacct, NetSuite). Screens are dense: filter bars, bulk actions,
wide tables, side sheets, banners, money-affecting actions.

The workflow reviews **HTML prototypes** Dasha builds, not production code. Output is a
findings list the designer acts on. Reviews run as **parallel subagents**, each given a
single "lens" prompt.

**The problem this workflow currently has:** agents receive too much context and return
generic feedback. That complaint is the reason this document exists.

---

## Two tracks

**Track 1 — Validators (default).** Five lens agents that emit coded findings
(`UX-1`, `DOM-2`…). Used for reviewing a screen. Prompts in `personas/validators/`.

**Track 2 — Personas (narrow use).** Six named characters — Sarah (accountant),
Mike (business owner), Viktor (UX), James (skeptical CFO), Priya (support),
Alex (synthesis, runs last). Used only for user-type questions
("how would a CFO read this?"), not general review.

The rest of this document describes Track 1.

---

## Track 1 pipeline — v2, step by step

Full detail in `VALIDATOR_PROTOCOL.md`. In outline:

**0 · Resolve target.** Conversation → last edited file → newest prototype → ask. State the choice
in the report so a wrong guess surfaces immediately.

**1 · Scope contract.** Primary task in one sentence; split the screen into zones (header, filters,
bulk bar, table, row actions, side sheet, pagination, banners, empty/error). More than ~8 zones →
two rounds. Multiple variants → one round each.

**2 · Build** (only for `Build + Review`), Synder tokens, all required states.

**2b · Jira auto-fetch** if a ticket is named → `reference.json`. Read-only. Request missing frames
by name before running Fidelity.

**3 · Recon pass, real browser, once.** Produces `statemap.json`: per zone, every control, its
label, and what actually happens on interaction, with screenshots. Asserts visibility and
hittability, not element state. Completes forms fully before enumerating fields. Everything
downstream reads this instead of raw HTML.

**4 · Deterministic checks, no LLM.** Fonts, colours, radii, 8px grid, contrast, dead handlers →
`AUTO-` findings that never enter a validator prompt.

**5 · Declare the round.** `validator-check.js manifest` writes what this round must produce,
before any agent is spawned.

**6 · Fan out to six lenses** — UX (5), Domain (3), Clarity (3), Fidelity (5), Trust (4), A11Y (4),
all at confidence floor 70. Each gets its zone slice of the state map, the one-sentence task, and
only the relevant friction entries; Domain/Clarity/Fidelity also get `vocabulary.md`; Trust and
A11Y get the whole map. Never raw HTML, never all nine friction entries. UX may run 3× on
high-stakes passes with cross-instance agreement tagged `corroborated`.

**7 · Verify.** `validator-check.js verify` fails the round on missing validators, schema drift,
over-cap payloads, unevidenced findings, empty coverage, or a missing findings log. **No findings
are read from a failed round.**

**8 · Aggregate.** `AUTO-` first, Critical/High only, dedupe by element, corroborated ranks first,
apply the Domain/Clarity tiebreak.

**9 · Report.** Max 7 items, plain words, no ids or tallies in chat — detail goes in the HTML
report. State which lenses ran and which were skipped.

**10 · Apply, write `findings-log.json`, publish** to GitHub Pages.

**11 · Loop,** max 3 iterations, never re-flagging anything RESOLVED.

---

## The audit that produced v2 — verified 2026-08-19

Only one validator round had left artifacts: `.synder-state/settings-rework/validators-r3/`
(2026-08-03 15:06 UTC). Contents: `ux1`, `ux2`, `ux3`, `domain`, `clarity`. What that showed:

| Finding | Detail |
|---|---|
| **Trust never ran** | Not once. The one lens written from a real bug, skipped by omission. |
| **Caps not held** | 12 + 15 + 55 + 30 + 33 = 145 findings against a cap of 20. The cap was applied per *prototype variant* (`CLR-A1`, `UX-VD3` …), not per agent. |
| **Schema drift** | A `per_prototype` wrapper and compound ids instead of the flat contract, so no stable merge step was possible. |
| **No `findings-log.json`** | Never existed anywhere in the repo. Delta mode and the never-re-flag rule had no file to read, so every round was a cold full re-review. |
| **Dead path** | The protocol saved to and globbed `projects/prototypes/<slug>/`, which does not exist. Prototypes live in `projects/<slug>/` and `reports/<slug>/`. |
| **Fidelity mostly skipped** | Legitimately, whenever no reference existed — which is most "build this" tasks. Spec drift went unchecked. |

**The single sentence that matters:** every volume-control mechanism in the protocol was an
instruction in a markdown file, and nothing verified any of them. Not a judgement failure — an
enforcement failure. There was no harness at all: no code spawned validators, truncated findings,
or wrote the log.

Caveat: earlier rounds may have run more validators and simply not saved output. The table
describes what was on disk.

---

## What changed in v2 — 2026-08-20

Ordered by leverage, which is also the order they were built.

1. **`scripts/validator-check.js`** — the first actual enforcement code in the system. Two commands:
   `manifest` declares what a round must produce *before* any agent is spawned; `verify` fails the
   round on a missing validator, unparseable output, schema drift, over-cap payloads, malformed ids,
   sub-floor confidence, empty required fields, an empty `checked` array, unevidenced findings, or a
   missing `findings-log.json`. It also checks its own downstream artifact, because a check that
   never ran looks identical to a check that passed. Replaying the 2026-08-03 round through it fails
   on all four historical counts.
2. **A declared expectation per round.** A validator that produces nothing is invisible unless you
   wrote down that it was supposed to. This is the specific fix for Trust's two-week silence.
3. **`checked` array required in every payload.** Previously a validator that inspected everything
   and one that inspected nothing both returned `[]`. Coverage is now auditable.
4. **Evidence requirement replaces the confidence floor as the real gate.** Each finding must carry
   `evidence.action` and `evidence.observed`. A confidence score is self-reported and uncalibrated;
   a reproduction step is checkable. Floors unified at 70 for all six lenses — the split at 70/75
   had no stated justification and protected nothing.
5. **Three-phase method in every lens** — inventory (enumerate, no judgement), interrogate (ask the
   lens question of each item), select (rank, cap, drop the unreproducible). v1 gave four of five
   lenses a scope list and a ban list, which is a filter, not a procedure. Trust was the exception
   and was visibly the sharpest.
6. **Input shrunk per agent.** One state map built once by a recon pass, sliced by zone; only the
   2-3 relevant `KNOWN_FRICTION` entries rather than all nine; mechanical style deviations diverted
   into `AUTO-` findings that never enter a prompt. Trust and A11Y still receive the whole map —
   their failures are cross-zone by nature.
7. **`vocabulary.md` now reaches Domain, Clarity and Fidelity.** The canonical terminology file
   existed in the workspace root and no validator had ever been given it, while two lenses argued
   about wording.
8. **Domain vs Clarity tiebreak, anchored to stakes.** On book-affecting or compliance-relevant
   terms the precise term stays and Clarity's fix becomes an added explanation — tooltip, helper
   text, "what's this?" link — never a relabel. Clarity wins outright on navigation,
   action-discovery and reassurance copy.
9. **A11Y validator added** as a sixth lens rather than folded into UX: ARIA, focus traps, tab
   order and semantics need different expertise than a cognitive-load checker. Mechanical contrast
   stays in the script.
10. **State quality assigned to UX** as a sixth scope bullet — a dead-end error state is a
    task-completion blocker, which is exactly UX's severity anchor. Fidelity stays diff-only.
11. **Dead path corrected**; one round per prototype variant, never one round covering all of them.
12. **`personas/MISSES.md`** — the failure corpus. Scope lines now come from observed failures with
    a case id and a regression prototype, instead of from theory.

## Still open

- **No calibration data.** The regression cases in `MISSES.md` exist, but no prompt change has yet
  been measured against them. Until one is, prompt edits remain unfalsifiable.
- **The recurring failure on the assistant's side is judgement, not plumbing** — claiming something
  before verifying it (see `MISSES.md`, four of six cases). Step 3 and Step 7 address the mechanical
  half. Ignat noticing is still the only backstop for the rest.
- **Zone-splitting vs cross-zone bugs.** Narrower scope makes each lens sharper, but Trust-class
  failures live *between* zones — FLT-2 was a control in one region lying about a table in another.
  Mitigated by giving Trust and A11Y the whole map and an explicit cross-zone duty; not proven.
- **`TASK_BRIEF.md` has never been filled in**, and neither has `reference.json` ever been produced.
  v2's answer is that the orchestrator assembles the brief from conversation and reads it back for a
  yes/no. Untested.

---

## The reasoning behind the v2 redesign (for reviewers to attack)

Diagnosis: the unit of work is wrong. One agent reviewing a whole dense screen, fed raw
HTML plus every observation plus all friction data, cannot be sharp. Proposal is to make
the unit **one zone × one lens, reading a structured state map instead of HTML**:

0. Scope contract — one-sentence primary task, split the page into zones (header, filters,
   bulk bar, table, row actions, side sheet, pagination, banners). More than ~8 zones →
   two reviews, not one.
1. Recon pass — one agent in a real browser builds `statemap.json`: per zone, every
   control, its label, and what actually happens on interaction. The expensive read
   happens once. **Assert visibility/clickability, not element state** — a checkbox inside
   a closed panel reports the correct state while being unusable.
2. Deterministic checks — script, no LLM: tokens, 8px grid, contrast, dead handlers.
   These never enter an agent prompt, removing most of the noise.
3. Fan out on zone × lens. Each agent gets ~one screen of facts: its zone's slice of the
   state map, its lens, the one-sentence task, only the relevant friction entries.
   Hard cap 2 findings per agent.
4. Evidence gate — a finding must cite a state-map line, the exact control, the repro
   step, and the wrong decision a user would make. Uncitable → dropped automatically.
5. Merge and rank, boosting anything two lenses hit independently.
6. Report max 7 items.

---

## Questions for reviewers

Three of v1's six questions are now answered in code (enforcement, coverage, the Domain/Clarity
tiebreak). What's genuinely still open:

1. **Zone-splitting vs cross-zone bugs.** Narrow scope sharpens each lens, but Trust-class failures
   live between zones. Giving Trust and A11Y the whole map is a patch, not a proof. Is there a
   better decomposition?
2. **Is an evidence gate that auto-drops unreproducible findings worth its false negatives?** Some
   real problems are structural and hard to demonstrate in two clicks.
3. **Six lenses, 24 findings max, 7 reaching the designer.** Is the funnel the right shape, or does
   capping per-lens systematically drop the fifth-worst problem in the sharpest lens while keeping
   the third-worst in the weakest one?
4. **How should an assistant treat an unanswered clarifying question?** Waiting indefinitely is also
   a failure mode. This has caused a real incident in both directions.
5. **What catches an unverified claim before the designer does?** Four of six entries in `MISSES.md`
   are that same shape, and v2 only addresses the mechanical half.
6. **Is "build 3-6 variants and pick" scalable**, or does it defer decisions that should be made up
   front — and does one-round-per-variant make review cost grow faster than the insight?
