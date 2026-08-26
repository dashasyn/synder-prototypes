# Round 1 fixes — Critical + High

All 6 Critical and 14 High findings from round 1 are fixed in
`reports/transactions-prototype/index.html`. Verified in real Chromium
(Playwright), 28 + 15 assertions, zero page errors.

| ID | Sev | Fix |
|---|---|---|
| UX-1 (ux2) | Critical | Dead ⋯ items wired to `rowSync` / `rowRollback` / `rowArchive` — same confirm + pending + result path as the bulk twins |
| DOM-1 | Critical | `Skipped` / `Excluded from sync` moved out of **Successful** into a new **Not synced** group. Successful now holds only `Synced` (6, was 8) |
| DOM-2 | Critical | Dashboard tooltip now describes the whole group: "failed, canceled, not parsed, or synced with warnings" |
| TRU-1 | Critical | `resetSelectionForScope()` on every tab / filter-apply / search / clear; bulk scope derived from `selectedIds`, never `currentRows.length` |
| TRU-2 | Critical | Unchecking the master box clears the **entire** selection, not just the visible page |
| A11Y-1 | Critical | `.row-action` → `<button>`; `.dd-item` → `<button role="menuitem">` inside `role="menu"`, focusable and keyboard-operable |
| UX-1 (ux1) | High | Status chip renders on the filter bar from load (still removable) |
| UX-2 (ux1) | High | Tab row states "Counts limited by Status: X" with one-click clear |
| UX-2 (ux2) | High | Row verbs act in place; the navigational case is relabelled "View details" |
| UX-3 (ux2) | High | `Sync now` gets a confirm naming the count and the destination |
| UX-1 (ux3) | High | Bulk bar left the `<thead>` — column headers never disappear now |
| UX-2 (ux3) | High | `Import historical data` disabled with a stated reason |
| DOM-3 | High | "accounting platform" / "accounting system" gone from the file (0 hits) |
| CLR-1 | High | Rollback dialog gains the recovery sentence: "It stays in Synder and you can sync it again." |
| CLR-2 | High | `STATUS_HELP` — plain-language explanation on every one of the 19 badges |
| TRU-3 | High | Empty state names the filters actually applied and offers the narrowest one to relax |
| TRU-4 | High | Bulk sync → per-row pending badge → per-row resolve → persistent "N synced, N failed — Review failures" |
| A11Y-2 | High | Every checkbox has an `aria-label` naming its transaction; "Select all 31" is a `<button>` |
| A11Y-3 | High | Bulk bar is `role="toolbar"`; selection count announced via `aria-live="polite"` |
| A11Y-4 | High | `role="tablist"` / `role="tab"` / `aria-selected`, arrow-key nav, partial state in the accessible name |

## Still not fixed (out of scope for Critical+High)
The 7 Medium findings, and the four AUTO- items (column sort, column gear,
pagination, rows-per-page) which were already known and tracked.

## Still untested, not clean
CSV export behaviour, and screen-reader output. The keyboard pass IS now real —
run in Chromium, tab order reaches every row action.
