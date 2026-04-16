# Brief: Transaction Reconciliation — "Missing in Accounting" Reasons

## Context
Synder's Transaction Reconciliation shows two panels: "Missing in accounting" (transactions in Stripe not in QBO) and "Missing in integration" (transactions in QBO not in Stripe). Users are stuck on the "Not matched" tab with 1,002 items and no idea why they're missing.

The two most common root causes are:
1. **Payout processing disabled in Synder for Stripe** — payouts exist in Stripe but were never synced to accounting
2. **Not synced / rolled-back transactions** — transactions existed in Synder but were excluded or rolled back

**Key product fact:** Per product statistics, users typically have only a **few missing transactions per month**. The 1,002 count is a worst-case / demo exaggeration. Design should work for both 3 items and 1,000+.

## Two Design Ideas from Figma

### Idea A — Top-of-page "How to fix" banner
An amber warning banner at the top of the Not matched tab with:
- **Heading (orange, bold):** "How to fix Not matched"
- **Body text:** "Resolve all transactions in Not matched and Discrepancy to finish reconciliation.
  Most common reasons for discrepancy:
  • Check if the payout processing is enabled. Go to Settings → Payouts → Enable 'Process payouts'
  • Sync all not-synced transactions for the selected time period.
  • If the transactions are still missing in accounting, create missing transaction in books manually."

One banner, three bullet points, no per-row indicators.

### Idea B — Per-row "Missing reason" column
A new column "Missing reason" added to the table. Each row gets:
- An inline chip tag: "Payout sync" (orange), "Rolled back" (orange), "Excluded from..." (orange), or "–" (dash for unknown)
- Below the chip: truncated expanded text e.g. "Enable the p… Settings. Go… Enable 'Pro…" / "The transa… books. Sync accounting…"

Both chip + explanation text shown inline per row.

## Questions for Each Persona
1. Which idea works better for YOUR use case and why?
2. What's wrong or missing in the chosen approach?
3. Suggestions for better copy for the banner/chips/tooltips
4. Any structural improvements?
