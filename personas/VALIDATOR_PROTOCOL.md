# Validator Protocol v2 — Orchestrator Instructions

How the orchestrator (Dasha) runs a validator round.

**What changed from v1 and why.** v1's volume controls — finding caps, the strict schema, the
resolved-findings log — were all instructions in this file, and nothing verified them. On
2026-08-03 a round produced 145 findings against a cap of 20, the Trust validator never ran, and
no `findings-log.json` was ever created. Nobody noticed for two weeks. v2 moves enforcement out of
prose and into `scripts/validator-check.js`, and shrinks each agent's input so there is less to
over-report. v1 is archived at `VALIDATOR_PROTOCOL-v1-archived.md`.

---

## Triggers

Any of these fire the pipeline — **a URL is not required**:
`Review` · `Review this` · `Review it` · `Check this` · `Check the design` ·
`Review with validators` · `Run the validators` · `Review: [name or URL]` ·
`Build + Review: [task brief]`

A Figma link or Jira ticket alone is also a valid target.

---

## Step 0 — Resolve the target, then state it

When no URL is given, resolve in this order and **say which one you picked**:

1. The prototype discussed in this conversation — the normal case
2. The file most recently edited in this session
3. Newest modified prototype in the repo — `ls -t` across `projects/*/index.html`,
   `projects/*/*.html`, `reports/*/index.html`
   *(v1 globbed `projects/prototypes/*/index.html`, which does not exist.)*
4. Ask — only if genuinely ambiguous. One question, naming the top 2 candidates.

Open the report with the resolved target so a wrong guess is caught immediately:

```
Round 1 — Platform Transactions v2
Target: projects/platform-transactions/index.html (most recent edit)
```

If the target is a local file not yet published, review the local file and note that the live URL
may lag.

---

## Step 1 — Scope contract

Write down, before anything is spawned:

- **Primary task, one sentence.** What is the user here to accomplish?
- **Zones.** Split the screen: header · filters · bulk action bar · table · row actions ·
  side sheet · pagination · banners · empty/error states. Name only the zones that exist.
- **Reference?** Figma frames or Jira ticket, or none.

If the screen has more than ~8 zones, run **two rounds** rather than one oversized pass.
If reviewing multiple prototype variants, that is **one round per variant** — never one round
covering all of them. (Merging variants is what blew the cap in v1: ids came back as `CLR-A1`,
`UX-VD3`, one payload holding ten variants' worth of findings.)

**Only for `Build + Review`:** confirm the task brief has task name, source, delta, required
states, focus area, and known issues to ignore. Assemble it from the conversation and read it
back for a yes/no — do not send Ignat a blank form; `TASK_BRIEF.md` has never once been filled in,
which says the form is the wrong instrument, not that he lacks discipline.

---

## Step 2 — Build (only for `Build + Review`)

Synder design system: Roboto, `#0053CC` primary, 8px grid, Material-based components.
Tokens: `skills/synder-explorer/references/synder-design-tokens.css`.
Save to `projects/<task-slug>/index.html` or `reports/<task-slug>/index.html`.
Include every state the brief lists.

---

## Step 2b — Jira auto-fetch (if a ticket is named)

Fetch the ticket (DIS-336, SD-17432 …) via `scripts/jira-fetch.sh` or the API. Extract title,
description, acceptance criteria, linked Figma frames, reporter. Fetch screenshots of linked
frames. Store as `reference.json` beside the prototype and pass it to Fidelity as the
authoritative spec. **Read-only** — never write to Jira or Confluence.

If frames are missing (all-states matrix, per-component variants, cold state, tooltips, banner
combinations), request them explicitly by name before running Fidelity. Reviewing an incomplete
frame set produces findings that are artifacts of the gap.

---

## Step 3 — Recon pass → `statemap.json`

One agent, **real browser**, once per round. This is the expensive read, and it happens a single
time so that no validator ever has to swallow raw HTML.

For each zone, record every control: label, type, and **what actually happens on interaction** —
before/after, with screenshots. Then:

- **Assert visibility and hittability, not element state.** `isChecked()` passes against a
  checkbox inside a closed panel: correct state, zero liveness. Record whether the control is
  still visible and clickable after the interaction.
- Record silent failures. Programmatic clicks on react-select / MUI option lists fail quietly;
  read the value back and confirm it changed.
- **Complete every form before judging what's missing.** Conditional fields render only once
  their dependencies are satisfied. Two false flow-breaking findings on the Reconciliation
  overlay came from enumerating fields on a half-filled form.

Save as `statemap.json` in the round directory. Everything downstream reads this, not the DOM.

---

## Step 4 — Deterministic checks (script, no LLM)

Extract every CSS value — fonts, colours, radii, spacing — and diff against `DESIGN_RULES.md` and
the token file. Flag wrong font, off-palette colour, radius > 4px on action buttons, spacing off
the 8px grid, contrast failures. Broken handlers and dead controls found in Step 3 land here too.

These become `AUTO-` findings and **never enter a validator prompt**. Keeping mechanical noise out
of the agents' input is half the reason feedback was generic.

---

## Step 5 — Declare the round *before* spawning

```
node scripts/validator-check.js manifest <round-dir> \
  --target "<name or URL>" --round <n> \
  --expect ux,ux,ux,domain,clarity,trust,a11y
```

Without a declared expectation, a validator that never runs is undetectable — precisely how Trust
stayed silent from 2026-08-03 until someone asked. Include `fidelity` only when a reference
exists; note in the report when it is omitted, so "skipped" never reads as "passed".

---

## Step 6 — Fan out

| Lens | File | Prefix | Cap | Floor |
|---|---|---|---|---|
| UX (incl. state clarity) | `ux-validator.md` | UX-n | 5 | 70 |
| Domain (accounting) | `domain-validator.md` | DOM-n | 3 | 70 |
| Clarity (business owner) | `clarity-validator.md` | CLR-n | 3 | 70 |
| Fidelity (vs spec) | `fidelity-validator.md` | FID-n | 5 | 70 |
| Trust (does the UI lie?) | `trust-validator.md` | TRU-n | 4 | 70 |
| A11Y (keyboard/focus/semantics) | `a11y-validator.md` | A11Y-n | 4 | 70 |

One floor for all six. The confidence number is self-reported and uncalibrated — it is not the
safety mechanism. **The evidence requirement is.**

**Two evidence modes, because "reproduce it" doesn't apply uniformly.**
- **Interaction** (UX, Trust, A11Y) — the finding is a behaviour: `evidence.action` +
  `evidence.observed`. If you can't name the click that shows it, drop it.
- **Artifact** (Domain, Clarity, Fidelity) — the finding is a string on screen:
  `evidence.quote` (copied exactly, not paraphrased) + `evidence.source` (the `vocabulary.md`
  line, accounting rule, or reference frame it violates). A quotation is the reproduction step —
  the string either appears on the page or it doesn't.

`validator-check.js` enforces the correct mode per lens.

**High-stakes passes:** run UX 3× and tag findings surfaced by 2+ instances as `corroborated`,
ranked first. Don't triple-run the narrow lenses; it wastes their 3-finding caps.

Each agent receives — and nothing more:

```
SYSTEM: [full content of the validator's .md file]

USER:
## Primary task
[one sentence]

## Your slice of the state map
[the zone(s) this agent owns — controls, labels, after-interaction behaviour.
 Trust and A11Y get the whole map: their failures are cross-zone by nature.]

## Prototype URL
[fetch only if the state map doesn't cover something]

## Canonical terminology
[vocabulary.md — Domain, Clarity, Fidelity only]

## Reference
[reference.json / Figma screenshots — Fidelity only]

## Known real friction to check against
[only the 2-3 relevant KNOWN_FRICTION entries — never all nine]

## Already resolved (do not re-flag)
[findings-log.json resolved list]

## Known issues to ignore
[from the brief, or "none"]

Return the strict JSON payload. Return NOTHING else.
```

**Never embed raw HTML in a subagent prompt.** Validators need read and fetch, never write.

**Round 2+:** send the diff — what changed since round N — plus new screenshots and the full
resolved list, not the whole state map again.

---

## Step 7 — Verify the round before reading a single finding

```
node scripts/validator-check.js verify <round-dir>
```

It fails the round on: a missing validator, unparseable output, wrong lens, schema drift
(`per_prototype` wrappers, stray top-level keys), over-cap payloads, malformed ids, sub-floor
confidence, empty required fields, an empty or absent `checked` array, unevidenced findings, and a
missing `findings-log.json`.

**If it fails, fix and re-run. Do not report findings from a failed round.** The `checked` array is
what distinguishes a validator that inspected everything and found nothing from one that inspected
nothing — without it, both return `[]`.

---

## Step 8 — Aggregate

1. Prepend `AUTO-` findings from Step 4
2. Keep Critical and High (Medium → polish list)
3. Deduplicate by element across lenses; a finding two lenses hit independently ranks first
4. Apply the Domain/Clarity tiebreak: on book-affecting or compliance-relevant terms the precise
   term stays and Clarity's fix becomes an added explanation — tooltip, helper text, "what's
   this?" link — never a relabel. Clarity wins outright on navigation, action-discovery and
   reassurance copy.
5. Tag with `iteration: N`

---

## Step 9 — Report

**Max 7 items to Ignat, in chat, in plain words.** Verdict line, then short bullets. No finding
ids, no per-validator rankings, no severity tallies — he reads these on a phone. Detail goes in
the published HTML report.

State explicitly which validators ran and which were skipped, and why.

---

## Step 10 — Apply, log, publish

1. Apply auto-fixes, then Ignat-approved fixes
2. **Write resolved findings to `findings-log.json`** at the project root — this is what makes
   round 2 a delta instead of a cold re-review
3. Rebuild, commit, push, send the GitHub Pages URL

---

## Step 11 — Loop

Max 3 iterations. Then: "3 rounds complete. Remaining: [list]. Ship or hold?"
Zero Critical/High: "All critical issues resolved. Live: [URL]"
Never re-flag anything marked RESOLVED in `findings-log.json`.

---

## Improving the validators over time

Every scope line should come from an observed failure, never from theory. Trust is the sharpest
lens because it was written from one real bug; the others were written top-down.

When something reaches Ignat that a validator should have caught:
1. Log it in `personas/MISSES.md` — what it was, which lens owned it, why it was missed
2. Add it as a scope line to that validator, citing the case id
3. Keep the prototype as a regression case, so the next prompt change can be tested against known
   bugs instead of judged by feel

Ignat's side of this is one sentence in chat. No forms, no terminal.
