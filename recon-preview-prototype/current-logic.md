# Transaction Reconciliation — Current Page Logic

**Source:** Live audit of `https://demo.synderapp.com/ui/transactionReconciliation/result/rec_7487e8c9c991416684cdb375859c1761`
**Date:** 2026-04-10
**Method:** Playwright automation — hover, click, and DOM inspection
**Framework:** React + MUI (Material UI) — `MuiDataGrid`, `MuiDialog`, `MuiTooltip`, custom CSS

---

## Page Header

### Title Row
- **X (close)** — top-left, returns to reconciliation list
- **"Reconciliation results"** — breadcrumb label (static text, not a link)
- **"Refresh data"** — top-right, outlined button
  - 🟡 **Tooltip text:** *"Create a new reconciliation for the same time period and same accounts."*
  - 🔴 **MISMATCH:** Label says "Refresh" but action creates a brand new reconciliation run. Users expect "refresh" to update the current view, not start over.

### Below title
- **Page H1** — e.g., "Stripe mzkt.by" — the account reference name
- **Status badges** (next to H1):
  - 🟢 **Finished** — tooltip: *"Matching successfully finished."*
  - 🟡 **Not reconciled** — tooltip: *"Reconciliation is not ready. Resolve or ignore discrepancies to finish reconciliation."*
    - 🔴 **COPY ISSUE:** Says "discrepancies" but there are also "not matched" items. Imprecise.

- **Subtitle line:** `mzkt.by (Stripe) / Jan 1 - 31, 2026` — integration display name + date range

- **Page-level buttons (right side):**
  - **Process log** — outlined button — ❌ **NO TOOLTIP**. Unclear what it does until clicked.
  - **Export ▾** — dropdown with options:
    - Export matched
    - Export discrepancy
    - Export not matched
    - Export ignored
    - Export all
    - ❌ **NO TOOLTIPS on individual options.** Format (CSV? XLSX?) not indicated.

---

## Warning Banner

- **Text:** "Resolve all transactions in Not matched and Discrepancy to finish reconciliation."
- **Icon:** ⚠ amber triangle
- **Dismissable:** X button on the right (hides banner until page reload)
- 🔴 **UX ISSUE:** The CTA is an imperative with no actionable path. On a recon with 1,359 not-matched items, "resolve all" is hostile.

---

## Tab Strip

Four tabs, each with count pill:
- **Matched** (count)
- **Discrepancy** (count)
- **Not matched** (count) ← active here
- **Ignored** (count)

- ❌ **NO TOOLTIPS on any tab.** Users don't know what "Discrepancy" vs "Not matched" mean without experimenting.
- No indication of severity/action-required state beyond the count number.

---

## Not matched Tab — Two-Panel Layout

### Dynamic panel labels (adapts to accounting platform)
- Left panel label = `"Missing in {accountingPlatform}"` — e.g.:
  - **"Missing in Synder"** when accounting = Synder (Summary mode)
  - **"Missing in accounting"** when accounting = QBO / Xero / Sage / NetSuite
- Right panel label = `"Missing in integration"` (always)

### Filter Bar (DUPLICATED per panel)
Each panel has its own independent filter bar:
- **Search** input — placeholder "Search..." — free-text
- **Date range** — two date pickers separated by "–", with calendar icons
- **Amount** — single numeric input — placeholder "Amount" (no range, no operator)
- **Apply** — primary filled blue button, applies the filter
- **Reset filters** — outlined button, clears all three fields
- ❌ **NO TOOLTIPS on any filter field.**
- 🔴 **Left and right filters do not share state** — user has to enter dates twice to filter both sides.

### Data Grid (MUI custom grid — not a native `<table>`)
Columns per panel (both identical):
1. **Checkbox** (select-all in header; select-row per row)
2. **Date** — sortable ↓
3. **Primary ID** — sortable ↓ — displayed truncated, no copy button, no hover reveal
4. **Secondary ID** — sortable ↓ — same truncation
5. **Transaction type** — sortable ↓ — e.g., "charge", "payout", "Transfer", "Expense"
6. **Amount** — sortable ↓, right-aligned, `-` prefix for negatives, currency suffix
7. **Description** — **a tiny `InfoOutlinedIcon`** (MUI) — ❗ **HOVER-ONLY text**. The actual description ("STRIPE PAYOUT", "Subscription update") is hidden behind a hover.
8. **Ignore** — blue text button on the right
   - ❌ **NO TOOLTIP** on the Ignore button. No confirmation modal. Click = immediate ignore.

### Row-level findings
- 🔴 **Description is hidden behind hover** — this is the biggest grid-level issue. Important context (e.g., "STRIPE PAYOUT" vs "Subscription update") is invisible unless you point at each row individually. 25+ info icons per page, each concealing a 1–2 word string that could just be displayed inline.
- 🔴 **IDs truncate to ~18 chars with no copy action** — users investigating have to click through to an external tool.
- 🔴 **No bulk action bar on checkbox selection** — you can select rows but nothing happens; there's no "Match selected" or "Bulk ignore" button. The checkboxes are dead UI.
- 🔴 **No manual match across panels** — you can see the same amount on both sides but can't say "these are the same".
- 🔴 **Row click does nothing** — no detail drawer, no side panel. No way to see the full record.

### Footer (per panel)
- **Rows per page:** dropdown (25 default)
- **Range indicator:** e.g., "1–25 of 44"
- **Pagination:** First / Prev / page numbers / Next / Last — standard
  - `Go to previous page` and `Go to next page` are aria-labeled but the first/last buttons are not.

---

## Bulk Actions, Matching, Escalation

- ❌ **No bulk Match action** in the UI
- ❌ **No "Mark as expected / safe to ignore"** — only raw "Ignore"
- ❌ **No grouping / clustering of similar items**
- ❌ **No totals** — no sum of unmatched amounts anywhere on the page
- ❌ **No progress indicator** beyond the scary warning banner
- ❌ **No keyboard shortcuts** (tested: arrow keys, space, delete — none bound)

---

## Ignore Flow

- Click Ignore → row is ignored immediately (no confirmation dialog observed in the automated test)
- Ignored items move to the **Ignored** tab (count increments)
- ❓ **Un-ignore path not tested**, but the Ignored tab exists and probably has a restore action
- 🔴 **No undo toast** after ignoring. Once clicked, the row disappears from the Not matched list with no "Undo" recovery within 5s like most modern grids offer.

---

## Process log

- Not inspected fully (button has no tooltip, goal unclear from label).
- URL pattern: `/ui/transactionReconciliation/processLog/rec_XXXX`
- Likely shows the timeline of the reconciliation run (import → match → result). Not surfaced contextually on this page.

---

## Tooltip Summary (ALL captured tooltips)

| Element | Has tooltip? | Text |
|---|---|---|
| **Refresh data** button | ✅ Yes | *"Create a new reconciliation for the same time period and same accounts."* |
| **Process log** button | ❌ No | — |
| **Export** button | ❌ No | — |
| Export menu items (5×) | ❌ No | — |
| **Finished** badge | ✅ Yes | *"Matching successfully finished."* |
| **Not reconciled** badge | ✅ Yes | *"Reconciliation is not ready. Resolve or ignore discrepancies to finish reconciliation."* |
| Matched / Discrepancy / Not matched / Ignored tabs | ❌ No | — |
| Search / Date range / Amount filter fields | ❌ No | — |
| Column headers (Date, Primary ID, Secondary ID, Transaction type, Amount) | ❌ No | — |
| **Description** column icons | ✅ Yes (hover-only) | The description text ("STRIPE PAYOUT", "Subscription update", etc.) — hidden behind hover, not displayed inline |
| **Ignore** row button | ❌ No | — |
| Pagination buttons | ⚠ Partial | `Go to previous page`, `Go to next page` aria-labels only |

---

## Key Current-Logic Findings (what to keep vs fix)

### ✅ What works
1. Two-panel layout is the right model for two-sided reconciliation
2. Sortable columns (Date, Primary ID, Secondary ID, etc.)
3. Status badges with descriptive tooltips
4. Export dropdown with granular scope (matched / discrepancy / not matched / ignored / all)
5. Date range filter with two pickers (industry standard)
6. Dynamic left-panel label based on accounting platform

### 🔴 What's broken
1. **"Refresh data" label lies** — it creates a new reconciliation, not a refresh
2. **"Not reconciled" badge copy is imprecise** — says "discrepancies" when it means both discrepancy + not-matched
3. **Tabs have no tooltips** — ambiguous labels (Discrepancy vs Not matched)
4. **Description is hidden behind hover** — data that should be visible inline requires pointing at each row
5. **Two duplicated filter bars** that don't share state
6. **Checkboxes are dead UI** — no bulk action bar
7. **No manual match** across panels
8. **Ignore is one-click with no undo**
9. **No totals** anywhere
10. **Warning banner is hostile** — "resolve all" with no path forward for large counts
11. **IDs truncate without copy buttons**
12. **Row click does nothing** — no detail drawer

---

## Data model (from API)

```
GET /transactionreconciliation/api/reconciliations/{id}/results/summary
  → { matchedCount, discrepancyCount, notMatchedCount, ignoredCount,
      missingInAccountingCount, missingInPaymentPlatformCount }

GET /transactionreconciliation/api/reconciliations/{id}/results/missing-in-acc
  → paginated { items: [{ record: { id, data: { primaryId, secondaryId, amount, currency, date, type, description } } }] }

GET /transactionreconciliation/api/reconciliations/{id}/results/missing-in-pp
  → same shape
```

Notes on the data I captured (rec_7487e8c9, Jan 1–31 2026, Stripe mzkt.by):
- The 6 missing-in-pp items have `amount: null`, `date: null`, `secondaryId: "20.00"` etc. — this is because the user's accounting CSV had a broken column mapping (`gross` → SECONDARY_ID, `created` → AMOUNT, `reporting_category` → DATE). The reconciliation metadata confirms this in `reconciliation.accountingData.inputData.params.headerMappings`.
- The 44 missing-in-acc items are a single recurring Stripe subscription: 24× $21.61 charges + 15× -$21.61 daily payouts + 3× -$64.83 weekend rollups + 1× -$86.44 (4-day) + 1× -$43.22 (2-day). Mathematically consistent.
