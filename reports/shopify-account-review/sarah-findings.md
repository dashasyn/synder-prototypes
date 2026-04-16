# Sarah Chen — Clearing Account Dropdown Review

*Senior accountant, 15 years in practice, ~40 ecommerce clients on QBO/Xero*

---

## ✅ What Works

- The three-section structure is the right instinct — separating "Synder accounts" from "existing QBO accounts" prevents users from accidentally wiring reconciliation into a live operational account like Checking.
- Putting the recommended option first (Section 1) saves experienced users time — I can grab it and move on without reading all six options.
- Including standard QBO accounts (A/R, Checking) at all is defensible — some clients have pre-existing clearing setups they'd want to reuse.

---

## 🔴 Critical (max 1)

**Finding:** Section 1 is labeled "ACCOUNTS AVAILABLE FOR AUTOMATED DATA RETRIEVAL" — that is not an accounting concept, and it does not tell me why this account is the right clearing account to pick.

**Why:** A clearing account is a balance-sheet account used to temporarily hold in-transit entries before they post to their final destination. When I read "automated data retrieval," my brain goes to *file imports*, not *chart of accounts*. What I actually need to know is: what account type is this (bank? current asset?), and why does automation mode require it specifically? The heading describes a software capability, not an accounting property. For any accountant auditing a client's QBO file later, "available for automated data retrieval" will mean nothing — and if the wrong account gets selected here because the label was confusing, I'm looking at a reconciliation mess that costs real hours to untangle.

**Confidence:** High

---

## 🟡 Important (max 2)

**Finding 1:** "(required for Synder)" appears four times in six options, including twice on a single line ("Shopify (required for Synder): Shopify Manual Order (required for Synder)"). By the third instance it's invisible noise.

**Why:** If nearly everything is "required for Synder," the tag conveys no information. The one place it *would* matter is distinguishing the Synder accounts from the QBO accounts that are *not* required — but the section grouping already does that. The repeated badge is redundant with the section structure and just creates visual clutter on what's already a fairly loaded dropdown. Worse, that double-hit on one line looks like a rendering bug to someone skimming fast.

**Confidence:** High

---

**Finding 2:** "Accounts Receivable (A/R)" is in the "OTHER QBO ACCOUNTS" section with no warning.

**Why:** A/R is a control account in QBO — it's locked to the AR subledger and posting non-customer transactions into it is incorrect accounting. If a less experienced bookkeeper on my team picks it thinking "oh, Shopify customers create receivables," I now have corrupted A/R aging reports. At minimum this option needs a caveat or should be excluded from clearing account selection entirely.

**Confidence:** High

---

## 💡 My Ideas

1. **Rename Section 1 to something accounting-native.** Try: "RECOMMENDED — DEDICATED SHOPIFY CLEARING ACCOUNT" or simply "SYNDER DEFAULT." Tell me what it *is* in accounting terms, not what Synder does with it under the hood.

2. **Drop "(required for Synder)" from individual item labels; let the section heading carry that meaning.** If you need to communicate requirement status, a single note under the section header ("Synder needs one of these accounts to run automated reconciliation") does the job once instead of four times.

3. **Flag A/R with a warning icon or remove it.** If it must stay, a small tooltip ("Not recommended — QBO control account") would prevent a costly mistake. Better yet, move it to a separate "Advanced / not recommended" section or hide it behind a toggle.

---

## My Pick

I'd choose: **Shopify (required for Synder)** in Section 1 — because it's a dedicated clearing account purpose-built for this integration, it's isolated from operational accounts, and it's first in the list, which signals it's the intended choice for automated mode. The label is still clunky, but the accounting logic is sound: a dedicated intermediary account keeps Shopify settlements off my client's live bank or A/R lines until they're fully matched. Clean audit trail, easy to zero-out, easy to explain to a client.
