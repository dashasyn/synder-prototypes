# Sarah Chen — CPA Feedback: Reconciliation V2 Mocks
*Senior Accountant, 15 yrs experience, QBO power user*

---

## Screen 1 (Setup warning)

The pre-start warning is the right instinct — catching data integrity issues before a reconciliation run saves real pain. In QBO, a botched recon with bad source data means voiding entries and re-running, which is exactly what we want to avoid.

**What works:** The red border and bold heading get attention. Placing it before "Start reconciliation" respects the workflow sequence.

**Problems:**
- The warning only appearing on the left (Accounting/QBO) panel is confusing. Failed/rolled-back transactions live in the *integration* side (Stripe), but the warning implies it's a QBO problem. Accountants will instinctively look at both panels as a pair — asymmetry creates doubt about which side needs fixing.
- "Please check them before start reconciling" — grammatically broken ("before *starting*") and vague. Check them *where*? There's no link, no count, no navigation path.
- The word "discrepancy" is used correctly here (good!), but "Failed and Rolled back transactions will cause discrepancy" reads like a header and a sentence fused together. Needs to be one or the other.

**Verdict:** Keep the warning. Fix the grammar, add a transaction count, add a "View transactions" link, and consider mirroring a softer version on the right panel too.

---

## Screen 2 (Idea A — banner)

The banner with quantities is genuinely useful from an accounting standpoint. Seeing "2 payout syncs, 1 rolled back, 2 failed, 1 unknown" before diving into 1,002 rows lets me triage the workload and decide whether to handle it now or flag it for review.

**What works:** The count-first structure matches how accountants think — we quantify before we investigate. The color coding by type is logical once you learn it.

**Problems:**
- "2 payout syncs" is not a meaningful accounting term. Does it mean 2 payouts that *failed to sync*, or 2 payout *transactions*? It should be "2 payout sync errors" or "2 unsynced payouts."
- "Sync rolled back transactions" and "Sync failed transactions" are imperative commands with no object clarity. Rolled back *to where*? In QBO terms: re-sync to create the journal entry? Re-sync to re-import the transaction? Be explicit.
- "create a journal entry in books manually" — lowercase start mid-sentence; also "in books" should be "in your books" or "in QuickBooks." The instruction is correct (unknown items *do* need manual JEs), but the phrasing is informal.
- The dismiss (×) is appropriate — accountants may want to hide the banner after reading it once.

**Verdict:** Strong concept. Fix terminology, capitalize consistently, and make "Sync" actions link directly to the relevant settings page.

---

## Screen 3 (Idea B — per-row chips)

Per-row context is powerful for small datasets but scales poorly. At 5 rows, the chips are a revelation — I can see at a glance why each item is missing. At 1,002 rows, it's noise.

**What works:** The chip labels ("Rolled back," "Payout sync disabled") are more precise than the banner equivalents. Tooltips give actionable next steps — the "Excluded from sync" tooltip is the clearest writing in this entire design.

**Problems:**
- **"Excluded from sync" is green.** Green = good/resolved in every accounting system I've used (QBO, Xero, NetSuite). A missing transaction shown in green will be read as "this is fine" — it is not fine. Use gray or amber.
- **"Unknown" in gray plain text** doesn't look like a chip — it looks like an empty cell. Needs a visible chip border or background, even if light gray.
- **"Payout sync disabled" as orange-filled** is the right severity signal. Keep it.
- The tooltip for "Excluded from sync" says "The transaction wasn't sync to your books yet" — grammatical error ("wasn't *synced*").
- Column truncation ("Transaction t…", "Invoice paym…") is a real regression from Idea A. Accountants need to read transaction types — "Invoice payment" vs. "Invoice" vs. "Payment" are meaningfully different in QBO.

---

## Overall recommendation

**Use Idea A (banner) as the primary pattern, with per-row chips as a supplemental detail column — not a replacement.**

The banner gives the aerial view accountants need to assess scope. Per-row chips add value when the dataset is small (under ~20 rows) but clutter the table at scale. A hybrid — banner always shown, chip column optional/collapsible — serves both use cases.

Screen 1's warning is worth keeping but needs a direct link to the problematic transactions and a fix to the right-panel asymmetry.

---

## Copy rewrites (top 5, accounting-accurate)

| # | Original | Rewrite |
|---|----------|---------|
| 1 | "Failed and Rolled back transactions will cause discrepancy" | "Your selected period contains failed or rolled-back transactions that will cause reconciliation discrepancies." |
| 2 | "Please check them before start reconciling." | "Review and resolve these transactions before starting reconciliation. [View transactions →]" |
| 3 | "2 payout syncs – Enable payout processing to reconcile Stripe payouts." | "2 unsynced payouts – Payout sync is disabled. Enable it in Settings → Payouts → Process payouts." |
| 4 | "create a journal entry in books manually to cover the difference." | "Create a manual journal entry in QuickBooks to record this transaction." |
| 5 | "The transaction wasn't sync to your books yet. Sync it again to add to accounting." | "This transaction was excluded and hasn't been posted to your books. Re-sync it to import it into QuickBooks." |
