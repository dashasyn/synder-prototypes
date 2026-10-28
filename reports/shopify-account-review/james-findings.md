# James Whitfield — CFO Review: Clearing Account Dropdown

> *Reviewed: Synder Reconciliation Details modal, Clearing account dropdown*
> *Integration: Shopify ("My ceramic plates") → QuickBooks Online ("My lovely money")*
> *Automation mode: Automated | Date range: 02/22/2024 – 03/22/2024*

---

## ✅ What Works (if anything)

- The three-section layout is a reasonable structural choice — grouping by account origin (Synder-automated vs. Synder-created vs. native QBO) shows someone thought about hierarchy.
- Putting "ACCOUNTS AVAILABLE FOR AUTOMATED DATA RETRIEVAL" at the top signals intent and nudges users toward the recommended path. I appreciate the prioritization.
- The "(required for Synder)" tag does at least distinguish Synder-managed accounts from the plain QBO ones at the bottom. That's a minimal but real signal.

---

## 🔴 Critical (max 1) — what would block my approval

**Finding:** Four separate accounts all carry the label "(required for Synder)" — yet I can only select one. The word "required" applied to multiple mutually exclusive options is either a labeling error or an undisclosed multi-account mapping happening behind the scenes.

**Why:** When I see "Shopify (required for Synder)" in Section 1, then "Shopify Manual Order (required for Synder)" and "Shopify Other Order (required for Synder)" in Section 2, the word *required* implies I need all of them. But this is a single-select field. If picking Section 1 silently handles all order types while Sections 2 accounts exist for edge-case overrides, that logic is completely invisible to me. If Synder is internally routing some transactions to the Manual Order account regardless of what I select here, I need to know that — because that affects what shows up in my ledger without my explicit sign-off. This is the exact kind of black-box behavior I will not approve. My audit trail requires me to know, at point of configuration, exactly which account receives which transactions. The current UI does not provide that.

**Confidence:** High

---

## 🟡 Important (max 2)

**Finding 1:** No account type metadata is displayed — I cannot verify the financial classification of these accounts before selecting.

**Why:** A clearing account in this context should be a current asset or liability, depending on settlement timing. Nothing in this dropdown tells me whether "Shopify (required for Synder)" is an asset, liability, bank, or other account type. If a user — or a junior accountant working under time pressure — picks "Accounts Receivable (A/R)" from Section 3, Shopify clearing entries get booked to AR. At month-end, receivables are overstated, aging reports are wrong, and reconciliation is broken. The UI does nothing to guard against this. One QBO account type indicator next to each option would eliminate this risk entirely.

**Confidence:** High

**Finding 2:** The functional difference between Section 1 and Section 2 is never explained, and that gap has real workflow consequences.

**Why:** "ACCOUNTS AVAILABLE FOR AUTOMATED DATA RETRIEVAL" vs. "OTHER ACCOUNTS CREATED BY SYNDER" implies a meaningful distinction — but what is it, exactly? Does selecting from Section 2 degrade automation? Does it result in manual journal entries for certain transaction types? Does it affect how Shopify payouts reconcile against the clearing balance? I should not have to call support to understand what I'm choosing here. If picking a Section 2 account means I lose automated retrieval for some transaction types, that is a reconciliation risk I need to evaluate before I select it — not discover at month-end when the numbers don't add up.

**Confidence:** High

---

## 💡 Ideas to Gain My Trust

1. **Show account type on every row.** Add a small tag or secondary line to each option showing QBO account type (e.g., "Other Current Asset," "Accounts Receivable," "Bank"). One glance tells me whether the account is financially appropriate for clearing. This is not a nice-to-have — it's the minimum information needed to make this decision responsibly.

2. **Rename or define "(required for Synder)."** "Required" applied to four different accounts in a single-select field is contradictory. Either change the label to something precise — "Synder-managed," "Used for automated sync," "Handles manual orders" — or add a tooltip that explains exactly what each account does in the sync workflow and what breaks if you don't use it. If the label means "this account must exist in QBO for Synder to function" rather than "you must select this account," say that instead.

3. **Add a one-line functional consequence to each section header.** Under "ACCOUNTS AVAILABLE FOR AUTOMATED DATA RETRIEVAL," add: *"Selecting this enables full automated data retrieval for this integration."* Under "OTHER ACCOUNTS CREATED BY SYNDER," add: *"Selecting these accounts may limit or alter automated sync behavior."* Under "OTHER QBO ACCOUNTS," add: *"Not recommended — these accounts were not created for Synder workflows."* Fifteen words per section. That's the difference between informed consent and guesswork.

---

## Verdict

I'm sending this back. The "(required for Synder)" label applied to four accounts in a single-select dropdown is either a documentation failure or evidence of undisclosed backend routing — and I will not sign off on a reconciliation tool where I cannot trace, at configuration time, exactly which account receives which transactions. Address the labeling, surface account types, and explain the functional consequence of each section; then I'll review it again.
