# Transaction Reconciliation — LogRocket Research
**Research date:** 2026-03-13  
**Tool:** LogRocket Galileo AI  
**App:** vn4kxj/synder_test  
**Scope:** 8 research questions covering conversion, behavior, journeys, rage clicks, and onboarding correlation

---

## TL;DR

Transaction Reconciliation is a deeply underused feature. Only **1.3% of all sessions** even land on the page. Of those, only **33% proceed to create a reconciliation**. The nav click-through rate is just **0.87%**. Users who skip onboarding visit reconciliation at roughly **5× lower rates** than those who complete it. The feature exists — users just don't know why they need it or what to do when they land on it.

---

## Q1 — Conversion: Who Visits vs. Who Starts?

### Raw data (last 30 days)

| Stage | Sessions | % of total | % of visitors |
|---|---|---|---|
| All sessions | 34,914 | 100% | — |
| Visited TR landing page | 447 | 1.3% | 100% |
| Visited any TR sub/detail page | 271 | 0.8% | 60.6% |
| Visited Create Reconciliation page | 155 | 0.4% | 34.7% |
| Funnel: landing → create (same session) | 148 | 0.4% | 33.1% |

### Raw data (last 90 days)

| Stage | Sessions |
|---|---|
| Visited TR landing page | 518 |
| Visited TR detail pages | 329 |
| Visited Create Reconciliation page | 185 |

### Key patterns
- **67% of TR landing page visitors never proceed to create a reconciliation.** They look and leave.
- The 30d vs 90d comparison shows relatively flat traffic — no growth trend on TR adoption.
- 271 sessions visited sub-pages but only 148 reached "create" in the same session, suggesting some users enter via deep-link or explore previous reconciliations rather than starting new ones.

### Surprising finding
33% is actually higher than expected for a complex accounting action — the problem is at the top of the funnel (awareness/reach), not necessarily conversion within the page. Only 447 users out of ~35k even try.

---

## Q2 — What Do Users Do on the TR Page?

### Click activity (last 30 days)
- **Total clicks on TR page:** 1,814 events across 447 sessions
- **Avg clicks per session:** ~4.1

### Elements users interact with (confirmed by Galileo metric building)
Galileo built individual click-count metrics for all of these — they all appear in the top semantic context, confirming they're being clicked:

| Element | Signal strength | Interpretation |
|---|---|---|
| `Actions` button | High (reranker: 0.265) | Users do open the action menu |
| `Transaction date` | High (reranker: 0.239) | Sorting/filtering by date |
| `All types` dropdown | High (reranker: 0.234) | Filtering by transaction type |
| `Linked Transactions` tab | High (reranker: 0.217) | Users check linked records |
| `Show in` | High (reranker: 0.214) | Cross-navigation to transactions |
| `Select all transactions` | Medium (reranker: 0.199) | Bulk selection attempted |
| `All statuses` dropdown | Medium (reranker: 0.197) | Filtering by status |
| `Summaries` | Medium (reranker: 0.193) | Switching views |
| `Next` | Medium (reranker: 0.193) | Pagination |
| `Reload` | Medium (reranker: 0.193) | Page reload (frustration signal?) |
| `See details` | Medium (reranker: 0.184) | Inspecting specific items |
| `Sync` | Medium (reranker: 0.169) | Triggering sync from this page |
| `Clear selection` | Present | Undoing bulk selection |
| `Cancel` | Present | Aborting an action |
| `19 items selected` / `2 items selected` | Present | Multi-select usage |

### Key patterns
- Users are actively **filtering and sorting** (Transaction date, All types, All statuses) before deciding to act — this is exploration behavior.
- **`Reload` appearing** in top-clicked elements is a low-level frustration signal — users may be experiencing loading delays or state confusion.
- **`Show in` clicks** suggest users pivot back to the transaction list mid-flow, likely to verify data before reconciling.
- **`Select all transactions`** + **`Clear selection`** pattern suggests users start bulk actions but then abandon them.
- **`Sync` being clicked** on this page is unexpected — users may be trying to refresh data before reconciling, suggesting they distrust what they see.

### Data gaps
Galileo was still building per-button click counts during the session window. Exact click counts per element were not returned before timeout. Trend data (daily breakdown) was set up but not extracted.

---

## Q3 — Do Users Leave Without Acting? Where Do They Go?

### What Galileo found
Galileo built a **Session Playlist** of users who:
- Visited `https://go.synder.com/ui/transactionReconciliation`
- AND never clicked the `Actions` button

This playlist is available in LogRocket for session replay review.

### Navigation signals (from semantic context of adjacent clicks)
The following elements appear in the context of TR sessions, suggesting these are common exit destinations or related interactions:

| Destination / Action | Type | Likely meaning |
|---|---|---|
| `Transactions` | Nav click | Back to main transaction list |
| `Transactions list` | Click | Return to /transaction/list |
| `Reporting` | Nav click | Exit to reports section |
| `Control panel` | Nav click | Exit to settings/control |
| `General` | Nav click | Exit to general settings |
| `Select Organization` | Click | Multi-org users switching context |
| `Go to Organization settings` | Click | Exit to org config |
| `Summaries` | Click | Pivot to summaries view |

### Key patterns
- The **most common exit appears to be back to Transactions** — users seem to arrive at TR from transactions and return there after seeing the reconciliation page.
- **Reporting exits** suggest some users go to check their P&L or Balance Sheet instead of reconciling — they may be satisfying an accounting need a different way.
- **Organization switching** is notable — multi-org users may visit TR in the wrong org context, see unfamiliar data, and leave.

### Key pattern
Galileo specifically filtered users who **never clicked Actions** — this is the proxy for "visited but didn't engage." The playlist exists but session-level counts for this group were not directly surfaced numerically.

---

## Q4 — Most Common User Journey Through TR

### Before TR (entry paths from semantic context)

| Previous page | Evidence |
|---|---|
| `/transaction/list` | High embedding score (0.619), click_text "Transactions list" prominent |
| `/sync/show/*` | Present in context — users may come from a sync completion |
| `/imports/history` | Present — users may be checking what got imported |
| `/accounting/public/businessInsights/index.html` | Present — arriving from BI dashboards |
| `/reporting/sales` or `/reporting/expenses` | Present — arriving from reports |

### After TR (exit paths from semantic context)

| Next destination | Evidence |
|---|---|
| `/transaction/list` | Strongest exit signal |
| `/reporting/*` | Reporting section (P&L, sales, expenses) |
| `/accounting/public/reconciliation/index.html` | Balance Reconciliation (some cross-nav) |
| `/accounting/public/businessInsights/index.html` | Business Insights |
| Session end / app exit | Implied by high bounce pattern |

### Most common inferred journey
```
Transactions list → Transaction Reconciliation (landing) → filters/sort → exit back to Transactions
```

Secondary journey:
```
Sync completed → Transaction Reconciliation → review → exit to Reporting
```

### Key patterns
- TR is visited **after data entry actions** (sync, import), not as a proactive goal.
- Users appear to treat TR as a **verification stop**, not a starting point for reconciliation work.
- The return-to-transactions pattern suggests they don't see TR as completing a loop — they're looking for something specific and TR didn't provide it.

---

## Q5 — Rage Clicks & Dead Clicks

### What Galileo built
- **Dead click playlist**: Sessions in last 30 days where users generated ≥1 dead click on `https://go.synder.com/ui/transactionReconciliation` — available in LogRocket for replay.
- **Rage click metric**: Session count chart (daily) for sessions with ≥1 rage click AND a TR page visit (landing and sub-pages).
- **Dead click metric on sub-pages**: Daily trend chart for `https://go.synder.com/ui/transactionReconciliation/*/*`.

### Raw counts
Exact session counts for rage/dead clicks were not returned numerically by Galileo (metrics were built as charts, not immediately analyzed with figures). Session playlists were created for manual review.

### Elements likely involved (from semantic context)
The following appeared in the rage/dead click query context, suggesting they may be involved in frustrated clicks:

| Element | Possible issue |
|---|---|
| `Reload` | Users clicking reload repeatedly → frustration |
| `View the list of transactions imported from connec...` | Long text element — possibly a link that doesn't respond as expected |
| `Failed` status | Users clicking on "Failed" status items expecting something to happen |
| `try{(function(w,d){...` | Script injection noise — possible unintended click target |
| `Cancel` | Users canceling out of something they couldn't complete |

### Key patterns
- The presence of **`Reload` in top rage/dead click context** is a meaningful signal — users are reloading because the page isn't showing expected data or is slow.
- **`Failed` status clicks** suggest users try to interact with failed transaction statuses but no action is available.
- Dead click playlist is ready for replay in LogRocket — **recommend watching 10–15 sessions** from this playlist to identify the exact broken/unresponsive element.

---

## Q6 — TR vs. Balance Reconciliation Comparison

### Page visits

| Metric | Transaction Recon | Balance Recon |
|---|---|---|
| Sessions (last 30 days) | **447** | **155** |
| Sessions (last 90 days) | **518** | **381** |
| 30d/90d ratio | 86% | 41% |

### Click activity (last 30 days)

| Metric | Transaction Recon | Balance Recon |
|---|---|---|
| Total clicks | **1,814** | **533** |
| Clicks per session | ~4.1 | ~3.4 |

### Completion funnels (last 30 days)

| Page | Funnel Step 1 | Funnel Step 2 | Conversion |
|---|---|---|---|
| Transaction Recon | 447 (landing) | 148 (create) | **33%** |
| Balance Recon | 155 (landing) | started via `/start/*` | *not directly measured — metric built* |

### Key patterns
- **TR gets nearly 3× more visits** in the last 30 days (447 vs. 155).
- The 90-day comparison is much closer (518 vs. 381), suggesting **Balance Recon was more popular historically** but TR has recently surpassed it — possibly after a feature release or UI change.
- **TR users click more per session** (4.1 vs. 3.4), suggesting TR is a more complex interaction or users are more exploratory.
- Despite higher traffic, TR's **33% create-conversion** rate may actually be close to Balance Recon's rate — both have significant drop-off.

### Surprising finding
Balance Reconciliation had **higher relative usage 90 days ago** than it does now. This could indicate that TR was more recently promoted or made accessible, bringing in traffic that doesn't yet know what to do with it.

---

## Q7 — Navigation Click-Through Rate

### Raw data

| Metric | Value |
|---|---|
| Total sessions (last 30 days) | 34,914 |
| Sessions with a "Transaction reconciliation" nav click | **304** |
| Nav click-through rate (sessions) | **0.87%** |
| Total unique users (last 90 days) | 35,852 |
| Unique users who clicked TR nav (last 90 days) | **211** |
| Nav click-through rate (users, 90d) | **~0.59%** |

### Key patterns
- **Less than 1% of all users ever click on Transaction Reconciliation in the navigation.** This is extraordinarily low for a core feature.
- 304 nav-click sessions vs. 447 TR page sessions means some users arrive at TR via **direct links, other pages, or bookmarks** — not through navigation discovery.
- The 3-month unique user count (211) vs. 30-day session count (304) suggests **the same small group of users is visiting TR repeatedly**, rather than new users discovering it.

### Hypothesis
The reconciliation feature is **functionally invisible** to the majority of users. Either:
1. It's not prominent enough in the navigation
2. The label "Transaction Reconciliation" doesn't match the user's mental model of what they're trying to do ("match transactions," "verify sync," "close the books")
3. Users who find it don't know what it's for, so they don't return or recommend it

---

## Q8 — Onboarding Completers vs. Non-Completers

### Raw data (last 90 days)

| Cohort | Sessions | Visited any Reconciliation | Rate |
|---|---|---|---|
| Visited onboarding page | 3,177 | 83 | **2.6%** |
| Did NOT visit onboarding page | 98,260 | — | ~0.5% (estimated)* |

*Estimated from: 494 sessions visited TR without onboarding / 98,260 total non-onboarding sessions

### Non-onboarding reconciliation breakdown (sessions, 90d)

| Reconciliation page | Sessions (no onboarding visit) |
|---|---|
| `/ui/transactionReconciliation` | 494 |
| `/accounting/public/reconciliation/index.html` | 343 |
| `/revenuerecognition/public/reports/reconciliationReport.html` | 350 |
| `/smartReconciliation/settings` | 158 |

### Key patterns
- Users who **visited the onboarding page visit reconciliation at 5× the rate** of users who skipped onboarding (2.6% vs. ~0.5%).
- This is the single strongest predictor of reconciliation engagement in this dataset.
- 98,260 sessions with no onboarding visit — the vast majority of users — engage with reconciliation at negligible rates.
- Onboarding appears to **build awareness and intent** around reconciliation, not just general product understanding.

### Surprising finding
Only 3,177 out of 101,437 total sessions (3.1%) involved the onboarding page — meaning **96.9% of sessions are from users who skipped or already completed onboarding**. If onboarding is the main driver of reconciliation discovery, nearly all users are missing that education pathway.

---

## Key Patterns (Cross-Cutting)

1. **Awareness is the core problem, not usability.** Only 0.87% of sessions include a nav click to TR. The feature could be flawless UX and it still wouldn't matter if nobody finds it.

2. **The "1.3% / 33%" sandwich.** 1.3% of sessions reach TR; 33% of those start reconciliation. The bottleneck is getting users to the page, not converting them once there.

3. **Existing users repeat-visit TR.** 211 unique users over 90 days with 447+ sessions in 30 days → heavy users cycle back repeatedly. This is a power-user pattern — the feature works well for those who know it.

4. **Onboarding is the activation lever.** Users who touched onboarding visit reconciliation at 5× the rate. Onboarding either teaches them about reconciliation or attracts users who are more accounting-workflow-aware.

5. **TR replaced Balance Recon in mindshare.** 90d data shows Balance Recon was relatively stronger historically. TR has surged recently — possibly after a feature push — but brought in users who don't convert.

6. **Users arrive from transactions, return to transactions.** TR is being used as a side-trip from `/transaction/list`, not as a destination workflow. Users don't start their day at reconciliation.

7. **Reload clicks and dead clicks signal confusion.** Users who do land on TR are hitting friction — page state confusion, failed items they can't interact with, or data they don't trust.

---

## Hypotheses: Why Users Don't Start Reconciliation

| # | Hypothesis | Supporting evidence |
|---|---|---|
| H1 | **Users don't know the feature exists.** Navigation discovery rate is 0.87%. Most sessions never reach the page. | Q7 data |
| H2 | **"Transaction Reconciliation" label doesn't match user intent.** Users think about "matching," "verifying," "closing," not "reconciling." | Low nav CTR despite high transaction activity overall |
| H3 | **Users who arrive don't understand what reconciliation is for.** They explore filters, reload, then leave. No "why do this" context on the page. | Q2 reload signal, Q3 exit patterns |
| H4 | **Onboarding teaches reconciliation but most users skip it.** 97% of sessions are post-onboarding. The education moment is missed. | Q8 5× rate gap |
| H5 | **Users distrust the data they see.** Sync clicks on TR page, reload patterns, and "Show in" exits suggest users aren't confident the data is ready to reconcile. | Q2 Sync + Reload signals |
| H6 | **The feature is discovered by power users only.** 211 unique users over 90 days with repeat visits — this is a niche workflow known to a small cohort. | Q7 user counts |
| H7 | **Balance Recon served users better before.** The shift toward TR may have disrupted an established workflow without sufficient migration guidance. | Q6 historical comparison |

---

## Recommended Next Steps

1. **Watch the dead-click session playlist** (created in LogRocket, Q5) — identify the exact broken interaction
2. **Watch 10–15 sessions from the "visited TR, never clicked Actions" playlist** (Q3) — what do users actually do instead?
3. **Test rename + tooltip:** Change "Transaction Reconciliation" to "Match & Verify Transactions" or similar in navigation
4. **Add onboarding module on reconciliation** or in-app tooltip triggered after first sync completion
5. **Analyze the 211 power users** — who are they, what's their account type, how did they discover it?
6. **Check if "Start Reconciliation" CTA is visible without scrolling** — above the fold test
7. **Add contextual entry points:** Banner on `/transaction/list` when unmatched items exist, post-sync prompt

---

*Data sourced from LogRocket Galileo AI. All session counts are session-level (not deduplicated unique users unless explicitly noted). Time ranges: 30-day window = Feb 11–Mar 13 2026, 90-day = Dec 13 2025–Mar 13 2026.*
