# How We Work — Full Workflow Description

**Purpose:** hand this to an outside reviewer (human or agent) and ask "how could this
working relationship be improved?" It describes the whole setup, not just the review
pipeline — how tasks arrive, what lands cleanly, what breaks, and where the friction is on
both sides.

Written 2026-08-19 by Dasha (the assistant), verified against the repo and memory files
rather than recalled. Companion doc: `personas/WORKFLOW_AS_IS.md` covers the validator
pipeline in detail.

---

## 1 · Who's involved

**Ignat** — UI/UX designer at Synder (accounting automation: 30+ sales platforms →
QuickBooks / Xero / Sage Intacct / NetSuite). Based in Vilnius, UTC+2/+3. Works on dense
financial screens: filter bars, bulk actions, wide tables, side sheets, money-affecting
actions.

**Dasha** — persistent AI assistant. Scope: UX research, prototype building, design QA,
copy consistency, session-replay analysis. Runs in a long-lived workspace with memory
files, so context survives between sessions. Not a code-review agent — the artifacts are
HTML prototypes and audit reports, not production code.

**Subagents** — spawned per review, each with one narrow lens. Described in the companion doc.

---

## 2 · Channel and hard constraints

- **Telegram, mostly on a phone.** This shapes everything about output. No markdown
  tables, no long documents in chat, no wall-of-text.
- **English always**, even when the topic might suggest otherwise.
- **Limited terminal comfort.** On one occasion install instructions produced "which
  server? I don't understand". Deliverables must be links and screenshots, not CLI steps.
- **Async and bursty.** Requests arrive in fragments across many short messages rather
  than as one specification.
- Work is published to a GitHub Pages hub so anything built can be opened as a URL.

---

## 3 · How tasks actually arrive

Sampling real requests from the logs, they fall into six shapes:

1. **Build a variant** — "two more variants: 5 = real quick filters, 6 = …",
   "a new filters variant modeled on Shopify's Orders index UI".
   By far the most common. Usually one or two sentences.
2. **Judgement call on a detail** — "should suggested-mapping preview rows be orange or
   white?", "should empty rows in a summaries table be openable?",
   "which is cheaper: generating screenshots or building prototypes?"
3. **Copy request** — "banner copy + a catchy header given this 7-of-8 split",
   "a shorter description of the notice explaining why some transactions aren't included",
   "what do we call the UI block listing objects created in books during sync?"
4. **Explore and analyse a real screen** — "log into the Synder demo, open the New
   reconciliation overlay, full analysis". Involves real browser work against
   `demo.synderapp.com`.
5. **Review** — "review all prototypes with validators and give feedback."
6. **Meta / process** — "how can we improve the workflow", "you were overloaded with
   information". This document came from that category.

**Vocabulary with defined meaning** (established over time, now written into config):
- "review" / "check this design" → run the validator pipeline; a URL is not required
- "let's continue with X" → **load context and report, then stop.** Not a build order
- "finish" → end-of-day: update `PROJECTS.md` + write the daily log
- "continue [project]" next morning → read `PROJECTS.md`, pick up

**Note (2026-08-20):** the review pipeline described here was reworked into v2 the day after this
document was written — enforcement moved out of prose into `scripts/validator-check.js`, a sixth
(A11Y) lens was added, and validator input was shrunk to a per-zone slice of a shared state map.
See `WORKFLOW_AS_IS.md` for what changed. The observations below about *how tasks arrive* are
unaffected.

**A formal task brief template exists** (`personas/TASK_BRIEF.md`: task name, source,
delta, required states, validators to run, focus area, known issues to ignore).
**It has never been filled in.** No completed brief exists anywhere in the repo. Neither
does any `reference.json`, which means the Jira-auto-fetch step has never produced an
artifact either. In practice tasks arrive as one-liners and the structure is inferred.

---

## 4 · What works well

- **Short, concrete build asks.** "Variant 5 = quick filters named Attention required, …"
  is unambiguous and produces good work fast. The one-liner style is not the problem.
- **Naming a reference product.** "Model it on Shopify's Orders filter UI" gives more
  usable direction than a paragraph of requirements would.
- **Direct correction.** When something is wrong he says so plainly and immediately
  ("mapping is a recurring task, not one-time"). Fast, unambiguous, no hedging.
- **Real-data grounding.** LogRocket access means findings can be checked against 9
  measured friction patterns instead of invented from theory.
- **Persistent memory.** Preferences accumulate as files rather than being re-explained.
  Nine such rules exist now, each traceable to a specific incident.
- **Iteration by variants.** Building 3–6 side-by-side options and choosing beats
  arguing about one design in the abstract. This is the strongest habit in the workflow.

---

## 5 · What is difficult

Both directions. Listed by cost, highest first.

### On the request side

1. **"Continue" is overloaded, and silence after a clarifying question is ambiguous.**
   The most expensive recurring failure. Twice a whole production-depth screen got built
   when conversation was wanted. Once was worse: a clarifying question ("which layout?")
   went unanswered, the silence was read as approval, and a full screen shipped. His
   words: "I didn't pick the layout because I just wanted to continue the conversation."
   *Now handled by a rule, but the rule exists because the signal is genuinely ambiguous.*
2. **Scope arrives in fragments.** A feature is specified across a dozen short messages,
   often with the constraint that matters most arriving last. There is no point at which
   the full requirement exists in one place, which makes "is this done?" unanswerable.
3. **Reference material arrives incomplete.** For Figma reviews, he sends the frames he
   has; identifying and requesting the missing ones (all-states matrix, per-component
   variants, cold state, tooltips, banner combinations) is left to me. Reviews of an
   incomplete frame set produce findings that are artifacts of the gap.
4. **Specs sometimes contradict themselves** and it isn't flagged. On the settings rework
   the Member-role spec was internally inconsistent and add-on prices were placeholders,
   discovered mid-build.
5. **Unstated success criteria.** "Give feedback" doesn't say whether the goal is ship
   confidence, a specific worry, or exploration — which changes what should be looked at.

### On my side

6. **Reporting from an unverified state.** The single biggest quality problem. Twice on
   one screen I reported flow-breaking findings that were artifacts of a form I hadn't
   finished filling — programmatic clicks on react-select/MUI lists fail silently, so
   dependent fields never rendered and I called them missing. He had to correct both.
7. **Trusting a test that proves nothing.** A prototype passed 60 jsdom checks while being
   completely unusable in a browser: a flat dropdown-layer list meant opening a filter
   closed its own popover. jsdom ignores layout and visibility. Related failure: asserting
   element state (`isChecked()`) rather than visibility, which passes perfectly against a
   control inside a closed panel.
8. **Over-long output.** "Very long and difficult to understand" — dense messages with
   finding IDs, per-validator rankings and severity tallies sent to a phone. Also
   "you were overloaded with information", said about me, in the same spirit as the
   complaint that started this document.
9. **Working in silence.** "You don't communicate while working, so I don't understand
   what is happening." Long silent builds read as a stall.
10. **Claiming a system doesn't exist without searching properly.** I once told him the
    validators didn't exist because I searched two directories and not the third.

---

## 6 · Repeat pattern worth noting

Every rule in section 5 exists because the same class of mistake happened at least twice.
The recurring theme on my side is **asserting something is true before verifying it**
— a field is missing, a test passed, a system doesn't exist. The recurring theme on his
side is **compression**: one-liners work brilliantly for build asks and badly for scope,
success criteria, and reference completeness.

Nothing in the current setup detects either pattern automatically. Both are caught by
Ignat noticing, which makes him the only error-checking mechanism in the loop.

---

## 7 · Questions for reviewers

1. "Continue" needs to mean two different things (resume conversation / resume work) and
   currently means one. Better vocabulary, or an explicit confirm step?
2. The task brief template is good and completely unused. Is a 7-field form simply the
   wrong instrument for someone working from a phone in fragments — should the assistant
   assemble the brief from the conversation and read it back for a yes/no instead?
3. How should an assistant treat an unanswered clarifying question? Waiting indefinitely
   is also a failure mode.
4. Ignat is currently the only mechanism that catches unverified claims. What could catch
   them before he does?
5. Reference completeness: should a review refuse to start until the frame set is
   complete, or proceed and label which findings are gap-artifacts?
6. Is "build 3–6 variants and pick" scalable, or does it defer decisions that should be
   made up front?
