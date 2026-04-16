# Sarah Chen — Accountant Feedback: Missing in Accounting Reasons UI

*Sarah Chen, CPA · 15 years · QBO power user · 40 ecommerce clients*

---

## Idea A — Assessment

The top banner is well-intentioned but falls apart in practice. As an accountant, the first thing I do when I open a reconciliation screen is triage by *root cause*, not read a generic help article. A single banner addresses zero transactions specifically — it tells me what might be wrong, but forces me to mentally map generic advice against 1,002 rows. That cognitive overhead is exactly what I'm paying a tool like Synder to eliminate.

The copy is also imprecise. "Discrepancy" and "Not matched" are used almost interchangeably in the banner text, which will confuse clients who don't live in this UI daily. And "create missing transaction in books manually" as a bullet point buries the lede — that's my last resort, not step 3.

**Workflow impact:** High friction. Three generic bullets do not scale to even 10 rows, let alone 1,002.

---

## Idea B — Assessment

This is the right direction. Inline reason chips turn a triage nightmare into a sortable, actionable list. I can instantly filter all "Payout sync" rows and fix them in one Settings trip, then knock out "Rolled back" as a batch. That's how accountants actually work — group, remediate, confirm.

Concerns: The truncated tooltip text in the chip expansion is unreadable mid-row. I don't need a sentence there — I need a clean label. Also, the dash "–" for unknown is a dead end; I need at minimum "Reason pending sync" or a re-sync trigger. The chip color (all orange) loses signal fast when every row is the same color — differentiate "fixable by user" vs. "requires manual journal entry."

**Workflow impact:** Low friction for triaging. Bulk-action buttons per reason group would make it near-perfect.

---

## Recommendation

**Ship Idea B** with these refinements:
1. Replace truncated inline tooltip text with a hover/click popover — keep the row clean
2. Differentiate chip colors: orange = user-actionable (Payout sync, Not synced), grey = accountant action required (Excluded, No match found)
3. Add a **group-by reason** control or at minimum make the "Missing reason" column sortable
4. Replace "–" with "Unknown — re-sync to diagnose" and a one-click re-sync trigger

Keep Idea A's banner only as a collapsed "?" help link — don't default it open.

---

## Copy Suggestions

| Current | Suggested |
|---|---|
| "How to fix Not matched" | "Why are these transactions missing?" |
| "Resolve all transactions in Not matched and Discrepancy to finish reconciliation." | "Clear all unmatched and amount-discrepancy items to mark this reconciliation complete." |
| "Check if the payout processing is enabled. Go to Settings → Payouts → Enable 'Process payouts'" | "Payout sync is off — Stripe payouts are not posting to your ledger. Enable in Settings → Payouts → Process payouts." |
| "Sync all not-synced transactions for the selected time period." | "Re-sync period — transactions were excluded or rolled back before posting to QuickBooks." |
| "Create missing transaction in books manually" (chip label or last-resort step) | "Post manual journal entry in QuickBooks" |
