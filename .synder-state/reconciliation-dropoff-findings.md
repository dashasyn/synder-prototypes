# Reconciliation drop-off: "Run reconciliation" button vs sidebar nav

**Date:** 2026-08-25 · **Source:** LogRocket Galileo AI (`vn4kxj/synder_test`) · **Window:** last 30 days (≈2026-07-26 → 2026-08-25)
**Status:** Galileo API healthy today — the 2026-08-24 500 errors have cleared. Hit HTTP 429 rate limits once; queries were spaced out from then on.

---

## Headline

**The premise did not hold up.** Users who click "Run reconciliation" on Platform transactions do *not* look like low-intent bounces. They convert to the reconciliation create flow at ~3× the rate of sidebar-nav arrivals and stay on the page longer. The short-visit, high-bounce behaviour belongs to the **sidebar cohort**, not the button cohort.

---

## Cohort definitions

| | Cohort A (button) | Cohort B (sidebar) |
|---|---|---|
| Filter | click text exactly `Run reconciliation` | click text exactly `Transaction reconciliation` |
| Sessions (30d) | **123** | **607** |

Clean ordered-funnel subset of A that genuinely started on Platform transactions: **91 sessions**.

---

## 1. Ordered funnel — the most reliable artifact

Ordered (sequential) funnel, last 30 days:

| Step | Sessions |
|---|---|
| 1. Viewed `https://go.synder.com/transaction/list` | 8,973 |
| 2. Clicked `Run reconciliation` | 91 |
| 3. Viewed `https://go.synder.com/ui/transactionReconciliation` | 91 |
| 4. Viewed `https://go.synder.com/ui/transactionReconciliation/create` | 74 |

- Step 2 → 3: **91 → 91 (100%)**. Every session that clicked the button reached the Reconciliation page.
- Step 3 → 4: **91 → 74 (81%)**. Only 17 sessions left without reaching the create flow.

**⚠️ Limit:** step 4 measures *reaching the create page*, not *submitting a reconciliation*. Whether those 74 completed is unmeasured here.

---

## 2. Time on the Reconciliation page (duration buckets)

LogRocket has **no median/mean seconds-on-page aggregation** — Galileo said so explicitly and refused to invent one. Bucketed session counts were the workaround.

**Cohort B — sidebar (n=607, buckets sum exactly to 607):**

| Bucket | Sessions | % |
|---|---|---|
| 0–10s | 377 | 62% |
| 10–30s | 126 (derived) | 21% |
| 30–60s | 62 (derived) | 10% |
| >60s | 42 | 7% |

→ Median visit is **under 10 seconds**.

**Cohort A — button (n≈123):**

| Bucket | Sessions |
|---|---|
| 10–30s | 41 |
| >60s | 26 (21%) |
| 0–10s + 30–60s combined | 56 — *split unavailable* |
| total under 61s | 97 |

→ Median bounded to **between 10s and 60s** regardless of how the 56 split. Cannot be narrowed further.

**Unavailable / caveats:**
- Exact median or mean seconds: **unavailable** for both cohorts (no such aggregation in LogRocket).
- Cohort A's 0–10s vs 30–60s split: **unavailable** — Galileo built the 0–10s metric with a URL *contains* match (returned 62, inflated by `/result/*` and `/create` child pages) while the others used exact matching. It flagged this itself rather than publishing a bad subtraction.
- Cohort B's 10–30s and 30–60s figures are **derived by subtraction** from cumulative metrics, not measured directly.

---

## 3. Where they go next

**⚠️ These are session-level co-occurrence counts, not sequential next-page counts.** A session counts if it contains the click and a visit to the destination *at any point* — possibly before the reconciliation page. Rows overlap and do not sum to cohort size. True next-page ordering: **unavailable** as a ranked list.

| Destination | A count | A % | B count | B % |
|---|---|---|---|---|
| `/ui/transactionReconciliation/create` | 106 | 86.2% | 173 | 28.5% |
| `/ui/transactionReconciliation/result/*` | 75 | 61.0% | 162 | 26.7% |
| `/transaction/list` | 91 | 74.0% | 493 | 81.2% |

- All page-visit filters require duration >1s, so instantaneous redirects are excluded.
- `/result/*` is a prefix match, not exact (variable ID in path).
- Ranked "next destination" list and "session ended here" counts: **unavailable**.

---

## 4. Rage clicks, dead clicks, errors

| Metric | Sessions (30d) |
|---|---|
| Rage clicks on Transaction Reconciliation pages | **84** (112 element buckets) |
| Dead clicks on Transaction Reconciliation pages | **27** (806 element buckets) |
| JS + network errors, all triage states | **0** |

- Rage-click metric used a genuine `rageClicked IS_TRUE` filter, **not** a frozen-frame filter (the Aug 17 silent-zero bug).
- **84 is an upper bound** — both conditions apply at session level, so the rage click may have happened on another page in the same session. Galileo estimated roughly a third of matched sessions landed directly on `/ui/transactionReconciliation` or a sub-page.
- The dead-click metric *is* page-accurate (the dead click itself was scoped to the URL pattern).
- **Top rage-clicked and dead-clicked elements: unavailable.** Per-element session counts were not returned in rankable form. The 806 dead-click buckets suggest grouping split on dynamic row/ID selectors; re-grouping by click text would be needed.
- Errors returning 0 is a real query across both triaged and untriaged states, not the untriaged-only bug from prior weeks.

---

## 5. Confound to be aware of

The `Run reconciliation` click text appears on **more than one page**. Galileo's per-URL breakdown for the click:

| Page URL | Sessions |
|---|---|
| `/ui/transactionReconciliation` | 123 |
| `/ui/transactionReconciliation/create` | 106 |
| `/transaction/list` | 91 |
| `/controlPanel/index/overview` | 64 |
| `/controlPanel/index` | 49 |

**This table is co-occurrence, not click location** — Galileo confirmed event counts cannot be grouped by page URL, only session counts can. So it does not prove where the button was clicked. Consequence: **cohort A (123) is not a pure Platform-transactions-button cohort.** The 91-session ordered funnel is the only clean measurement of the button-on-Platform-transactions path.

This also means the 86.2% `/create` co-occurrence for cohort A is partly circular — some of those sessions clicked "Run reconciliation" *on* the create page. The funnel's 81% (74/91) is the defensible figure.

---

## Expectation-mismatch vs low-intent promo traffic

Evidence points at **neither, for the button cohort**:

- 100% step 2→3 and 81% step 3→4 is not bounce behaviour.
- Longer dwell (21% over 60s vs 7% for sidebar) is not low-intent behaviour.
- Zero errors on the page argues against a broken-experience mismatch.

The drop-off profile the question describes matches **cohort B, the sidebar nav item**: 62% under 10 seconds, only 28.5% co-occurring with `/create`, and 81.2% co-occurring with the transactions list — consistent with the sidebar being hit incidentally during transaction-list work rather than starting a reconciliation task.

**Residual unknown:** whether the 74 sessions reaching `/create` actually submitted. If the real drop-off is inside the create form rather than on the landing page, none of these metrics would show it. That is the gap worth closing next.

---

## Suggested next queries

1. Ordered funnel with step 5 = reconciliation successfully created (needs a custom event or a `/result/*` arrival as proxy) — closes the "reached create ≠ started" gap.
2. Re-anchor step 1 on `/ui/transactionReconciliation` to measure create-flow drop-off cleanly, per Galileo's own suggestion.
3. Open the two rage/dead-click metric tables in the LogRocket dashboard for element rankings; re-group dead clicks by click text to collapse the 806 buckets.
4. Rebuild cohort A's 0–10s bucket with URL *is* (not *contains*) to unlock the exact median band.
