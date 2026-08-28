# LogRocket findings — Sync details page, external users only

**Run:** 2026-08-28 · Galileo chat `01a04889-4d9c-7173-a05c-5aa3f05884b1`
**Window:** 2026-05-25 → 2026-08-24 (90d) · **Filter:** email NOT containing synder.com / cloudbusinessllc / synder.service
**Basis:** 3 metrics over 10,511 sessions + 91 individually watched sessions

---

# Sync Details Page (`/sync/show/*`) — 90-Day Analysis, External Customers Only

Email exclusion applied: identified email does not contain `synder.com`, `cloudbusinessllc`, or `synder.service`.

---

## 1. Volume

[Sessions visiting /sync/show/ (last 90d, external users)](https://app.logrocket.com/vn4kxj/synder_test/metric/create?galileoChatID=01a04889-4d9c-7173-a05c-5aa3f05884b1&galileoMessageID=01a0488b-f789-744c-a01d-a77c95d7c4dc&galileoMetricIndex=0) — **10,511 sessions** visited a `/sync/show/*` URL between May 25 and August 24, 2026. Weekly volume is steady at roughly 750–915 sessions, with a peak of 969 (week of June 1) and a taper to 586 in the final partial week.

**Distinct users:** not available from this metric — session-count timeseries don't carry a unique-user aggregation. I can rebuild it as a user-count metric if you want that number.

## 2. Preceding page

[Pages visited immediately before /sync/show/ (last 90 days, excluding internal emails)](https://app.logrocket.com/vn4kxj/synder_test/metric/create?galileoChatID=01a04889-4d9c-7173-a05c-5aa3f05884b1&galileoMessageID=01a0488b-f789-744c-a01d-a77c95d7c4dc&galileoMetricIndex=2) is the path analysis ending on `https://go.synder.com/sync/show/*`. From the 91 sessions I watched, the entry paths are heavily concentrated:

| Previous page | Approx. share of watched sessions |
| - | - |
| `/transaction/list` (Platform transactions) | ~65% |
| Dashboard / synchronization issues tab ("Fix issue", "Sync issues", "Not synced transactions") | ~10% |
| `/sync/list` (Syncs history) | ~3% |
| Rule execution details ("Show sync info") | ~4% |
| Organization / user admin pages | ~4% |
| Direct load or in-session refresh | ~13% |

Common triggers on the transactions list were the `Explain` link and the row-level `Sync` action ([Session #43 `00:01:02`](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a04873-7199-7fea-bb8f-354591cb6e41/0?t=1787921983142), [Session #9 `00:00:53`](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a045fa-925c-7ee3-b7df-07aca972cd94/0?t=1787880497590)).

## 3. Time on page

[Average time on /sync/show/ pages (last 90 days, external users)](https://app.logrocket.com/vn4kxj/synder_test/metric/create?galileoChatID=01a04889-4d9c-7173-a05c-5aa3f05884b1&galileoMessageID=01a0488b-f789-744c-a01d-a77c95d7c4dc&galileoMetricIndex=3) returns an **average of 22,929 ms (~22.9 s)** per `/sync/show/` page view over the window. Median and p90 aren't in this result — the metric is configured as an average percentile aggregation. I can add explicit p50 and p90 lines to that same metric if you'd like the true distribution.

## 4. Scroll depth — do they reach Sync time / Rules?

Of the 91 sessions watched, **~78 (86%) scrolled far enough to see the "Sync time" and/or "Rules" sections** at the bottom. Only about 6 sessions stayed above the fold ([Session #6](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a0437c-897a-73eb-af4c-6c8f74f52170/0), [Session #10](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a043da-8d7a-70b3-b9b1-1bf2743d4ab9/0), [Session #18](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a045c9-6173-7d83-8a50-4af65e00c7e4/0), [Session #23](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a04401-68aa-73cc-9b17-6191523e6520/0), [Session #34](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a04545-7ce9-73d9-940a-19445e644d06/0), [Session #37](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a04864-9314-7197-9cfa-06550295f8fc/0)). Reaching the bottom is the norm, not the exception ([Session #47 `00:00:40`](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a047df-09bc-78cc-a3a7-3e27b871c11f/0?t=1787912234790), [Session #39 `00:01:31`](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a0452e-ba50-7eee-80ca-a8ba9cbc4e65/0?t=1787867177436)).

## 5. Clicked elements, ranked (91 watched sessions)

| Element | Sessions clicking |
| - | - |
| Transactions list (back link) | ~30 |
| Sync again | ~14 |
| Show in QuickBooks / Show in Xero / "Show in" | ~13 |
| Sync log expand/collapse triangles & log rows | ~13 |
| Explain | ~6 |
| Syncs history | ~6 |
| Rollback sync | ~6 |
| Show (cached/imported transactions) | ~5 |
| Object / transaction ID links in sync log | ~5 |
| See execution details | ~2 |
| Ready to sync | ~2 |
| Create a rule | **0 observed** |

Notable: **"Create a rule" was never clicked** in any watched session, despite ~86% of users scrolling to the Rules section. The bottom-of-page Rules block is being seen but not acted on.

## 6. Rage and dead clicks

Rare — 3 of 91 sessions:
- **Dead clicks** on the non-interactive sync log message row "Synchronization cancelled. This transaction does not require further processing" [Session #17 `00:01:40`](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a04468-93c5-7795-835f-e25b454966dd/0?t=1787854199974)
- **Dead/rage clicks** on the static sync ID text `450151095` in the header [Session #32 `00:00:03`](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a04861-d995-740f-90f0-a9fa6c77ec70/0?t=1787920771065)
- **Rage clicks** on a "Business Validation Error" message in the sync log [Session #77 `00:15:38`](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a0451a-0a54-7921-8e4a-d91bda6b4adc/0?t=1787866668392)

The pattern is consistent: users click error/status text expecting it to expand or link to an explanation.

## 7. Repeat opens of the same sync id

[Sessions with multiple sync details visits](https://app.logrocket.com/vn4kxj/synder_test/metric/create?galileoChatID=01a04889-4d9c-7173-a05c-5aa3f05884b1&galileoMessageID=01a0488b-f789-744c-a01d-a77c95d7c4dc&galileoMetricIndex=1) — **7,129 sessions** (68% of the 10,511) visited a `/sync/show/` URL more than once in the same session. Session review shows the dominant driver is **manual refresh while waiting for a sync to finish** ([Session #35 `00:00:21`](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a043ea-c981-74f2-a6c5-3e31500f2c82/0?t=1787845877513), [Session #71 `00:19:13`](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a04498-d436-76df-af64-e7331120a88a/0?t=1787858415347), [Session #61](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a0448d-32bc-71a5-8589-958218427b32/0), [Session #46](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a04475-7d6c-7def-b4f3-39d0d7b982af/0)), plus opening the same sync across multiple tabs ([Session #5](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a0443d-10fa-72d8-b7bc-0cb2e7bf07f1/0), [Session #58](https://app.logrocket.com/vn4kxj/synder_test/s/6-01a04814-3f90-7dec-a7eb-b2f8ced92457/0)).

> Caveat: this metric counts repeat visits to any `/sync/show/` URL in a session, not strictly the identical id, so it slightly over-counts. Also note its email filter was built with only `synder.service` in the exclusion list, so it is less strictly filtered than [Sessions visiting /sync/show/ (last 90d, external users)](https://app.logrocket.com/vn4kxj/synder_test/metric/create?galileoChatID=01a04889-4d9c-7173-a05c-5aa3f05884b1&galileoMessageID=01a0488b-f789-744c-a01d-a77c95d7c4dc&galileoMetricIndex=0) and [Average time on /sync/show/ pages (last 90 days, external users)](https://app.logrocket.com/vn4kxj/synder_test/metric/create?galileoChatID=01a04889-4d9c-7173-a05c-5aa3f05884b1&galileoMessageID=01a0488b-f789-744c-a01d-a77c95d7c4dc&galileoMetricIndex=3).

---

## Recommendations

1. **Auto-refresh sync status.** 68% of sessions re-open the page, and watched sessions show repeated manual reloads while a sync is pending. Polling or a websocket status update would remove most of that.
2. **Make error/status text interactive.** All three rage/dead-click instances were on static log text. Linking validation errors and cancellation messages to an explanation would address the observed friction.
3. **Surface rule creation in context.** Users reach the Rules section but never clicked "Create a rule." Consider promoting a contextual rule suggestion next to the failing log entry rather than only at page bottom.

Session-based percentages come from the 91 sessions I reviewed, not the full 10,511 — treat them as directional. Let me know if you want the distinct-user count and true p50/p90 built out.