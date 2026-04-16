# Per-Transaction Sync Mode

> Per-Transaction mode creates individual accounting records for each sale, refund, payout, and fee. Provides maximum detail and traceability at the cost of higher record volume.

---

## What Gets Created Per Transaction

| Platform Event | Created in Books |
|---------------|-----------------|
| Sale / Order | Sales Receipt **or** Invoice + Payment |
| Refund | Refund Receipt |
| Payout | Transfer (clearing account → bank account) |
| Processing fee | Expense |
| Dispute/chargeback | Expense (amount + chargeback fee) |
| Shipping label cost (Shopify) | Expense |

---

## Transaction Statuses

Every transaction in Synder has a status shown in the Platform Transactions view.

### Failed (action required)

| Status | Meaning | What to Do |
|--------|---------|------------|
| **Failed** | Sync error | Click "Explain" link for error + fix guide |
| **Rollback Failed** | Rollback hit an error | Check Explain; may need support |
| **Rule Failed** | Sync went through but Smart Rule didn't apply | Check Smart Rule settings |
| **Canceled** | Setup issue prevented sync | Click Explain; common causes below |
| **Rollback Canceled** | Rollback interrupted | Reconnect accounting software, then retry |
| **Not Parsed** | Transaction type unsupported | Create manually in books or export to Excel |

**Common "Canceled" causes:**
- Multi-currency not enabled in accounting platform or Synder
- No sync credits left on plan (wait for new period or upgrade)
- User manually canceled
- Insufficient mappings (RevRec or Summary requires complete mapping)
- Platform disconnected (Synder needed additional data from source)

### In Your Books (no action needed)

| Status | Meaning |
|--------|---------|
| **Synced** | Successfully recorded in books |
| **Synced with Warnings** | Synced but minor discrepancy noted (click Explain) |
| **Skipped** | Duplicate detected; not re-synced |

> "Synced with Warnings" is fine in 99% of cases. Example: item is inventory type in Shopify but non-inventory in QBO.

### In Progress (no action needed)

| Status | Meaning |
|--------|---------|
| **In Progress** | Currently being processed |
| **Scheduled** | Queued for sync |
| **Rollback in Progress** | Actively being removed from books |
| **Rollback Scheduled** | Queued for rollback |

### Ready to Sync (user action needed)

| Status | Meaning | What to Do |
|--------|---------|------------|
| **Ready to Sync** | Imported into Synder, not yet sent to books | Review + manually sync, or enable Auto-Sync |
| **Pending** | Payment not yet finalized by processor | Wait; Synder processes automatically |

### Deleted

| Status | Meaning |
|--------|---------|
| **Deleted** | Successfully rolled back from books |
| **Deleted with Warnings** | Rolled back but some records remain (e.g., customer record) |

---

## Explain Link

Every failed/warned transaction has an **Explain** link below the status badge. Clicking it shows:
- Full error message
- Link to relevant help article
- Links to the transaction records in accounting software

> **UX note:** The Explain link is one of the most important UI elements for error recovery. Users who miss it spend significantly more time troubleshooting.

---

## The Rollback Function

Rollback removes a synced transaction from accounting books and resets its status to "Deleted" (ready to re-sync).

**When to use:**
- Synced transaction has wrong account/amount/category
- Need to change settings and re-sync
- Accidentally synced duplicate transactions

**How to use:**
1. Find transaction in Platform Transactions
2. Three-dot menu → **Rollback**
3. Status changes to "Deleted"
4. Fix settings
5. Click Sync to re-sync with new settings

> ⚠️ **Rule:** Always Rollback in Synder before fixing issues. Never edit transactions directly in QBO/Xero — manual edits may be overwritten or cause duplicates on next sync.

---

## Auto-Sync

When enabled, Synder automatically syncs new transactions as they arrive from connected platforms.

**Behavior:**
- Works forward only (from the date enabled)
- Historical transactions require manual import + sync
- Each transaction type (Payments, Refunds, Fees) has its own auto-sync toggle
- Can be auto-disabled by Synder if connection issues occur

**Path:** Settings → [Integration] → Auto-Sync toggle

**Plan restrictions:**
- Trial users: manual sync only
- Pro plan: auto-sync paused until CSM onboarding call

---

## Smart Reconciliation (Per-Transaction Only)

When both an e-commerce platform (Shopify, WooCommerce, etc.) and a payment processor (Stripe, PayPal, etc.) are connected, Smart Reconciliation matches them automatically.

**What it adds:**
- Products and line items (not just the total)
- Tax detail
- Shipping
- Discounts
- Customer information

**Result:** Instead of syncing just "Stripe payment $150," Synder syncs "Shopify order #1234 — Product A (x2) + $12 tax + $8 shipping − $5 discount, paid via Stripe."

**Availability:**
- Per-Transaction mode only
- Not available in Summary mode
- Supported platforms: Shopify, WooCommerce, BigCommerce, eBay, Ecwid, Wix, Squarespace (each with specific processor pairings)

**Setup:** Main Settings → E-commerce flow settings (link only visible when applicable)

---

## How Transactions Flow (Clearing Account Model)

```
Sale occurs on Stripe/Shopify
        ↓
Synder creates: Sales Receipt → Clearing Account (debit)
        ↓
Payout arrives from processor
        ↓
Synder creates: Transfer → Clearing Account (credit) → Bank Account (debit)
        ↓
Net: Clearing Account = $0 (balanced)
     Bank Account = payout amount (correct)
```

**Why the clearing account exists:**
- Platform holds funds before paying out (1–3 business days typical)
- Clearing account represents funds "at the processor"
- Transfer to bank = actual bank deposit

---

## Shopify Transaction Timing

> **Critical:** Synder syncs Shopify transactions **only after the payout occurs** (typically 1–3 business days after the sale). A sale today won't appear in Synder until Shopify pays out.

This is the #1 reason users think transactions are "missing."

**Check:** Shopify → Finance → Payouts to verify payout status.

---

## Bulk Actions

In Platform Transactions view, after filtering:
1. Click "Select all transactions"
2. Actions dropdown → Sync / Rollback / Export to Excel

Useful for mass re-syncing after fixing settings, or exporting failed transactions for review.
