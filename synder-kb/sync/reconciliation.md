# Reconciliation

> Synder reconciliation means comparing payment platform data against accounting records to verify they match. The process differs significantly between Per-Transaction and Summary modes.

---

## What Reconciliation Means in Synder Context

Reconciliation = confirming that what's in your books matches what happened on the payment platform. Two distinct types:

1. **Transaction reconciliation** — comparing individual platform transactions with accounting records
2. **Bank reconciliation** — confirming clearing account balances match bank deposits

---

## Per-Transaction Mode Reconciliation

### Overview
Each sale, refund, fee, and payout is individually trackable in both Synder and the accounting software. Reconciliation means verifying each matches.

### Workflow

1. **Get platform report**
   - Shopify: Analytics → Reports → "Net payments by order" → Export CSV
   - Stripe: Dashboard → Reports → Balance transactions
   - Others: Platform-specific payout/settlement reports

2. **Check Synder**
   - Filter Platform Transactions by status, date, platform
   - Verify Synced count matches expected transaction count
   - Look for any Failed, Canceled, or Ready to Sync transactions that shouldn't be there

3. **Verify in accounting software**
   - Each order = Sales Receipt or Invoice + Payment in QBO/Xero
   - Payouts = Transfer entries (clearing → bank)
   - Check clearing account balance = 0 after all payouts transferred

4. **Match bank deposits**
   - In QBO: Banking → For Review
   - Each payout transfer should match a bank statement line

### Monthly Checklist (Per-Transaction)
- [ ] All transactions synced (no unexpected "Ready to Sync" or "Pending")
- [ ] No unresolved Failed transactions
- [ ] Clearing account balances match gateway reports
- [ ] Payout/Transfer amounts match bank deposits
- [ ] Refunds accounted for with Refund Receipts
- [ ] Manual/POS/Other orders reconciled separately (they don't go through the same clearing account)
- [ ] No "Uncategorized" transactions in books

---

## Summary Mode Reconciliation

### Overview
No individual transaction records in books — only journal entries. Reconciliation compares aggregate totals between Synder summaries and platform reports.

### Key Tool: Aggregated View
The Summary Preview → Aggregated View shows totals grouped by Account or Description.

**Three-step review:**
1. **Account view** → Confirm mapped account totals align with provider/payout reports. Note variances.
2. **Description view** → Identify drivers of variances; watch for odd amounts or unexpected categories.
3. **Drill & resolve** → Click into summary lines for drilldown to individual transactions, adjust mappings/settings if needed, refresh preview, then sync.

### Workflow

1. **Open Summary Preview** for the period
2. **Aggregated View → Account** — compare grand total with platform payout report
3. **Aggregated View → Description** — review type breakdown (sales, refunds, fees, taxes)
4. **Clickable drilldowns** — click any blue amount to inspect individual transactions behind it
5. **Sync** when validated
6. **Bank match** — each synced summary (per-payout) should = one bank deposit

### Monthly Checklist (Summary Mode)
- [ ] All summaries show "Fully Fetched" (none stuck at "Partially Fetched")
- [ ] Summary totals match platform payout reports
- [ ] Journal entry amounts match bank deposits
- [ ] No date discrepancies creating mismatches (see date note below)

---

## Smart Reconciliation (Per-Transaction Mode Only)

Smart Reconciliation is a feature that automatically matches payment processor transactions with e-commerce platform orders.

**Problem it solves:** When a customer pays via PayPal on a Shopify store, Synder receives a Stripe/PayPal payment with an amount but no product details. Smart Reconciliation cross-references the order from Shopify to enrich the payment with full order detail.

**Result:** Synced record includes: customer name, product line items, tax, shipping, discounts — not just payment amount.

**Availability:**
- Per-Transaction mode only
- Not available in Summary mode
- Supported platform combinations (Shopify, WooCommerce, BigCommerce, eBay, Ecwid, Wix, Squarespace + specific payment processors)

**Access:** Settings → Main Settings → E-commerce flow settings

**Controls:** Toggle individual platform+processor combinations on/off. All valid combinations enabled by default.

**When Smart Reconciliation is NOT visible:**
- Organization uses Summary mode
- E-commerce platform doesn't support it
- No compatible payment processor connected

---

## Transaction Reconciliation Report

A dedicated report for comparing platform data against accounting records.

**Access:** Reports → Transaction Reconciliation

**What it shows:**
- Side-by-side comparison of platform transactions vs. accounting records
- Mismatches highlighted
- Drill-down to specific discrepancies

---

## Common Reconciliation Issues

### Clearing Account Doesn't Zero Out
**Cause:** Payout synced but Transfer entry created to wrong bank account, or payout amount doesn't match sum of transactions.
**Fix:** Verify bank account mapping. Check if all transactions in the payout period are synced.

### Summary Doesn't Match Bank Deposit
**Cause:** Date discrepancy (summary date ≠ transaction dates), or missing transactions.
**Fix:** Use drilldown to check which transactions are in the summary. Compare with platform payout detail report.

### "Partially Fetched" Summary
**Cause:** Platform hasn't finished delivering all transaction data (Amazon is the most common).
**Fix:** Wait and retry. For Amazon, build in a 1-day delay on syncing.

### Multi-Gateway Reconciliation
If a store accepts multiple payment methods:
- Synder creates **separate clearing accounts per payment method**
- Reconcile each gateway's clearing account only against that gateway's transactions
- Don't mix Stripe clearing with PayPal transactions

### Customer Name Mismatch Across Platforms
**Symptom:** Error "Customer name is different in Invoice and Payment"
**Cause:** Same customer appears as "John Smith" in Shopify and "jsmith@email.com" in PayPal.
**Fix:** Enable Smart Reconciliation — it matches orders and payments even when names differ.

---

## Date Discrepancies

Summary date and transaction dates often differ. This is expected:
- Payout date ≠ transaction date (Stripe pays out 2 days after charge)
- Summary is anchored to payout date; transactions occurred earlier
- Timezone mismatches can shift dates by 1 day

**Not a bug.** Inform users: the summary period covers transactions within the payout window, not necessarily on the same calendar date.
