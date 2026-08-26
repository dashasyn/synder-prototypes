# FRICTION REGISTER

Every problem found in production, tracked until it's fixed. **This file is the memory the weekly
report never had.**

Before Aug 26 each Monday report started from zero, so the same problem could be reported forever
and always look new. The import→sync gap led three consecutive reports and nobody noticed it was
one problem, not three findings.

## How to use it

**Weekly (the cron does this):** match this week's findings against the IDs below. Update `Seen`,
`Trend`, and `Sessions`. Add new IDs. Then report *what changed* — not the whole list again.

**Status values:** `no ticket` · `ticket open` · `in progress` · `fixed — watching` · `fixed` ·
`wontfix (reason)`

**Impact** = how close the problem is to money. A rage click on marketing is not a user failing to
sync their books.
- `blocks-money` — user cannot get data into their books
- `blocks-task` — user cannot finish what they came to do
- `friction` — slower or confusing, task still completes
- `cosmetic`

Sort by impact first, volume second. Raw counts alone let the loudest problem win instead of the worst.

---

## Open

### FR-01 · Import completes, Sync never happens
- **First seen:** 2026-08-03 · **Seen:** 3 weeks · **Trend:** flat
- **Impact:** blocks-money
- **Volume:** 639 sessions/wk imported to Synder and never clicked Sync (Aug 17). Aug 3: 848→24 (−97.2%). Aug 10: 8.68% e2e.
- **Status:** no ticket
- **What happens:** users import data, land on the transactions list, and stop. Either they think importing *is* the job, or a mapping error blocks them — mapping is also the #1 sync failure cause.
- **Note:** the −83.5% first-step drop reported Aug 17 is inflated; step 1 is just opening the list. The real number is the 639 who imported and stopped.

### FR-02 · /transaction/list is the worst page in the product
- **First seen:** 2026-08-03 · **Seen:** 2 weeks confirmed (Aug 24 run failed) · **Trend:** flat
- **Impact:** blocks-task
- **Volume:** #1 dead clicks both weeks — 104 sessions (Aug 3), 87 / 13.8% of all dead clicks (Aug 17). #2 rage clicks Aug 3 (86).
- **Status:** no ticket
- **Suspects:** Apply, Apply filter, Reset filters, Select All. Element-level attribution never resolved — Galileo returned unfiltered populations, so only page-level counts are trustworthy.
- **Note:** this is the page the filter prototypes are redesigning.

### FR-03 · Settings cluster dead clicks — one shared template
- **First seen:** 2026-08-03 · **Seen:** 2 weeks · **Trend:** flat
- **Impact:** friction
- **Volume:** 110 sessions / 17% of all dead clicks (Aug 17): /organizations/settings 40, /company/settings 36, sub-routes 34. Aug 3: 44 + 37.
- **Status:** no ticket
- **Why it matters:** three routes, one template. Likely **one** component bug, not three — cheap fix, wide effect.

### FR-04 · Reload button hammered during in-progress states
- **First seen:** 2026-08-03 · **Seen:** 1 week explicit, likely folded into FR-02 since · **Trend:** unknown
- **Impact:** friction
- **Volume:** 56 sessions on /index pages (Aug 3), #1 rage-click magnet that week
- **Status:** no ticket
- **Cause:** import/sync/rollback show no progress, so users assume the page is stale and force a reload.
- **Cross-ref:** `personas/KNOWN_FRICTION.md` KF-1

### FR-05 · Control Panel overview dead clicks
- **First seen:** 2026-08-03 · **Seen:** 2 weeks · **Trend:** slightly down
- **Impact:** friction
- **Volume:** 113 sessions (Aug 3, /controlPanel/index + /index/overview), 50 / 7.9% (Aug 17)
- **Status:** no ticket

### FR-06 · Reconciliation landing page teaches instead of configuring
- **First seen:** 2026-08-10 · **Seen:** 1 week · **Trend:** unknown
- **Impact:** blocks-task
- **Volume:** landing→create −73.6% (795→210); create→result −54.8% (210→95). 13.99% e2e.
- **Status:** no ticket
- **What happens:** users read the overview, FAQs, or video and never click Run audit. Secondary killer: Stripe/Amazon file normalization failures (unrecognized date formats, missing columns) dead-end users *after* they've committed effort — seen in 4+ sessions.

### FR-07 · Sync Issues page rising against the traffic trend
- **First seen:** 2026-08-17 · **Seen:** 1 week · **Trend:** worsening
- **Impact:** blocks-money
- **Volume:** 74→91 sessions (+23%) while total sessions fell 23%. Per-session rate 0.9%→1.5%.
- **Status:** no ticket
- **Why it matters:** the only metric moving *against* the trend. Repeat accounts suggest unresolved sync failures, not curiosity.

### FR-08 · Onboarding: friction is after Connect, not before
- **First seen:** 2026-08-10 · **Seen:** 2 weeks · **Trend:** flat
- **Impact:** blocks-money
- **Volume:** 149 → Connect 134 (−10%) → Sync/Import 75 (−44%). 50.3% e2e — healthiest of the three funnels.
- **Status:** no ticket
- **Failure mode:** "Synder couldn't retrieve necessary information to identify the company" at Connect (3 of 35 watched sessions).

### FR-09 · Date picker has no month/year jump
- **First seen:** 2026-08-03 · **Seen:** 1 week · **Trend:** unknown
- **Impact:** friction
- **Volume:** 20–30 clicks to reach a date 1–2 years back
- **Status:** no ticket
- **Cross-ref:** KF-3

### FR-10 · Onboarding stepper labels look clickable, aren't
- **First seen:** 2026-08-03 · **Seen:** 1 week · **Trend:** unknown
- **Impact:** friction
- **Volume:** 23 dead-click sessions on /onboarding/index; densest dead-click zone that week
- **Status:** no ticket
- **Cross-ref:** KF-4

---

## Instrumentation problems (not user friction — our measurement is broken)

| ID | Problem | First seen | Status |
|---|---|---|---|
| IN-01 | Rage-click metric built with a frozen-frame filter, returned 0 | 2026-08-17 | cron rewritten 2026-08-24, unverified |
| IN-02 | Funnels return 30d/90d despite a 7-day request | 2026-08-10 | cron now must state the window used |
| IN-03 | Reconciliation funnel step 1 matches marketing-site traffic, returns 0 past step 1 | 2026-08-17 | cron now scopes step 1 to app URLs |
| IN-04 | Error queries scoped untriaged-only — blind to triaged issues | 2026-08-10 | cron now asks for all states |
| IN-05 | Element-level click attribution returns unfiltered populations | 2026-08-03 | unresolved — page-level only |
| IN-06 | Galileo 500s on every query | 2026-08-24 | LogRocket-side, retry logic added |

---

## Closed

*(nothing yet — this is the line that should stop being empty)*
