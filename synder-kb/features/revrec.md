# Revenue Recognition (RevRec)

> Synder RevRec is a GAAP/ASC 606 compliant revenue recognition module for subscription businesses. It automates deferred revenue tracking and provides reconciliation reports.

---

## What RevRec Does

For subscription businesses, cash received doesn't always equal earned revenue:
- A customer pays $1,200 for an annual subscription → only $100/month is "earned" each month
- The unearned portion must be recorded as **Deferred Revenue** (a liability)

Synder RevRec:
- Automatically calculates recognition schedules for each subscription invoice
- Creates journal entries to move revenue from Deferred Revenue → Recognized Revenue as it's earned
- Provides reports to validate deferred revenue balances
- Reconciles against your accounting platform's Deferred Revenue account

---

## Platform Requirements

- **Per-Transaction mode only** — RevRec does not work in Summary mode
- **Primary data source:** Stripe (subscriptions, invoices)
- **Secondary:** Excel import (for non-Stripe subscription data)
- **Accounting platform:** QuickBooks Online (primary support), others limited

---

## How RevRec Works

### Recognition Basis Options
- **Based on payment date:** Revenue recognition starts when payment is received
- **Based on invoice date:** Revenue recognition starts from invoice date regardless of payment

### What RevRec Tracks
- New subscriptions
- Upgrades (prorations)
- Downgrades (prorations)
- Cancellations
- One-time invoices with service periods
- Excel-imported invoices

### Journal Entries Created
RevRec creates monthly journal entries that:
- **Debit** Deferred Revenue (reducing the liability)
- **Credit** Recognized Revenue (recording earned income)

Entries are generated after each month closes (not mid-month).

---

## Setup Flow

1. Enable RevRec module for the organization
2. Connect Stripe account (or configure Excel import)
3. Define recognition settings:
   - Recognition basis (payment date or invoice date)
   - Which Deferred Revenue account to use
   - Line items to exclude (e.g., taxes)
4. RevRec begins processing historical Stripe subscription data
5. Monthly journal entries sync to QBO automatically

### Enabling RevRec for Additional Stripe Accounts
If RevRec is already enabled and a new Stripe account is connected later:
- RevRec does **not** automatically apply to the new account
- Must explicitly enable RevRec for the new Stripe connection in settings

---

## Excel Import

For businesses not using Stripe:
- Import subscription data via Excel spreadsheet
- Template provided by Synder
- Supports custom recognition schedules
- Imported invoices must hit the Deferred Revenue account with matching IDs for reconciliation to work

> ⚠️ If invoices are imported via Excel but NOT synced to QBO (no matching ID in books), the Deferred Revenue Reconciliation Report will show discrepancies.

---

## Excluding Line Items from Recognition

Certain line items should be excluded from the recognition schedule (e.g., taxes, setup fees).

**Path:** RevRec settings → Exclude line items from recognition

**Common exclusions:**
- Tax line items (to maintain GAAP compliance)
- One-time setup fees (if recognized immediately)
- Shipping

---

## Deferred Revenue Reconciliation Report

Compares QBO Deferred Revenue account balance against Synder RevRec calculations.

**Access:** Reports → Deferred Revenue Reconciliation

**Prerequisites:**
- RevRec enabled
- QBO connected
- Deferred revenue in liability accounts (current or long-term)
- If multiple Deferred Revenue accounts: must be sub-accounts of one parent

### Using the Report

1. Open the report → first time: select your Deferred Revenue account from QBO
2. Select starting reconciliation period
3. Choose months to reconcile (completed months only — current month won't match until it closes)
4. Review three columns per month:
   - **Accounting:** QBO balance sheet balance for selected account
   - **RevRec:** Synder's calculated deferred revenue ending balance
   - **Difference:** Delta between the two

5. Click a difference amount → **Detailed Comparison View:**
   - **Matched tab:** Lines aligned by ID and amount
   - **Not Matched tab:** Lines with ID matches but amount differences, or lines missing from one side

### Reconciliation Statuses

| Status | Meaning |
|--------|---------|
| Matched | All transactions aligned (ID + amount) |
| Partially Matched | Some matched, some not |
| Not Matched | No matching transactions found |
| Retrieving Data | Fetching from QBO + RevRec |
| Comparing Data | Processing comparison |
| Failed | Couldn't retrieve or process data |
| Outdated | Source data changed; needs refresh |

### Maintenance

- **Auto-refresh:** 5th of each month automatically
- **Manual refresh:** Available from any start date
- **Outdated status:** Triggers when QBO balance or RevRec data changes; manually refresh from first outdated period
- **Export:** Download RevRec Incoming Revenue (Itemized), RevRec Recognized Revenue by Entry, or QBO balance export — sent to email

---

## Debits & Credits Report

A drill-down report showing the debit/credit movements in RevRec by accounting category.

**Use case:** "Cash looks strong this month, but where does it end up in the books?" Run this report to see exactly how cash received maps to recognized vs. deferred revenue across the period.

**Columns:** Account category, Debits, Credits, Net movement

---

## Known Limitations

### QBO Doc Numbers Enabled
If QBO document numbers are enabled, transaction-level matching in the reconciliation report fails. QBO replaces Synder's transaction IDs with its own doc numbers, making ID-based matching impossible.

**Fix:** Disable Doc Numbers in QBO settings. Monthly totals still comparable, but not line-by-line.

### Multiple Deferred Revenue Accounts
The reconciliation report supports only a **single** Deferred Revenue account (or a parent with subaccounts).

**Fix:** Create a parent Deferred Revenue account and move others under it as sub-accounts.

### Current Month Totals
Don't use the report to validate the current month — RevRec journal entries are only generated after month close. Use only completed months for validation.

---

## Stripe Detached Invoice Edge Case

Stripe allows detaching a payment from one invoice and attaching it to another after the fact.

**Impact on RevRec:**
- Synder synced based on original invoice-payment relationship
- When payment is detached, Stripe changes the state but Synder doesn't rewrite historical records
- RevRec may show "Incomplete" subscription status

**With Sync Open Invoices OFF:** RevRec recognizes Invoice #1 (has payment), ignores Invoice #2 (no payment)
**With Sync Open Invoices ON:** RevRec recognizes both invoices → can result in double recognition

**Rule:** Don't detach payments in Stripe if using Synder RevRec. If required, adjust manually in accounting.

---

## RevRec + Smart Rules

Smart Rules can automate applying Classes or Locations to RevRec journal entries.

**Use case:** Auto-apply "Enterprise" class to all journal entries where the Stripe invoice has a subscription plan tagged "enterprise."

**Setup:** Smart Rules → Trigger: Journal Entry Created → Condition: [field] → Action: Set Class/Location
