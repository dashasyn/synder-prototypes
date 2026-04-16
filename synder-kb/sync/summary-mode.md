# Summary Sync Mode

> Summary Sync aggregates all transactions for a period (daily or per-payout cycle) into a single Journal Entry in the accounting platform. The main alternative to Per-Transaction sync.

---

## How It Works

Instead of creating one accounting record per sale, Summary Sync:
1. Collects all transactions for a period (day or payout cycle)
2. Groups them by type (sales, refunds, fees, taxes, adjustments)
3. Posts a single Journal Entry to the accounting platform

**Result:** One journal entry per day (or per payout) instead of hundreds of individual transactions.

---

## Summary Variants

### Daily Summary
- Groups by calendar day
- One journal entry = one day's activity
- Date used: transaction date or payout date? → See "Date Discrepancy" section

### Per-Payout Summary
- Groups by payout cycle
- One journal entry = one bank deposit
- Easier bank reconciliation: each summary maps 1:1 with a bank statement line
- Available for: Shopify Payments, Stripe, and other payout-based processors

> **Choosing:** Per-Payout simplifies bank matching. Daily provides daily-level detail without worrying about payout timing.

---

## Summary Lifecycle / Statuses

| Status | Meaning | User Action |
|--------|---------|-------------|
| Fetching | Synder pulling transactions from platform | Wait |
| Partially Fetched | Some transactions still pending from platform | Wait; re-check |
| Fully Fetched | All transactions received, ready to sync | Review & Sync |
| Synced | Journal entry created in books | None |
| Close-Ready | Validated, approved for close | Post when ready |

> ⚠️ **Partially Fetched is common with Amazon** due to delayed settlement data. Users often mistake this for an error. Best practice: sync Amazon summaries with a 1-day delay.

---

## Viewing and Syncing a Summary

1. Left sidebar → Sync (or Summaries)
2. Select a summary from the list
3. Click **Preview** → opens Summary Preview modal
4. Review the two tabs:
   - **Summary Lines** — line-by-line breakdown (sales, fees, refunds, etc.)
   - **Aggregated View** — roll-up totals for quick validation

### Aggregated View

Groups journal lines by **Account** or **Description**. Shows Debits, Credits, Grand Total.

**Use Account view for:**
- Controller sign-off
- Payout/cash amount checks
- GL tie-out across all mapped accounts
- Preview how each account balance will change after sync

**Use Description view for:**
- Operational explanation of movement
- Variance/flux analysis
- Identifying which types of transactions (invoices, refunds, fees) drive the totals

**Export:** One-click export from Aggregated view for audit workpapers.

### Clickable Drilldowns

In Summary Lines tab: any blue debit/credit amount is clickable.

Clicking opens **Summary Line Details:**
- Exact transactions behind that line
- Columns: date, contact, processor transaction ID, type (Payment/Refund/Fee/Adjustment), amount in source currency
- Downloadable as report

**Use drilldowns for:**
- Proving a number (tie total to individual transactions)
- Mapping QA (confirm fees/refunds going to right accounts)
- Disputes (grab processor IDs instantly)
- Timezone/payout boundary checks (which transactions fell into which summary window)

---

## Date Discrepancy Issue

**The problem:** Summary date and individual transaction dates can differ.

**Why it happens:**
- Payout date ≠ transaction date (Stripe pays out 2 days after charge)
- Timezone differences between platform and Synder
- Summary is created on payout date, transactions occurred earlier

**UX impact:** Users see a "Feb 28" summary containing transactions from "Feb 25–27" and think there's a bug.

**Resolution:** This is expected behavior. The summary date reflects the payout/period, not each transaction's original date.

---

## Cash Basis Accounting Without AR

Summary Sync can be configured to record income on cash basis (payment date) without using Accounts Receivable in QBO.

**Setup options:**
- **For new users:** Configure during initial setup
- **For existing users:** Change setting in Settings → [Integration] → Sales

**Use case:** Businesses that don't want open invoice management in QBO. Revenue records when cash is received, no AR aging.

---

## Limitations of Summary Mode

- **No Smart Reconciliation** — order-level enrichment (products, tax, shipping per order) not available
- **No Revenue Recognition (RevRec)** — requires Per-Transaction mode
- **No per-customer records in books** — transactions are aggregated, not attributed to individuals
- **Less granular reporting** — can't trace a specific order in accounting

---

## Summary Mode and Reconciliation

Reconciliation in Summary mode compares summary totals against:
- Platform payout reports
- Bank statement deposits

The Aggregated View is the primary tool for this. See `sync/reconciliation.md` for full reconciliation flows.

---

## Summary Mode vs Per-Transaction Quick Reference

| Aspect | Summary | Per-Transaction |
|--------|---------|----------------|
| Entries in books | 1 per day/payout | 1 per sale + 1 fee + 1 payout |
| Order traceability | ❌ | ✅ |
| Smart Reconciliation | ❌ | ✅ |
| RevRec | ❌ | ✅ |
| High-volume friendly | ✅ | ❌ (can clutter) |
| Bank matching | Easy (per-payout) | Requires clearing account |
| Cash basis AR-free | ✅ | Limited |
