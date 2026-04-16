# Invoice Handling

> How Synder handles invoice syncing from payment platforms (primarily Stripe) to accounting software. Covers applying payments, open invoices, edge cases, and AR management.

---

## Invoice Handling Overview

Synder can create and manage invoices in accounting software based on platform data. The behavior depends on:
- Sync mode (Per-Transaction or Summary)
- Platform (Stripe invoices vs. Shopify orders vs. manual)
- Settings (Sync Open Invoices toggle)
- Whether an open invoice already exists in QBO/Xero

---

## Applying Payments to Open Invoices

When an invoice already exists in QBO/Xero (created manually or from another tool) and a payment comes in via a platform, Synder can automatically match and apply the payment.

**How it works:**
1. Synder imports payment from platform
2. Searches for matching open invoice in books (by customer, amount, reference number)
3. Applies payment to close the invoice

**Setup path:** Integration settings → "Apply payments to invoices" toggle

**Smart Reconciliation role:** When names differ between platforms (e.g., "John Smith" in Shopify vs. "jsmith@email.com" in PayPal), Smart Reconciliation helps match correctly.

---

## Syncing Stripe Invoice Statuses

Synder can sync Stripe invoice statuses to accounting software:
- **Draft** — not synced until paid/finalized
- **Open** — synced as unpaid invoice in QBO (Accounts Receivable)
- **Paid** — synced as paid invoice (payment applied)
- **Void/Uncollectible** — handled as voided/written-off

**"Sync Open Invoices" toggle:**
- **ON:** Synder syncs unpaid Stripe invoices to books as open AR
- **OFF:** Only paid invoices are synced; no AR aging for unpaid invoices

> **UX decision point:** Users must decide whether they want AR tracking in QBO for outstanding Stripe invoices. Turning this on creates AR aging but also exposes the "Sync Open Invoices" to detached payment issues.

---

## Partially Paid Invoices

For Stripe invoices with partial payments applied:
1. Invoice syncs as open in QBO
2. Each partial payment syncs and applies to the invoice
3. Invoice remains open with remaining balance until fully paid
4. Reconciliation must account for partial application

**Setup:** Specific settings in the Stripe integration settings for partial payment handling.

---

## $0 Invoices

Stripe can generate $0 invoices for:
- Promotional free trials that convert to paid
- Reward/credit applications
- Zero-dollar authorizations

**Synder behavior:** By default, $0 invoices may be synced as $0 Sales Receipts. Settings allow configuring whether to skip $0 invoices or handle them with custom logic.

**UX consideration:** $0 invoices clutter books but may be needed for completeness (especially for RevRec tracking of subscription lifecycle events).

---

## Stripe Detached Invoices

A Stripe-specific edge case where a payment is manually detached from one invoice and attached to another.

**What happens:**
1. Invoice #1 created and paid → Synder syncs Invoice #1 as paid
2. Payment detached from Invoice #1 in Stripe
3. Payment attached to Invoice #2
4. Invoice #1 now shows as "Open" in Stripe

**Synder behavior:**
- Invoice #1 remains closed/paid in accounting (Synder doesn't retroactively undo historical syncs)
- Invoice #2 may import but without the payment (if Sync Open Invoices is ON)
- **Result:** Books show different state than Stripe

**This is not a bug** — it's a fundamental limitation of Stripe's post-hoc payment reassignment.

**Fix:** Manual adjustment in accounting software. Cannot be automated.

**Recommendation:** Don't detach payments in Stripe if using Synder for bookkeeping.

---

## Closing Open QBO Invoices with Platform Payments

When open invoices exist in QBO and payments arrive later via Stripe/PayPal/Shopify:

1. Configure Synder to match payments to existing invoices (not create new Sales Receipts)
2. Synder searches by: customer name, invoice amount, reference number
3. If matched: payment applied, invoice closed
4. If not matched: Synder creates new Sales Receipt (potential duplicate)

**Common mismatch causes:**
- Invoice customer name ≠ payment customer name
- Invoice amount ≠ payment amount (partial payment or tip)
- Invoice number format mismatch
- Invoice already marked paid

---

## Summary Sync: Cash Basis Without AR

For users who want cash-basis accounting without AR management:

**Configuration:** Settings → Summary Sync → record sales on payment date

**Result:** Revenue recorded only when cash is received, no open invoices in books, no AR aging.

**Setup:**
- **New users:** Configure during onboarding
- **Existing users:** Settings → [Integration] → Sales → change to cash basis / no AR mode

**UX consideration:** This is a popular setting for high-volume merchants who don't do B2B invoicing. Reduces book complexity significantly.

---

## Linking Invoices to Bank Feed Deposits

For reconciling bank feeds with invoice payments:

1. Invoice paid via payment processor → stored in "Undeposited Funds" or clearing account in QBO
2. Payout arrives at bank
3. Synder creates Transfer (clearing → bank)
4. In QBO Banking, match the bank feed deposit to the transfer

**Manual steps still required** if invoices were created outside Synder.

---

## B2B / Net Payment Terms (Shopify)

For Shopify B2B orders with net payment terms (Net 30, Net 60, etc.):

- Orders are paid later, not at checkout
- Setting **"Sync Open Invoices"** required in Synder Shopify settings
- Without it, these orders won't appear in Synder until payment arrives (which may be weeks later)

---

## QBO "Automatically Apply Credits" Conflict

QBO has a setting "Automatically Apply Credits" that can conflict with Synder:

**The problem:** When QBO auto-applies credits to invoices, it can interfere with how Synder applies payments — creating mismatches or closing the wrong invoices.

**Synder warning:** A warning appears in Synder settings if this QBO setting is detected as enabled.

**Fix:** Go to QBO Settings → Advanced → Automation → Disable "Automatically apply credits."

---

## Invoice-Related Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Invoice number is not matching" | Reference numbers don't align | Check invoice doc number in accounting; adjust numbering settings |
| "Payment is not matched with Invoice" | Amount/customer mismatch, or invoice already paid | Verify invoice is open; check amounts and names |
| "Customer name is different in Invoice and Payment" | Cross-platform name mismatch | Enable Smart Reconciliation |
| Duplicate invoices in QBO | Running Shopify's native QB integration alongside Synder | Disable Shopify's native integration; use Synder only |
