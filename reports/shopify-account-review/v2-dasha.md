# UX Feedback — Reconciliation v2 Mocks
**Reviewer:** Dasha (UX researcher)
**Date:** 2026-04-13

---

## Screen 1 (Setup warning)

The warning exists for the right reason — stopping a user before they bake a problem into their books. But the execution has three friction points.

**Placement asymmetry is confusing.** The warning lives only under the Accounting panel, but the problem (failed/rolled-back transactions) belongs to the date range they set — it affects both sides. A user scanning right-to-left will start reconciliation without ever seeing it. The "Start reconciliation" CTA is also top-right, so their eyes are already moving away from the warning when they reach the button.

**The heading reads like a threat with no escape hatch.** "Will cause discrepancy" tells me what's wrong but not what I should do. There's no link, no quick-action, no count. How many failed transactions? Where do I go to check them?

**"Before start reconciling" is broken grammar** — small but damages trust in a financial product.

**What to fix:** Anchor the warning closer to the CTA (inline above the button, or as a blocking modal on click). Add a count and a direct link: "3 failed/rolled-back transactions in this range — [View them]". Consider disabling or relabeling the button: "Review issues first" → "Start anyway."

---

## Screen 2 (Idea A — banner)

The quantity labels ("2 payout syncs", "1 rolled back") are the key upgrade here and they work well — users immediately know the scope. The dismiss (×) is good; power users who've already acted will close it.

**The four action instructions are still too long for a banner.** Users in a triage mindset skim. "Enable payout processing to reconcile Stripe payouts. Go to Settings →Payouts → Enable 'Process payouts'" is a three-step instruction crammed into a one-liner. It will be read as noise.

**Color logic is inconsistent.** Blue for "payout syncs," red for "failed," orange for "unknown" — each color has a different semantic weight in a financial UI but they aren't clearly differentiated in meaning here. Black for "rolled back" is the weakest signal for something that requires action.

**What to fix:** Trim each line to a label + one linked action: "**2 payout syncs** — [Enable payout processing]". Let the Settings page carry the explanation. Keep the banner as a navigation shortcut, not a manual.

---

## Screen 3 (Idea B — per-row)

Per-row chips give the right context at the right moment — user is already looking at the row, the chip tells them why it's missing. This is strong for low-volume use (3–10 rows).

**"Excluded from sync" in green is a serious UX bug.** Green = resolved/healthy in every financial and ops UI convention. A user will read this chip as "this one is fine" and skip it. It's a missing transaction that needs action — it needs a warning color (amber or gray).

**Tooltip copy for "Excluded from sync" has a grammar error:** "The transaction wasn't sync to your books yet." Also the instruction ("Sync it again") is too vague — sync from where, how?

**Column truncation is a real cost.** Adding the chip column squeezes Primary ID and Transaction type. For 1,002-row datasets, users need those IDs to identify records. This approach breaks down at scale.

**Four simultaneous tooltips** is a design-artifact issue — make sure hover states are tested one at a time in handoff.

---

## Overall recommendation

**Ship Idea B as the default for ≤ ~50 rows; add the banner as a secondary summary above the table.** The per-row chip gives the most actionable signal at the row level. The banner (Idea A) serves as a quick-scan overview — keep it but trim the copy to label + link. For 1,000+ rows, the banner alone is the only realistic interface; chips at that scale add visual noise with no proportional benefit.

**Screen 1 needs the most work.** It's the highest-leverage touchpoint (prevention > cure) but currently the warning is easy to miss and offers no escape route.

---

## Copy rewrites (top 5 most impactful)

| # | Current | Rewrite |
|---|---------|---------|
| 1 | "Failed and Rolled back transactions will cause discrepancy" | "3 transactions in this range may break reconciliation" |
| 2 | "Please check them before start reconciling." | "Review them before you start — [View failed transactions]" |
| 3 | "There are 10 missing in accounting transactions:" | "10 transactions missing from accounting" |
| 4 | "Enable payout processing to reconcile Stripe payouts. Go to Settings →Payouts → Enable 'Process payouts'" | "2 payout syncs — [Enable payout processing ↗]" |
| 5 | "The transaction wasn't sync to your books yet. Sync it again to add to accounting." | "This transaction was excluded from sync. Re-sync it to add it to your books — [Go to sync history ↗]" |
