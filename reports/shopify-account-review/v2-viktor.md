# Viktor Harsch — v2 UX Review
*Reconciliation: Setup Warning + Results Variants A/B*

---

## Screen 1 (Setup warning) — 4/10

The warning exists. That's the only compliment.

**Problems:**

1. **Warning is left-panel-only, button is top-right.** The user's eye exits the warning, scans nothing, and clicks "Start reconciliation" without connecting the two. The spatial relationship is broken. Stripe's pre-action warnings appear directly above the CTA or disable it.

2. **CTA has zero friction.** The button is blue, fully active, and says nothing. A warning that doesn't gate or challenge the action is decoration. At minimum: change button label to "Start anyway" or add an inline checkbox ("I acknowledge failed transactions may cause discrepancy").

3. **No link to fix the problem.** "Please check them before start reconciling" — check *where*? Sync history? The failed transactions list? This warning asks the user to act, then gives them nothing to act on.

4. **Grammar error + passive phrasing.** "before start reconciling" is broken English. The whole body reads like machine translation. Users lose trust.

5. **Duplicate concept in the body.** "discrepancy" appears in both the heading and body sentence. Cut one.

---

## Screen 2 (Idea A — banner with quantities) — 6/10

The counts are the right call. Knowing "2 payout syncs, 1 rolled back" before reading 1,002 rows is real signal. This is directionally correct.

**Problems:**

1. **Banner text is a wall.** Four items, each with a full instruction sentence, creates ~60 words in a notification box. Xero and QuickBooks use banners for *summary only* — instructions live in tooltips or a linked help article.

2. **"1 rolled back" in black bold.** Every other category gets a semantic color. Black reads as default/neutral. It will be skipped.

3. **Inline paths inside banner copy.** "Go to Settings →Payouts → Enable 'Process payouts'" is a navigation path inside a dismissible banner. If the user dismisses it, that instruction is gone. It belongs in a tooltip or modal, not here.

4. **Dismiss is destructive.** Once the × is clicked, how does the user recover the diagnosis? If there's no per-row indicator, they're flying blind on 1,002 rows.

5. **No connection between banner categories and rows.** If I click "2 payout syncs," does the table filter? No. The counts feel actionable but lead nowhere.

---

## Screen 3 (Idea B — per-row chips + tooltips) — 5/10

Per-row diagnosis is the right concept for a data table. Execution has real problems.

**Problems:**

1. **"Excluded from sync" is green.** Green = success in every major design system (Material, Polaris, Ant, Atlassian). This is a *problem* state being rendered as success. Ship this and you'll have support tickets asking why green rows need fixing.

2. **"Unknown" chip has the lowest visual weight but the worst outcome.** Gray, no fill, no icon. Yet it requires a manual journal entry — the most complex user action. Invert this: Unknown should be the loudest chip.

3. **Column addition truncates already-truncated data.** Primary ID is now "ch_3Qai9EE4…" — 4 chars less than Screen 2. The table is already at compression limits.

4. **No summary anywhere.** At 1,002 rows, 10 per page, the user has no idea the breakdown is "800 payout sync, 200 unknown." The per-row view loses the forest for the trees.

5. **Tooltip copy error.** "The transaction wasn't sync to your books yet" — broken grammar ("wasn't synced").

---

## What to ship and exactly how

**Ship a hybrid: slim banner + per-row chips.**

1. **Banner:** Summary counts only, one line each, no inline instructions. Clickable labels filter the table. Example: "10 not matched: 2 payout sync · 1 rolled back · 2 failed · 1 unknown". No full instructions in the banner.

2. **Per-row chips:** Keep the chip column. Fix colors immediately (see table below). Tooltip copy carries the fix instruction — this is where instructions belong.

3. **Setup warning (Screen 1):** Add a direct link to sync history in the warning body. Change button label to "Start anyway" when warning is active. Fix the grammar.

---

## Copy table

| Location | Current | Fix |
|---|---|---|
| Screen 1 — warning heading | "Failed and Rolled back transactions will cause discrepancy" | "You have failed or rolled-back transactions in this date range" |
| Screen 1 — warning body | "You have failed and rolled back transactions within selected period. They will cause discrepancy in reconciliation. Please check them before start reconciling." | "These will cause discrepancies. [Review failed transactions →] before you start." |
| Screen 1 — CTA (when warning shown) | "Start reconciliation" | "Start anyway" |
| Screen 2 — banner header | "There are 10 missing in accounting transactions:" | "10 transactions missing in accounting — 3 fixable automatically" |
| Screen 2 — rolled back line | "**1 rolled back** - Sync rolled back transactions." | "**1 rolled back** — Re-sync from transaction history" |
| Screen 2 — unknown line | "**1 unknown** - create a journal entry in books manually to cover the difference." | "**1 unknown** — Requires a manual journal entry in your books" |
| Screen 3 — chip | "Excluded from sync" (green) | "Excluded from sync" (gray/neutral — not green) |
| Screen 3 — chip | "Unknown" (gray, no fill) | "Unknown" (amber fill, dark text — highest urgency) |
| Screen 3 — tooltip | "The transaction wasn't sync to your books yet." | "This transaction wasn't synced to your books. Sync it again to add it to accounting." |
