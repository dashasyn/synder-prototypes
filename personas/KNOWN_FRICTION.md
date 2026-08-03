# Known Real Friction — Synder Production

Measured from LogRocket. Pass relevant entries to validators so they check designs against real user behavior instead of reasoning from first principles.

**Update this file whenever the weekly friction report surfaces something new.** Last updated: 2026-08-03.

---

## KF-1 · Reload button hammering — #1 rage-click magnet

Users repeatedly click "Reload" on the transactions list and summaries during import / sync / rollback in-progress states. 56 sessions on `/index` pages.

**Root cause:** in-progress states give no progress feedback, so users assume the page is stale.

**Check in new designs:** does any long-running operation show real progress and a terminal state? Is there a manual Reload button that exists only because progress isn't communicated?

---

## KF-2 · Import → Sync drop-off — 97.2%

Of 848 sessions that reach "Import to Synder", only 24 ever click "Sync to books". Overall funnel 1.9%. Preceding step also drops 33.5% (1,275 → 848).

**Root cause (hypothesis):** users believe importing is the whole job. Syncing is a separate, unsignposted action. Compounded by mapping errors — the #1 sync failure cause.

**Check in new designs:** after a step completes, is the next required action obvious and adjacent? Does the UI ever imply the job is done when it isn't?

---

## KF-3 · Date picker month-by-month arrows

Users click "Previous Month" 20–30 times to reach a date 1–2 years back. No year or month jump. Appears in onboarding and import flows.

**Check in new designs:** any date picker covering historical ranges needs direct month/year selection.

---

## KF-4 · Onboarding stepper labels are dead clicks

"Tell us about you", "Provide business details" — densest dead-click zone in the product. Users expect step labels to navigate; they don't.

**Check in new designs:** are step indicators clickable, or clearly styled as non-interactive? Anything that looks like a nav target should be one.

---

## KF-5 · Unresponsive Actions dropdown

"Actions" dropdown on the transactions list is unresponsive across multiple sessions.

**Check in new designs:** prefer a contextual bulk bar on selection over a hidden Actions menu.

---

## KF-6 · Matching ID links and copy icons

Reconciliation results: 3–10+ rage clicks per session across 16 sessions on matching-ID links and copy icons.

**Check in new designs:** copy actions need immediate visible confirmation. IDs styled as links must actually navigate.

---

## KF-7 · Tab and dropdown filtering the same dimension

Summaries list has both status tabs and a status dropdown. Tabs get ~986 clicks/30d; the dropdown gets ~0 direct clicks. Switching a tab silently discards the dropdown value **without resetting its display** — the UI shows "Failed" while listing Ready-to-sync rows.

**This is the origin of the Trust Validator.**

**Check in new designs:** never two controls on one dimension without defined, visible precedence.

---

## KF-8 · Product Mapping "Create" blocked

"Press Enter to add a product" error blocks the Create action. Users don't discover the required keystroke.

**Check in new designs:** never require an undiscoverable keystroke to commit a value. Clicking the primary button must work.

---

## KF-9 · Sync failures dominate, not JS errors

No tracked JS/network exceptions. All friction is sync failures. Top causes in order: insufficient or missing account mappings, multi-currency not enabled in QBO/Xero, closed accounting periods, lost QBO Desktop/Xero authorization, missing products / tax codes / fee categories.

Outliers seen: one org with 19,841 canceled sync issues under a generic "Other" error; a 10,002-transaction import backlog; one session with 591 failed syncs.

**Check in new designs:** does the design surface *which* precondition failed and how to fix it? Generic "Other" errors are a known dead end. Does it handle hundreds or thousands of failures without collapsing?

---

## Baseline (week of Jul 28 – Aug 3, 2026)

- 266 sessions with rage clicks, 150 with dead clicks
- ~1,036 sessions/day on weekdays
- Reconciliation: landing → create 73.6% drop (795 → 210); create → result 54.8% drop (210 → 95)
- Onboarding: page → role selector 54.1% drop (61 → 28), then 96.4% reach Connect

**Caveat:** Galileo samples sessions (107 for clicks, 155 for errors), not full traffic. Drop-off funnels were 30-day, not 7-day. Treat as directional.
