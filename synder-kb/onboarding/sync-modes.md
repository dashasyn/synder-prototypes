# Choosing a Sync Mode

> Synder offers two fundamentally different ways to record sales data in accounting software. This is one of the most consequential decisions in onboarding — it affects the entire bookkeeping structure.

---

## The Two Sync Modes

### Per-Transaction Sync
One entry in accounting per individual sale.

**What gets created in books (e.g., QBO) per transaction:**
- Customer order → Sales Receipt or Invoice + Payment
- Refund → Refund Receipt
- Payout → Transfer (clearing account → bank account)
- Fee → Expense

**Best for:**
- Businesses needing granular, per-order detail
- Sellers who match specific orders to specific customers
- Moderate transaction volume (under ~50/day)
- Businesses using Smart Reconciliation (requires Per-Transaction)
- Revenue Recognition (requires Per-Transaction)

**Pros:** Full visibility into every transaction, easy to trace any order.  
**Cons:** High volume creates clutter in books. Each transaction = multiple accounting records.

---

### Summary (Daily Summary) Sync
All transactions for a day (or per payout cycle) rolled into a single Journal Entry.

**What gets created in books per summary:**
- Single Journal Entry aggregating all sales, refunds, fees, taxes for the period

**Best for:**
- Businesses prioritizing clean, simple books over per-order detail
- High-volume stores (50+ transactions/day)
- Sellers who don't need to trace individual orders in accounting
- Cash-basis accounting workflows

**Pros:** Clean books, fewer entries, faster reconciliation.  
**Cons:** Cannot trace individual orders in accounting. Smart Reconciliation not available. Less granular reporting.

---

## Summary Variants

### Daily Summary
Groups all transactions by calendar day. One journal entry per day.

### Per-Payout Summary
Groups transactions by payout cycle (e.g., each Shopify Payments or Stripe payout). One journal entry per bank deposit. 
- Available for: Shopify Payments, Stripe, other payout-based processors
- Easier bank matching — each summary = one bank line

> **Choosing between Daily and Per-Payout:** If the accounting platform or user reconciles against bank statements, Per-Payout is easier. Daily is better when day-level reporting matters more than bank matching.

---

## Decision Guide

| Need | Recommended Mode |
|------|-----------------|
| Per-order accounting detail | Per-Transaction |
| Granular customer records in books | Per-Transaction |
| Smart Reconciliation (order enrichment) | Per-Transaction |
| Revenue Recognition (RevRec) | Per-Transaction |
| High volume (50+ orders/day) | Summary |
| Simple/clean journal entries | Summary |
| Easy bank reconciliation | Summary (Per-Payout) |
| Cash-basis, no AR | Summary |
| Not sure | Per-Transaction (easier to switch away from than switch to) |

---

## When the Mode is Chosen

- **QBO / Xero users:** Prompted during onboarding immediately after connecting the accounting platform
- **Sage Intacct / NetSuite users:** Mode selection is part of the platform-specific flow
- **Post-setup:** The mode can be changed, but it requires re-syncing historical data

> ⚠️ **UX friction point:** Switching modes after historical transactions have been synced requires rolling back all previous syncs, reconfiguring settings, and re-syncing. Users often don't understand this at the time of initial selection.

---

## Mode-Specific Feature Availability

| Feature | Per-Transaction | Summary |
|---------|----------------|---------|
| Smart Reconciliation | ✅ | ❌ |
| Revenue Recognition (RevRec) | ✅ | ❌ (separate guide) |
| Per-order customer records in books | ✅ | ❌ |
| Deferred Revenue Reconciliation Report | ✅ | Separate report |
| Aggregated View / Drilldowns | N/A | ✅ |
| Close-Ready Summaries | N/A | ✅ |

---

## Switching Modes

Path: Settings → [Integration] → General → Sync Mode

> **Critical:** If you've already synced transactions in one mode, switching requires:
> 1. Rolling back all existing synced transactions in Synder
> 2. Changing the sync mode setting
> 3. Re-syncing with the new mode
>
> Failure to rollback first creates duplicate or inconsistent records in books.
