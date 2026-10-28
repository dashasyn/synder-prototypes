# Brief v2: Transaction Reconciliation — Updated Mocks Review

## What changed from v1

1. **Users can't fix anything on the results page** — they always navigate to other pages (Settings, sync history, etc.). The page is diagnostic + navigational only.
2. **Added transaction quantities** to the top banner: "2 payout syncs", "1 rolled back", "2 failed", "1 unknown"
3. **No more truncated copy** — render artifact in the previous review, now confirmed clean
4. **New screen: Reconciliation details setup page** — warning shown BEFORE the user starts reconciliation
5. **Updated chip/status colors** in the per-row variant
6. **Realistic pagination** — "1 of 1" on left, "1-10 of 1002" on right

---

## Three screens to review

### Screen 1 — Reconciliation Details (setup, pre-start)
This screen is shown BEFORE the user starts reconciliation. It's where they set up date range, platform, integration, and automation mode.

**A red-bordered warning box appears in the left (Accounting) panel only:**
- Heading (bold red): "Failed and Rolled back transactions will cause discrepancy"
- Body: "You have failed and rolled back transactions within selected period. They will cause discrepancy in reconciliation. Please check them before start reconciling."

The right (Integration) panel has NO warning — only the info box about automated file retrieval.

The "Start reconciliation" button is in the top-right corner, blue.

---

### Screen 2 — Reconciliation Results / Not matched tab — Idea A (top banner with quantities)

Banner content (amber background, left orange border, dismissable with ×):
- Header: **"There are 10 missing in accounting transactions:"** (bold amber/orange text)
- "**2 payout syncs**" (blue bold) - Enable payout processing to reconcile Stripe payouts. Go to Settings →Payouts → Enable 'Process payouts'
- "**1 rolled back**" (black bold) - Sync rolled back transactions.
- "**2 failed**" (red bold) - Sync failed transactions.
- "**1 unknown**" (orange bold) - create a journal entry in books manually to cover the difference.

Tables below: standard columns (Date, Primary ID, Secondary ID, Transaction type, Amount, Description ⓘ icon, Ignore).
**No per-row reason indicators** — only the banner. Description column kept, shows ⓘ info icon.
Left table: 5 rows visible, "1 of 1" pagination (small dataset)
Right table: 10 rows, "1-10 of 1002" pagination

---

### Screen 3 — Reconciliation Results / Not matched tab — Idea B (per-row chips + tooltips)

Same page, but no banner. The left table has an extra column replacing Description. 4 chip types:
- **"Rolled back"** — red/coral text chip
- **"Payout sync disabled"** — orange filled chip (white text)
- **"Unknown"** — gray text (2 occurrences)
- **"Excluded from sync"** — green filled chip (white text)

All four tooltips visible simultaneously (design artifact showing hover states):
1. **Rolled back tooltip:** "This transaction was rolled back in Synder. Re-sync it to your books."
2. **Payout sync disabled tooltip:** "Payouts aren't being synced. Enable payout processing in Settings → Payouts."
3. **Excluded from sync tooltip:** "The transaction wasn't sync to your books yet. Sync it again to add to accounting."
4. **Unknown tooltip:** "We couldn't detect why this is missing. You can create a manual journal entry in your books to fix it."

Primary ID / Transaction type columns are slightly more truncated in this variant due to the added column.

---

## Key context for all personas

- **Users can't fix anything on the results page itself** — every action requires navigating away (Settings, sync history, books)
- **Typical real-world volume: a few transactions per month** — not 1,000
- **Idea A** gives a scannable summary at the top with exact counts — user sees total picture first, then goes to fix
- **Idea B** gives per-row context — user sees why each row is missing without reading the full table
- **Screen 1 (setup page warning)** is a proactive prevention signal shown before the process starts — different UX job than both ideas

## Questions for personas
1. Screen 1 (setup warning): Is the pre-start warning helpful? Does the copy work? Is placing it only on the left panel confusing?
2. Idea A (banner with quantities): Do quantities help ("2 payout syncs")? Is the instruction text still too long? Are the color-coded labels (blue/black/red/orange) clear?
3. Idea B (per-row chips + tooltips): Are the chip labels clear? Do the tooltip texts give enough to act on? Is "Excluded from sync" (green) the right color for a problem state?
4. Which approach works better for a user with 3 missing transactions vs. 30 vs. 1,002?
