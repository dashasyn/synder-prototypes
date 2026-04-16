# Viktor Harsch — Reconciliation Prototype Review
**Reviewed:** `reports/recon-preview-prototype/index.html` (Improved mode) vs `current-logic.md`
**Dataset:** `rec_7487e8c9c991416684cdb375859c1761` — 44 missing-in-acc + 6 missing-in-pp, Stripe mzkt.by, Jan 2026
**Date:** 2026-04-10

---

## Verdict (1 line)

**Iterate hard** — the core insights are real and valuable, but three of the five new UI elements introduce interaction models that don't resolve, and two of them are actively worse than what they replace.

---

## ✅ What doesn't suck

- **The column mapping error detection is the best thing in this entire prototype.** Surfacing a machine-readable API signal (`headerMappings` showing `created → AMOUNT`, `reporting_category → DATE`) as a human-readable error banner with a "Fix column mapping" CTA is exactly the right call. Current Synder ships 6 red-tinted null rows with no explanation. Users think their integration is broken. They're not wrong, but they don't know *how* to fix it. This banner saves a support ticket. Fine, this part is genuinely good.

- **Clustering the 44 items into 5 groups** (24× $21.61 charge, 15× -$21.61 payout, 3× -$64.83, 1× -$86.44, 1× -$43.22) is directionally correct. 44 lookalike rows flattened into a paginated grid is cognitive torture. The cluster model at least lets the user understand the *shape* of their problem in 10 seconds instead of 10 minutes.

- **Totals in panel headers** ("Missing in accounting · 44 items · 86.44 USD") is pure win. The current design has zero dollar-impact visibility. Adding totals takes one line of code and reduces the user's "how bad is this?" anxiety from "I have to count rows" to "I can see immediately." Revolut Business does this for every category summary. It works.

- **Bulk action bar interaction model** (hidden until items are selected, then slides in with context-sensitive buttons) is exactly the pattern Revolut Business and modern data grids use. The current design has dead checkboxes with literally no affordance for what selecting does. This is a correct fix.

- **Red tint + italic dashes for null fields** in the broken-rows cluster correctly signals "this data is structurally corrupt, not just unmatched." Visual encoding of error severity at the cell level is proper data journalism. Fine.

---

## 🔴 Critical flaws (what's broken in the Improved design)

**1. The shared filter bar has no defined scope — it's ambiguous by design**

- **Problem:** The filter bar sits above a two-panel layout. The search field says "Search by ID, amount, description..." — but search for what? Left panel? Right panel? Both? The Quick filter chips make it worse: "Charges (24)" and "Payouts (20)" are left-panel-specific, while "⚠ Broken rows (6)" is right-panel-specific. You've mixed panel-specific state into a shared control. When a user clicks "Payouts (20)" and nothing changes on the right panel (because payouts live on the left), they will assume the filter is broken.
- **Evidence:** `renderImproved()` in `index.html` — shared filter chips are rendered in one block with no visual scope separator. The filter bar `<div class="shared-filter">` contains no label indicating which panels it controls. The current design's duplicated bars were wasteful but unambiguous — you always knew which side you were filtering.
- **Fix:** Add a scope selector: "Filter: [Both panels ▾]" as a dropdown next to the Apply button. Separate the Quick filter chips into two labeled groups: "Missing in accounting:" (Charges, Payouts, Negative only, Over $100) and "Missing in integration:" (Broken rows). Alternatively, make the filter panel-scoped by positioning one above each panel with a visual link showing "Synced filters: Date range ✓". This is how Stripe's reconciliation UI handles asymmetric panel filters — same date context, different type contexts.

---

**2. "Match all →" is a phantom action with no interaction model**

- **Problem:** Every cluster in the left panel ("Missing in accounting") shows a "Match all →" button. But match 24 Stripe subscription charges to *what*, exactly? The right panel has 6 rows with null amounts and dates — they cannot be matched to anything. When Matched=0, Discrepancy=0, there are no candidates on either side that correspond to these charges. "Match all" with no matching target is a button that either silently errors, does nothing, or does something dangerous. This is not a minor detail — it's the *primary action* on the primary panel.
- **Evidence:** `cluster-header .actions button` in `index.html` renders "Match all →" unconditionally regardless of whether there are right-panel counterparts. The data in `DATA.missingInPp` has 6 items, all with `amount: null` — they are mathematically unmatchable. The cluster model in `accClusters` has no link to any pp-side candidates.
- **Fix:** "Match all" should only appear when Synder has detected candidate matches on the right side. Replace with: "Review & match →" which opens a drawer showing the cluster summary and the system's matching suggestions. If no candidates exist (as is the case here), the button reads "No matching items found" and is disabled with a tooltip: "Fix the column mapping on the right first." This is exactly how Xero's "Find & match" works — you don't get a match button without a suggestion.

---

**3. The progress bar at the top is a feel-good widget with zero decision utility**

- **Problem:** The progress snapshot shows Matched=0, Discrepancy=0, Not matched=50, Ignored=0, with a visual progress track that is 100% red because the user is 0% done. This widget communicates "you're 0% done" — information the user already knows because they navigated to the "Not matched" tab with 50 items. It replaces a "hostile" warning banner with a calm-looking component that takes 4× more screen real estate to say the same thing. The 100%-red track bar is not calming. It's just a differently-shaped alarm.
- **Evidence:** `progress-bar` block in `renderImproved()` — `pct(s.matchedCount)` = pct(0) = 0%, `pct(s.notMatchedCount)` = pct(50) = 100%. The rendered bar is entirely `seg-notmatched` (red). The warning banner it replaces was 1 line. This is 5 metrics + a colored track + a legend.
- **Fix:** Replace with a completion-focused status line: "**50 items to resolve** · Est. 3 min to bulk-resolve all" — where the estimate is based on the cluster count (5 clusters × ~30s each). Only show the progress bar AFTER the user has taken at least one action (e.g., resolved a cluster). Before any action, the bar adds noise. After resolving 2 of 5 clusters, "40% resolved · 3 clusters remaining" is genuinely motivating. Stripe's checkout progress UX does exactly this — no progress indicator until you've started progressing.

---

**4. "Mark as expected" in the bulk action bar is undefined jargon**

- **Problem:** The bulk action bar shows three options: "⇄ Match selected", "Mark as expected", "Ignore selected". "Mark as expected" appears nowhere in `current-logic.md`, is not defined in any tooltip or label in the prototype, and has no described behavior. Is it equivalent to "Ignore"? Does it create a rule for future reconciliations ("always expect this pattern")? Does it move items to a new tab? For an accounting-adjacent product used by finance professionals, introducing a status category with no defined semantics is a compliance risk — an auditor will ask "what does 'expected' mean in your reconciliation workflow?" and the user will have no answer.
- **Evidence:** `bulk-bar` in `renderImproved()` — `<button>Mark as expected</button>` with no associated tooltip, modal, or described behavior in the proto notes. The `current-logic.md` has "Matched", "Discrepancy", "Not matched", "Ignored" as the four defined states. "Expected" is a fifth state with no tab, no count, no persistence model.
- **Fix:** Either define the behavior precisely (e.g., "Mark as expected = Ignore + create a rule that auto-ignores this pattern in future reconciliations") or remove it. If you want a "known pattern" state, model it as "Add to known patterns" with a visible rule manager. QuickBooks uses "Exclude" for items you expect to ignore permanently — single label, clear behavior: excluded items appear in a dedicated "Excluded" tab with an "Include" restore action.

---

**5. The insight footer is critical intelligence buried at the wrong depth**

- **Problem:** The reconciliation insight — "The 44 items on the left appear to be a single recurring Stripe subscription. Once you fix the column mapping on the right, Synder will likely match all 44 automatically" — is displayed at the *bottom of the right panel*, after the broken-rows cluster and the valid-rows cluster, in a dashed box styled like a hint. This is the single most actionable piece of information in the entire UI: "one action resolves all 50 items." It should be visible on first render, above the fold. Instead it requires scrolling past two cluster panels.
- **Evidence:** `renderImproved()` — the insight footer `<div style="background:var(--primary-5);border:1px dashed...">` is rendered as the last element inside the right panel, after all clusters. On any screen under 1440px height, this will be below the fold. The smart banner at the top addresses the mapping error but doesn't connect it to the left-panel resolution ("fix this → 44 items auto-match").
- **Fix:** Move the insight into the smart banner CTA copy. Change the banner's `<p>` text to: "6 transactions are missing dates and amounts due to a column mapping error. Fixing the mapping will also automatically resolve the 44 missing-in-accounting items on the left, which appear to be the same Stripe subscription pattern." One banner, complete story, above the fold. The dashed hint box can stay as a supplementary note.

---

## 🟡 Stuff Dasha missed from the Current Logic doc

- **"Refresh data" label still lies.** `current-logic.md` flags this as a critical mismatch: label says "Refresh," action creates a new reconciliation. The improved design keeps the same "Refresh data" button unchanged. No fix attempted.

- **Tab tooltips still absent.** The current design has no tooltips on "Matched / Discrepancy / Not matched / Ignored." The improved design doesn't add them. A user who doesn't know what "Discrepancy" means still doesn't know.

- **No copy button on truncated IDs.** The improved design bumps ID truncation from 18 to 24 chars (`truncate(r.primaryId, 24)` vs `truncate(r.primaryId, 18)`) — marginal improvement. But `po_1Sv5SEE4pygkgelbSou3NmTj` is still truncated to `po_1SmkyAE4pygkgel…` with no copy-to-clipboard. Finance users *will* need to paste these IDs into Stripe Dashboard. This is a recurring friction point that's unresolved.

- **"Ignore all" at cluster level has no confirmation.** `current-logic.md` flags single-row Ignore as "no confirmation, no undo toast." The improved design adds cluster-level "Ignore all" — which is *higher stakes* (ignoring 24 rows at once) — also with no confirmation modal and no undo. This is a regression in risk surface.

- **Export dropdown format still undocumented.** No change to the Export button: still no format indicators (CSV? XLSX?), no per-option tooltips.

- **"Process log" still has no tooltip.** Unchanged from current.

---

## 🏆 Industry benchmark notes

- **Stripe Dashboard reconciliation:** Stripe uses flat lists with system-generated reason codes per mismatch ("Amount mismatch", "Missing payout", "Duplicate"). No clustering, but every item has a reason category — users can filter by reason. The prototype's clustering is a stronger pattern than Stripe's reason codes *for high-count homogeneous datasets*, but Stripe's per-item context is better for heterogeneous lists. Synder should target this: clusters for homogeneous patterns, reason codes for anomalies.

- **QuickBooks bank reconciliation:** Explicit two-column match-by-click paradigm. You select a bank item, select a QB item, click "Match." There is no "Match all" without specifying both sides. The prototype's "Match all →" violates this established mental model that Synder's target audience (accountants and bookkeepers) has been trained on for 20+ years. This is a category error.

- **Xero reconciliation:** "Find & match" drawer appears when you click an unreconciled item, showing AI-suggested matches ranked by confidence. The suggestion step is non-skippable — you confirm before matching. Xero's model is more cautious than the prototype but protects against false-positive bulk matching. The prototype could borrow Xero's confidence score ("94% likely same transaction") to justify bulk matching.

- **Revolut Business:** Bulk selection + action bar is the closest to the prototype's interaction model and it works there. Revolut's context: mostly bank transfers with high confidence. Synder's context: accounting reconciliation with legal implications. The lower-stakes bulk model needs higher-stakes confirmation in Synder's domain.

---

## 💡 Top 3 changes to approve for production

**1. Scope the filter bar explicitly — with scope selector and chip grouping**

Spec: Add a "Filter scope: [Both panels ▾]" dropdown (options: "Both panels", "Missing in accounting only", "Missing in integration only") next to the Reset button in the shared filter bar. Separate Quick filter chips into two labeled rows: `Missing in accounting: [Charges (24)] [Payouts (20)] [Negative only] [Over $100]` and `Missing in integration: [⚠ Broken rows (6)]`. This eliminates the scope ambiguity and makes the filter architecture legible at a glance without requiring users to guess which panel reacts.

**2. Replace "Match all →" with a conditional "Review & match →" that requires a confirmation step**

Spec: Show "Review & match →" only when the cluster has been pattern-detected as having probable right-side counterparts (signal: if `DATA.mappingBroken === true` AND this cluster's type/amount pattern appears in historical imports, grey out with tooltip "Fix column mapping to enable matching"). When clickable, open a 3-step modal: (1) Cluster summary showing total amount and date range, (2) Matched candidates list from the right panel with confidence scores, (3) Confirm button. If no candidates exist, replace the button with "No match candidates" (disabled, grey). This aligns with Xero's "Find & match" model and removes the phantom action risk.

**3. Merge the insight footer into the smart banner — one banner, full story**

Spec: Change the smart banner `<p>` from the current technical error description to: *"6 transactions are missing dates and amounts because `created` was mapped to Amount and `reporting_category` was mapped to Date. Fix the mapping to also auto-resolve the 44 recurring subscription charges on the left — Synder has detected they're the same Stripe subscription pattern."* Remove the dashed insight box at the bottom of the right panel (redundant). Change the smart banner's secondary CTA from "See which rows →" to "See the 44 related items →" which scrolls to the left panel. One action, full causal chain, above the fold.

---

## 🎯 Bonus observations (unasked-for but important)

- **The prototype's proto-notes section (yellow box) will never ship but is doing half the UX's job.** The notes explain what the clusters mean, why the mapping is broken, and what the insight footer implies. If users need a yellow annotation box to understand the UI, the UI isn't done. The annotations reveal where the design is still communicating through ambient narrative rather than the interface itself.

- **Cluster granularity is over-split on the right side.** The right panel renders "0 valid unmatched items" (`validPpRows.length === 0`) as an empty cluster with a header. An empty cluster with "0 items — Review individually" and no rows is pure noise. The code has a conditional (`${validPpRows.length > 0 ? ...}`) but even an empty cluster header gets rendered because the broken-rows cluster is always there. If all right-panel items are broken, the panel should show ONLY the broken-rows cluster with zero scaffolding around it.

- **The "looks like recurring subscription pattern" metadata label in cluster headers is hardcoded.** In `renderImproved()`, the cluster meta text reads `"looks like recurring subscription pattern"` as a string literal for every cluster. The -$86.44 payout cluster (count=1) and -$43.22 payout cluster (count=1) don't look like a "pattern" — they're single items. Either derive the pattern label from the count threshold (e.g., pattern label only for count ≥ 3) or remove it for singletons. False pattern detection erodes trust faster than no detection at all.

- **"50 to resolve" badge in the header is a meaningful improvement over "Not reconciled."** Subtle but good — changing the status badge from the vague "Not reconciled" (current) to "50 to resolve" (improved) gives quantified actionability at the page level. This is the kind of copy change that costs nothing and reduces anxiety measurably. Ship this independent of everything else.
