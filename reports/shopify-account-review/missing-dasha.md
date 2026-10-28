# Dasha — UX Researcher Review: Missing Reasons Design

## Idea A — Assessment

The top banner pattern is familiar and low-implementation-cost, but it fails the core job. It treats 1,002 rows as if they share a single root cause — they don't. A user staring at a thousand unmatched transactions can't apply "check payout processing" uniformly without first knowing which rows that applies to. The banner is generic advice, not actionable diagnosis.

Additional friction: the three bullets are ordered by solution type, not by frequency or urgency. "Create transactions manually" is a last-resort action but sits at the same visual weight as the primary fix. The dismissible amber block also competes with the tab-level summary counts (Discrepancy 30, Not matched 10) — two places screaming "problem" with no hierarchy between them.

Verdict: Works fine for 3 missing items where one cause likely dominates. Breaks down immediately at scale or mixed-cause sets.

## Idea B — Assessment

This is the right direction. Putting the reason on the row eliminates the user's need to mentally match a global banner to individual records. The orange chips ("Payout sync", "Rolled back", "Excluded from...") create scannable pattern recognition — a user can group visually in seconds.

Problems I see: The truncated explanation text below each chip is doing too much work inside a table cell. It's unreadable at current column width and creates severe row-height inconsistency. Rows with "–" (unknown reason) are dead ends — no hint of what to do next. The column header "Missing reason" is technically correct but misses an opportunity to set expectation.

One structural concern: the table already has many columns and adding a wide "Missing reason" column forces horizontal truncation on Primary ID and Transaction type. This is visible in the screenshot — columns are already clipping.

## Recommendation

**Ship Idea B**, but simplify the cell. Show only the chip tag inline; move the explanation to a tooltip or expandable row. The full-text walkthrough (e.g., "Go to Settings → Payouts → Enable Process payouts") belongs in a tooltip triggered on hover/tap of the chip, not rendered raw in the table cell. Rows with "–" should show a "?" chip with tooltip: "We couldn't detect the reason. Check sync history."

For the 3-item case, Idea B still works — a short table with clear reason chips is cleaner than a banner that may not match the actual cause.

## Copy Suggestions

1. **Banner headline (Idea A):** "How to fix Not matched" → **"Why are these missing — and what to do"**
   *(Frames as diagnosis before prescription)*

2. **Chip label:** "Payout sync" → **"Payout not synced"**
   *(Passive noun reads as a status; verb phrase reads as an action needed)*

3. **Chip label:** "Excluded from..." → **"Excluded from sync"**
   *(Complete the phrase — truncation here loses the critical word "sync")*

4. **Unknown reason dash "–":** → **"Unknown — check sync log"**
   *(Dead end becomes a next step)*

5. **Column header:** "Missing reason" → **"Why it's missing"**
   *(More human; matches the user's mental question exactly)*
